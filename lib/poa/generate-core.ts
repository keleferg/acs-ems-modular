/*
 * Template POA generation shared by the Generate page and the automatic build that runs when an
 * applicant submits the pretest qualification (Kele, Nov 12 2026). Pure helpers plus
 * assembleTemplatePoa (no I/O) and saveTemplatePoa (writes the frozen POA).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import faaAcsComplianceCatalog from "../../data/faa-acs-compliance-catalog.json";
import ADDITIONAL_MAPS from "../../data/acs-additional-rating-maps.json";
import { taskAppliesToClass } from "./task-class-applicability";
import {
  deriveAllFlightTasksFromAcsCatalog,
  filterFlightTasksByParentCodes,
  normalizeAdditionalMapCodes,
} from "./flight-tasks";
import {
  buildTemplateSequence,
  fillTemplateText,
  pickTemplateVariants,
  type FillCheck,
  type TemplateItem,
  type TemplateVariants,
} from "./template-build";
import { chainEndIndex, planFocus, type FocusArea, type FocusSource } from "./focus";
import type { StopNeed } from "./locations";

export function acsPrefix(reference: string) {
  const cleaned = reference.trim().toUpperCase();

  const match = cleaned.match(/^([A-Z]{1,5})\./);

  return match?.[1] ?? null;
}

export function faaAcsPrefixesForTestType(testType: PracticalTestType) {
  const certificateCode = (testType.certificate_code ?? "")
    .trim()
    .toUpperCase();

  const ratingCode = (testType.rating_code ?? "").trim().toUpperCase();

  const categoryCode = (testType.category_code ?? "").trim().toUpperCase();

  const classCode = (testType.class_code ?? "").trim().toUpperCase();

  const certificate = (testType.certificate_name ?? "").trim().toLowerCase();

  const category = (testType.category_name ?? "").trim().toLowerCase();

  const rating = (testType.rating_name ?? "").trim().toLowerCase();

  const display = (testType.display_name ?? "").trim().toLowerCase();

  const combined = `${certificate} ${category} ${rating} ${display}`;

  /*
   * AIRPLANE
   */

  if (certificateCode === "PRIVATE" && categoryCode === "AIRPLANE") {
    return ["PA"];
  }

  if (certificateCode === "COMMERCIAL" && categoryCode === "AIRPLANE") {
    return ["CA"];
  }

  if (certificateCode === "ATP" && categoryCode === "AIRPLANE") {
    return ["AA"];
  }

  if (
    certificateCode === "INSTRUMENT" &&
    ratingCode === "INSTRUMENT_AIRPLANE"
  ) {
    return ["IR"];
  }

  if (
    certificateCode === "FLIGHT_INSTRUCTOR" &&
    categoryCode === "AIRPLANE" &&
    ratingCode !== "CFII"
  ) {
    return ["FI", "AI"];
  }

  /*
   * CFII Airplane is still tested to the PTS (FAA-S-8081-9E), which has no
   * ACS codes. EMS codes its Tasks IF.<Area>.<Task>.K/S (K = objective
   * elements 1-2 and ground Tasks, S = demonstration and analysis); the
   * entries are in data/faa-acs-compliance-catalog.json. The prefix must stay
   * two letters for complianceParentCode.
   */
  if (certificateCode === "FLIGHT_INSTRUCTOR" && ratingCode === "CFII") {
    return ["IF"];
  }

  /*
   * GLIDER
   *
   * Glider practical tests still use PTS (Private FAA-S-8081-22A, Commercial
   * FAA-S-8081-23B, Flight Instructor FAA-S-8081-8C), which have no ACS
   * codes. Like the CFII PTS, EMS codes their Tasks <PFX>.<Area>.<Task>.K/S:
   * PG (private), CG (commercial), FG (flight instructor). The entries are in
   * data/faa-acs-compliance-catalog.json.
   */
  if (categoryCode === "GLIDER" && certificateCode === "PRIVATE") {
    return ["PG"];
  }

  if (categoryCode === "GLIDER" && certificateCode === "COMMERCIAL") {
    return ["CG"];
  }

  if (
    certificateCode === "FLIGHT_INSTRUCTOR" &&
    ratingCode === "CFI_GLIDER"
  ) {
    return ["FG"];
  }

  /*
   * HELICOPTER
   */

  if (certificateCode === "PRIVATE" && classCode === "HELICOPTER") {
    return ["PH"];
  }

  if (certificateCode === "COMMERCIAL" && classCode === "HELICOPTER") {
    return ["CH"];
  }

  if (
    certificateCode === "INSTRUMENT" &&
    ratingCode === "INSTRUMENT_HELICOPTER"
  ) {
    return ["IH"];
  }

  /*
   * FAA-S-ACS-29:
   * Flight Instructor Rotorcraft Helicopter uses HI.
   */
  if (
    certificateCode === "FLIGHT_INSTRUCTOR" &&
    ratingCode === "CFI_HELICOPTER"
  ) {
    return ["FI", "HI"];
  }

  /*
   * CFII Helicopter remains PTS-based under FAA-S-8081-9E.
   */
  if (
    certificateCode === "FLIGHT_INSTRUCTOR" &&
    ratingCode === "CFII_HELICOPTER"
  ) {
    return [];
  }

  /*
   * AVIATION MECHANIC
   *
   * FAA-S-ACS-1 uses the AM prefix throughout:
   *
   * AM.I   = General
   * AM.II  = Airframe
   * AM.III = Powerplant
   */

  if (certificateCode === "MECHANIC") {
    return ["AM"];
  }

  /*
   * REMOTE PILOT — SMALL UAS
   * FAA-S-ACS-10B uses UA.
   *
   * These are future-safe mappings; there is not
   * currently a Remote Pilot practical_test_type.
   */

  if (
    certificateCode === "REMOTE_PILOT" ||
    combined.includes("remote pilot") ||
    combined.includes("unmanned aircraft")
  ) {
    return ["UA"];
  }

  /*
   * COMMERCIAL PILOT — MILITARY COMPETENCE
   * FAA-S-ACS-12 uses MC.
   *
   * There is not currently a Military Competence
   * practical_test_type in EMS.
   */

  if (
    certificateCode === "MILITARY_COMPETENCE" ||
    combined.includes("military competence")
  ) {
    return ["MC"];
  }

  /*
   * LEGACY / FUTURE FALLBACKS
   */

  if (combined.includes("private pilot") && combined.includes("airplane")) {
    return ["PA"];
  }

  if (combined.includes("commercial pilot") && combined.includes("airplane")) {
    return ["CA"];
  }

  if (
    combined.includes("airline transport pilot") &&
    combined.includes("airplane")
  ) {
    return ["AA"];
  }

  if (
    combined.includes("instrument") &&
    combined.includes("airplane") &&
    !combined.includes("instructor")
  ) {
    return ["IR"];
  }

  if (
    combined.includes("flight instructor") &&
    combined.includes("airplane") &&
    !combined.includes("instrument instructor")
  ) {
    return ["AI"];
  }

  return [];
}

