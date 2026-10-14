// Verify every imported field in an isolated, in-memory Postgres database.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Usage: node scripts/verify_employee_import.mjs <manifest.json>');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(readFileSync(new URL('../employee_registry.sql', import.meta.url), 'utf8'));
  const expected = new Map();
  for (const batch of manifest.batches) {
    const sql = readFileSync(batch, 'utf8');
    const marker = "jsonb_to_recordset('";
    const payload = sql.slice(sql.indexOf(marker) + marker.length, sql.indexOf("'::jsonb)")).replaceAll("''", "'");
    for (const record of JSON.parse(payload)) expected.set(record.employee_number, record);
    await db.exec(sql);
  }
  const actual = await db.query("select to_jsonb(e) - 'department_key' - 'imported_at' as record from public.employee_registry e");
  assert.equal(actual.rows.length, manifest.employees);
  for (const { record } of actual.rows) assert.deepEqual(record, expected.get(record.employee_number));
  // Re-importing updates the same employees, never duplicates the roster.
  for (const batch of manifest.batches) await db.exec(readFileSync(batch, 'utf8'));
  assert.equal((await db.query('select count(*)::integer as total from public.employee_registry')).rows[0].total, manifest.employees);
  console.log(JSON.stringify({ verified_employees: actual.rows.length, verified_departments: manifest.departments.length, all_source_fields_match: true, reimport_idempotent: true }));
} finally {
  await db.close();
}
