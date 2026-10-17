#!/usr/bin/env node
/*
 * DPE EMS / EMT boundary guard.
 *
 * Identical copy in every DPE repository. The repository's role is read from
 * the `.dpe-system` file at its root: EMS | EMT-WEB | EMT-IPAD | DATABASE.
 * The rules implement BOUNDARY.md. Change both together, in every repo.
 *
 * Usage: node scripts/check-boundary.mjs        (exit 1 on any violation)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const system = existsSync(join(root, ".dpe-system"))
  ? readFileSync(join(root, ".dpe-system"), "utf8").trim()
  : "";

if (!["EMS", "EMT-WEB", "EMT-IPAD", "DATABASE"].includes(system)) {
  console.error("check-boundary: missing or unknown .dpe-system file.");
  process.exit(1);
}

/* ---------------- Ownership (mirrors BOUNDARY.md) ---------------- */

// Tables EMT owns and may write. EMS may only READ these (records/history).
const EMT_TABLES = [
  "practical_tests",
  "practical_test_grades",
  "practical_test_reports",
  "ppc_8410_documents",
];
const EMT_BUCKETS = ["practical-test-reports", "ppc-8410-documents"];

// EMS-owned data EMT may READ (the published EMS -> EMT interface).
const EMT_READABLE_EMS_TABLES = [
  "generated_plan_of_actions",
  "generated_plan_of_action_questions",
  "generated_plan_of_action_flight_tasks",
  "generated_plan_of_action_triggers",
  "examiner_plan_of_actions",
  "practical_test_types",
  "examiner_designee_profiles",
];

// The only database functions EMT may call.
const EMT_RPC_ALLOWLIST = [
  // EMS -> EMT (read)
  "examiner_get_emt_appointments",
  "examiner_get_practical_test_offerings",
  "examiner_get_type_rating_poa_questions",
  // EMT grading session (EMT-owned)
  "examiner_get_ppc_evaluation",
  "examiner_save_ppc_evaluation",
  "examiner_get_ppc_8410_packet",
  // EMT -> EMS result handoff
  "examiner_submit_emt_practical_test",
  "examiner_finalize_emt_practical_test",
  "examiner_complete_ppc_event",
  "examiner_finalize_ppc_8410",
];

// Grading functions EMS must never call.
const EMS_RPC_DENYLIST = EMT_RPC_ALLOWLIST.filter(
  (name) =>
    ![
      "examiner_get_emt_appointments",
      "examiner_get_practical_test_offerings",
      "examiner_get_type_rating_poa_questions",
    ].includes(name),
);

/* ---------------- File walking ---------------- */

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", ".netlify", "build", "DerivedData",
  ".xcode-packages", ".swiftpm", "docs",
]);
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts|swift)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, out);
    else out.push(relative(root, path));
  }
  return out;
}

const files = walk(root);
const codeFiles = files.filter(
  (file) => CODE_EXT.test(file) && !file.endsWith("check-boundary.mjs"),
);
const violations = [];
const fail = (file, message) => violations.push(`${file}: ${message}`);

/* ---------------- Code analysis ---------------- */

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

function rpcCalls(text) {
  const calls = [];
  const re = /\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g;
  for (let m; (m = re.exec(text)); ) calls.push({ name: m[1], index: m.index });
  return calls;
}