export function complianceParentCode(reference: string) {
  const cleaned = reference.trim().toUpperCase();

  const match = cleaned.match(/^([A-Z]{2}\.[IVX]+\.[A-Z]+\.[KRS])/);

  return match?.[1] ?? null;
}

export type GeneratorScenarioOption = {
  id: string;
  scenario_name: string;
  scenario_brief: string | null;
  departure: string | null;
  destination: string | null;
  leg_nm: number | null;
  aircraft: string | null;
  initial_conditions: string | null;
  examiner_notes: string | null;
  /** Which version of the template story (photo, ferry, on_demand). Null = the template as written. */
  mission_code?: string | null;
  /** Fill-ins the scenario supplies, e.g. {"passenger": "the photographer"}. */
  fills?: Record<string, string> | null;
  /** Extra places, e.g. {"stops": ["fuel", "no_fuel"], "prefer_river": true}. */
  location_needs?: { stops?: StopNeed[]; prefer_river?: boolean } | null;
};

export type PoaTemplateQuestion = {
  id: string;
  question: string;
  answer: string | null;
  reference: string | null;
  acs_reference: string;
  task_name: string | null;
  topic: string | null;
  question_type: string | null;
  poa_question_acs_applicability: Array<{ acs_reference: string; certificate_name?: string | null }>;
};

