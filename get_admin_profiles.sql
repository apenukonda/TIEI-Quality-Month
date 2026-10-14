-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Add manager_name column to profiles table and backfill from employee_registry
alter table public.profiles add column if not exists manager_name text;

update public.profiles p
set manager_name = e.manager_employee_name
from public.employee_registry e
where btrim(e.employee_number) = btrim(p.user_id);

-- 2. Create RPC function to fetch profiles with manager_name joined from employee_registry
create or replace function public.get_admin_profiles(
  p_limit integer default 2000,
  p_offset integer default 0
)
returns table(
  id uuid,
  user_id text,
  name text,
  department text,
  designation text,
  manager_name text,
  score int,
  role text
) language sql security definer as $$
  select
    p.id,
    p.user_id,
    p.name,
    p.department,
    p.designation,
    coalesce(nullif(btrim(e.manager_employee_name), ''), nullif(btrim(p.manager_name), ''), 'N/A') as manager_name,
    p.score,
    p.role
  from public.profiles p
  left join public.employee_registry e
    on btrim(e.employee_number) = btrim(p.user_id)
  where p.role = 'user'
  order by p.score desc, p.created_at desc
  limit p_limit offset p_offset;
$$;

revoke all on function public.get_admin_profiles(integer, integer) from public, anon, authenticated;
grant execute on function public.get_admin_profiles(integer, integer) to anon, authenticated;

-- Drop duplicate zero-arg overload if it exists to avoid ambiguity
drop function if exists public.get_admin_profiles();

