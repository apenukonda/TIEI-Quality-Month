-- Apply after employee_registry.sql and a successful roster import.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- This intentionally supports signup before authentication. It returns no
-- employee records, names, designations, or other personal information.
create or replace function public.employee_registration_matches(
  p_employee_number text, p_department text
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.employee_registry e
    where e.employee_number = btrim(p_employee_number)
      and e.department_key = lower(btrim(regexp_replace(p_department, '[[:space:]]+', ' ', 'g')))
  );
$$;
revoke all on function public.employee_registration_matches(text, text) from public, anon, authenticated;
grant execute on function public.employee_registration_matches(text, text) to anon, authenticated;

create or replace function public.get_registration_departments()
returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct btrim(department) order by btrim(department)), '{}'::text[])
  from public.employee_registry;
$$;
revoke all on function public.get_registration_departments() from public, anon, authenticated;
grant execute on function public.get_registration_departments() to anon, authenticated;

-- Top registrations list for admin including manager name from employee_registry
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
    coalesce(e.manager_employee_name, 'N/A') as manager_name,
    p.score,
    p.role
  from public.profiles p
  left join public.employee_registry e
    on e.employee_number = p.user_id
  where p.role = 'user'
  order by p.score desc, p.created_at desc
  limit p_limit offset p_offset;
$$;
revoke all on function public.get_admin_profiles(integer, integer) from public, anon, authenticated;
grant execute on function public.get_admin_profiles(integer, integer) to anon, authenticated;

-- Enforce the same-row match in Auth as well as the signup form. This trigger
-- runs only for new accounts, preserving existing users and scores.
create or replace function private.enforce_employee_registration()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  employee public.employee_registry%rowtype;
begin
  select e.* into employee
  from public.employee_registry e
  where e.employee_number = btrim(new.raw_user_meta_data->>'userId')
    and e.department_key = lower(btrim(regexp_replace(new.raw_user_meta_data->>'department', '[[:space:]]+', ' ', 'g')));

  if not found then
    raise exception using errcode = '23514', message = 'Please check your Employee ID and Department or contact admin';
  end if;

  -- Populate identity from the verified roster, never user-supplied name,
  -- designation, or role metadata.
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'userId', employee.employee_number,
    'name', employee.employee_name,
    'department', btrim(employee.department),
    'designation', employee.designation,
    'role', 'user'
  );
  return new;
end;
$$;
revoke all on function private.enforce_employee_registration() from public, anon, authenticated;

drop trigger if exists validate_employee_registration on auth.users;
create trigger validate_employee_registration
  before insert on auth.users
  for each row execute function private.enforce_employee_registration();

-- Repair accounts created before employee profiles were available. This is
-- idempotent and only creates profiles when Auth metadata matches the roster.
insert into public.profiles (id, user_id, name, department, designation, role, passcode)
select
  u.id,
  e.employee_number,
  e.employee_name,
  btrim(e.department),
  e.designation,
  'user',
  u.raw_user_meta_data->>'passcode'
from auth.users u
join public.employee_registry e
  on e.employee_number = btrim(u.raw_user_meta_data->>'userId')
 and e.department_key = lower(btrim(regexp_replace(
   coalesce(u.raw_user_meta_data->>'department', ''),
   '[[:space:]]+', ' ', 'g'
 )))
where u.email = e.employee_number || '@quality-event.internal'
on conflict (id) do nothing;

-- Function to safely clean up orphan auth accounts during signup
create or replace function public.cleanup_orphan_user(
  p_employee_number text,
  p_department text
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.employee_registration_matches(p_employee_number, p_department) then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where btrim(user_id) = btrim(p_employee_number)
  ) then
    return false;
  end if;

  select u.id into v_user_id
  from auth.users u
  where u.email = btrim(p_employee_number) || '@quality-event.internal'
    and not exists (
      select 1 from public.profiles p where p.id = u.id or btrim(p.user_id) = btrim(p_employee_number)
    );

  if v_user_id is not null then
    delete from auth.users where id = v_user_id;
    return true;
  end if;

  return false;
end;
$$;
revoke all on function public.cleanup_orphan_user(text, text) from public, anon, authenticated;
grant execute on function public.cleanup_orphan_user(text, text) to anon, authenticated;

-- Ensure deleted profiles automatically remove the corresponding auth user
create or replace function public.handle_deleted_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_profile_deleted on public.profiles;
create trigger on_profile_deleted
  after delete on public.profiles
  for each row execute procedure public.handle_deleted_profile();

commit;

