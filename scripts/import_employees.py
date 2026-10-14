"""Read the HR workbook and prepare private SQL batches for a database import.

Requires openpyxl. Keep --output-dir outside the repository; outputs contain HR data.
Apply employee_registry.sql first, then the batches, then employee_registration.sql.
"""
import argparse
from collections import Counter
from datetime import date, datetime
import hashlib
import json
from pathlib import Path
import re

import openpyxl


COLUMNS = [
    ("Employee Number", "employee_number"),
    ("Employee Name", "employee_name"),
    ("Curr.Grade", "grade"),
    ("Curr.Designation", "designation"),
    ("Date-Of-Joining", "date_of_joining"),
    ("Manager Employee No", "manager_employee_number"),
    ("Manager Employee Name", "manager_employee_name"),
    ("Curr.Departmentgroups", "department_group"),
    ("Curr.Departmentsname", "department"),
    ("Curr.Divisions", "division"),
    ("Curr.Departmentsno", "department_number"),
    ("Gender", "gender"),
]


def extract(source):
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    try:
        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)
        for row_number, row in enumerate(rows, 1):
            if "Employee Number" in row and "Curr.Departmentsname" in row:
                positions = {str(value): index for index, value in enumerate(row) if value is not None}
                break
        else:
            raise ValueError("Employee header row was not found.")
        missing = [header for header, _ in COLUMNS if header not in positions]
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        records = []
        for row_number, row in enumerate(rows, row_number + 1):
            if not any(value is not None for value in row):
                continue
            record = {}
            for header, column in COLUMNS:
                value = row[positions[header]]
                if column == "date_of_joining":
                    if isinstance(value, (datetime, date)):
                        value = value.date().isoformat() if isinstance(value, datetime) else value.isoformat()
                    elif value:
                        value = date.fromisoformat(str(value).split(" ")[0]).isoformat()
                elif value is not None:
                    value = str(value).strip()
                record[column] = value
            if not isinstance(row[positions["Employee Number"]], str):
                raise ValueError(f"Employee number at row {row_number} must be text to preserve leading zeros.")
            if not re.fullmatch(r"[0-9]{1,6}", record["employee_number"] or ""):
                raise ValueError(f"Invalid employee number at row {row_number}.")
            if not record["employee_name"] or not record["department"]:
                raise ValueError(f"Missing employee name or department at row {row_number}.")
            record.update(source_file=source.name, source_row=row_number)
            records.append(record)
        duplicates = [key for key, count in Counter(r["employee_number"] for r in records).items() if count > 1]
        if duplicates:
            raise ValueError(f"Duplicate employee numbers found: {len(duplicates)}; import stopped.")
        if not records:
            raise ValueError("Workbook contains no employee records.")
        return sheet.title, records
    finally:
        workbook.close()


def sql_batch(records):
    columns = [column for _, column in COLUMNS] + ["source_file", "source_row"]
    types = ", ".join(f"{column} {'date' if column == 'date_of_joining' else 'integer' if column == 'source_row' else 'text'}" for column in columns)
    names = ", ".join(columns)
    updates = ", ".join(f"{column} = excluded.{column}" for column in columns if column != "employee_number")
    payload = json.dumps(records, ensure_ascii=True, separators=(",", ":")).replace("'", "''")
    return f"""insert into public.employee_registry ({names})
select {names} from jsonb_to_recordset('{payload}'::jsonb) as employee({types})
on conflict (employee_number) do update set {updates}, imported_at = now();
select count(*) as imported_rows from public.employee_registry;
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=400)
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be positive")
    repository = Path(__file__).resolve().parents[1]
    output = args.output_dir.resolve()
    if output == repository or repository in output.parents:
        parser.error("--output-dir must be outside the repository to keep HR data out of Git")
    sheet, records = extract(args.source)
    output.mkdir(parents=True, exist_ok=True)
    batches = []
    for start in range(0, len(records), args.batch_size):
        path = output / f"employees-{start // args.batch_size + 1:03d}.sql"
        path.write_text(sql_batch(records[start:start + args.batch_size]), encoding="utf-8")
        batches.append(str(path))
    manifest = {"source": args.source.name, "sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
                "sheet": sheet, "employees": len(records),
                "departments": sorted(set(r["department"] for r in records)), "batches": batches}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"employees": len(records), "departments": len(manifest["departments"]), "batches": len(batches), "output_dir": str(output)}))


if __name__ == "__main__":
    main()
