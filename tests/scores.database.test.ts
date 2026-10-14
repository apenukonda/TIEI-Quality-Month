import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';

const userId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const migration = readFileSync(new URL('../score_updates.sql', import.meta.url), 'utf8');
const db = new PGlite();

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  await db.exec(readFileSync(new URL('../setup_database.sql', import.meta.url), 'utf8'));
  await db.exec(migration);
});

beforeEach(async () => {
  await db.exec('truncate auth.users cascade;');
  await db.query('insert into auth.users(id) values ($1), ($2)', [userId, otherId]);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
});
afterAll(() => db.close());

const task = async (id: string, points: number) => {
  const result = await db.query<{ total: number }>(
    'select public.handle_task_completion($1, $2, $3, $4) as total',
    [id, userId, id === 'task1' ? 7 : 1, points]);
  return result.rows[0].total;
};
const moduleQuiz = async (module: string, index: number, points: number) => {
  const result = await db.query<{ total: number }>(
    'select public.update_module_task($1, $2, $3, true, $4) as total',
    [module, userId, index, points]);
  return result.rows[0].total;
};

describe('persisted score totals', () => {
  it('adds module quizzes and other activities, counting the module aggregate once', async () => {
    expect(await task('task1', 5)).toBe(5);
    expect(await moduleQuiz('m1', 1, 6)).toBe(11);
    expect(await task('task3', 5)).toBe(16);
    expect(await moduleQuiz('m2', 1, 4)).toBe(20);
    const rows = await db.query('select score, completed_steps from public.user_tasks where user_id = $1 and task_id = $2', [userId, 'task6']);
    expect(rows.rows).toEqual([{ score: 10, completed_steps: 14 }]);
    const profile = await db.query<{ score: number }>('select score from public.profiles where id = $1', [userId]);
    expect(profile.rows[0].score).toBe(20);
  });

  it('does not award points twice for retries or replace a result with a stale lower score', async () => {
    await task('task1', 5);
    await moduleQuiz('m1', 1, 6);
    expect(await moduleQuiz('m1', 1, 6)).toBe(11);
    expect(await moduleQuiz('m1', 1, 2)).toBe(11);
    expect(await task('task1', 1)).toBe(11);
    expect(await moduleQuiz('m1', 2, 3)).toBe(14);
  });

  it('records completion even when all answers are incorrect', async () => {
    expect(await moduleQuiz('m3', 5, 0)).toBe(0);
    const result = await db.query('select score, completed_steps from public.user_tasks where user_id = $1 and task_id = $2', [userId, 'task6']);
    expect(result.rows).toEqual([{ score: 0, completed_steps: 7 }]);
  });

  it('updates activity timestamps for earned points while preserving them on retries', async () => {
    await task('task1', 5);
    await db.query("update public.user_tasks set updated_at = '2000-01-01' where user_id = $1", [userId]);
    await db.query("update public.profiles set updated_at = '2000-01-01' where id = $1", [userId]);
    await task('task1', 5);
    let result = await db.query<{ unchanged: boolean }>("select updated_at = '2000-01-01'::timestamptz as unchanged from public.profiles where id = $1", [userId]);
    expect(result.rows[0].unchanged).toBe(true);
    await task('task1', 6);
    result = await db.query<{ unchanged: boolean }>("select updated_at = '2000-01-01'::timestamptz as unchanged from public.profiles where id = $1", [userId]);
    expect(result.rows[0].unchanged).toBe(false);
    const progress = await db.query<{ updated: boolean }>("select updated_at > '2000-01-01'::timestamptz as updated from public.user_tasks where user_id = $1 and task_id = 'task1'", [userId]);
    expect(progress.rows[0].updated).toBe(true);
  });

  it('repairs old totals and preserves legacy points when applying the migration again', async () => {
    await db.query("insert into public.user_tasks(user_id,task_id,completed_steps,score) values ($1,'task1',7,5), ($1,'task6',14,10)", [userId]);
    await db.query('insert into public.module_m1_progress(user_id,task1_completed,task1_score,score) values ($1,true,6,0)', [userId]);
    await db.query('update public.profiles set score = 6 where id = $1', [userId]);
    await db.exec(migration);
    const result = await db.query<{ score: number }>('select score from public.profiles where id = $1', [userId]);
    expect(result.rows[0].score).toBe(15);
    expect(await moduleQuiz('m1', 2, 7)).toBe(18);
  });

  it('rejects invalid scores and module indices without changing stored results', async () => {
    await moduleQuiz('m1', 1, 4);
    await expect(moduleQuiz('m1', 1, 8)).rejects.toThrow('Invalid module quiz result');
    await expect(moduleQuiz('m2', 5, 3)).rejects.toThrow('Invalid module quiz result');
    await expect(task('task3', -1)).rejects.toThrow('Invalid task result');
    expect(await moduleQuiz('m1', 1, 4)).toBe(4);
  });

  it('rejects anonymous submissions and submissions for another user', async () => {
    await expect(db.query('select public.update_module_task($1,$2,1,true,7)', ['m1', otherId]))
      .rejects.toThrow('Please sign in');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await expect(task('task1', 7)).rejects.toThrow('Please sign in');
  });
});
