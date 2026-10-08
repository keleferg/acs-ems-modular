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
const oralSequence = read(
  "supabase/migrations/20260917210854_structure_poa_oral_event_questions.sql",
);
const generator = read("app/examiner/plan-of-action/generate/page.tsx");
const scenarios = read("app/examiner/plan-of-action/scenarios/page.tsx");
const generatedEditor = read(
  "app/examiner/plan-of-action/generated/[id]/edit/page.tsx",
);
const generatedPrint = read(
  "app/examiner/plan-of-action/generated/[id]/print/page.tsx",
);
const flightTasks = read("lib/poa/flight-tasks.ts");

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const between = (text, startMarker, endMarker) => {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  return start >= 0 && end > start ? text.slice(start, end) : "";
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

for (const code of [
  "PREFLIGHT_PREPARATION",
  "PREFLIGHT_PROCEDURES",
  "ENGINE_START_TAXI",
  "TAKEOFF_CLIMB",
  "CRUISE",
  "DESCENT",
  "APPROACH_LANDING",
  "AFTER_LANDING_SECURE",
]) {
  check(oralSequence.includes(`'${code}'`), `missing oral Event Set ${code}`);
}

check(
  oralSequence.includes("create table if not exists public.poa_event_set_question_rules"),
  "Event Set question sequencing table is missing",
);
check(
  oralSequence.includes("create table if not exists public.poa_question_prerequisites"),
  "question prerequisite table is missing",
);
check(
  oralSequence.includes("option_order smallint not null check (option_order between 1 and 3)"),
  "three-option trigger constraint is missing",
);
check(
  !oralSequence.includes("min_question_count") &&
    oralSequence.includes("max_question_count integer not null default 15") &&
    oralSequence.includes("check (max_question_count between 1 and 60)") &&
    oralSequence.includes("when e.code = 'PREFLIGHT_PREPARATION' then 60 else 15") &&
    scenarios.includes('eventSet.code === "PREFLIGHT_PREPARATION" ? 60 : 15'),
  "Event Set 1 must cap at 60 and Event Sets 2–8 must cap at 15",
);
check(
  oralSequence.includes("p_required_acs_codes text[]") &&
    oralSequence.includes("missing_required_codes") &&
    oralSequence.includes("same_question_task_gaps") &&
    generator.includes("p_required_acs_codes: requiredComplianceCodes"),
  "required-task Knowledge/Risk validation is missing",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 1 K/R minimum sequence") &&
    oralSequence.includes("PA.I.D.R6") &&
    oralSequence.includes("dependency_kind") &&
    generator.includes("validateEditableDraft({") && generator.includes("allTasksCovered: allRatingTasksCovered"),
  "Private Pilot ASEL Event Set 1 does not enforce a reviewed, distinct K/R sequence",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 2 K/R minimum sequence") &&
    oralSequence.includes("PA.II.B.R3") &&
    oralSequence.includes("Engine start, taxi, and before-takeoff checks belong to the") &&
    oralSequence.includes("PREFLIGHT_PROCEDURES"),
  "Private Pilot ASEL Event Set 2 is missing its reviewed A/B task boundary or K/R sequence",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 3 K/R minimum sequence") &&
    oralSequence.includes("PA.II.D.K1; PA.II.D.R4") &&
    oralSequence.includes("A large jet departs ahead of you from the same runway") &&
    oralSequence.includes("ENGINE_START_TAXI"),
  "Private Pilot ASEL Event Set 3 is missing its reviewed engine/taxi/departure-wake sequence",
);
const eventOneBlock = between(
  oralSequence,
  "with curated(question_text, sequence_stage, sequence_order, coverage_kind) as (",
  "-- Private Pilot ASEL Event Set 2:",
);
const eventThreeSection = between(
  oralSequence,
  "-- Private Pilot ASEL Event Set 3:",
  "-- Narrative placement corrections",
);
const eventThreeBlock = between(
  eventThreeSection,
  "with curated(question_text, sequence_stage, sequence_order, coverage_kind) as (",
  "), event_set as (",
);
check(
  !eventOneBlock.includes("Your alternator fails in flight"),
  "in-flight alternator failure must not interrupt Preflight Preparation",
);
check(
  !eventThreeBlock.includes("steady red light signal") &&
    !eventThreeBlock.includes("radio fails and traffic is converging"),
  "arrival communications questions must not appear in Engine Start / Taxi",
);
check(
  oralSequence.includes("Reviewed narrative placement correction: cruise aircraft/system event") &&
    oralSequence.includes("Reviewed narrative placement correction: approach communications event"),
  "narrative placement corrections for Cruise and Approach/Landing are missing",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 4 K/R minimum sequence") &&
    oralSequence.includes("PA.III.B.K2") &&
    oralSequence.includes("PA.III.B.R1; PA.III.B.R2") &&
    oralSequence.includes("PA.IV.A.K1; PA.IV.A.K2; PA.IV.A.K3") &&
    oralSequence.includes("PA.IV.A.R3a; PA.IV.A.R3b") &&
    oralSequence.includes("PA.IV.C.K4; PA.IV.C.K5") &&
    oralSequence.includes("PA.IV.C.R2e; PA.IV.C.R3a") &&
    oralSequence.includes("PA.IV.E.K1; PA.IV.E.K2; PA.IV.E.K3") &&
    oralSequence.includes("PA.IV.E.R1; PA.IV.E.R3a") &&
    oralSequence.includes("PA.VIII.B.K1a; PA.VIII.B.K1d") &&
    oralSequence.includes("PA.VIII.B.R1; PA.VIII.B.R2; PA.VIII.B.R4; PA.VIII.B.R5"),
  "Private Pilot ASEL Event Set 4 is missing its five distinct K/R task pairs",
);
check(
  oralSequence.includes("Inadvertent IMC After Takeoff") &&
    oralSequence.includes("insert into public.poa_event_set_question_triggers") &&
    oralSequence.includes("'immediate_response', 'after_trigger'") &&
    oralSequence.includes("'consequence', 'after_trigger'") &&
    generator.includes("ruleAppliesToSelectedTriggers") &&
    generator.includes("trigger_option_id: (rule ? selectedTriggerForRule(rule) : null)") &&
    generatedEditor.includes("Ask only if used:") &&
    generatedPrint.includes("ASK ONLY IF USED"),
  "Private Pilot basic-instrument questions are not conditional on the inadvertent-IMC trigger",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 5 Cruise sequence") &&
    oralSequence.includes("PA.V.A.K2b; PA.V.A.K2d; PA.V.A.K2e; PA.V.B.K2; PA.V.B.K3") &&
    oralSequence.includes("PA.V.A.R1; PA.V.A.R2; PA.V.A.R3; PA.V.A.R5; PA.V.B.R1; PA.V.B.R2; PA.V.B.R3; PA.V.B.R5") &&
    oralSequence.includes("PA.VI.A.K1; PA.VI.A.K7; PA.VI.B.K1; PA.VI.B.K2; PA.VI.B.K3") &&
    oralSequence.includes("PA.VI.D.K1; PA.VI.D.K2") &&
    oralSequence.includes("Alternator Failure in Cruise") &&
    oralSequence.includes("Engine Roughness in Cruise") &&
    oralSequence.includes("Vacuum or Attitude Instrument Failure in Cruise"),
  "Private Pilot ASEL Event Set 5 is missing its reviewed Cruise baseline or aircraft/system branches",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 6 Descent sequence") &&
    oralSequence.includes("PA.IV.B.K1; PA.IV.B.K2; PA.IV.B.K3") &&
    oralSequence.includes("PA.XI.A.K1; PA.XI.A.K2; PA.XI.A.K3; PA.XI.A.K4; PA.XI.A.K5; PA.XI.A.K8") &&
    oralSequence.includes("PA.IX.A.K1; PA.IX.A.K2; PA.IX.A.K3; PA.IX.A.K4") &&
    oralSequence.includes("PA.IX.A.R1; PA.IX.A.R2; PA.IX.A.R3; PA.IX.A.R4"),
  "Private Pilot ASEL Event Set 6 is missing its reviewed descent, night, or emergency-descent baseline",
);
check(
  oralSequence.includes("Inadvertent IMC During Descent") &&
    oralSequence.includes("PA.VIII.C.K1a; PA.VIII.C.K1b; PA.VIII.C.K1c; PA.VIII.C.K1d") &&
    oralSequence.includes("PA.VIII.C.R1; PA.VIII.C.R2; PA.VIII.C.R4; PA.VIII.C.R5; PA.VIII.C.R6; PA.VIII.C.R7; PA.VIII.C.R8") &&
    oralSequence.includes("Ear Block/Sinus Block") &&
    oralSequence.includes("Cockpit Smoke or Fire During Descent"),
  "Event Set 6 conditional descent branches are incomplete",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 7 Approach/Landing sequence") &&
    oralSequence.includes("PA.IV.D.K1; PA.IV.D.K2; PA.IV.D.K3; PA.IV.F.K1; PA.IV.F.K2; PA.IV.F.K3") &&
    oralSequence.includes("PA.IV.M.K1; PA.IV.M.K2; PA.IV.M.K3; PA.IV.M.K4; PA.IV.N.K1; PA.IV.N.K2; PA.IV.N.K3") &&
    oralSequence.includes("PA.VII.A.K; PA.VII.B.K; PA.VII.C.K; PA.VII.D.K") &&
    oralSequence.includes("PA.IX.B.K1; PA.IX.B.K2; PA.IX.B.K3; PA.IX.B.K4; PA.IX.B.K5; PA.IX.B.K6"),
  "Private Pilot ASEL Event Set 7 is missing landing, stall-awareness, or emergency-landing coverage",
);
check(
  oralSequence.includes("Windshear Reported on Final") &&
    oralSequence.includes("Passenger Distraction on Final") &&
    oralSequence.includes("Radio Failure on Arrival") &&
    oralSequence.includes("steady red light signal from the tower"),
  "Event Set 7 arrival trigger branches are incomplete",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 8 After Landing sequence") &&
    oralSequence.includes("PA.XII.A.K1; PA.XII.A.K2") &&
    oralSequence.includes("PA.XII.A.R1; PA.XII.A.R3; PA.XII.A.R4") &&
    oralSequence.includes("Strong or Gusty Wind During Parking") &&
    oralSequence.includes("Passenger Opens Door Before Shutdown") &&
    oralSequence.includes("Postflight Damage or Fluid Leak Found"),
  "Private Pilot ASEL Event Set 8 or its trigger branches are incomplete",
);
check(
  oralSequence.includes("Reviewed Private Pilot ASEL Event Set 3 trigger sequence") &&
    oralSequence.includes("Flooded Engine During Start") &&
    oralSequence.includes("Taxi Route Becomes Uncertain") &&
    oralSequence.includes("Jet Wake Delays Departure"),
  "Event Set 3 still lacks its three reviewed trigger branches",
);
check(
  oralSequence.includes("values (1, 'weather'), (2, 'passenger'), (3, 'pilot_aircraft')") &&
    oralSequence.includes("select s.id, e.id, e.default_phase, true, 3, 3") &&
    generator.includes("Choose at least one trigger for:"),
  "Cruise does not enforce one trigger option from each of its three branches",
);
check(
  generator.includes("selectedCandidateTriggerIds") &&
    generator.includes("link.is_required && selectedCandidateTriggerIds.has(link.trigger_id)") &&
    generator.includes("!selectedIds.includes(link.question_id)") &&
    generator.includes("is_required\")"),
  "selected trigger candidates do not carry their required conditional questions",
);
check(
  generator.includes("hasSameRatingContent") &&
    generator.includes("sharedContentTestTypeIds") &&
    generator.includes("additional-rating task table narrows the required ACS"),
  "original and additional issuances do not share rating-level question content",
);
check(
  generator.includes("p_trigger_selections: triggerSelections") && generator.includes("draft?.triggers ?? selectedTriggerIds"),
  "generator does not pass examiner-selected trigger candidates",
);
check(
  oralSequence.includes("where q.is_active and q.question_type <> 'skill'"),
  "flight skills are not excluded from oral question classification",
);
check(
  oralSequence.includes("'foundation', 'planning', 'immediate_response'") &&
    oralSequence.includes("'consequence', 'resolution'"),
  "instructional question stages are incomplete",
);
check(
  generator.includes("ACS references prove coverage; they do not define narrative order"),
  "generator still lacks explicit Event Set question ordering",
);
check(
  generator.includes("question_rule_id: rule?.id") &&
    generator.includes("trigger_timing: rule && eventItemOrder[rule.event_set_id]") &&
    generator.includes(": rule?.trigger_timing ?? null") &&
    generator.includes("item_order: effectiveEventItemOrder[item.event_set_id]"),
  "generated POA does not freeze question sequencing metadata",
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("POA Event Set architecture verification passed.");
