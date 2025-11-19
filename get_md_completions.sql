create or replace function public.get_md_completions(
  p_limit integer default 1000,
  p_offset integer default 0
)
returns table(
  id uuid,
  user_id uuid,
  employee_id text,
  name text,
  department text,
  designation text,
  score int,
  completed_steps int,
  finished boolean,
  task_id text,
  updated_at timestamptz
) language sql security definer as $$
  select
    ut.user_id as id,  -- use user_id (user_tasks has no ut.id)
    ut.user_id,
    coalesce(p.user_id::text, ut.user_id::text) as employee_id,
    coalesce(p.name, ut.user_id::text) as name,
    coalesce(p.department, 'Unknown') as department,
    coalesce(p.designation, 'Unknown') as designation,
    ut.score,
    ut.completed_steps,
    (coalesce(ut.completed_steps, 0) >= 7) as finished,
    ut.task_id,
    ut.updated_at
  from public.user_tasks ut
  left join public.profiles p
    on p.id::text = ut.user_id::text OR p.user_id::text = ut.user_id::text
  where ut.task_id = 'task1' and (coalesce(ut.completed_steps, 0) >= 7)
  limit p_limit offset p_offset;
$$;