export type PoaTemplateRow = TemplateItem & { poa_questions: PoaTemplateQuestion | null };

export type LoadedPoaTemplate = {
  id: string;
  name: string;
  version: number;
  items: PoaTemplateRow[];
  eventSetNames: Record<string, string>;
  previousVariants: TemplateVariants | null;
  /** Scenarios written for this template's story; empty means any scenario for the test. */
  scenarioIds: string[];
  /** Scenario of the examiner's last POA for this test, so the auto-pick rotates. */
  previousScenarioId: string | null;
};

export type PracticalTestType = {
  id: string;

  certificate_code?: string | null;
  issuance_code?: string | null;
  category_code?: string | null;
  class_code?: string | null;
  rating_code?: string | null;

  certificate_name: string;
  issuance_name: string;

  category_name: string | null;
  class_name: string | null;

  rating_name: string;
  display_name: string;
};

export type AcsApplicability = {
  id: string;
  certificate_name: string;
  acs_reference: string;
};

export type QuestionTestTypeJoin = {
  practical_test_type_id: string;
};

export type LibraryQuestion = {
  id: string;
  question: string;

  answer: string | null;

  reference: string | null;

  topic: string | null;

  task_name: string | null;

  question_type: string;
  difficulty: string;

  poa_question_acs_applicability: AcsApplicability[];

  poa_question_practical_test_types: QuestionTestTypeJoin[];

  /** Aircraft equipment the question is written for; null = any. */
  aircraft_equipment?: AircraftEquipment | null;
};

/**
 * The flight instruments in the airplane the test is flown in. Questions and
 * trigger options can be written for one of them (vacuum system vs AHRS/ADC);
 * untagged ones apply to both.
 */
export type AircraftEquipment = "six_pack" | "taa";

