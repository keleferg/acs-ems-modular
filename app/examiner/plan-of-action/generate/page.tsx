"use client";

import Link from "next/link";

import {
  Check,
  Loader2,
  RefreshCw,
  Shuffle,
  TriangleAlert,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { validateEditableDraft } from "@/lib/poa/validate-editable-draft";
import { questionEventTargets } from "@/lib/poa/question-event-targets";
import { taskAppliesToClass } from "@/lib/poa/task-class-applicability";
import { buildCompliantDraft } from "@/lib/poa/build-compliant-draft";
import { hasCompleteTaskCoverage } from "@/lib/poa/generation-readiness";
import { FlightTaskSequenceEditor } from "@/components/poa/flight-task-sequence-editor";
import { EVENT_SET_SEQUENCE } from "@/lib/poa/event-set-sequence";
import { TimelineEventEditor } from "@/components/poa/timeline-event-editor";

import { createClient } from "@/lib/supabase/client";
import faaAcsComplianceCatalog from "@/data/faa-acs-compliance-catalog.json";
import {
  deriveAllFlightTasksFromAcsCatalog,
  filterFlightTasksByParentCodes,
  normalizeAdditionalMapCodes,
} from "@/lib/poa/flight-tasks";

import { ADDITIONAL_MAPS } from "@/public/ems/js/config/config.js";

function acsPrefix(reference: string) {
  const cleaned = reference.trim().toUpperCase();

  const match = cleaned.match(/^([A-Z]{1,5})\./);

  return match?.[1] ?? null;
}

function faaAcsPrefixesForTestType(testType: PracticalTestType) {
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
   * CFII is intentionally not assigned until
   * its exact FAA ACS family is verified.
   */
  if (certificateCode === "FLIGHT_INSTRUCTOR" && ratingCode === "CFII") {
    return [];
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

function complianceParentCode(reference: string) {
  const cleaned = reference.trim().toUpperCase();

  const match = cleaned.match(/^([A-Z]{2}\.[IVX]+\.[A-Z]+\.[KRS])/);

  return match?.[1] ?? null;
}

type GeneratorScenarioOption = {
  id: string;
  scenario_name: string;
  scenario_brief: string | null;
  departure: string | null;
  destination: string | null;
  aircraft: string | null;
  initial_conditions: string | null;
  examiner_notes: string | null;
};

type CompatibleTrigger = {
  id: string;
  eventSetId: string;
  category: string;
  title: string;
  narrative: string | null;
  weight: number;
};

type GeneratorEventSet = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  maxQuestionCount: number;
};

type ScenarioTimelineItem = {
  kind: string;
  label: string;
  phase: string;
  title: string;
  narrative?: string | null;
  trigger_id?: string | null;
  category?: string | null;
  branch_worthy?: boolean;
  required?: boolean;
  time_pressure?: string | null;
  source_trigger_id?: string | null;
  design_note?: string | null;
  precondition?: string | null;
  event_set_id?: string | null;
  event_set_code?: string | null;
  trigger_option_order?: number | null;
  max_question_count?: number | null;
};

type ScenarioTimelineResult = {
  scenario?: {
    id?: string | null;
    title?: string | null;
    narrative?: string | null;
  } | null;
  altitude?: number | null;
  cross_country_required?: boolean;
  timeline?: ScenarioTimelineItem[];
};

type SavedGeneratedPoa = {
  id: string;
  title: string;
  status: string | null;
  created_at: string;
};

type PracticalTestType = {
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

type AcsApplicability = {
  id: string;
  certificate_name: string;
  acs_reference: string;
};

type QuestionTestTypeJoin = {
  practical_test_type_id: string;
};

type LibraryQuestion = {
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
};

type TriggerQuestionLink = {
  trigger_id: string;
  question_id: string;
  relationship: "primary" | "compatible" | "follow_up";
  weight: number;
  is_required: boolean;
};

type EventQuestionRule = {
  id: string;
  event_set_id: string;
  question_id: string;
  sequence_stage:
    | "foundation"
    | "planning"
    | "immediate_response"
    | "consequence"
    | "resolution";
  trigger_timing: "before_trigger" | "after_trigger";
  sequence_order: number;
  coverage_kind: "K" | "R" | null;
  is_required: boolean;
  applies_to_all_triggers: boolean;
  review_status: "needs_review" | "approved";
  poa_event_set_question_rule_test_types: Array<{
    practical_test_type_id: string;
  }>;
  poa_event_set_question_triggers: Array<{
    trigger_id: string;
  }>;
};

function practicalTestDescription(testType: PracticalTestType) {
  return [
    testType.certificate_name,
    testType.issuance_name,
    testType.category_name,
    testType.class_name,
    testType.rating_name,
  ]
    .filter(Boolean)
    .join(" • ");
}

function splitAcsReferences(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compareAcsReferences(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function taskParentFromReference(reference: string) {
  const cleaned = reference.trim().toUpperCase();
  const match = cleaned.match(/^([A-Z]{1,5}\.[IVX]+\.[A-Z0-9/]+)/);
  return match?.[1] ?? null;
}

function isOriginalIssuance(testType: PracticalTestType) {
  const code = (testType.issuance_code ?? "").trim().toUpperCase();
  const name = (testType.issuance_name ?? "").trim().toLowerCase();

  return (
    code === "ORIGINAL" ||
    code === "INITIAL" ||
    name.includes("original") ||
    name.includes("initial")
  );
}

function hasSameRatingContent(
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

function crossCountryTaskParentsForPrefixes(prefixes: string[]) {
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

export default function GeneratePoaPage() {
  const [testTypeId, setTestTypeId] = useState("");

  const [testType, setTestType] = useState<PracticalTestType | null>(null);

  const [practicalTestTypes, setPracticalTestTypes] = useState<
    PracticalTestType[]
  >([]);

  const [loadingTestTypes, setLoadingTestTypes] = useState(true);

  const [questions, setQuestions] = useState<LibraryQuestion[]>([]);

  const [triggerQuestionLinks, setTriggerQuestionLinks] = useState<
    TriggerQuestionLink[]
  >([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectionMethod, setSelectionMethod] = useState<
    "manual" | "automatic"
  >("manual");

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState("Generated Plan of Action");

  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [generatedPoaId, setGeneratedPoaId] = useState("");

  const [savedPoaVersions, setSavedPoaVersions] = useState<SavedGeneratedPoa[]>(
    [],
  );

  const [scenarioOptions, setScenarioOptions] = useState<
    GeneratorScenarioOption[]
  >([]);

  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  const [loadingScenarios, setLoadingScenarios] = useState(false);

  const [scenarioTimeline, setScenarioTimeline] =
    useState<ScenarioTimelineResult | null>(null);

  const [eventItemOrder, setEventItemOrder] = useState<Record<string, string[]>>({});
  const [questionEventAssignments, setQuestionEventAssignments] = useState<Record<string, string>>({});

  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [scenarioAltitude, setScenarioAltitude] = useState(8000);

  const [loadingPoaVersions, setLoadingPoaVersions] = useState(false);

  const [selectedPoaVersionId, setSelectedPoaVersionId] = useState("new");

  const [additionalRatingHeld, setAdditionalRatingHeld] = useState("");

  const [eventQuestionRules, setEventQuestionRules] = useState<
    EventQuestionRule[]
  >([]);

  const [generatorEventSets, setGeneratorEventSets] = useState<GeneratorEventSet[]>([]);
  const [compatibleTriggers, setCompatibleTriggers] = useState<CompatibleTrigger[]>([]);
  const [selectedTriggerIds, setSelectedTriggerIds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function initializeGenerator() {
      const params = new URLSearchParams(window.location.search);

      const id = params.get("testTypeId")?.trim() ?? "";

      const supabase = createClient();

      const { data, error } = await supabase
        .from("practical_test_types")
        .select(
          `
          id,
          certificate_code,
          issuance_code,
          category_code,
          class_code,
          rating_code,
          certificate_name,
          issuance_name,
          category_name,
          class_name,
          rating_name,
          display_name
        `,
        )
        .eq("is_active", true)
        .order("certificate_name", {
          ascending: true,
        })
        .order("display_name", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (error) {
        setErrorMessage(
          `Practical tests could not be loaded: ${error.message}`,
        );

        setLoading(false);
        setLoadingTestTypes(false);

        return;
      }

      setPracticalTestTypes((data ?? []) as PracticalTestType[]);

      setTestTypeId(id);
      setLoadingTestTypes(false);

      if (!id) {
        setLoading(false);
      }
    }

    void initializeGenerator();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadPage = useCallback(async () => {
    if (!testTypeId) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data: testTypeData, error: testTypeError } = await supabase
      .from("practical_test_types")
      .select(
        `
            id,
          certificate_code,
          issuance_code,
          category_code,
          class_code,
          rating_code,
          certificate_name,
          issuance_name,
          category_name,
          class_name,
          rating_name,
          display_name
          `,
      )
      .eq("id", testTypeId)
      .maybeSingle();

    if (testTypeError || !testTypeData) {
      setErrorMessage(
        testTypeError?.message || "The practical test could not be loaded.",
      );

      setLoading(false);

      return;
    }

    const loadedTestType = testTypeData as PracticalTestType;

    setTestType(loadedTestType);

    setTitle(`${loadedTestType.display_name} Plan of Action`);

    /*
     * Original and additional issuances share one rating-level Question
     * Library. The additional-rating task table narrows the required ACS
     * Tasks later; it does not create a separate set of question content.
     */
    const sharedContentTestTypeIds = practicalTestTypes
      .filter((candidate) => hasSameRatingContent(candidate, loadedTestType))
      .map((candidate) => candidate.id);

    if (!sharedContentTestTypeIds.includes(loadedTestType.id)) {
      sharedContentTestTypeIds.push(loadedTestType.id);
    }

    const { data: questionData, error: questionError } = await supabase
      .from("poa_questions")
      .select(
        `
            id,
            question,
            answer,
            reference,
            topic,
            task_name,
            question_type,
            difficulty,
            created_at,
            poa_question_acs_applicability (
              id,
              certificate_name,
              acs_reference
            ),
            poa_question_practical_test_types!inner (
              practical_test_type_id
            )
          `,
      )
      .eq("is_active", true)
      .in(
        "poa_question_practical_test_types.practical_test_type_id",
        sharedContentTestTypeIds,
      )
      .order("created_at", {
        ascending: true,
      });

    if (questionError) {
      setErrorMessage(
        `Scenario Library could not be loaded: ${questionError.message}`,
      );

      setLoading(false);

      return;
    }

    const loadedQuestions = (questionData ?? []) as LibraryQuestion[];
    setQuestions(loadedQuestions);

    if (loadedQuestions.length > 0) {
      const questionIds = loadedQuestions.map((question) => question.id);
      const [linkResult, ruleResult] = await Promise.all([
        supabase
          .from("poa_trigger_questions")
          .select("trigger_id, question_id, relationship, weight, is_required")
          .in("question_id", questionIds),
        supabase
          .from("poa_event_set_question_rules")
          .select(`
            id,
            event_set_id,
            question_id,
            sequence_stage,
            trigger_timing,
            sequence_order,
            coverage_kind,
            is_required,
            applies_to_all_triggers,
            review_status,
            poa_event_set_question_rule_test_types (
              practical_test_type_id
            ),
            poa_event_set_question_triggers (
              trigger_id
            )
          `)
          .in("question_id", questionIds),
      ]);

      const { data: linkData, error: linkError } = linkResult;

      if (linkError) {
        setErrorMessage(
          `Trigger-to-Question mappings could not be loaded: ${linkError.message}`,
        );
        setLoading(false);
        return;
      }

      setTriggerQuestionLinks((linkData ?? []) as TriggerQuestionLink[]);

      if (ruleResult.error) {
        setErrorMessage(
          `Event Set question sequences could not be loaded: ${ruleResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      const loadedRules = (ruleResult.data ?? []) as EventQuestionRule[];
      setEventQuestionRules(
        loadedRules.filter((rule) => {
          const scopedTestTypes =
            rule.poa_event_set_question_rule_test_types ?? [];
          return (
            scopedTestTypes.length === 0 ||
            scopedTestTypes.some((scope) =>
              sharedContentTestTypeIds.includes(scope.practical_test_type_id),
            )
          );
        }),
      );
    } else {
      setTriggerQuestionLinks([]);
      setEventQuestionRules([]);
    }

    setSelectedIds([]);
    setSelectionMethod("manual");

    setLoading(false);
  }, [practicalTestTypes, testTypeId]);

  useEffect(() => {
    if (testTypeId) {
      void loadPage();
    }
  }, [loadPage, testTypeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedPoaVersions() {
      if (!testTypeId) {
        setSavedPoaVersions([]);
        setSelectedPoaVersionId("new");
        return;
      }

      setLoadingPoaVersions(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setSavedPoaVersions([]);
          setLoadingPoaVersions(false);
        }

        return;
      }

      const { data, error } = await supabase
        .from("generated_plan_of_actions")
        .select(
          `
            id,
            title,
            status,
            created_at
          `,
        )
        .eq("examiner_profile_id", user.id)
        .eq("practical_test_type_id", testTypeId)
        .order("created_at", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (error) {
        setSavedPoaVersions([]);
        setLoadingPoaVersions(false);
        return;
      }

      setSavedPoaVersions((data ?? []) as SavedGeneratedPoa[]);

      setLoadingPoaVersions(false);
    }

    void loadSavedPoaVersions();

    return () => {
      cancelled = true;
    };
  }, [testTypeId]);

  function formatSavedPoaVersion(poa: SavedGeneratedPoa, index: number) {
    const created = new Date(poa.created_at);

    const dateText = Number.isNaN(created.getTime())
      ? ""
      : created.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

    return `Version ${index + 1}${dateText ? ` — ${dateText}` : ""}`;
  }

  function selectPoaVersion(value: string) {
    setSelectedPoaVersionId(value);

    if (value === "new") {
      return;
    }

    window.location.href = `/examiner/plan-of-action/generated/${encodeURIComponent(
      value,
    )}/edit`;
  }

  function selectPracticalTest(nextTestTypeId: string) {
    setTestTypeId(nextTestTypeId);

    setTestType(null);
    setQuestions([]);
    setSelectedIds([]);
    setSelectionMethod("manual");
    setMessage("");
    setErrorMessage("");
    setGeneratedPoaId("");
    setAdditionalRatingHeld("");

    const url = new URL(window.location.href);

    if (nextTestTypeId) {
      url.searchParams.set("testTypeId", nextTestTypeId);
    } else {
      url.searchParams.delete("testTypeId");

      setLoading(false);
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  function acsReferencesForQuestion(question: LibraryQuestion) {
    if (!testType) {
      return [];
    }

    return [
      ...new Set(
        question.poa_question_acs_applicability
          .filter((item) => item.certificate_name === testType.certificate_name)
          .flatMap((item) => splitAcsReferences(item.acs_reference)),
      ),
    ];
  }

  const isAdditionalIssuance = useMemo(() => {
    if (!testType) {
      return false;
    }

    const code = (testType.issuance_code ?? "").trim().toUpperCase();

    const name = (testType.issuance_name ?? "").trim().toLowerCase();

    return code === "ADDITIONAL" || name.includes("additional");
  }, [testType]);

  const additionalMapCertificateKey = useMemo(() => {
    if (!testType) {
      return "";
    }

    const certificate = testType.certificate_name.trim().toLowerCase();

    if (certificate.includes("private")) {
      return "Private";
    }

    if (certificate.includes("commercial")) {
      return "Commercial";
    }

    if (certificate.includes("instrument")) {
      return "Instrument";
    }

    if (certificate.includes("airline transport")) {
      return "ATP";
    }

    if (certificate.includes("flight instructor")) {
      return "CFI";
    }

    return "";
  }, [testType]);

  const additionalTargetRatingKey = useMemo(() => {
    if (!testType) {
      return "";
    }

    const classCode = (testType.class_code ?? "").trim().toUpperCase();

    const ratingName = testType.rating_name.trim();

    /*
     * Instrument practical-test records identify the target as the aircraft
     * category (for example, "Airplane"), while the FAA additional-rating
     * matrix uses the full rating name ("Instrument Airplane"). Normalize
     * that database shape before deriving the held-rating options.
     */
    if (additionalMapCertificateKey === "Instrument") {
      const target = `${classCode} ${ratingName}`.toLowerCase();

      if (target.includes("airplane")) {
        return "Instrument Airplane";
      }

      if (target.includes("helicopter")) {
        return "Instrument Helicopter";
      }
    }

    if (["ASEL", "AMEL", "ASES", "AMES"].includes(classCode)) {
      return classCode;
    }

    return ratingName;
  }, [additionalMapCertificateKey, testType]);

  const additionalHeldOptions = useMemo(() => {
    if (
      !isAdditionalIssuance ||
      !additionalMapCertificateKey ||
      !additionalTargetRatingKey
    ) {
      return [];
    }

    const certificateMaps =
      (ADDITIONAL_MAPS as Record<string, Record<string, unknown>>)[
        additionalMapCertificateKey
      ] ?? {};

    const prefix = `${additionalTargetRatingKey}_from_`;

    return Object.keys(certificateMaps)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .sort((a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [
    additionalMapCertificateKey,
    additionalTargetRatingKey,
    isAdditionalIssuance,
  ]);

  const [generatorTab, setGeneratorTab] = useState<
    "timeline" | "flight_tasks" | "compliance"
  >("timeline");

  const selectedQuestions = useMemo(
    () => questions.filter((question) => selectedIds.includes(question.id)),
    [questions, selectedIds],
  );

  const isPrivatePilotAsel = Boolean(
    testType &&
      (testType.certificate_code ?? "").toUpperCase() === "PRIVATE" &&
      (testType.category_code ?? "").toUpperCase() === "AIRPLANE" &&
      (testType.class_code ?? "").toUpperCase() === "ASEL",
  );

  useEffect(() => {
    setGeneratorTab("timeline");
  }, [isPrivatePilotAsel, testTypeId]);

  const complianceAcsPrefixes = useMemo(() => {
    if (!testType) {
      return [];
    }

    return faaAcsPrefixesForTestType(testType);
  }, [testType]);

  const complianceCodes = useMemo(() => {
    if (complianceAcsPrefixes.length === 0) {
      return [];
    }

    const prefixSet = new Set(complianceAcsPrefixes);

    const codes = new Set<string>();

    for (const entry of faaAcsComplianceCatalog.entries) {
      const prefix = acsPrefix(entry.code);

      if (prefix && prefixSet.has(prefix) && taskAppliesToClass(entry.task_name, testType?.class_code, entry.code)) {
        codes.add(entry.code);
      }
    }

    return [...codes].sort((a, b) => {
      const aParts = a.split(".");
      const bParts = b.split(".");

      const elementOrder: Record<string, number> = {
        K: 0,
        R: 1,
        S: 2,
      };

      const prefixCompare = aParts[0].localeCompare(bParts[0]);

      if (prefixCompare !== 0) {
        return prefixCompare;
      }

      const areaCompare = aParts[1].localeCompare(bParts[1], undefined, {
        numeric: true,
      });

      if (areaCompare !== 0) {
        return areaCompare;
      }

      const taskCompare = aParts[2].localeCompare(bParts[2]);

      if (taskCompare !== 0) {
        return taskCompare;
      }

      return (elementOrder[aParts[3]] ?? 9) - (elementOrder[bParts[3]] ?? 9);
    });
  }, [complianceAcsPrefixes, testType?.class_code]);

  const [selectedFlightTaskCodes, setSelectedFlightTaskCodes] = useState<string[]>([]);
  useEffect(() => { setSelectedFlightTaskCodes([]); }, [testTypeId, additionalRatingHeld]);
  const flightTaskLibrary = (() => {
      let generatedFlightTasks = deriveAllFlightTasksFromAcsCatalog(
        complianceAcsPrefixes,
      ).filter(task => taskAppliesToClass(task.task_name_snapshot, testType?.class_code, task.acs_task_code_snapshot));

      if (isAdditionalIssuance) {
        if (!additionalRatingHeld) return [];

        const certificateMaps =
          (ADDITIONAL_MAPS as Record<string, Record<string, unknown>>)[
            additionalMapCertificateKey
          ] ?? {};

        const mapKey = `${additionalTargetRatingKey}_from_${additionalRatingHeld}`;

        const parentCodes = normalizeAdditionalMapCodes(
          certificateMaps[mapKey],
          complianceAcsPrefixes[0] ?? "",
        );

        if (parentCodes.length === 0) return [];

        generatedFlightTasks = filterFlightTasksByParentCodes(
          generatedFlightTasks,
          parentCodes,
        );
      }

      const commercialSingleEngineOriginal =
        (testType?.certificate_code ?? "").toUpperCase() === "COMMERCIAL" &&
        (testType?.category_code ?? "").toUpperCase() === "AIRPLANE" &&
        ["ASEL", "ASES"].includes((testType?.class_code ?? "").toUpperCase()) &&
        Boolean(testType && isOriginalIssuance(testType));

      if (commercialSingleEngineOriginal) {
        const selectedParents = new Set(
          selectedQuestions.flatMap((question) =>
            acsReferencesForQuestion(question)
              .map((reference) => taskParentFromReference(reference))
              .filter((value): value is string => Boolean(value)),
          ),
        );

        const chooseFromPair = (first: string, second: string) => {
          if (selectedParents.has(first) && !selectedParents.has(second)) {
            return first;
          }

          if (selectedParents.has(second) && !selectedParents.has(first)) {
            return second;
          }

          return first;
        };

        const firstChoice = chooseFromPair("CA.V.A", "CA.V.B");

        const secondChoice = chooseFromPair("CA.V.C", "CA.V.D");

        generatedFlightTasks = generatedFlightTasks
          .filter(
            (task) =>
              !["CA.V.A", "CA.V.B", "CA.V.C", "CA.V.D"].includes(
                task.acs_task_code_snapshot,
              ) ||
              task.acs_task_code_snapshot === firstChoice ||
              task.acs_task_code_snapshot === secondChoice,
          )
          .map((task, index) => ({
            ...task,
            sort_order: (index + 1) * 10,
          }));
      }

    return generatedFlightTasks;
  })();
  const selectedFlightTaskDrafts = selectedFlightTaskCodes.flatMap((code) => flightTaskLibrary.filter((task) => task.acs_task_code_snapshot === code)).map((task, index) => ({ ...task, sort_order: (index + 1) * 10 }));
  const flightComplianceCodes = flightTaskLibrary.map((task) => `${task.acs_task_code_snapshot}.S`);
  const selectedFlightComplianceCodes = new Set(selectedFlightTaskDrafts.map((task) => `${task.acs_task_code_snapshot}.S`));

  const requiredComplianceCodes = useMemo(() => {
    let codes = complianceCodes.filter((code) => !code.endsWith(".S"));

    if (isAdditionalIssuance && additionalRatingHeld) {
      const certificateMaps =
        (ADDITIONAL_MAPS as Record<string, Record<string, unknown>>)[
          additionalMapCertificateKey
        ] ?? {};
      const mapKey = `${additionalTargetRatingKey}_from_${additionalRatingHeld}`;
      const requiredParents = new Set(
        normalizeAdditionalMapCodes(
          certificateMaps[mapKey],
          complianceAcsPrefixes[0] ?? "",
        ),
      );

      codes = codes.filter((code) => {
        const parent = taskParentFromReference(code);
        return Boolean(parent && requiredParents.has(parent));
      });
    }

    const commercialSingleEngine =
      (testType?.certificate_code ?? "").toUpperCase() === "COMMERCIAL" &&
      (testType?.category_code ?? "").toUpperCase() === "AIRPLANE" &&
      ["ASEL", "ASES"].includes((testType?.class_code ?? "").toUpperCase()) &&
      Boolean(testType && isOriginalIssuance(testType));

    if (commercialSingleEngine) {
      codes = codes.filter((code) => {
        const parent = taskParentFromReference(code);
        return parent !== "CA.V.B" && parent !== "CA.V.D";
      });
    }

    return codes;
  }, [
    additionalMapCertificateKey,
    additionalRatingHeld,
    additionalTargetRatingKey,
    complianceAcsPrefixes,
    complianceCodes,
    isAdditionalIssuance,
    testType,
  ]);

  const coveredComplianceCodes = useMemo(() => {
    const covered = new Set<string>();

    const applicablePrefixes = new Set(complianceAcsPrefixes);

    for (const question of selectedQuestions) {
      for (const applicability of question.poa_question_acs_applicability) {
        for (const reference of applicability.acs_reference.split(/[,;\n]+/)) {
          const prefix = acsPrefix(reference);

          if (!prefix || !applicablePrefixes.has(prefix)) {
            continue;
          }

          const code = complianceParentCode(reference);

          /*
           * Knowledge and Risk are satisfied by selected
           * Scenario Library questions.
           *
           * Skills will be satisfied later by the flight
           * maneuver compliance source.
           */
          if (code && !code.endsWith(".S")) {
            covered.add(code);
          }
        }
      }
    }

    return covered;
  }, [selectedQuestions, complianceAcsPrefixes]);

  const displayedComplianceCodes = [...requiredComplianceCodes, ...flightComplianceCodes];
  const coveredComplianceCount = displayedComplianceCodes.filter((code) =>
    coveredComplianceCodes.has(code) || selectedFlightComplianceCodes.has(code),
  ).length;

  const missingComplianceCodes = requiredComplianceCodes.filter(
    (code) => !coveredComplianceCodes.has(code),
  );

  const allRatingTasksCovered = hasCompleteTaskCoverage(
    displayedComplianceCodes,
    new Set([...coveredComplianceCodes, ...selectedFlightComplianceCodes]),
  );

  function selectedTriggerForRule(rule: EventQuestionRule) {
    if (rule.applies_to_all_triggers) {
      return null;
    }

    const selectedForEvent = new Set(selectedTriggerIds[rule.event_set_id] ?? []);
    return (
      rule.poa_event_set_question_triggers.find((link) =>
        selectedForEvent.has(link.trigger_id),
      )?.trigger_id ?? null
    );
  }

  function ruleAppliesToSelectedTriggers(rule: EventQuestionRule) {
    return rule.applies_to_all_triggers || Boolean(selectedTriggerForRule(rule));
  }

  function acsReferenceForQuestion(question: LibraryQuestion) {
    return acsReferencesForQuestion(question)[0] ?? "";
  }

  useEffect(() => {
    let cancelled = false;

    async function loadGeneratorScenarios() {
      if (!testType?.id) {
        setScenarioOptions([]);
        setSelectedScenarioId("");
        return;
      }

      setLoadingScenarios(true);

      const supabase = createClient();

      const { data: mappings, error: mappingError } = await supabase
        .from("poa_scenario_practical_test_types")
        .select("scenario_id")
        .eq("practical_test_type_id", testType.id);

      if (cancelled) {
        return;
      }

      const mappedIds = mappingError
        ? []
        : (mappings ?? [])
            .map((row) => String(row.scenario_id || ""))
            .filter(Boolean);

      let scenarioQuery = supabase
        .from("poa_scenarios")
        .select(
          `
          id,
          scenario_name,
          scenario_brief,
          departure,
          destination,
          aircraft,
          initial_conditions,
          examiner_notes
        `,
        )
        .eq("is_active", true)
        .order("scenario_name", {
          ascending: true,
        });

      if (mappedIds.length > 0) {
        scenarioQuery = scenarioQuery.in("id", mappedIds);
      }

      const { data: scenarios, error: scenarioError } = await scenarioQuery;

      if (cancelled) {
        return;
      }

      if (scenarioError) {
        setScenarioOptions([]);
        setSelectedScenarioId("");
        setLoadingScenarios(false);
        return;
      }

      setScenarioOptions((scenarios ?? []) as GeneratorScenarioOption[]);

      setSelectedScenarioId("");
      setLoadingScenarios(false);
    }

    void loadGeneratorScenarios();

    return () => {
      cancelled = true;
    };
  }, [testType?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadTriggerChoices() {
      setScenarioTimeline(null);
      setGeneratorEventSets([]);
      setCompatibleTriggers([]);
      setSelectedTriggerIds({});

      if (!selectedScenarioId) return;

      const supabase = createClient();
      const { data: sequenceRows, error: sequenceError } = await supabase
        .from("poa_event_sets")
        .select("id, code, name, description, default_phase, is_active")
        .in("code", EVENT_SET_SEQUENCE.map((eventSet) => eventSet.code))
        .eq("is_active", true);

      if (cancelled) return;
      if (sequenceError) { setErrorMessage(`Event sets could not be loaded: ${sequenceError.message}`); return; }
      const eventSets = EVENT_SET_SEQUENCE.flatMap((definition, index) => {
        const row = (sequenceRows ?? []).find((eventSet) => eventSet.code === definition.code);
        return row ? [{ id: row.id, code: row.code, name: definition.name, description: row.description, sortOrder: index + 1, maxQuestionCount: definition.maxQuestionCount }] : [];
      });
      if (eventSets.length !== EVENT_SET_SEQUENCE.length) {
        setErrorMessage("The shared eight-event-set library is incomplete. Restore the missing event sets before generating.");
        return;
      }

      const eventSetIds = eventSets.map((eventSet) => eventSet.id);
      if (eventSetIds.length === 0) return;

      const { data: optionRows, error: optionError } = await supabase
        .from("poa_event_set_trigger_options")
        .select(`
          event_set_id,
          option_order,
          is_active,
          poa_triggers!inner (
            id, category, trigger_text, trigger_narrative, is_active, trigger_role
          )
        `)
        .in("event_set_id", eventSetIds)
        .eq("is_active", true)
        .eq("poa_triggers.is_active", true)
        .eq("poa_triggers.trigger_role", "operational")
        .order("option_order", { ascending: true });

      if (cancelled || optionError) return;

      const choices = (optionRows ?? []).map((row) => {
        const related = Array.isArray(row.poa_triggers)
          ? row.poa_triggers[0]
          : row.poa_triggers;
        return {
          id: related?.id ?? "",
          eventSetId: row.event_set_id,
          category: related?.category ?? "event",
          title: related?.trigger_text ?? "Trigger",
          narrative: related?.trigger_narrative ?? null,
          weight: 100 - row.option_order,
        };
      }).filter((choice) => choice.id);

      setGeneratorEventSets(eventSets);
      setCompatibleTriggers(choices);
      setSelectedTriggerIds(Object.fromEntries(eventSets.map((eventSet) => [eventSet.id, []])));
    }

    void loadTriggerChoices();
    return () => { cancelled = true; };
  }, [selectedScenarioId]);

  useEffect(() => {
    setScenarioTimeline(null);
    setQuestionEventAssignments({});
    setEventItemOrder({});
  }, [testType?.id, additionalRatingHeld, selectedScenarioId]);

  useEffect(() => {
    setScenarioTimeline((current) => {
      if (!current) return current;
      const timeline = (current.timeline ?? []).filter((item) => item.kind !== "trigger_option" && !(item.kind === "gap" && item.event_set_id && (current.timeline ?? []).some((event) => event.kind === "event_set" && event.event_set_id === item.event_set_id))).flatMap((item) => {
        if (item.kind !== "event_set" || !item.event_set_id) return [item];
        const choices = selectedTriggerIds[item.event_set_id] ?? [];
        const options: ScenarioTimelineItem[] = choices.flatMap((id, index) => {
          const trigger = compatibleTriggers.find((candidate) => candidate.id === id && candidate.eventSetId === item.event_set_id);
          return trigger ? [{ kind: "trigger_option", label: `${item.title} — Option ${index + 1}`, phase: item.phase, title: trigger.title, narrative: trigger.narrative, trigger_id: id, category: trigger.category, event_set_id: item.event_set_id, event_set_code: item.event_set_code, trigger_option_order: index + 1, branch_worthy: true }] : [];
        });
        const order = eventItemOrder[item.event_set_id] ?? [];
        options.sort((a, b) => (order.includes(`trigger:${a.trigger_id}`) ? order.indexOf(`trigger:${a.trigger_id}`) : Number.MAX_SAFE_INTEGER) - (order.includes(`trigger:${b.trigger_id}`) ? order.indexOf(`trigger:${b.trigger_id}`) : Number.MAX_SAFE_INTEGER));
        return [item, ...options, ...(options.length >= 1 ? [] : [{ kind: "gap", label: item.title, title: "Choose at least one trigger", phase: item.phase, event_set_id: item.event_set_id }])];
      });
      return { ...current, timeline };
    });
  }, [selectedTriggerIds, compatibleTriggers, eventItemOrder]);

  const selectedScenario = useMemo(
    () =>
      scenarioOptions.find((scenario) => scenario.id === selectedScenarioId) ??
      null,
    [scenarioOptions, selectedScenarioId],
  );

  function removeTriggerChoice(eventSetId: string, triggerId: string) {
    setSelectedTriggerIds((current) => ({ ...current, [eventSetId]: (current[eventSetId] ?? []).filter((id) => id !== triggerId) }));
  }

  const timelineEditorEventSets = (scenarioTimeline?.timeline ?? [])
    .filter((item) => item.kind === "event_set" && item.event_set_id)
    .map((item) => generatorEventSets.find((eventSet) => eventSet.id === item.event_set_id))
    .filter((eventSet): eventSet is GeneratorEventSet => Boolean(eventSet));

  const timelineEditorQuestions = questions.map((question) => {
    const rules = eventQuestionRules.filter((rule) => rule.question_id === question.id && rule.review_status === "approved");
    const assignedEventSetId = questionEventAssignments[question.id] ?? timelineEditorEventSets.find((eventSet) => rules.some((rule) => eventSet.id === rule.event_set_id))?.id;
    return { id: question.id, title: question.question, eventSetIds: questionEventTargets(question.id, eventQuestionRules, timelineEditorEventSets.map((eventSet) => eventSet.id)), assignedEventSetId, selected: selectedIds.includes(question.id) };
  });

  const effectiveEventItemOrder = Object.fromEntries(timelineEditorEventSets.map((eventSet) => {
    const active = [
      ...timelineEditorQuestions.filter((question) => question.selected && question.assignedEventSetId === eventSet.id).map((question) => `question:${question.id}`),
      ...(selectedTriggerIds[eventSet.id] ?? []).map((id) => `trigger:${id}`),
    ];
    const manual = (eventItemOrder[eventSet.id] ?? []).filter((key) => active.includes(key));
    return [eventSet.id, [...manual, ...active.filter((key) => !manual.includes(key))]];
  }));

  function assignTimelineEntry(kind: "question" | "trigger", id: string, eventSetId: string) {
    setErrorMessage("");
    if (kind === "trigger") {
      if ((selectedTriggerIds[eventSetId] ?? []).includes(id)) return true;
      const trigger = compatibleTriggers.find((item) => item.id === id && item.eventSetId === eventSetId);
      if (!trigger) { setErrorMessage("This trigger is not compatible with the event set."); return false; }
      setSelectedTriggerIds((current) => {
        const existing = current[eventSetId] ?? [];
        return existing.includes(id) ? current : { ...current, [eventSetId]: [...existing, id] };
      });
      return true;
    }
    const eventSet = generatorEventSets.find((item) => item.id === eventSetId);
    const assigned = timelineEditorQuestions.filter((question) => question.selected && question.assignedEventSetId === eventSetId && question.id !== id);
    if (eventSet && assigned.length >= eventSet.maxQuestionCount) {
      setErrorMessage(`${eventSet.name} allows at most ${eventSet.maxQuestionCount} questions. Remove a question first.`);
      return false;
    }
    setSelectionMethod("manual");
    setQuestionEventAssignments((current) => ({ ...current, [id]: eventSetId }));
    setSelectedIds((current) => current.includes(id) ? current : [...current, id]);
    return true;
  }

  async function buildScenarioTimeline(automaticallyPopulate = false) {
    if (!testType) {
      return;
    }

    setLoadingTimeline(true);
    setErrorMessage("");
    setMessage("");

    try {
      if (!selectedScenarioId) {
        throw new Error("Select a Scenario Library record before building the timeline.");
      }

      if (isAdditionalIssuance && !additionalRatingHeld) {
        throw new Error(
          "Select the rating already held before building the Scenario Timeline.",
        );
      }

      const draft = automaticallyPopulate ? buildCompliantDraft({
        events: generatorEventSets,
        triggers: compatibleTriggers,
        requiredCodes: requiredComplianceCodes,
        requiredQuestionIds: [],
        links: triggerQuestionLinks,
        questions: questions.map(question => ({
          id: question.id,
          codes: [...new Set(question.poa_question_acs_applicability.flatMap(item => splitAcsReferences(item.acs_reference)).filter(reference => complianceAcsPrefixes.includes(acsPrefix(reference) ?? "")).map(complianceParentCode).filter((code): code is string => Boolean(code && !code.endsWith(".S"))))],
          placements: eventQuestionRules.filter(rule => rule.question_id === question.id && rule.review_status === "approved" && generatorEventSets.some(event => event.id === rule.event_set_id)).map(rule => ({ eventSetId: rule.event_set_id, afterTrigger: rule.trigger_timing === "after_trigger", order: rule.sequence_order, required: rule.is_required, triggerIds: rule.applies_to_all_triggers ? undefined : rule.poa_event_set_question_triggers.map(link => link.trigger_id) })),
        })),
      }) : null;
      const triggerSelections = draft?.triggers ?? selectedTriggerIds;

      const crossCountryParents = new Set(
        crossCountryTaskParentsForPrefixes(complianceAcsPrefixes),
      );

      let crossCountryRequired = crossCountryParents.size > 0;

      /*
       * Additional ratings must use the same
       * ACS task map already used by the POA
       * flight-task resolver.
       */
      if (isAdditionalIssuance) {
        const certificateMaps =
          (ADDITIONAL_MAPS as Record<string, Record<string, unknown>>)[
            additionalMapCertificateKey
          ] ?? {};

        const mapKey = `${additionalTargetRatingKey}_from_${additionalRatingHeld}`;

        const requiredParents = normalizeAdditionalMapCodes(
          certificateMaps[mapKey],
          complianceAcsPrefixes[0] ?? "",
        );

        if (requiredParents.length === 0) {
          throw new Error(
            `No Additional Rating ACS task map was found for ${mapKey}.`,
          );
        }

        crossCountryRequired = requiredParents.some((parent) =>
          crossCountryParents.has(parent),
        );
      }

      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "examiner_generate_poa_scenario_timeline",
        {
          p_scenario_id: selectedScenarioId,
          p_practical_test_type_id: testType.id,
          p_required_acs_codes: requiredComplianceCodes,
          p_cross_country_required: crossCountryRequired,
          p_altitude: Number.isFinite(scenarioAltitude)
            ? Math.round(scenarioAltitude)
            : 8000,
          p_trigger_selections: triggerSelections,
        },
      );

      if (error) {
        throw new Error(
          `Scenario Timeline could not be generated: ${error.message}`,
        );
      }

      const rawResult = data as ScenarioTimelineResult;
      const rawItems = rawResult.timeline ?? [];
      const result: ScenarioTimelineResult = {
        ...rawResult,
        timeline: [
          ...rawItems.filter((item) => !item.event_set_id),
          ...generatorEventSets.flatMap((eventSet) => {
            const options: ScenarioTimelineItem[] = (triggerSelections[eventSet.id] ?? []).flatMap((id, index) => {
              const trigger = compatibleTriggers.find((item) => item.eventSetId === eventSet.id && item.id === id);
              return trigger ? [{ kind: "trigger_option", label: `${eventSet.name} — Option ${index + 1}`, phase: eventSet.code.toLowerCase(), title: trigger.title, narrative: trigger.narrative, trigger_id: id, event_set_id: eventSet.id, event_set_code: eventSet.code, category: trigger.category, trigger_option_order: index + 1 }] : [];
            });
            return [{ kind: "event_set", label: "Event Set", title: eventSet.name, narrative: eventSet.description, phase: eventSet.code.toLowerCase(), event_set_id: eventSet.id, event_set_code: eventSet.code, max_question_count: eventSet.maxQuestionCount }, ...options, ...(options.length >= 1 ? [] : [{ kind: "gap", label: eventSet.name, title: "Choose at least one trigger", phase: eventSet.code.toLowerCase(), event_set_id: eventSet.id }])];
          }),
        ],
      };

      setScenarioTimeline(result);
      if (draft) {
        setSelectedTriggerIds(draft.triggers);
        setSelectedIds(draft.questionIds);
        setQuestionEventAssignments(draft.assignments);
        setEventItemOrder(draft.order);
        setSelectedFlightTaskCodes(flightTaskLibrary.map(task => task.acs_task_code_snapshot));
        setSelectionMethod("automatic");
        setGeneratorTab("timeline");
        setMessage(`POA draft built. ${draft.provisionalQuestionIds.length ? `${draft.provisionalQuestionIds.length} questions were placed provisionally; review their event sets. ` : ""}Review the Timeline, Flight Tasks, and Compliance tabs before generating.`);
        if (draft.missingCodes.length) {
          setErrorMessage(`The draft still needs ${draft.missingCodes.length} Knowledge/Risk groups. Review Compliance for gaps; final generation remains disabled until they are covered.`);
        }
        return;
      }

      const itemCount = result.timeline?.length ?? 0;

      const branchCount =
        result.timeline?.filter((item) => item.kind === "trigger_option").length ?? 0;

      setMessage(
        `Scenario Timeline generated with ${itemCount} timeline item${
          itemCount === 1 ? "" : "s"
        } and ${branchCount} trigger option${
          branchCount === 1 ? "" : "s"
        }. Cross-country planning ${
          result.cross_country_required ? "is required" : "is not required"
        } for this ACS task set.`,
      );
    } catch (error) {
      if (!automaticallyPopulate) setScenarioTimeline(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Scenario Timeline could not be generated.",
      );
    } finally {
      setLoadingTimeline(false);
    }
  }

  async function generatePoa() {
    if (!testType) {
      return;
    }

    setMessage("");
    setErrorMessage("");
    setGeneratedPoaId("");

    if (selectedQuestions.length === 0) {
      setErrorMessage("Select at least one question.");

      return;
    }

    if (!selectedScenario || !scenarioTimeline) {
      setErrorMessage("Select a scenario and build its Event Sequence before generating.");
      return;
    }

    try {
      const incompleteTriggerSets = generatorEventSets.filter(
        (eventSet) => (selectedTriggerIds[eventSet.id] ?? []).length < 1,
      );
      if (incompleteTriggerSets.length > 0) {
        throw new Error(
          `Choose at least one trigger for: ${incompleteTriggerSets.map((eventSet) => eventSet.name).join(", ")}.`,
        );
      }

    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Review the trigger selections.");
      return;
    }

    const timelineGaps = (scenarioTimeline.timeline ?? []).filter(
      (item) => item.kind === "gap",
    );

    if (timelineGaps.length > 0) {
      setErrorMessage(
        `Resolve ${timelineGaps.length} required Event Set gap${timelineGaps.length === 1 ? "" : "s"} before generating.`,
      );
      return;
    }

    if (missingComplianceCodes.length > 0) {
      setGeneratorTab("compliance");
      setErrorMessage(
        `The POA is missing ${missingComplianceCodes.length} required ACS Knowledge/Risk group${missingComplianceCodes.length === 1 ? "" : "s"}. Select mapped questions before generating.`,
      );
      return;
    }

    for (const eventSet of timelineEditorEventSets) {
      const count = timelineEditorQuestions.filter((question) => question.selected && question.assignedEventSetId === eventSet.id).length;
      if (count > eventSet.maxQuestionCount) {
        setErrorMessage(`${eventSet.name} exceeds its maximum of ${eventSet.maxQuestionCount} questions.`);
        return;
      }
    }
    const invalidAssignment = timelineEditorQuestions.find((question) => question.selected && questionEventAssignments[question.id] && !question.eventSetIds.includes(questionEventAssignments[question.id]));
    if (invalidAssignment) {
      setErrorMessage("A question is no longer compatible with its event set's trigger choices. Reassign or remove it before generating.");
      return;
    }

    const selectedCandidateTriggerIds = new Set(Object.values(selectedTriggerIds).flat());
    const missingRequiredTriggerQuestions = triggerQuestionLinks.filter((link) =>
      link.is_required && selectedCandidateTriggerIds.has(link.trigger_id) && !selectedIds.includes(link.question_id),
    );
    if (missingRequiredTriggerQuestions.length > 0) {
      setErrorMessage("Add the required conditional questions for your selected triggers before generating the POA.");
      return;
    }

    const missingFlightTasks = flightTaskLibrary.filter((task) => task.is_required && !selectedFlightTaskCodes.includes(task.acs_task_code_snapshot));
    if (missingFlightTasks.length > 0) {
      setGeneratorTab("compliance");
      setErrorMessage(`Add ${missingFlightTasks.length} required flight task${missingFlightTasks.length === 1 ? "" : "s"} to the Flight Tasks sequence before generating.`);
      return;
    }

    const draftIssues = validateEditableDraft({
      events: timelineEditorEventSets,
      questions: timelineEditorQuestions,
      triggers: selectedTriggerIds,
      compatibleTriggers,
      allTasksCovered: allRatingTasksCovered,
    });
    if (draftIssues.length) {
      setErrorMessage(`Resolve the oral structure before generating. ${draftIssues.join(" ")}`);
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Enter a Plan of Action title.");

      return;
    }

    if (selectedQuestions.length > 75) {
      const proceed = window.confirm(
        `${selectedQuestions.length} questions are selected. This is unusually large for a practical-test POA. Continue and freeze all ${selectedQuestions.length} questions?`,
      );

      if (!proceed) {
        return;
      }
    }

    setGenerating(true);

    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be signed in as an examiner.");
      }

      const { data: generated, error: generatedError } = await supabase
        .from("generated_plan_of_actions")
        .insert({
          examiner_profile_id: user.id,

          practical_test_type_id: testType.id,

          title: title.trim(),

          scenario_name: selectedScenario?.scenario_name ?? null,

          scenario_id: selectedScenario.id,

          scenario_timeline_snapshot: (scenarioTimeline.timeline ?? []).map((item) => item.kind === "event_set" && item.event_set_id ? { ...item, item_order: effectiveEventItemOrder[item.event_set_id] ?? [] } : item),

          compliance_snapshot: {
            required: displayedComplianceCodes,
            covered: [...coveredComplianceCodes, ...selectedFlightComplianceCodes].sort(compareAcsReferences),
            missing: [...missingComplianceCodes, ...flightComplianceCodes.filter((code) => !selectedFlightComplianceCodes.has(code))],
          },

          cross_country_required: Boolean(
            scenarioTimeline.cross_country_required,
          ),

          selection_method: selectionMethod,

          status: "ready",

          notes: `Generated from Scenario Library for ${testType.display_name}. Selection method: ${selectionMethod}.`,
        })
        .select("id")
        .single();

      if (generatedError || !generated) {
        throw new Error(
          generatedError?.message ||
            "The generated POA record could not be created.",
        );
      }

      /*
       * ACS references prove coverage; they do not define narrative order.
       * Freeze questions by Event Set, pre/post-trigger timing, instructional
       * stage, and the examiner-approved sequence position. Unmapped questions
       * remain visible at the end so they cannot disappear silently.
       */
      const eventSetOrder = new Map<string, number>();
      for (const item of scenarioTimeline.timeline ?? []) {
        if (item.event_set_id && !eventSetOrder.has(item.event_set_id)) {
          eventSetOrder.set(item.event_set_id, eventSetOrder.size);
        }
      }

      const stageOrder: Record<EventQuestionRule["sequence_stage"], number> = {
        foundation: 0,
        planning: 1,
        immediate_response: 2,
        consequence: 3,
        resolution: 4,
      };

      const ruleForQuestion = (questionId: string) =>
        eventQuestionRules
          .filter(
            (rule) =>
              rule.question_id === questionId &&
              rule.review_status === "approved" &&
              (!questionEventAssignments[questionId] || rule.event_set_id === questionEventAssignments[questionId]) &&
              eventSetOrder.has(rule.event_set_id) &&
              ruleAppliesToSelectedTriggers(rule),
          )
          .sort(
            (a, b) =>
              (eventSetOrder.get(a.event_set_id) ?? Number.MAX_SAFE_INTEGER) -
                (eventSetOrder.get(b.event_set_id) ?? Number.MAX_SAFE_INTEGER) ||
              stageOrder[a.sequence_stage] - stageOrder[b.sequence_stage] ||
              a.sequence_order - b.sequence_order,
          )[0] ?? null;

      const orderedSelected = selectedQuestions
        .map((question) => ({
          question,
          rule: ruleForQuestion(question.id),
        }))
        .sort((a, b) => {
          const aEvent = questionEventAssignments[a.question.id] ?? a.rule?.event_set_id;
          const bEvent = questionEventAssignments[b.question.id] ?? b.rule?.event_set_id;
          if (aEvent || bEvent) {
            const eventDifference = (aEvent ? eventSetOrder.get(aEvent) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER) - (bEvent ? eventSetOrder.get(bEvent) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);
            if (eventDifference) return eventDifference;
            if (aEvent && aEvent === bEvent) {
              const keys = effectiveEventItemOrder[aEvent] ?? [];
              const difference = keys.indexOf(`question:${a.question.id}`) - keys.indexOf(`question:${b.question.id}`);
              if (difference) return difference;
            }
          }

          if (!a.rule && !b.rule) {
            return (
              compareAcsReferences(
                acsReferenceForQuestion(a.question),
                acsReferenceForQuestion(b.question),
              ) || a.question.question.localeCompare(b.question.question)
            );
          }

          if (!a.rule) return 1;
          if (!b.rule) return -1;

          return (
            (eventSetOrder.get(a.rule.event_set_id) ?? Number.MAX_SAFE_INTEGER) -
              (eventSetOrder.get(b.rule.event_set_id) ?? Number.MAX_SAFE_INTEGER) ||
            ((effectiveEventItemOrder[a.rule.event_set_id] ?? []).indexOf(`question:${a.question.id}`) - (effectiveEventItemOrder[b.rule.event_set_id] ?? []).indexOf(`question:${b.question.id}`)) ||
            stageOrder[a.rule.sequence_stage] - stageOrder[b.rule.sequence_stage] ||
            a.rule.sequence_order - b.rule.sequence_order ||
            a.question.question.localeCompare(b.question.question)
          );
        });

      const generatedFlightTasks = selectedFlightTaskDrafts;

      const snapshots = orderedSelected.map(({ question, rule }, index) => ({
        generated_plan_of_action_id: generated.id,

        question_library_id: question.id,

        acs_reference_snapshot: acsReferenceForQuestion(question),

        acs_references_snapshot: acsReferencesForQuestion(question),

        question_snapshot: question.question,

        answer_snapshot: question.answer,

        reference_snapshot: question.reference,

        topic_snapshot: question.topic,

        task_name_snapshot: question.task_name,

        question_type_snapshot: question.question_type,

        event_set_id: questionEventAssignments[question.id] ?? rule?.event_set_id ?? null,

        question_rule_id: rule?.id ?? null,

        sequence_stage: rule?.sequence_stage ?? null,

        trigger_timing: rule && eventItemOrder[rule.event_set_id]
          ? (effectiveEventItemOrder[rule.event_set_id] ?? []).slice(0, (effectiveEventItemOrder[rule.event_set_id] ?? []).indexOf(`question:${question.id}`)).some((key) => key.startsWith("trigger:")) ? "after_trigger" : "before_trigger"
          : rule?.trigger_timing ?? null,

        trigger_option_id: (rule ? selectedTriggerForRule(rule) : null) ?? triggerQuestionLinks.find(link => link.question_id === question.id && selectedCandidateTriggerIds.has(link.trigger_id) && compatibleTriggers.some(trigger => trigger.id === link.trigger_id && trigger.eventSetId === (questionEventAssignments[question.id] ?? rule?.event_set_id)))?.trigger_id ?? null,

        sort_order: (index + 1) * 10,
      }));

      const { error: snapshotError } = await supabase
        .from("generated_plan_of_action_questions")
        .insert(snapshots);

      if (snapshotError) {
        await supabase
          .from("generated_plan_of_actions")
          .delete()
          .eq("id", generated.id);

        throw new Error(
          `Question snapshots could not be saved: ${snapshotError.message}`,
        );
      }

      const { error: flightTaskError } = await supabase.rpc(
        "examiner_replace_generated_poa_flight_tasks",
        {
          p_generated_plan_of_action_id: generated.id,
          p_tasks: generatedFlightTasks,
        },
      );

      if (flightTaskError) {
        await supabase
          .from("generated_plan_of_actions")
          .delete()
          .eq("id", generated.id);

        throw new Error(
          `Flight task snapshots could not be saved: ${flightTaskError.message}`,
        );
      }

      const timelineSnapshots = (scenarioTimeline.timeline ?? []).map(
        (item, index) => ({
          trigger_library_id: item.trigger_id ?? null,
          event_set_id: item.event_set_id ?? null,
          placement_section: ["departure", "cruise", "branch", "arrival"].includes(
            item.phase,
          )
            ? "flight"
            : "oral",
          timeline_kind: item.kind,
          phase: item.phase,
          category_snapshot: item.category ?? null,
          trigger_text_snapshot: item.title,
          trigger_narrative_snapshot: item.narrative ?? item.title,
          branch_worthy: Boolean(item.branch_worthy),
          source_trigger_id: item.source_trigger_id ?? null,
          sort_order: (index + 1) * 10,
        }),
      );

      const { error: timelineSaveError } = await supabase.rpc(
        "examiner_replace_generated_poa_triggers",
        {
          p_generated_plan_of_action_id: generated.id,
          p_triggers: timelineSnapshots,
        },
      );

      if (timelineSaveError) {
        await supabase
          .from("generated_plan_of_actions")
          .delete()
          .eq("id", generated.id);
        throw new Error(
          `Scenario timeline snapshots could not be saved: ${timelineSaveError.message}`,
        );
      }

      setGeneratedPoaId(generated.id);

      setMessage(
        `${title.trim()} generated successfully with ${selectedQuestions.length} question${
          selectedQuestions.length === 1 ? "" : "s"
        } and ${generatedFlightTasks.length} flight task${
          generatedFlightTasks.length === 1 ? "" : "s"
        }.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Plan of Action could not be generated.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Plan of Action Generator
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Generate POA
          </h1>

          {testType ? (
            <>
              <p className="mt-2 text-lg font-semibold text-slate-800">
                {testType.display_name}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {practicalTestDescription(testType)}
              </p>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/examiner/plan-of-action"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Plan of Action
          </Link>

          <Link
            href="/examiner/plan-of-action/scenarios"
            className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100"
          >
            Scenario Library
          </Link>

          <button
            type="button"
            onClick={() => void loadPage()}
            disabled={!testTypeId}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold text-slate-900">Practical Test</p>

            <p className="mt-1 text-xs text-slate-500">
              Select the certificate and rating for this Plan of Action.
            </p>
          </div>

          <select
            value={testTypeId}
            onChange={(event) => selectPracticalTest(event.target.value)}
            disabled={loadingTestTypes}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
          >
            <option value="">
              {loadingTestTypes
                ? "Loading practical tests…"
                : "Select a practical test"}
            </option>

            {practicalTestTypes.map((practicalTest) => (
              <option key={practicalTest.id} value={practicalTest.id}>
                {practicalTest.display_name}
                {" — "}
                {practicalTestDescription(practicalTest)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {!loading && testType ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  POA Version
                </span>

                <select
                  value={selectedPoaVersionId}
                  onChange={(event) => selectPoaVersion(event.target.value)}
                  disabled={loadingPoaVersions}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
                >
                  <option value="new">
                    {loadingPoaVersions
                      ? "Loading saved POAs…"
                      : `New POA — ${testType.display_name}`}
                  </option>

                  {savedPoaVersions.map((poa, index) => (
                    <option key={poa.id} value={poa.id}>
                      {formatSavedPoaVersion(poa, index)}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    New POA Title
                  </span>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500"
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Selected Questions
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-2xl font-bold text-slate-900">
                  {selectedIds.length}
                </div>
              </div>
            </div>
          </section>
      ) : null}

      <div className="mt-6 flex gap-1 border-b border-slate-300" role="tablist" aria-label="POA generator views">
        {(["timeline", "flight_tasks", "compliance"] as const).map((tab) => (
          <button key={tab} type="button" role="tab" id={`poa-tab-${tab}`} aria-controls={`poa-panel-${tab}`} aria-selected={generatorTab === tab} onClick={() => setGeneratorTab(tab)} className={`border-b-2 px-6 py-3 text-sm font-bold ${generatorTab === tab ? "border-sky-700 text-sky-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {tab === "timeline" ? "Timeline" : tab === "flight_tasks" ? "Flight Tasks" : "Compliance"}
          </button>
        ))}
      </div>



      {testType && generatorTab === "timeline" ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                Scenario Library Selection
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Scenario
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Select the scenario that will organize this Plan of Action
                chronologically.
              </p>
            </div>

            <div className="mt-5">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Scenario
                </span>

                <select
                  value={selectedScenarioId}
                  onChange={(event) =>
                    setSelectedScenarioId(event.target.value)
                  }
                  disabled={loadingScenarios}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
                >
                  <option value="">
                    {loadingScenarios
                      ? "Loading scenarios…"
                      : scenarioOptions.length === 0
                        ? "No active scenarios available"
                        : "Select a scenario…"}
                  </option>

                  {scenarioOptions.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.scenario_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedScenario ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Scenario Brief
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {selectedScenario.scenario_brief ||
                    "No scenario brief entered."}
                </p>

                {selectedScenario.initial_conditions ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Initial Conditions
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                      {selectedScenario.initial_conditions}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

      ) : null}



      <section id="poa-panel-timeline" role="tabpanel" aria-labelledby="poa-tab-timeline" hidden={generatorTab !== "timeline"} className="mt-6 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Scenario Engine
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Scenario POA Timeline
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Builds the oral as an ordered Event Set sequence. Each Event Set
              contains ground questions and requires at least one plan-changing trigger.
              Add more triggers if you want additional options.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Scenario Altitude
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={scenarioAltitude}
                  onChange={(event) =>
                    setScenarioAltitude(Number(event.target.value))
                  }
                  className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />

                <span className="text-sm text-slate-500">ft MSL</span>
              </div>
            </label>

            <button
              type="button"
              onClick={() => void buildScenarioTimeline(true)}
              disabled={loading || loadingTimeline || !testType || !selectedScenarioId || generatorEventSets.length === 0 || requiredComplianceCodes.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingTimeline ? "Building…" : "Build Compliant POA"}
            </button>
            <button
              type="button"
              onClick={() => void buildScenarioTimeline()}
              disabled={loadingTimeline || !testType}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingTimeline ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="h-4 w-4" />
              )}

              {scenarioTimeline ? "Regenerate Timeline" : "Build Timeline"}
            </button>
          </div>
        </div>

        {!scenarioTimeline ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            Build the timeline after selecting a scenario, then drag questions and triggers into its event sets. The engine
            will determine whether Cross-Country Flight Planning belongs in this
            test before inserting it into the scenario.
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  scenarioTimeline.cross_country_required
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Cross-Country{" "}
                {scenarioTimeline.cross_country_required
                  ? "Required"
                  : "Not Required"}
              </span>

              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                {scenarioTimeline.timeline?.length ?? 0} Timeline Items
              </span>

              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                {scenarioTimeline.timeline?.filter(
                  (item) => item.kind === "trigger_option",
                ).length ?? 0}{" "}
                Trigger Option
                {(scenarioTimeline.timeline?.filter(
                  (item) => item.kind === "trigger_option",
                ).length ?? 0) === 1
                  ? ""
                  : "es"}
              </span>
            </div>

            <TimelineEventEditor
              scenario={{ title: scenarioTimeline.scenario?.title ?? selectedScenario?.scenario_name ?? "Scenario", narrative: scenarioTimeline.scenario?.narrative ?? selectedScenario?.scenario_brief }}
              eventSets={timelineEditorEventSets}
              questions={timelineEditorQuestions}
              triggers={compatibleTriggers.map((trigger) => ({ id: trigger.id, title: trigger.title, eventSetIds: [trigger.eventSetId], assignedEventSetId: trigger.eventSetId, selected: (selectedTriggerIds[trigger.eventSetId] ?? []).includes(trigger.id) }))}
              itemOrder={effectiveEventItemOrder}
              onOrderChange={(eventSetId, keys) => setEventItemOrder((current) => ({ ...current, [eventSetId]: keys }))}
              onAssign={assignTimelineEntry}
              onRemove={(kind, id, eventSetId) => {
                if (kind === "trigger") removeTriggerChoice(eventSetId, id);
                else setSelectedIds((current) => current.filter((questionId) => questionId !== id));
              }}
            />
          </>
        )}
      </section>

      {testType && isAdditionalIssuance ? (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Rating Already Held
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Required to determine the correct FAA Additional Rating
                flight-task matrix.
              </p>
            </div>

            <select
              value={additionalRatingHeld}
              onChange={(event) => setAdditionalRatingHeld(event.target.value)}
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500"
            >
              <option value="">Select rating already held</option>

              {additionalHeldOptions.map((held) => (
                <option key={held} value={held}>
                  {held}
                </option>
              ))}
            </select>
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">{message}</p>

              {generatedPoaId ? (
                <p className="mt-1 text-xs">
                  Generated POA ID: {generatedPoaId}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          {isPrivatePilotAsel
            ? "Loading Event Set Plan…"
            : "Loading Scenario Library…"}
        </div>
      ) : null}

      {!loading && testType ? (
        <>



          {generatorTab === "flight_tasks" ? <FlightTaskSequenceEditor library={flightTaskLibrary} selected={selectedFlightTaskCodes.filter((code) => flightTaskLibrary.some((task) => task.acs_task_code_snapshot === code))} onChange={setSelectedFlightTaskCodes} /> : null}

          <div>
          {generatorTab === "compliance" ? (
            <section id="poa-panel-compliance" role="tabpanel" aria-labelledby="poa-tab-compliance" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    ACS Compliance
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    A Knowledge or Risk element turns green when at least one
                    selected question covers that ACS parent code. Flight Skill
                    elements turn green when their flight task is added to your flight sequence.
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Covered
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {coveredComplianceCount} / {displayedComplianceCodes.length}
                  </p>
                </div>
              </div>

              {displayedComplianceCodes.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  No ACS compliance elements are available for this practical
                  test.
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  {displayedComplianceCodes.map((code) => {
                    const covered = coveredComplianceCodes.has(code) || selectedFlightComplianceCodes.has(code);

                    const skill = code.endsWith(".S");

                    return (
                      <div
                        key={code}
                        className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
                      >
                        <div className="flex items-center gap-4">
                          {covered ? (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                              <Check className="h-5 w-5 text-emerald-700" />
                            </span>
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                              <TriangleAlert className="h-5 w-5 text-amber-700" />
                            </span>
                          )}

                          <div>
                            <p
                              className={`font-mono text-base font-bold ${
                                covered ? "text-emerald-800" : "text-slate-900"
                              }`}
                            >
                              {code}
                            </p>

                            {skill ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {covered ? "Included in the flight sequence." : "Add this task on the Flight Tasks tab."}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            covered
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {covered ? "Covered" : "Needs Coverage"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
          </div>

          <section className="sticky bottom-4 mt-8 rounded-2xl border border-slate-300 bg-white/95 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">
                  {selectedQuestions.length} question
                  {selectedQuestions.length === 1 ? "" : "s"} selected
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {allRatingTasksCovered
                    ? "All required tasks for this rating are covered."
                    : `Cover all required tasks before generating (${coveredComplianceCount}/${displayedComplianceCodes.length} covered).`}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  generating ||
                  selectedQuestions.length === 0 ||
                  !allRatingTasksCovered ||
                  !scenarioTimeline ||
                  loadingTimeline ||
                  Boolean(isAdditionalIssuance && !additionalRatingHeld) ||
                  Boolean(scenarioTimeline.timeline?.some((item) => item.kind === "gap"))
                }
                onClick={() => void generatePoa()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}

                {generating ? "Generating…" : "Generate POA"}
              </button>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
