import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const db = new PGlite();
const userId = '33333333-3333-4333-8333-333333333333';

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create role supabase_auth_admin;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to supabase_auth_admin;
    grant insert on auth.users to supabase_auth_admin;
  `);
  await db.exec(readFileSync(new URL('../setup_database.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../employee_registry.sql', import.meta.url), 'utf8'));
  // Fixture users existed before registration enforcement was enabled.
  await db.query('insert into auth.users(id) values ($1)', [userId]);
  await db.exec(readFileSync(new URL('../employee_registration.sql', import.meta.url), 'utf8'));
});

beforeEach(async () => {
  await db.exec('reset role; truncate auth.users cascade; truncate public.employee_registry;');
  await db.exec(`insert into public.employee_registry(employee_number,employee_name,department,designation,source_file,source_row)
    values ('00001','Test Employee A','INFORMATION SYSTEMS','ENGINEER','fixture.xlsx',3),
           ('00002','Test Employee B','TNGA - HEAD','TRAINEE','fixture.xlsx',4);`);
});
afterAll(() => db.close());

async function matches(number: string | null, department: string | null) {
  const result = await db.query<{ allowed: boolean }>('select public.employee_registration_matches($1,$2) as allowed', [number, department]);
  return result.rows[0].allowed;
}
async function signup(metadata: Record<string, unknown>) {
  await db.query('insert into auth.users(id,raw_user_meta_data) values ($1,$2::jsonb)', [userId, JSON.stringify(metadata)]);
}

describe('employee registration rules', () => {
  it('requires employee number and department from the same row', async () => {
    expect(await matches('00001', 'INFORMATION SYSTEMS')).toBe(true);
    expect(await matches('00001', 'TNGA - HEAD')).toBe(false);
    expect(await matches('987654', 'INFORMATION SYSTEMS')).toBe(false);
    expect(await matches(null, null)).toBe(false);
  });
  it('preserves leading zeros and tolerates case and harmless surrounding whitespace', async () => {
    expect(await matches(' 00001 ', ' information   systems ')).toBe(true);
    expect(await matches('1', 'INFORMATION SYSTEMS')).toBe(false);
  });
  it('returns department choices without employee details', async () => {
    await db.exec('set role anon;');
    const result = await db.query<{ departments: string[] }>('select public.get_registration_departments() as departments');
    expect(result.rows[0].departments).toEqual(['INFORMATION SYSTEMS', 'TNGA - HEAD']);
    expect(await matches('00001', 'INFORMATION SYSTEMS')).toBe(true);
  });
  it('denies direct roster reads and writes for clients', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role};`);
      await expect(db.query('select * from public.employee_registry')).rejects.toThrow('permission denied');
      await expect(db.query("update public.employee_registry set department='FORGED'")).rejects.toThrow('permission denied');
      await db.exec('reset role;');
    }
  });
  it('blocks direct Auth insert with a mismatched department atomically', async () => {
    await db.exec('set role supabase_auth_admin;');
    await expect(signup({ userId: '00001', department: 'TNGA - HEAD' })).rejects.toThrow('Please contact the admin');
    await db.exec('reset role;');
    expect((await db.query('select count(*)::integer as total from auth.users')).rows).toEqual([{ total: 0 }]);
    expect((await db.query('select count(*)::integer as total from public.profiles')).rows).toEqual([{ total: 0 }]);
  });
  it('blocks missing employee metadata and an unknown number', async () => {
    await expect(signup({})).rejects.toThrow('Please contact the admin');
    await expect(signup({ userId: '987654', department: 'INFORMATION SYSTEMS' })).rejects.toThrow('Please contact the admin');
  });
  it('creates a profile with roster name and designation despite forged metadata', async () => {
    await db.exec('set role supabase_auth_admin;');
    await signup({ userId: ' 00001 ', department: ' information systems ', name: 'Forged', designation: 'Forged', role: 'admin' });
    await db.exec('reset role;');
    const profile = await db.query('select user_id,name,department,designation,role,score from public.profiles where id=$1', [userId]);
    expect(profile.rows).toEqual([{ user_id: '00001', name: 'Test Employee A', department: 'INFORMATION SYSTEMS', designation: 'ENGINEER', role: 'user', score: 0 }]);
  });
  it('does not alter existing profiles when installing the registration rule', async () => {
    await signup({ userId: '00001', department: 'INFORMATION SYSTEMS' });
    await db.query("update public.profiles set name='Existing',score=15,role='admin' where id=$1", [userId]);
    await db.exec(readFileSync(new URL('../employee_registration.sql', import.meta.url), 'utf8'));
    expect((await db.query('select name,score,role from public.profiles where id=$1', [userId])).rows)
      .toEqual([{ name: 'Existing', score: 15, role: 'admin' }]);
  });
});
