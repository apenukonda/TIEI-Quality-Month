-- Run once in the existing Supabase project's SQL Editor.
-- This migration replaces only score functions and repairs totals; it does
-- not recreate tables or delete accounts, submissions, or earned progress.
begin;

create or replace function public.refresh_user_score(user_id_in uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  module_id text;
  task_count int;
  score_expression text;
  completion_expression text;
  module_score int;
  module_completed int;
  advanced_score int := 0;
  advanced_steps int := 0;
  has_module_data boolean := false;
  total_score int;
begin
  -- Serialize changes for one user before reading or updating any totals.
  perform 1 from public.profiles where id = user_id_in for update;
  if not found then raise exception 'User profile does not exist'; end if;

  foreach module_id in array array['m1', 'm2', 'm3'] loop
    task_count := case module_id when 'm1' then 6 when 'm2' then 4 else 5 end;
    select string_agg(format('coalesce(task%s_score, 0)', n), ' + '),
           string_agg(format('coalesce(task%s_completed, false)::int', n), ' + ')
      into score_expression, completion_expression
      from generate_series(1, task_count) n;
    execute format('select %s, %s from public.%I where user_id = $1',
      score_expression, completion_expression, 'module_' || module_id || '_progress')
      into module_score, module_completed using user_id_in;
    if module_score is not null then
      has_module_data := true;
      advanced_score := advanced_score + module_score;
      advanced_steps := advanced_steps + module_completed * 7;
      execute format('update public.%I set score = $1 where user_id = $2',
        'module_' || module_id || '_progress') using module_score, user_id_in;
    end if;
  end loop;

  if has_module_data then
    -- task6 mirrors all module quizzes. Preserve legacy earned points when
    -- older clients stored an aggregate without individual module records.
    insert into public.user_tasks (user_id, task_id, completed_steps, score, updated_at)
      values (user_id_in, 'task6', advanced_steps, advanced_score, now())
      on conflict (user_id, task_id) do update set
        completed_steps = greatest(user_tasks.completed_steps, excluded.completed_steps),
        score = greatest(user_tasks.score, excluded.score),
        updated_at = case when excluded.completed_steps > user_tasks.completed_steps
          or excluded.score > user_tasks.score then now() else user_tasks.updated_at end;
  end if;

  -- Count every activity once, including the task6 module aggregate.
  select coalesce(sum(score), 0) into total_score
    from public.user_tasks where user_id = user_id_in;
  update public.profiles set score = total_score,
    updated_at = case when score is distinct from total_score then now() else updated_at end
    where id = user_id_in;
  return total_score;
end;
$$;

create or replace function public.handle_task_completion(
  task_id_in text, user_id_in uuid, completed_steps_in int, score_earned_in int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  max_points int;
  max_steps int;
begin
  if auth.uid() is null or auth.uid() <> user_id_in then
    raise exception 'Please sign in to save your own score' using errcode = '42501';
  end if;
  max_points := case task_id_in when 'task1' then 7 when 'task3' then 5
    when 'task4' then 3 when 'task5' then 3 else null end;
  max_steps := case task_id_in when 'task1' then 7 else 1 end;
  if max_points is null or score_earned_in is null or completed_steps_in is null
     or score_earned_in < 0 or score_earned_in > max_points
     or completed_steps_in < 0 or completed_steps_in > max_steps
     or (completed_steps_in = 0 and score_earned_in <> 0) then
    raise exception 'Invalid task result' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = user_id_in for update;
  if not found then raise exception 'User profile does not exist'; end if;

  insert into public.user_tasks (user_id, task_id, completed_steps, score, updated_at)
    values (user_id_in, task_id_in, completed_steps_in, score_earned_in, now())
    on conflict (user_id, task_id) do update set
      completed_steps = greatest(user_tasks.completed_steps, excluded.completed_steps),
      score = greatest(user_tasks.score, excluded.score),
      updated_at = case when excluded.completed_steps > user_tasks.completed_steps
        or excluded.score > user_tasks.score then now() else user_tasks.updated_at end;
  return public.refresh_user_score(user_id_in);
end;
$$;

create or replace function public.update_module_task(
  module_name text, user_id_in uuid, task_index int, completed boolean, score int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  module_id text := lower(trim(module_name));
  task_count int;
  table_name text;
  score_column text;
  completed_column text;
begin
  if auth.uid() is null or auth.uid() <> user_id_in then
    raise exception 'Please sign in to save your own score' using errcode = '42501';
  end if;
  task_count := case module_id when 'm1' then 6 when 'm2' then 4 when 'm3' then 5 else null end;
  if task_count is null or task_index is null or task_index < 1 or task_index > task_count
     or score is null or score < 0 or score > 7 or completed is distinct from true then
    raise exception 'Invalid module quiz result' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = user_id_in for update;
  if not found then raise exception 'User profile does not exist'; end if;

  table_name := 'module_' || module_id || '_progress';
  score_column := 'task' || task_index || '_score';
  completed_column := 'task' || task_index || '_completed';
  execute format('insert into public.%I (user_id) values ($1) on conflict (user_id) do nothing', table_name)
    using user_id_in;
  -- Bound parameters avoid the old ambiguity between the score argument and
  -- the module table's score column. Repeated requests keep one best result.
  execute format('update public.%I set %I = true, %I = greatest(coalesce(%I, 0), $1), completed_at = now() where user_id = $2',
    table_name, completed_column, score_column, score_column) using score, user_id_in;
  return public.refresh_user_score(user_id_in);
end;
$$;

revoke all on function public.refresh_user_score(uuid) from public, anon, authenticated;
revoke all on function public.handle_task_completion(text, uuid, int, int) from public, anon;
revoke all on function public.update_module_task(text, uuid, int, boolean, int) from public, anon;
grant execute on function public.handle_task_completion(text, uuid, int, int) to authenticated;
grant execute on function public.update_module_task(text, uuid, int, boolean, int) to authenticated;

-- Repair existing totals from their saved activity/quiz results.
do $$
declare user_row record;
begin
  for user_row in select id from public.profiles order by id loop
    perform public.refresh_user_score(user_row.id);
  end loop;
end;
$$;

commit;
