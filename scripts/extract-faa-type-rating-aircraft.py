from pathlib import Path
import json
import re

TEXT = Path("/tmp/faa-type-ratings.txt")
OUT = Path("data/faa-type-rating-aircraft.json")

raw = TEXT.read_text(
    encoding="utf-8",
    errors="ignore",
)

raw = (
    raw.replace("\x02", "-")
       .replace("\u00ad", "")
       .replace("\xa0", " ")
)

lines = raw.splitlines()


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def looks_like_rating(s):
    s = clean(s)

    if not s:
        return False

    if len(s) > 60:
        return False

    if re.search(
        r"\b(?:FIGURE|DESIGNATION|CURRENT|HOLDER|CIVIL|MODEL|PRIOR|EQUIVALENT|MILITARY|FAA ORDER|CHAPTER|SECTION|NONE)\b",
        s.upper(),
    ):
        return False

    # FAA type ratings generally contain compact alphanumeric
    # designations such as A-320, B-737, DC-6, CL-65, etc.
    return bool(
        re.fullmatch(
            r"[A-Z0-9][A-Z0-9\-\/ ;,\.]*",
            s.upper(),
        )
    )


records = []
current_holder = None

# pdftotext -layout preserves the columns reasonably well.
#
# We use large runs of spaces as column separators.
for line_number, raw_line in enumerate(lines, start=1):

    line = raw_line.rstrip()

    if not line.strip():
        continue

    upper = line.upper()

    if (
        "FIGURE 5-88" in upper
        or "TYPE CERTIFICATE" in upper
        or "CIVIL MODEL" in upper
        or "PRIOR MODEL" in upper
        or "EQUIVALENT" in upper
        or "CURRENT TYPE" in upper
        or "FAA ORDER 8900.1" in upper
    ):
        continue

    cols = [
        clean(x)
        for x in re.split(r"\s{2,}", line.strip())
        if clean(x)
    ]

    if len(cols) < 2:
        continue

    # Rating designation should normally be the final column.
    rating = cols[-1]

    if not looks_like_rating(rating):
        continue

    # Skip entries that clearly only say None.
    if rating.upper() == "NONE":
        continue

    # Most usable rows are either:
    #
    # holder | civil | prior | military | rating
    # civil  | prior | military | rating
    #
    # due to wrapped / continued holder cells.
    if len(cols) >= 5:
        holder = cols[0]
        civil = cols[1]
        prior = cols[2]
        military = " ".join(cols[3:-1])

        current_holder = holder

    elif len(cols) == 4:
        holder = current_holder
        civil = cols[0]
        prior = cols[1]
        military = cols[2]

    elif len(cols) == 3:
        holder = current_holder
        civil = cols[0]
        prior = None
        military = cols[1]

    else:
        continue

    holder = clean(holder)
    civil = clean(civil)
    prior = clean(prior)
    military = clean(military)
    rating = clean(rating)

    if not civil:
        continue

    # Strip literal "None" placeholders from FAA.
    if prior.lower() == "none":
        prior = ""

    if military.lower() == "none":
        military = ""

    records.append(
        {
            "type_certificate_holder":
                holder or None,

            "civil_model_designation":
                civil or None,

            "prior_model_designation":
                prior or None,

            "equivalent_military_designation":
                military or None,

            "type_rating_designation":
                rating,

            "source_line":
                line_number,
        }
    )


# Deduplicate exact records.
deduped = []
seen = set()

for row in records:
    key = (
        row["type_certificate_holder"],
        row["civil_model_designation"],
        row["prior_model_designation"],
        row["equivalent_military_designation"],
        row["type_rating_designation"],
    )

    if key in seen:
        continue

    seen.add(key)

    row["sort_order"] = (
        len(deduped) + 1
    ) * 10

    deduped.append(row)


OUT.write_text(
    json.dumps(
        deduped,
        indent=2,
        ensure_ascii=False,
    )
)

print(
    f"Parsed {len(deduped)} unique FAA aircraft/type-rating rows."
)


ratings = {
    row["type_rating_designation"]
    for row in deduped
}

print("\nRecognized sample type ratings:")

for needle in [
    "A-320",
    "A-330",
    "B-737",
    "B-757, B-767",
    "B-767, B-757",
    "DC-6, DC-7",
]:
    matches = [
        value
        for value in ratings
        if needle in value
    ]

    print(
        f"{needle}:",
        matches[:5],
    )


if len(deduped) < 100:
    raise SystemExit(
        "STOPPED: fewer than 100 FAA aircraft records "
        "were parsed. Database was NOT touched."
    )


required_groups = [
    ("A-320",),
    ("A-330",),
    ("B-737",),
    ("B-757", "B-767"),
    ("DC-6",),
]

missing = []

for group in required_groups:
    found = False

    for rating in ratings:
        if any(
            needle in rating
            for needle in group
        ):
            found = True
            break

    if not found:
        missing.append(group)


if missing:
    raise SystemExit(
        "STOPPED: expected FAA type ratings were missing: "
        + repr(missing)
    )


print(
    "\nFAA extraction passed validation."
)
print(
    f"Wrote {OUT}"
)
