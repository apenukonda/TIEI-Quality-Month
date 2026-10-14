# Employee registration

The active employee workbook contains 1,637 employees across 67 values of
`Curr.Departmentsname`. All 12 source columns are stored in `public.employee_registry`.
Employee numbers, manager numbers, and department numbers stay as text, preserving
leading zeros. `department` comes from **Curr.Departmentsname**, not the department
group or designation.

Signup asks for Employee ID, Department, Passcode, and Confirm Passcode. Department
choices come from the database. Employee ID and Department must match the same
roster row. Missing or mismatched records display exactly:

> Please contact the admin

The backend validates the pair again before Auth creates an account. It fills the
profile's name, designation, and canonical department from the matched record.
New accounts always receive the `user` role. Existing accounts and scores are
unchanged. Matching ignores case and excess whitespace in department names;
employee numbers retain leading zeros and are otherwise matched exactly.

Clients cannot read or modify the roster. The two public registration RPCs return
only a boolean match and department names. Their intentionally anonymous execution
supports signup before login. The Auth trigger is in the private schema and is not
callable by clients. Employee records and generated import SQL must stay out of Git.

## Importing a new workbook

1. Apply `employee_registry.sql` for a new installation, after `setup_database.sql`.
2. Run `scripts/import_employees.py` with the workbook path and `--output-dir`
   pointing outside this repository. The script requires Python with openpyxl.
   It rejects missing fields, duplicate employee numbers, and numeric employee IDs
   whose leading zeros could be lost.
3. Run `node scripts/verify_employee_import.mjs <manifest.json>` to verify every
   imported field and that re-importing creates no duplicates.
4. Apply the generated SQL batches through an authorized database connection.
   Imports update existing employees by employee number and do not delete rows.
5. Apply `employee_registration.sql` after a successful initial import.

`npm test` verifies matching, role permissions, backend rejection, profile identity,
and the simplified form. `tests/verify_registration_live.sql` checks the deployed
anonymous RPC and Auth trigger, and rolls back all temporary test writes. Local
tests run the trigger as `supabase_auth_admin`; that managed role cannot be assumed
by the remote MCP connection. The API check also verifies rejection through Auth.

The roster and enforcement have been applied to project `paysoqcytmymbkglhasy`:

- `20261014145212`: create employee registry.
- `20261014145333`: enforce employee/department registration.

All 1,637 live rows were reconciled against all source fields with zero differences.
The live API accepts valid pairs and rejects mixed-row/unknown pairs. A direct Auth
signup for an unknown employee returns `Please contact the admin` with SQLSTATE
`23514`; no test account was created. Transaction-only profile checks were rolled
back. The 14 existing profiles and their total score of 28 were preserved.

Supabase advisors were reviewed. The new public function notices are intentional
pre-login endpoints returning only a match or department names. The roster has no
client policies and client grants are revoked; no employee rows are exposed.

The frontend changes are local until the code is pushed and deployed.
