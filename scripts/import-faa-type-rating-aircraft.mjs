import fs from "node:fs";

import {
  createClient,
} from "@supabase/supabase-js";


function loadEnv(filename) {
  const result = {};

  if (!fs.existsSync(filename)) {
    return result;
  }

  for (
    const raw
    of fs
      .readFileSync(filename, "utf8")
      .split(/\r?\n/)
  ) {
    const match =
      raw.match(
        /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
      );

    if (!match) continue;

    let value =
      match[2].trim();

    if (
      (
        value.startsWith('"') &&
        value.endsWith('"')
      ) ||
      (
        value.startsWith("'") &&
        value.endsWith("'")
      )
    ) {
      value =
        value.slice(1, -1);
    }

    result[
      match[1]
    ] = value;
  }

  return result;
}


const env = {
  ...loadEnv(".env.local"),
  ...process.env,
};


const url =
  env.NEXT_PUBLIC_SUPABASE_URL ??
  env.SUPABASE_URL;

const serviceKey =
  env.SUPABASE_SERVICE_ROLE_KEY;


if (!url) {
  throw new Error(
    "Supabase URL not found."
  );
}


if (!serviceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY not found. " +
    "No database changes were made."
  );
}


const supabase =
  createClient(
    url,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );


function clean(value) {
  return String(
    value ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeRating(value) {
  const cleaned =
    clean(value)
      .toUpperCase()
      .replace(/\x02/g, "-");

  /*
    Sort multi-rating groups so:
      B-767, B-757
    matches:
      B-757; B-767
  */
  const parts =
    cleaned
      .split(/[;,]/)
      .map(
        item =>
          item
            .trim()
            .replace(/\s+/g, "")
      )
      .filter(Boolean)
      .sort();

  return parts.join(";");
}


const source =
  JSON.parse(
    fs.readFileSync(
      "data/faa-type-rating-aircraft.json",
      "utf8",
    )
  );


const {
  data: designations,
  error: designationError,
} =
  await supabase
    .from(
      "faa_type_rating_designations"
    )
    .select(
      "id, designation"
    )
    .eq(
      "is_active",
      true,
    );


if (designationError) {
  throw designationError;
}


const map =
  new Map();


for (
  const designation
  of designations ?? []
) {
  map.set(
    normalizeRating(
      designation.designation
    ),
    designation,
  );
}


const rows = [];
const unmatched = [];


for (const item of source) {

  const match =
    map.get(
      normalizeRating(
        item.type_rating_designation
      )
    );

  if (!match) {
    unmatched.push(item);
    continue;
  }


  rows.push(
    {
      type_rating_designation_id:
        match.id,

      type_certificate_holder:
        item.type_certificate_holder ??
        null,

      civil_model_designation:
        item.civil_model_designation ??
        null,

      prior_model_designation:
        item.prior_model_designation ??
        null,

      equivalent_military_designation:
        item.equivalent_military_designation ??
        null,

      sort_order:
        item.sort_order ?? 0,
    }
  );
}


console.log(
  "FAA extracted rows:",
  source.length,
);

console.log(
  "Matched rows:",
  rows.length,
);

console.log(
  "Unmatched rows:",
  unmatched.length,
);


fs.writeFileSync(
  "data/faa-type-rating-aircraft-unmatched.json",
  JSON.stringify(
    unmatched,
    null,
    2,
  )
);


if (rows.length < 100) {
  throw new Error(
    "STOPPED: fewer than 100 rows matched " +
    "faa_type_rating_designations. " +
    "Database was NOT touched."
  );
}


const {
  error: deleteError,
} =
  await supabase
    .from(
      "faa_type_rating_aircraft"
    )
    .delete()
    .not(
      "id",
      "is",
      null,
    );


if (deleteError) {
  throw deleteError;
}


for (
  let i = 0;
  i < rows.length;
  i += 200
) {
  const batch =
    rows.slice(
      i,
      i + 200,
    );


  const {
    error,
  } =
    await supabase
      .from(
        "faa_type_rating_aircraft"
      )
      .insert(batch);


  if (error) {
    throw error;
  }


  console.log(
    `Imported ${Math.min(
      i + batch.length,
      rows.length,
    )}/${rows.length}`
  );
}


const {
  count,
  error: countError,
} =
  await supabase
    .from(
      "faa_type_rating_aircraft"
    )
    .select(
      "*",
      {
        count: "exact",
        head: true,
      }
    );


if (countError) {
  throw countError;
}


console.log(
  "\nfaa_type_rating_aircraft:",
  count,
  "rows"
);