// `.from("name")` calls with whether the following query chain writes.
function fromCalls(text) {
  const calls = [];
  const re = /\.from\(\s*["'`]([a-zA-Z0-9_-]+)["'`]\s*\)/g;
  for (let m; (m = re.exec(text)); ) {
    const rest = text.slice(re.lastIndex);
    const next = rest.search(/\.from\(/);
    const chain = rest.slice(0, next === -1 ? 1500 : Math.min(next, 1500));
    const write = /\.(insert|update|upsert|delete|upload|remove|move|copy)\(/.test(chain);
    calls.push({ name: m[1], index: m.index, write });
  }
  return calls;
}

for (const file of codeFiles) {
  const text = readFileSync(join(root, file), "utf8");

  if (system === "EMS") {
    for (const call of rpcCalls(text)) {
      if (EMS_RPC_DENYLIST.includes(call.name)) {
        fail(`${file}:${lineOf(text, call.index)}`,
          `EMS calls grading function ${call.name}() — grading belongs to EMT.`);
      }
    }
    for (const call of fromCalls(text)) {
      const emtData = EMT_TABLES.includes(call.name) || EMT_BUCKETS.includes(call.name);
      if (emtData && call.write) {
        fail(`${file}:${lineOf(text, call.index)}`,
          `EMS writes EMT-owned "${call.name}". EMS may only read evaluation results.`);
      }
    }
  }

  if (system === "EMT-WEB" || system === "EMT-IPAD") {
    for (const call of rpcCalls(text)) {
      if (!EMT_RPC_ALLOWLIST.includes(call.name)) {
        fail(`${file}:${lineOf(text, call.index)}`,
          `EMT calls ${call.name}(), which is not an EMT interface function. ` +
          `Scheduling, POA building, records and admin belong to EMS.`);
      }
    }
    for (const call of fromCalls(text)) {
      if (EMT_TABLES.includes(call.name) || EMT_BUCKETS.includes(call.name)) continue;
      if (/^[a-z0-9_]+$/.test(call.name) && !EMT_READABLE_EMS_TABLES.includes(call.name)) {
        if (!/[_]/.test(call.name) && !call.write) continue; // not a table name (e.g. Array.from)
        fail(`${file}:${lineOf(text, call.index)}`,
          `EMT touches "${call.name}", which is not part of the EMS -> EMT interface.`);
      } else if (EMT_READABLE_EMS_TABLES.includes(call.name) && call.write) {
        fail(`${file}:${lineOf(text, call.index)}`,
          `EMT writes EMS-owned "${call.name}". EMT may only read POA and schedule data.`);
      }
    }
  }
}

/* ---------------- Structure rules ---------------- */

const has = (prefix) => files.some((f) => f === prefix || f.startsWith(prefix + "/"));

if (system !== "DATABASE" && has("supabase/migrations")) {
  fail("supabase/migrations", "Database migrations belong in the dpe-database project only.");
}

if (system === "EMS") {
  if (has("public/ems")) fail("public/ems", "Grading app code must not live in EMS (it is dpe-emt-web).");
  for (const f of files) {
    if (/^app\/(.+\/)?ppc(\/|$)/.test(f)) fail(f, "PPC grading screens belong to EMT.");
    if (/^(app|components|lib)\/.*grad(e|ing)[^/]*\.(tsx?|jsx?)$/i.test(f)) {
      fail(f, "Grading UI/logic belongs to EMT.");
    }
  }
}

if (system === "EMT-IPAD" && has("WebAppReference")) {
  fail("WebAppReference", "Copies of other systems' code are not kept in EMT.");
}

if (system === "EMT-WEB" || system === "EMT-IPAD") {
  for (const f of files) {
    if (/(plan-of-action|scheduling|availability|admin)/i.test(f) && CODE_EXT.test(f)) {
      fail(f, "Scheduling / POA-building / admin code belongs to EMS.");
    }
  }
}

if (system === "DATABASE") {
  const dir = join(root, "supabase/migrations");
  const baselineFile = join(root, "supabase/.baseline-migrations.txt");
  const baseline = new Set(
    existsSync(baselineFile)
      ? readFileSync(baselineFile, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
      : [],
  );
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    if (!name.endsWith(".sql") || baseline.has(name)) continue;
    const head = readFileSync(join(dir, name), "utf8").split("\n").slice(0, 5).join("\n");
    if (!/^--\s*owner:\s*(EMS|EMT|SHARED)\b/im.test(head)) {
      fail(`supabase/migrations/${name}`,
        'New migrations must start with "-- owner: EMS", "-- owner: EMT" or "-- owner: SHARED" (see BOUNDARY.md).');
    }
  }
}

/* ---------------- Report ---------------- */

if (violations.length) {
  console.error(`\nDPE boundary check FAILED for ${system} (${violations.length}):\n`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error("\nSee BOUNDARY.md. EMS = scheduling, POAs, records, admin. EMT = grading only.\n");
  process.exit(1);
}

console.log(`DPE boundary check passed for ${system} (${codeFiles.length} code files).`);
