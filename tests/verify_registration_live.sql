-- Checks the anonymous RPC and deployed Auth trigger. Every test write rolls back.
-- Supabase's managed Auth role cannot be assumed by the MCP database connection;
-- Auth-role execution is covered by registration.database.test.ts and the API check.
begin;
savepoint registration_verification;
do $verify$
declare
  employee public.employee_registry%rowtype;
  different_department text;
  test_user uuid := gen_random_uuid();
  profile public.profiles%rowtype;
begin
  select e.* into employee from public.employee_registry e
  where not exists(select 1 from auth.users u where u.email = e.employee_number || '@quality-event.internal')
  order by e.employee_number limit 1;
  if not found then raise exception 'No unused employee is available for transaction-only verification'; end if;
  select department into different_department from public.employee_registry
  where department_key <> employee.department_key limit 1;

  execute 'set local role anon';
  if public.employee_registration_matches(employee.employee_number, employee.department) is distinct from true then
    raise exception 'Valid registration pair was rejected';
  end if;
  if public.employee_registration_matches(employee.employee_number, different_department) is distinct from false then
    raise exception 'Fields from different rows were accepted';
  end if;
  if public.employee_registration_matches(null, null) is distinct from false then
    raise exception 'Missing registration fields were accepted';
  end if;
  if cardinality(public.get_registration_departments()) <> 67 then
    raise exception 'Department list does not match this workbook';
  end if;
  begin
    perform 1 from public.employee_registry limit 1;
    raise exception 'Anonymous roster read was allowed';
  exception when insufficient_privilege then null;
  end;

  execute 'reset role';
  begin
    insert into auth.users(id,email,raw_user_meta_data) values
      (test_user, employee.employee_number || '@quality-event.internal',
       jsonb_build_object('userId',employee.employee_number,'department',different_department));
    raise exception 'Auth accepted a mismatched registration';
  exception when check_violation then
    if sqlerrm <> 'Please contact the admin' then raise; end if;
  end;
  insert into auth.users(id,email,raw_user_meta_data) values
    (test_user, employee.employee_number || '@quality-event.internal',
     jsonb_build_object('userId',employee.employee_number,'department',employee.department,
                        'name','Forged name','designation','Forged designation','role','admin'));
  execute 'reset role';
  select * into profile from public.profiles where id=test_user;
  if profile.name is distinct from employee.employee_name
     or profile.designation is distinct from employee.designation
     or profile.department is distinct from btrim(employee.department)
     or profile.user_id is distinct from employee.employee_number
     or profile.role is distinct from 'user' then
    raise exception 'Profile did not use verified employee data';
  end if;
end;
$verify$;
rollback to savepoint registration_verification;
commit;
select 'passed; all test writes rolled back' as registration_verification;
