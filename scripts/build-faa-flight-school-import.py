"""Build the FAA flight school import SQL from the FAA facility dashboard
"Download Crosstab" files (UTF-16, tab separated). Usage:
  python3 scripts/build-faa-flight-school-import.py DATA.sql Part141.csv [Part142.csv]
Then place DATA.sql between the head and tail of the flight school migration
(see dpe-database migration 20261101030000_faa_flight_schools.sql) as a new migration.
Each file's certificate letter decides its part (S = Part 141, X/W = Part 142).
Only agency-level contact details are kept (no accountable manager or liaison names)."""
import csv, io, re, sys

SMALL = {"of", "and", "the", "at", "for", "in", "on", "de", "a", "an", "to"}
UPPER = {"LLC", "LLP", "LP", "USA", "US", "FBO", "ATP", "CAE", "UND", "AFS", "ATS", "AA", "II", "III",
         "IV", "PC", "CFI", "FAA", "UAS", "ERAU", "TSTC", "RVA", "NE", "NW", "SE", "SW", "UTC", "LOFT", "AFG",
         "DPS", "BTA", "ADF", "AMS", "JB", "CTI", "FSI", "HAI", "IFR", "VFR", "MTSU", "SIU", "BYU", "UNO"}

ROAD = {"CT","PL","ST","RD","DR","LN","BLVD","PKWY","HWY","CIR","SQ","TRL","TER","STE","FWY","PLZ","XING"}

def title(s, address=False):
    s = re.sub(r"\s+", " ", s or "").strip()
    out = []
    for i, w in enumerate(s.split(" ")):
        core = re.sub(r"[^A-Za-z0-9]", "", w)
        if address and core.upper() in ROAD:
            out.append(core[:1].upper() + core[1:].lower() + w[len(core):] if w.startswith(core) else w.title())
        elif core.upper() in UPPER or (len(core) <= 3 and not re.search(r"[AEIOUY]", core.upper()) and core.isalpha()):
            out.append(w.upper())
        elif i > 0 and w.lower() in SMALL:
            out.append(w.lower())
        else:
            out.append("-".join(p[:1].upper() + p[1:].lower() for p in w.split("-")))
    t = " ".join(out)
    t = re.sub(r"\bMc([a-z])", lambda m: "Mc" + m.group(1).upper(), t)
    t = re.sub(r"'S\b", "'s", t)
    return t

def dbas(raw):
    """FAA DBA cells hold several 'DBA ...' lines; wrapped lines repeat the previous last word."""
    names = []
    for line in (raw or "").replace("\r", "").split("\n"):
        if not line.strip():
            continue
        if line[:1].isspace() and names:
            words = line.split()
            prev_last = names[-1].split()[-1] if names[-1].split() else ""
            if words and prev_last and words[0] == prev_last:
                words = words[1:]
            names[-1] = (names[-1] + " " + " ".join(words)).strip()
        else:
            names.append(re.sub(r"^DBA\s+", "", line.strip(), flags=re.I))
    seen, out = set(), []
    for n in names:
        n = re.sub(r"\s+", " ", n).strip(" ,")
        if n and n.lower() not in seen:
            seen.add(n.lower()); out.append(title(n))
    return out

def load(path):
    raw = open(path, "rb").read()
    text = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text), delimiter="\t"))
    return [{(k or "").strip(): (v or "").strip() if k != "DBA" else (v or "") for k, v in r.items() if k} for r in rows]

def q(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"

def arr(values):
    return "array[" + ",".join(q(v) for v in values) + "]::text[]" if values else "'{}'::text[]"

def phone(p):
    d = re.sub(r"\D", "", p or "")
    return f"({d[:3]}) {d[3:6]}-{d[6:]}" if len(d) == 10 else (p or None)

def main():
    out, files = sys.argv[1], sys.argv[2:]
    schools, locations = {}, []
    for f in files:
        for r in load(f):
            cert = r["Cert_No"].upper()
            if not cert:
                continue
            part = "141" if cert[3:4] == "S" else "142"
            loc = dict(cert=cert, code=r["DSGN_CODE"].upper(), name=title(r["Agency Name"]),
                       a1=title(r["Address Line 1"], True), a2=title(r["Address Line 2"], True), a3=title(r["Address Line 3"], True),
                       city=title(r["City"]), state=r["State/Province"].upper(), country=title(r.get("Country", "")),
                       postal=r["Postal Code"], phone=phone(r["Agency Phone Number"]), email=r["Agency Email"].lower(),
                       dba=dbas(r.get("DBA")), date=r["Update_Date"], main=r["DSGN_CODE"].upper() == cert[:4])
            locations.append(loc)
            s = schools.setdefault(cert, dict(cert=cert, part=part, locs=[]))
            s["locs"].append(loc)
    lines = []
    for cert, s in sorted(schools.items()):
        main = next((l for l in s["locs"] if l["main"]), s["locs"][0])
        allnames = []
        for l in s["locs"]:
            for d in l["dba"]:
                if d not in allnames:
                    allnames.append(d)
        m, d = main["date"].split("/")[0:2], main["date"]
        mm, dd, yy = d.split("/")
        lines.append("(" + ",".join([q(cert), q(s["part"]), q(main["name"]), arr(allnames), q(main["a1"]),
                     q(", ".join(x for x in [main["a2"], main["a3"]] if x) or None), q(main["city"]), q(main["state"]),
                     q(main["postal"]), q(main["phone"]), q(main["email"]), q(f"{yy}-{mm}-{dd}")]) + ")")
    loc_lines = []
    for l in locations:
        loc_lines.append("(" + ",".join([q(l["cert"]), q(l["code"]), q(l["name"]), arr(l["dba"]), q(l["a1"]),
                         q(", ".join(x for x in [l["a2"], l["a3"]] if x) or None), q(l["city"]), q(l["state"]),
                         q(l["postal"]), q(l["country"]), q(l["phone"]), q(l["email"]), "true" if l["main"] else "false"]) + ")")
    with open(out, "w") as fh:
        fh.write("insert into faa_school_import (faa_certificate_number, faa_part, faa_agency_name, dba_names, address_line_1, address_line_2, city, state, postal_code, phone, email, faa_update_date) values\n")
        fh.write(",\n".join(lines) + ";\n\n")
        fh.write("insert into faa_location_import (faa_certificate_number, faa_designator_code, name, dba_names, address_line_1, address_line_2, city, state, postal_code, country, phone, email, is_main_base) values\n")
        fh.write(",\n".join(loc_lines) + ";\n")
    print(len(schools), "schools,", len(locations), "locations", file=sys.stderr)

main()