export function splitAcsReferences(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function compareAcsReferences(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function taskParentFromReference(reference: string) {
  const cleaned = reference.trim().toUpperCase();
  const match = cleaned.match(/^([A-Z]{1,5}\.[IVX]+\.[A-Z0-9/]+)/);
  return match?.[1] ?? null;
}

export function isOriginalIssuance(testType: PracticalTestType) {
  const code = (testType.issuance_code ?? "").trim().toUpperCase();
  const name = (testType.issuance_name ?? "").trim().toLowerCase();

  return (
    code === "ORIGINAL" ||
    code === "INITIAL" ||
    name.includes("original") ||
    name.includes("initial")
  );
}

export function hasSameRatingContent(
  candidate: PracticalTestType,
  selected: PracticalTestType,
) {
  const normalize = (value: string | null | undefined) =>
    (value ?? "").trim().toUpperCase();

  return (
    normalize(candidate.certificate_code || candidate.certificate_name) ===
      normalize(selected.certificate_code || selected.certificate_name) &&
    normalize(candidate.category_code || candidate.category_name) ===
      normalize(selected.category_code || selected.category_name) &&
    normalize(candidate.class_code || candidate.class_name) ===
      normalize(selected.class_code || selected.class_name) &&
    normalize(candidate.rating_code || candidate.rating_name) ===
      normalize(selected.rating_code || selected.rating_name)
  );
}

export function crossCountryTaskParentsForPrefixes(prefixes: string[]) {
  const allowed = new Set(prefixes.map((value) => value.trim().toUpperCase()));

  const parents = new Set<string>();

  const entries = faaAcsComplianceCatalog.entries as unknown as Array<
    Record<string, unknown>
  >;

  for (const raw of entries) {
    const code = String(raw.code ?? raw.acs_reference ?? raw.reference ?? "")
      .trim()
      .toUpperCase();

    const prefix = acsPrefix(code);

    if (!prefix || !allowed.has(prefix)) {
      continue;
    }

    const parent = taskParentFromReference(code);

    if (!parent) {
      continue;
    }

    const taskLabelCandidates = [
      raw.task_name,
      raw.taskName,
      raw.task,
      raw.name,
      raw.title,
      raw.label,
    ];

    const taskLabel = taskLabelCandidates.find(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

    if (
      String(taskLabel ?? "")
        .toLowerCase()
        .includes("cross-country flight planning")
    ) {
      parents.add(parent);
    }
  }

  return [...parents].sort(compareAcsReferences);
}


/* ---------------------------------------------------------------- required ACS codes */

export function isAdditionalIssuanceType(testType: PracticalTestType) {
  const code = (testType.issuance_code ?? "").trim().toUpperCase();
  const name = (testType.issuance_name ?? "").trim().toLowerCase();
  return code === "ADDITIONAL" || name.includes("additional");
}

function additionalMapKeys(testType: PracticalTestType) {
  const certificate = testType.certificate_name.trim().toLowerCase();
  const certificateKey = certificate.includes("private")
    ? "Private"
    : certificate.includes("commercial")
      ? "Commercial"
      : certificate.includes("instrument")
        ? "Instrument"
        : certificate.includes("airline transport")
          ? "ATP"
          : certificate.includes("flight instructor")
            ? "CFI"
            : "";
  const classCode = (testType.class_code ?? "").trim().toUpperCase();
  const ratingName = testType.rating_name.trim();
  let targetKey = ratingName;
  if (certificateKey === "Instrument") {
    const target = `${classCode} ${ratingName}`.toLowerCase();
    if (target.includes("airplane")) targetKey = "Instrument Airplane";
    else if (target.includes("helicopter")) targetKey = "Instrument Helicopter";
  } else if (["ASEL", "AMEL", "ASES", "AMES"].includes(classCode)) {
    targetKey = classCode;
  } else if (certificateKey === "CFI" && ratingName.toLowerCase().startsWith("instrument instructor")) {
    targetKey = "Instrument Instructor";
  }
  return { certificateKey, targetKey };
}

/** Ratings an add-on applicant can already hold (keys of the FAA Additional Rating Task Table). */
export function additionalHeldOptions(testType: PracticalTestType) {
  if (!isAdditionalIssuanceType(testType)) return [];
  const { certificateKey, targetKey } = additionalMapKeys(testType);
  const maps = (ADDITIONAL_MAPS as Record<string, Record<string, unknown>>)[certificateKey] ?? {};
  const prefix = `${targetKey}_from_`;
  return Object.keys(maps).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
}

/**
 * The ACS codes a POA must cover and the flight Tasks it flies, the same way the Generate page works
 * them out (for Commercial ASEL/ASES the first Task of each choice pair is used).
 */
export function poaRequirementsFor(testType: PracticalTestType, additionalRatingHeld: string | null) {
  const prefixes = faaAcsPrefixesForTestType(testType);
  const prefixSet = new Set(prefixes);
  const mapPrefix = prefixes.find((prefix) => prefix !== "FI") ?? prefixes[0] ?? "";
  const additional = isAdditionalIssuanceType(testType);
  const { certificateKey, targetKey } = additionalMapKeys(testType);
  const mapParents =
    additional && additionalRatingHeld
      ? new Set(
          normalizeAdditionalMapCodes(
            ((ADDITIONAL_MAPS as Record<string, Record<string, unknown>>)[certificateKey] ?? {})[`${targetKey}_from_${additionalRatingHeld}`],
            mapPrefix,
          ),
        )
      : null;

  const codes = new Set<string>();
  for (const entry of faaAcsComplianceCatalog.entries) {
    const prefix = acsPrefix(entry.code);
    if (prefix && prefixSet.has(prefix) && taskAppliesToClass(entry.task_name, testType.class_code, entry.code)) codes.add(entry.code);
  }
  const commercialSingleEngineOriginal =
    (testType.certificate_code ?? "").toUpperCase() === "COMMERCIAL" &&
    (testType.category_code ?? "").toUpperCase() === "AIRPLANE" &&
    ["ASEL", "ASES"].includes((testType.class_code ?? "").toUpperCase()) &&
    isOriginalIssuance(testType);

  let required = [...codes].filter((code) => !code.endsWith(".S")).sort(compareAcsReferences);
  if (mapParents) required = required.filter((code) => mapParents.has(taskParentFromReference(code) ?? ""));
  if (commercialSingleEngineOriginal) {
    required = required.filter((code) => {
      const parent = taskParentFromReference(code);
      return parent !== "CA.V.B" && parent !== "CA.V.D";
    });
  }

  let flightTasks = deriveAllFlightTasksFromAcsCatalog(prefixes).filter((task) =>
    taskAppliesToClass(task.task_name_snapshot, testType.class_code, task.acs_task_code_snapshot),
  );
  if (additional) flightTasks = mapParents?.size ? filterFlightTasksByParentCodes(flightTasks, [...mapParents]) : [];
  if (commercialSingleEngineOriginal) {
    flightTasks = flightTasks.filter((task) => !["CA.V.B", "CA.V.D"].includes(task.acs_task_code_snapshot));
  }
  const requiredFlightTasks = flightTasks
    .filter((task) => task.is_required)
    .map((task, index) => ({ ...task, sort_order: (index + 1) * 10 }));

  return {
    prefixes,
    requiredComplianceCodes: required,
    requiredFlightTasks,
    isAdditionalIssuance: additional,
    requiredTaskParents: additional
      ? new Set(required.map(taskParentFromReference).filter((code): code is string => Boolean(code)))
      : null,
  };
}

/* ---------------------------------------------------------------- loading */

const TEMPLATE_ITEM_FIELDS = `
  id, event_set_id, parent_item_id, sort_order, depth, item_kind, script_text, question_id,
  is_optional, condition_note, aircraft_equipment, class_codes, rotation_slot, rotation_variant, requires_fills, mission_codes, answer_text,
  poa_questions ( id, question, answer, reference, acs_reference, task_name, topic, question_type,
    poa_question_acs_applicability ( certificate_name, acs_reference ) )
`;

/** The examiner's approved template for this certificate and class, with the rotation memory of their last POA. */
export async function loadPoaTemplate(
  supabase: SupabaseClient,
  testType: PracticalTestType,
  examinerId: string | null,
): Promise<LoadedPoaTemplate | null> {
  if (!testType.certificate_code) return null;
  let templateQuery = supabase
    .from("poa_templates")
    .select("id, name, version, class_code")
    .eq("status", "approved")
    .eq("certificate_code", testType.certificate_code)
    .order("version", { ascending: false })
    .limit(1);
  templateQuery = testType.class_code ? templateQuery.eq("class_code", testType.class_code) : templateQuery.is("class_code", null);
  const { data: templates, error: templateError } = await templateQuery;
  const template = templates?.[0];
  if (templateError || !template) return null;

  const [itemResult, eventSetResult, scenarioResult, lastResult] = await Promise.all([
    supabase.from("poa_template_items").select(TEMPLATE_ITEM_FIELDS).eq("template_id", template.id).order("sort_order", { ascending: true }),
    supabase.from("poa_event_sets").select("id, name"),
    supabase.from("poa_template_scenarios").select("scenario_id").eq("template_id", template.id),
    examinerId
      ? supabase
          .from("generated_plan_of_actions")
          .select("template_variants, scenario_id")
          .eq("examiner_profile_id", examinerId)
          .eq("practical_test_type_id", testType.id)
          .not("template_variants", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (itemResult.error) return null;

  // Keep only the ACS codes for this test's certificate (a question can carry Private and Commercial codes).
  const certificateName = testType.certificate_name;
  const items = ((itemResult.data ?? []) as unknown as PoaTemplateRow[])
    .map((raw) => ({
      ...raw,
      poa_questions: raw.poa_questions
        ? {
            ...raw.poa_questions,
            poa_question_acs_applicability: (raw.poa_questions.poa_question_acs_applicability ?? []).filter(
              (row) => !row.certificate_name || row.certificate_name === certificateName,
            ),
          }
        : null,
    }))
    .map((item) => ({
      ...item,
      task_parents: [
        ...new Set(
          (item.poa_questions?.poa_question_acs_applicability ?? [])
            .flatMap((row) => splitAcsReferences(row.acs_reference))
            .map(taskParentFromReference)
            .filter((code): code is string => Boolean(code)),
        ),
      ],
    }));
  const last = (lastResult as { data: { template_variants?: unknown; scenario_id?: unknown } | null }).data;
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    items,
    eventSetNames: Object.fromEntries((eventSetResult.data ?? []).map((row) => [row.id, row.name])),
    previousVariants: (last?.template_variants as TemplateVariants | null) ?? null,
    scenarioIds: (scenarioResult.data ?? []).map((row) => String(row.scenario_id)),
    previousScenarioId: (last?.scenario_id as string | null) ?? null,
  };
}

/* ---------------------------------------------------------------- assembling */

export type TemplatePoaInput = {
  template: LoadedPoaTemplate;
  testType: PracticalTestType;
  scenario: GeneratorScenarioOption;
  /** Library questions for the test (already filtered to the aircraft equipment): the focus-area bank. */
  questions: Array<Pick<LibraryQuestion, "id" | "question" | "answer" | "reference" | "topic" | "task_name" | "question_type" | "poa_question_acs_applicability">>;
  equipment: AircraftEquipment | null;
  fills: Record<string, string | null | undefined>;
  fillCheck: FillCheck | null;
  requiredComplianceCodes: string[];
  requiredTaskParents: Set<string> | null;
  complianceAcsPrefixes: string[];
  focusAreas: FocusArea[];
  random?: () => number;
};

export type AssembledTemplatePoa = ReturnType<typeof assembleTemplatePoa>;

/**
 * The template in flight order for one POA: rotation picked, mission and equipment applied, weak
 * areas tagged or added, fill-ins applied. Returns the rows to save (no POA id yet).
 */
export function assembleTemplatePoa(input: TemplatePoaInput) {
  const { template, testType, scenario, fills } = input;
  const mission = scenario.mission_code ?? null;
  const variants = pickTemplateVariants(template.items, template.previousVariants, input.random ?? Math.random, input.fillCheck, mission);
  const scriptSequence = buildTemplateSequence(template.items, {
    variants,
    equipment: input.equipment,
    classCode: testType.class_code,
    requiredTaskParents: input.requiredTaskParents,
    fillCheck: input.fillCheck,
    mission,
  }) as PoaTemplateRow[];

  // Weak areas: tag the script questions that already cover them, add one question for the rest
  // right after the script's chain on the same Task (or Area).
  const certificateName = testType.certificate_name;
  const referencesOf = (rows: Array<{ acs_reference: string; certificate_name?: string | null }>) =>
    rows
      .filter((row) => !row.certificate_name || row.certificate_name === certificateName)
      .flatMap((row) => splitAcsReferences(row.acs_reference))
      .map((ref) => ref.toUpperCase());
  const focusPlan = planFocus(
    input.focusAreas,
    scriptSequence.map((item) => ({
      id: item.id,
      event_set_id: item.event_set_id,
      parent_item_id: item.parent_item_id,
      question_id: item.question_id,
      references: referencesOf(item.poa_questions?.poa_question_acs_applicability ?? []),
    })),
    input.questions.map((question) => ({
      id: question.id,
      references: referencesOf(question.poa_question_acs_applicability ?? []),
      isTrigger: (question.question_type ?? "").toLowerCase().includes("trigger"),
    })),
    input.random ?? Math.random,
  );
  const focusByItem = new Map<string, FocusSource[]>(Object.entries(focusPlan.tagged));
  const insertAfter = new Map<number, PoaTemplateRow[]>();
  const firstEventSet = scriptSequence.find((item) => item.item_kind !== "seed")?.event_set_id ?? "";
  for (const entry of focusPlan.added) {
    const question = input.questions.find((candidate) => candidate.id === entry.questionId);
    if (!question) continue;
    const rows = (question.poa_question_acs_applicability ?? []).filter(
      (row) => !row.certificate_name || row.certificate_name === certificateName,
    );
    const id = `focus-${question.id}`;
    const index = entry.afterItemId ? chainEndIndex(scriptSequence, entry.afterItemId) : scriptSequence.length - 1;
    const list = insertAfter.get(index) ?? [];
    list.push({
      id,
      event_set_id: entry.eventSetId || firstEventSet,
      parent_item_id: null,
      sort_order: 0,
      depth: 0,
      item_kind: "question",
      script_text: question.question,
      question_id: question.id,
      is_optional: false,
      condition_note: null,
      aircraft_equipment: null,
      class_codes: null,
      rotation_slot: null,
      rotation_variant: 1,
      poa_questions: {
        id: question.id,
        question: question.question,
        answer: question.answer,
        reference: question.reference,
        acs_reference: rows.map((row) => row.acs_reference).join("; "),
        task_name: question.task_name,
        topic: question.topic,
        question_type: question.question_type,
        poa_question_acs_applicability: rows,
      },
    });
    insertAfter.set(index, list);
    focusByItem.set(id, entry.sources);
  }
  const sequence = scriptSequence.flatMap((item, index) => [item, ...(insertAfter.get(index) ?? [])]);

  const coveredCodes = new Set(
    sequence.flatMap((item) =>
      (item.poa_questions?.poa_question_acs_applicability ?? [])
        .flatMap((row) => splitAcsReferences(row.acs_reference))
        .map(complianceParentCode)
        .filter((code): code is string => Boolean(code)),
    ),
  );

  const questionRows: Record<string, unknown>[] = [];
  const timelineRows: Record<string, unknown>[] = [];
  let position = 0;
  let currentEventSet: string | null = null;
  for (const item of sequence) {
    position += 10;
    const text = fillTemplateText(item.script_text, fills);
    if (item.item_kind === "seed") {
      timelineRows.push({
        timeline_kind: "scenario",
        placement_section: "oral",
        phase: "preflight",
        trigger_text_snapshot: scenario.scenario_name,
        trigger_narrative_snapshot: fillTemplateText(scenario.scenario_brief ?? scenario.scenario_name, fills),
        sort_order: position,
        template_item_id: item.id,
      });
      continue;
    }
    if (item.event_set_id !== currentEventSet) {
      currentEventSet = item.event_set_id;
      timelineRows.push({
        timeline_kind: "event_set",
        placement_section: "oral",
        event_set_id: item.event_set_id,
        trigger_text_snapshot: template.eventSetNames[item.event_set_id] ?? "Event Set",
        sort_order: position,
      });
      position += 10;
    }
    const question = item.poa_questions;
    if (question) {
      const references = (question.poa_question_acs_applicability ?? []).flatMap((row) => splitAcsReferences(row.acs_reference));
      const answer = item.answer_text ?? question.answer;
      questionRows.push({
        question_library_id: question.id,
        // Element codes, like the rule-based builder stores, so the compliance view can count K and R.
        acs_reference_snapshot: references.join("; ") || question.acs_reference,
        question_snapshot: item.item_kind === "trigger" ? `TRIGGER: ${text}` : text,
        // The script's own answer wins when the mission changes it (Part 91 ferry vs Part 135 charter).
        answer_snapshot: answer ? fillTemplateText(answer, fills) : answer,
        reference_snapshot: question.reference,
        topic_snapshot: question.topic,
        task_name_snapshot: question.task_name,
        question_type_snapshot: question.question_type,
        acs_references_snapshot: references,
        event_set_id: item.event_set_id,
        sort_order: position,
        template_item_id: item.id.startsWith("focus-") ? null : item.id,
        template_depth: item.depth,
        focus_sources: focusByItem.get(item.id) ?? null,
      });
    } else {
      timelineRows.push({
        timeline_kind: item.item_kind === "trigger" ? "trigger" : "scene",
        placement_section: "oral",
        event_set_id: item.event_set_id,
        trigger_text_snapshot: text,
        trigger_narrative_snapshot: text,
        sort_order: position,
        template_item_id: item.id,
        template_depth: item.depth,
      });
    }
  }

  const required = input.requiredComplianceCodes;
  const triggerCount =
    timelineRows.filter((row) => row.timeline_kind === "trigger").length +
    questionRows.filter((row) => String(row.question_snapshot).startsWith("TRIGGER: ")).length;
  return {
    variants,
    focusPlan,
    focusByItem,
    questionRows,
    timelineRows,
    triggerCount,
    complianceSnapshot: {
      required,
      covered: required.filter((code) => coveredCodes.has(code)),
      missing: required.filter((code) => !coveredCodes.has(code)),
    },
    crossCountryRequired: crossCountryTaskParentsForPrefixes(input.complianceAcsPrefixes).length > 0,
  };
}

/* ---------------------------------------------------------------- saving */

/**
 * Writes the frozen POA. The examiner's own session uses the examiner_replace_* functions; the
 * automatic build (service key, no signed-in user) writes the same rows directly.
 */
export async function saveTemplatePoa(
  supabase: SupabaseClient,
  header: Record<string, unknown>,
  assembled: Pick<AssembledTemplatePoa, "questionRows" | "timelineRows">,
  flightTasks: Array<Record<string, unknown>>,
  mode: "examiner" | "service" = "examiner",
): Promise<{ id: string; versionCode: string | null }> {
  const { data: generated, error: generatedError } = await supabase
    .from("generated_plan_of_actions")
    .insert(header)
    .select("id, version_code")
    .single();
  if (generatedError || !generated) {
    throw new Error(generatedError?.message || "The generated POA record could not be created.");
  }
  const remove = async () => {
    await supabase.from("generated_plan_of_actions").delete().eq("id", generated.id);
  };

  const { error: questionError } = await supabase
    .from("generated_plan_of_action_questions")
    .insert(assembled.questionRows.map((row) => ({ ...row, generated_plan_of_action_id: generated.id })));
  if (questionError) {
    await remove();
    throw new Error(`Question snapshots could not be saved: ${questionError.message}`);
  }

  if (mode === "examiner") {
    const { error: flightTaskError } = await supabase.rpc("examiner_replace_generated_poa_flight_tasks", {
      p_generated_plan_of_action_id: generated.id,
      p_tasks: flightTasks,
    });
    if (flightTaskError) {
      await remove();
      throw new Error(`Flight task snapshots could not be saved: ${flightTaskError.message}`);
    }
    const { error: timelineError } = await supabase.rpc("examiner_replace_generated_poa_triggers", {
      p_generated_plan_of_action_id: generated.id,
      p_triggers: assembled.timelineRows,
    });
    if (timelineError) {
      await remove();
      throw new Error(`Scenario timeline snapshots could not be saved: ${timelineError.message}`);
    }
  } else {
    const tasks = flightTasks
      .filter((task) => String(task.acs_task_code_snapshot ?? "").trim())
      .map((task, index) => ({
        generated_plan_of_action_id: generated.id,
        acs_task_code_snapshot: task.acs_task_code_snapshot,
        area_name_snapshot: task.area_name_snapshot ?? null,
        task_name_snapshot: task.task_name_snapshot || "ACS Task",
        skill_elements_snapshot: task.skill_elements_snapshot ?? [],
        examiner_notes: task.examiner_notes ?? null,
        is_required: task.is_required ?? true,
        sort_order: task.sort_order ?? (index + 1) * 10,
      }));
    const timeline = assembled.timelineRows.map((row) => ({
      generated_plan_of_action_id: generated.id,
      trigger_library_id: null,
      event_set_id: row.event_set_id ?? null,
      placement_section: row.placement_section,
      timeline_kind: row.timeline_kind ?? "trigger",
      phase: row.phase ?? null,
      category_snapshot: null,
      trigger_text_snapshot: row.trigger_text_snapshot,
      trigger_narrative_snapshot: row.trigger_narrative_snapshot ?? row.trigger_text_snapshot,
      branch_worthy: false,
      source_trigger_id: null,
      is_selected: false,
      sort_order: row.sort_order,
      template_item_id: row.template_item_id ?? null,
      template_depth: row.template_depth ?? 0,
    }));
    const [taskResult, timelineResult] = await Promise.all([
      tasks.length ? supabase.from("generated_plan_of_action_flight_tasks").insert(tasks) : Promise.resolve({ error: null }),
      timeline.length ? supabase.from("generated_plan_of_action_triggers").insert(timeline) : Promise.resolve({ error: null }),
    ]);
    if (taskResult.error || timelineResult.error) {
      await remove();
      throw new Error(`POA snapshots could not be saved: ${(taskResult.error ?? timelineResult.error)?.message}`);
    }
  }
  return { id: generated.id, versionCode: (generated.version_code as string | null) ?? null };
}
