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
    raise exception using errcode = '23514', message = 'Please contact the admin';
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

commit;
