"""Build the FAA FSTD import SQL from the FAA National Simulator Program "Active FSTD" Excel file.
Usage: python3 scripts/build-faa-fstd-import.py DATA.sql Active_FSTD.xlsx
Then place DATA.sql between the head and tail of the FSTD migration
(see dpe-database migration 20261101040000_faa_fstds.sql) as a new migration."""
import re, sys
import openpyxl

def q(v):
    if v is None or str(v).strip() == "":
        return "null"
    return "'" + re.sub(r"\s+", " ", str(v)).strip().replace("'", "''") + "'"

def main():
    out, path = sys.argv[1], sys.argv[2]
    ws = openpyxl.load_workbook(path, read_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h or "").strip().lower() for h in rows[0]]
    col = {name: head.index(name) for name in ["company name", "make,model,series", "status", "faa id", "city", "fstd level", "qualification standard"]}
    seen, values = set(), []
    for r in rows[1:]:
        fid = r[col["faa id"]]
        if fid is None or str(fid).strip() == "":
            continue
        fid = int(fid)
        if fid in seen:
            continue
        seen.add(fid)
        values.append("(" + ",".join([str(fid), q(r[col["company name"]]), q(r[col["make,model,series"]]), q(r[col["status"]]),
                                      q(r[col["city"]]), q(r[col["fstd level"]]), q(r[col["qualification standard"]])]) + ")")
    with open(out, "w") as fh:
        fh.write("insert into faa_fstd_import (faa_id, company_name, make_model_series, status, city, level, qualification_standard) values\n")
        fh.write(",\n".join(values) + ";\n")
    print(len(values), "devices", file=sys.stderr)

main()
