-- Run through the Supabase SQL Editor or administrative execute_sql tool.
-- Every test record is discarded through the inner exception/savepoint.
-- Unexpected failures abort the statement and also discard test records.
do $$
declare
  test_user uuid := gen_random_uuid();
  stored_total int;
  stored_steps int;
  stored_module_score int;
begin
  begin
    insert into auth.users (id, raw_user_meta_data)
      values (test_user, jsonb_build_object('userId', 'score-check-' || test_user::text, 'name', 'Temporary score validation'));
    perform set_config('request.jwt.claim.sub', test_user::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', test_user::text, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    if public.handle_task_completion('task1', test_user, 7, 5) <> 5 then
      raise exception 'MD quiz score was not saved';
    end if;
    if public.update_module_task('m1', test_user, 1, true, 6) <> 11 then
      raise exception 'Module and MD scores were not added correctly';
    end if;
    if public.update_module_task('m1', test_user, 1, true, 6) <> 11
       or public.update_module_task('m1', test_user, 1, true, 2) <> 11 then
      raise exception 'A repeated submission changed the earned total';
    end if;
    if public.update_module_task('m2', test_user, 1, true, 4) <> 15 then
      raise exception 'A second module quiz was not added correctly';
    end if;
    if public.handle_task_completion('task3', test_user, 1, 0) <> 15 then
      raise exception 'Other activity points were omitted';
    end if;
    if public.update_module_task('m3', test_user, 5, true, 0) <> 20 then
      raise exception 'A zero-point quiz changed the earned total';
    end if;

    select score into stored_total from public.profiles where id = test_user;
    select score, completed_steps into stored_module_score, stored_steps
      from public.user_tasks where user_id = test_user and task_id = 'task6';
    if stored_total is distinct from 20 or stored_module_score is distinct from 10
       or stored_steps is distinct from 21 then
      raise exception 'Stored totals or completion progress are incorrect';
    end if;

    begin
      perform public.update_module_task('m1', gen_random_uuid(), 1, true, 7);
      raise exception 'A submission for another user was accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.update_module_task('m1', test_user, 1, true, 8);
      raise exception 'An invalid quiz score was accepted';
    exception when invalid_parameter_value then null;
    end;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);
    begin
      perform public.handle_task_completion('task1', test_user, 7, 7);
      raise exception 'A submission without an authenticated user was accepted';
    exception when insufficient_privilege then null;
    end;

    -- Roll back all test inserts, score updates, role changes, and JWT claims.
    raise exception using errcode = 'P7777', message = 'Discard completed score validation';
  exception when sqlstate 'P7777' then null;
  end;
end;
$$;

select 'passed' as score_read_write_validation;
