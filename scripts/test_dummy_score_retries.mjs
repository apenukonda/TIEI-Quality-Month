// Read an already-completed synthetic account and retry its saved results.
// No real employee account is accepted, and tokens are never printed or saved.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const employee = process.env.DUMMY_EMPLOYEE_ID;
const passcode = process.env.DUMMY_PASSCODE;
if (employee !== '999901' || !/^\d{4}$/.test(passcode || '')) {
  throw new Error('Set DUMMY_EMPLOYEE_ID=999901 and DUMMY_PASSCODE for the synthetic QA account.');
}
const source = readFileSync(new URL('../context/supabaseClient.ts', import.meta.url), 'utf8');
const url = process.env.VITE_SUPABASE_URL || source.match(/https:\/\/[a-z]+\.supabase\.co/)[0];
const key = process.env.VITE_SUPABASE_ANON_KEY || source.match(/sb_publishable_[A-Za-z0-9_-]+/)[0];
let headers = { apikey: key, 'Content-Type': 'application/json' };
const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers, body: JSON.stringify({ email: `${employee}@quality-event.internal`, password: `${passcode}!TQM` }),
});
assert.equal(signIn.status, 200, 'Dummy login failed');
const session = await signIn.json();
headers = { ...headers, Authorization: `Bearer ${session.access_token}` };
const userId = session.user.id;
async function rows(table, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers });
  assert.equal(response.status, 200, `Read of ${table} failed`);
  return response.json();
}
async function rpc(name, body, expected = null) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const result = await response.json();
  if (expected === 'reject') {
    assert.ok(response.status >= 400, 'Invalid score write was accepted');
  } else {
    assert.equal(response.status, 200, `Score RPC ${name} failed`);
    assert.equal(result, expected, 'Retry changed the total score');
  }
}
const [profile] = await rows('profiles', `id=eq.${userId}&select=user_id,name,score`);
assert.equal(profile.user_id, employee);
assert.equal(profile.name, 'Codex Dummy QA', 'Refusing to write to any real employee');
const total = profile.score;
const tasks = await rows('user_tasks', `user_id=eq.${userId}&select=task_id,score,completed_steps&order=task_id`);
assert.deepEqual(tasks.map(task => [task.task_id, task.completed_steps]), [
  ['task1', 7], ['task3', 1], ['task4', 1], ['task5', 1], ['task6', 105],
]);
assert.equal(tasks.reduce((sum, task) => sum + task.score, 0), total);
let retries = 0;
// task6 is the server-maintained module aggregate, not a directly submitted task.
for (const task of tasks.filter(task => task.task_id !== 'task6')) {
  for (const score of [task.score, 0]) {
    await rpc('handle_task_completion', { task_id_in: task.task_id, user_id_in: userId,
      completed_steps_in: task.completed_steps, score_earned_in: score }, total);
    retries++;
  }
}
let modulePoints = 0;
for (const [name, count] of [['m1', 6], ['m2', 4], ['m3', 5]]) {
  const [progress] = await rows(`module_${name}_progress`, `user_id=eq.${userId}&select=*`);
  for (let index = 1; index <= count; index++) {
    assert.equal(progress[`task${index}_completed`], true);
    const score = progress[`task${index}_score`];
    modulePoints += score;
    for (const points of [score, 0]) {
      await rpc('update_module_task', { module_name: name, user_id_in: userId,
        task_index: index, completed: true, score: points }, total);
      retries++;
    }
  }
}
assert.equal(modulePoints, tasks.find(task => task.task_id === 'task6').score);
await rpc('update_module_task', { module_name: 'm1', user_id_in: userId, task_index: 1, completed: true, score: 8 }, 'reject');
await rpc('handle_task_completion', { task_id_in: 'task6', user_id_in: userId, completed_steps_in: 105, score_earned_in: modulePoints }, 'reject');
await rpc('handle_task_completion', { task_id_in: 'task3', user_id_in: '00000000-0000-4000-8000-000000000000', completed_steps_in: 1, score_earned_in: 5 }, 'reject');
const [after] = await rows('profiles', `id=eq.${userId}&select=score`);
const afterTasks = await rows('user_tasks', `user_id=eq.${userId}&select=task_id,score,completed_steps&order=task_id`);
assert.equal(after.score, total);
assert.deepEqual(afterTasks, tasks);
console.log(JSON.stringify({ employee, total, module_points: modulePoints, completed_video_questions: 105,
  retry_and_lower_score_writes: retries, invalid_score_rejected: true, direct_aggregate_write_rejected: true,
  wrong_owner_rejected: true, saved_totals_unchanged: true }));
