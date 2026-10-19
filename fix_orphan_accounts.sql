-- ==============================================================================
-- Fix Orphan Auth Accounts & Prevent Future Registration Conflicts
-- ==============================================================================
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Why did this error happen?
-- When an account was created in auth.users (e.g. during earlier signup attempts
-- or testing) but no row exists in public.profiles (e.g. if the profile was deleted
-- or never created), Supabase Auth blocks new signups with "User already registered"
-- while login also fails because the profile is missing.
-- ==============================================================================

-- 1. Purge any orphan accounts in auth.users that have no corresponding row in public.profiles
delete from auth.users
where id not in (select id from public.profiles);

-- 2. Create RPC function to safely clean up orphan auth accounts during signup
--    (Checks that employee ID & department match employee_registry and no profile exists)
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
  -- 1. Validate employee number and department against roster
  if not public.employee_registration_matches(p_employee_number, p_department) then
    return false;
  end if;

  -- 2. If a profile already exists in public.profiles, do not touch it (protects registered users)
  if exists (
    select 1 from public.profiles
    where btrim(user_id) = btrim(p_employee_number)
  ) then
    return false;
  end if;

  -- 3. If an orphan user exists in auth.users with no profile, delete it
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

-- 3. Trigger: when a profile is deleted from public.profiles, automatically delete from auth.users
--    (Keeps auth.users and public.profiles synchronized if an admin deletes an employee profile)
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
