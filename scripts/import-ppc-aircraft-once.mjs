import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filename) {
  const out = {};

  if (!fs.existsSync(filename)) {
    return out;
  }

  for (const raw of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const line = raw.trim();

    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) continue;

    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[match[1]] = value;
  }

  return out;
}

const env = {
  ...loadEnv(".env.local"),
  ...process.env,
};

const url =
  env.NEXT_PUBLIC_SUPABASE_URL ??
  env.SUPABASE_URL;

const key =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("Supabase URL not found in .env.local");
}

if (!key) {
  throw new Error("Supabase publishable/anon key not found in .env.local");
}

const rows = JSON.parse(
  fs.readFileSync(
    "data/faa-type-rating-aircraft.json",
    "utf8",
  ),
);

console.log(`FAA rows ready for import: ${rows.length}`);

if (rows.length < 100) {
  throw new Error(
    "FAA extraction contains too few rows. Import stopped.",
  );
}

const supabase = createClient(
  url,
  key,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const { data, error } = await supabase.rpc(
  "import_faa_type_rating_aircraft_once",
  {
    p_secret:
      "ppc-import-20260828-7f0e4d47d2a54f42a53a8d5685d2c5e9",
    p_rows: rows,
  },
);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("\nIMPORT RESULT");
console.log(JSON.stringify(data, null, 2));

if (!data || Number(data.inserted_count ?? 0) < 100) {
  throw new Error(
    "Import returned an unexpectedly low row count.",
  );
}

console.log("\nFAA aircraft import complete.");
