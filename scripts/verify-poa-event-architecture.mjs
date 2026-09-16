import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const hardening = read(
  "supabase/migrations/20260916025711_harden_poa_event_generator_architecture.sql",
);
const restored = read(
  "supabase/migrations/20260915155217_add_poa_event_set_architecture.sql",
);
const generator = read("app/examiner/plan-of-action/generate/page.tsx");
const scenarios = read("app/examiner/plan-of-action/scenarios/page.tsx");
const flightTasks = read("lib/poa/flight-tasks.ts");
const coverageRepair = read(
  "supabase/migrations/20260916221405_repair_private_asel_acs_coverage.sql",
);

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const mappingStart = hardening.indexOf(
  "with mapping(event_code, trigger_text, compatibility, weight)",
);
const mappingEnd = hardening.indexOf(
  "-- Reconstruct safe metadata",
  mappingStart,
);
const mappingBlock = hardening.slice(mappingStart, mappingEnd);

const manualReview = [
  'Aircraft is "Out of Annual" Before Return From Cross Country',
  "Approaching",
  "Operating Above 10,000’ MSL",
  "Pilot is Blinded by Passenger Cell Phone Picture Flash on Landing",
  "Standard",
  "Uses Cell Phone in Flight",
];

check(restored.includes("create table public.poa_event_sets"), "missing restored Event Set migration");
check(mappingStart >= 0 && mappingEnd > mappingStart, "reviewed mapping block is not identifiable");
check(!mappingBlock.includes("POSTFLIGHT_COMPLETION"), "Postflight must not receive trigger mappings");
check(!mappingBlock.includes("CRUISE_AIRCRAFT_SYSTEM"), "aircraft/system mappings must not be manufactured");

for (const trigger of manualReview) {
  const sqlLiteral = `'${trigger.replaceAll("'", "''")}'`;
  check(!mappingBlock.includes(sqlLiteral), `manual-review trigger was mapped: ${trigger}`);
}

check(
  hardening.includes("Only operational triggers may be mapped to Event Sets"),
  "scenario-seed mapping guard is missing",
);
check(
  hardening.includes("event_set_kind = case when code = 'POSTFLIGHT_COMPLETION' then 'structural'"),
  "Postflight is not structural",
);
check(
  hardening.includes("p_required_acs_codes text[]"),
  "timeline RPC is not ACS-aware",
);
check(
  generator.includes("p_scenario_id: selectedScenarioId"),
  "selected scenario is not passed to the timeline engine",
);
check(!generator.includes("Math.random"), "generator still contains pure random selection");
check(
  generator.includes("missingComplianceCodes.length > 0"),
  "generation does not block missing ACS coverage",
);
check(
  generator.includes("acs_references_snapshot: acsReferencesForQuestion(question)"),
  "generated questions do not preserve all ACS mappings",
);
check(
  generator.includes('"examiner_replace_generated_poa_triggers"'),
  "generated timelines are not frozen",
);
check(
  scenarios.includes("Event Sequence") && scenarios.includes("poa_scenario_event_sets"),
  "Scenario editor does not manage Event Sequences",
);
check(
  flightTasks.includes('parts[1] === "I"'),
  "AOA I flight-task exclusion is missing",
);
check(
  flightTasks.includes("acsTaskAppliesToAircraftClass") &&
    flightTasks.includes('normalizedTaskCode.startsWith("PA.X.")'),
  "airplane ACS tasks are not filtered by category/class applicability",
);
check(
  generator.includes("No Library Mapping") &&
    generator.includes("availableComplianceCodes"),
  "compliance UI does not distinguish library gaps from selectable gaps",
);
check(
  generator.includes("missingComplianceCodes.length > 0") &&
    generator.includes("selectedQuestions.length === 0 ||"),
  "Generate POA is not disabled while ACS gaps remain",
);
check(
  coverageRepair.includes("PA.VIII.F.K; PA.VIII.F.R") &&
    coverageRepair.includes("PA.XII.A.R"),
  "Private ASEL coverage repair is incomplete",
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("POA Event Set architecture verification passed.");
