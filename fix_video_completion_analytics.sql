-- Fix filtered video completion analytics scores.
-- Run this once in the Supabase SQL Editor.

create or replace function public.admin_video_completion(
  module_filter text default 'all',
  task_index integer default null
)
returns table(
  id uuid,
  user_id uuid,
  employee_id text,
  name text,
  department text,
  designation text,
  score_m1 int,
  score_m2 int,
  score_m3 int,
  total_score int,
  task_score int,
  m1 boolean,
  m2 boolean,
  m3 boolean,
  completed_at timestamptz
) language plpgsql security definer as $$
begin
  return query
  select
    p.id,
    p.id as user_id,
    coalesce(p.user_id, p.id::text) as employee_id,
    p.name,
    coalesce(p.department, 'Unknown') as department,
    coalesce(p.designation, 'Unknown') as designation,
    coalesce(m1.score, 0) as score_m1,
    coalesce(m2.score, 0) as score_m2,
    coalesce(m3.score, 0) as score_m3,
    p.score as total_score,
    case
      when task_index is null then 0
      when lower(coalesce(module_filter, 'all')) = 'm1' and task_index = 1 then coalesce(m1.task1_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm1' and task_index = 2 then coalesce(m1.task2_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm1' and task_index = 3 then coalesce(m1.task3_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm1' and task_index = 4 then coalesce(m1.task4_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm1' and task_index = 5 then coalesce(m1.task5_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm1' and task_index = 6 then coalesce(m1.task6_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm2' and task_index = 1 then coalesce(m2.task1_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm2' and task_index = 2 then coalesce(m2.task2_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm2' and task_index = 3 then coalesce(m2.task3_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm2' and task_index = 4 then coalesce(m2.task4_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm3' and task_index = 1 then coalesce(m3.task1_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm3' and task_index = 2 then coalesce(m3.task2_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm3' and task_index = 3 then coalesce(m3.task3_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'm3' and task_index = 4 then coalesce(m3.task4_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'all' and task_index = 1 then coalesce(m1.task1_score, 0) + coalesce(m2.task1_score, 0) + coalesce(m3.task1_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'all' and task_index = 2 then coalesce(m1.task2_score, 0) + coalesce(m2.task2_score, 0) + coalesce(m3.task2_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'all' and task_index = 3 then coalesce(m1.task3_score, 0) + coalesce(m2.task3_score, 0) + coalesce(m3.task3_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'all' and task_index = 4 then coalesce(m1.task4_score, 0) + coalesce(m2.task4_score, 0) + coalesce(m3.task4_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'all' and task_index = 5 then coalesce(m1.task5_score, 0)
      when lower(coalesce(module_filter, 'all')) = 'all' and task_index = 6 then coalesce(m1.task6_score, 0)
      else 0
    end as task_score,
    (coalesce(m1.task1_completed, false) and coalesce(m1.task2_completed, false) and coalesce(m1.task3_completed, false) and coalesce(m1.task4_completed, false) and coalesce(m1.task5_completed, false) and coalesce(m1.task6_completed, false)) as m1,
    (coalesce(m2.task1_completed, false) and coalesce(m2.task2_completed, false) and coalesce(m2.task3_completed, false) and coalesce(m2.task4_completed, false)) as m2,
    (coalesce(m3.task1_completed, false) and coalesce(m3.task2_completed, false) and coalesce(m3.task3_completed, false) and coalesce(m3.task4_completed, false) and coalesce(m3.task5_completed, false)) as m3,
    greatest(m1.completed_at, m2.completed_at, m3.completed_at) as completed_at
  from public.profiles p
  left join public.module_m1_progress m1 on m1.user_id = p.id
  left join public.module_m2_progress m2 on m2.user_id = p.id
  left join public.module_m3_progress m3 on m3.user_id = p.id
  where p.role = 'user';
end;
$$;
