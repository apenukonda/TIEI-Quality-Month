-- Create the roster before importing the workbook. No employee data belongs in Git.
begin;

create table if not exists public.employee_registry (
  employee_number text primary key check (employee_number ~ '^[0-9]{1,6}$'),
  employee_name text not null,
  grade text,
  designation text,
  date_of_joining date,
  manager_employee_number text,
  manager_employee_name text,
  department_group text,
  department text not null check (btrim(department) <> ''),
  division text,
  department_number text,
  gender text,
  department_key text generated always as
    (lower(btrim(regexp_replace(department, '[[:space:]]+', ' ', 'g')))) stored,
  source_file text not null,
  source_row integer not null,
  imported_at timestamptz not null default now()
);

alter table public.employee_registry enable row level security;
-- Signup receives only a match result and department choices through RPCs.
revoke all on table public.employee_registry from public, anon, authenticated;
grant all on table public.employee_registry to service_role;

commit;
