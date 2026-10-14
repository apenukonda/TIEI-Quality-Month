// Verify public registration endpoints without creating a real employee account.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const source = readFileSync(new URL('../context/supabaseClient.ts', import.meta.url), 'utf8');
const url = process.env.VITE_SUPABASE_URL || source.match(/https:\/\/[a-z]+\.supabase\.co/)[0];
const key = process.env.VITE_SUPABASE_ANON_KEY || source.match(/sb_publishable_[A-Za-z0-9_-]+/)[0];
const headers = { apikey: key, 'Content-Type': 'application/json' };
const employees = [];
for (const batch of manifest.batches) {
  const sql = readFileSync(batch, 'utf8');
  const marker = "jsonb_to_recordset('";
  employees.push(...JSON.parse(sql.slice(sql.indexOf(marker) + marker.length, sql.indexOf("'::jsonb)")).replaceAll("''", "'")));
}
const employee = employees[0];
const otherDepartment = manifest.departments.find(department => department !== employee.department);
const numbers = new Set(employees.map(record => record.employee_number));
let missing = '000000';
while (numbers.has(missing)) missing = String(Number(missing) + 1).padStart(6, '0');
async function rpc(name, body = {}) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  assert.equal(response.status, 200, `RPC ${name} did not return success`);
  return response.json();
}
const matches = (number, department) => rpc('employee_registration_matches', { p_employee_number: number, p_department: department });
assert.equal(await matches(employee.employee_number, employee.department), true);
assert.equal(await matches(employee.employee_number, otherDepartment), false);
assert.equal(await matches(missing, employee.department), false);
const departments = await rpc('get_registration_departments');
assert.deepEqual(departments, manifest.departments);
const roster = await fetch(`${url}/rest/v1/employee_registry?select=employee_number&limit=1`, { headers });
assert.ok([401, 403].includes(roster.status), 'Anonymous roster reads must be denied');
const signup = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST', headers,
  body: JSON.stringify({ email: `${missing}@quality-event.internal`, password: randomBytes(24).toString('base64url') + '!aA1',
    data: { userId: missing, department: employee.department } }),
});
const rejection = await signup.json();
assert.equal(signup.status, 500, 'Auth must reject the missing employee before saving the account');
assert.equal(rejection.code, '23514');
assert.equal(rejection.msg || rejection.message || '', 'Please contact the admin');
console.log(JSON.stringify({ valid_pair: true, mismatched_pair_rejected: true, unknown_employee_rejected: true,
  departments: departments.length, anonymous_roster_read_status: roster.status, auth_signup_rejected_status: signup.status }));
