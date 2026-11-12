"use client";

import Link from "next/link";

import {
  Check,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { validateEditableDraft } from "@/lib/poa/validate-editable-draft";
import { questionEventTargets } from "@/lib/poa/question-event-targets";
import { taskAppliesToClass } from "@/lib/poa/task-class-applicability";
import { buildCompliantDraft } from "@/lib/poa/build-compliant-draft";
import { orderEventItems, pickRotatedTriggers } from "@/lib/poa/event-sequence";
import { buildTemplateSequence, fillTemplateText, pickTemplateVariants, slotVariants, type TemplateItem, type TemplateVariants } from "@/lib/poa/template-build";
import { hasCompleteTaskCoverage } from "@/lib/poa/generation-readiness";
import { FlightTaskSequenceEditor } from "@/components/poa/flight-task-sequence-editor";
import { TimelineEventEditor } from "@/components/poa/timeline-event-editor";
import { PoaLocationsPanel } from "@/components/poa/poa-locations-panel";
import { STOP_FILL_KEYS, locationFills, locationSnapshot, parseLegNm, type PoaLocations, type StopNeed } from "@/lib/poa/locations";
import { FOCUS_SOURCE_LABEL, chainEndIndex, planFocus, type FocusSource } from "@/lib/poa/focus";
import { loadFocusAreas, type FocusSummary } from "@/lib/poa/focus-load";
import acsTaskNamesJson from "@/data/acs-task-names.json";

const ACS_TASK_NAMES = acsTaskNamesJson as Record<string, string>;
/** "PA.I.D.K3C" or "PA.I.D" → the Task's plain name. */
const acsTaskName = (code: string) => ACS_TASK_NAMES[code.split(".").slice(0, 3).join(".")] ?? "";
import { buildIfrContext, IFR_FILL_KEYS, type IfrContext } from "@/lib/poa/ifr-context";
import { loadIfrInputs } from "@/lib/poa/ifr-load";

import { createClient } from "@/lib/supabase/client";
import faaAcsComplianceCatalog from "@/data/faa-acs-compliance-catalog.json";
import {
  deriveAllFlightTasksFromAcsCatalog,
  filterFlightTasksByParentCodes,
  normalizeAdditionalMapCodes,
} from "@/lib/poa/flight-tasks";

// FAA additional-rating ACS task maps: a reference-data snapshot owned by EMS
// (generated from the former public/ems config; verified identical).
import ADDITIONAL_MAPS from "@/data/acs-additional-rating-maps.json";
import {
  acsPrefix,
  assembleTemplatePoa,
  compareAcsReferences,
  complianceParentCode,
  crossCountryTaskParentsForPrefixes,
  faaAcsPrefixesForTestType,
  hasSameRatingContent,
  isOriginalIssuance,
  loadPoaTemplate as loadSharedPoaTemplate,
  saveTemplatePoa,
  splitAcsReferences,
  taskParentFromReference,
  type AcsApplicability,
  type AircraftEquipment,
  type GeneratorScenarioOption,
  type LibraryQuestion,
  type LoadedPoaTemplate,
  type PoaTemplateQuestion,
  type PoaTemplateRow,
  type PracticalTestType,
  type QuestionTestTypeJoin,
} from "@/lib/poa/generate-core";

type CompatibleTrigger = {
  id: string;
  eventSetId: string;
  category: string;
  title: string;
  narrative: string | null;
  weight: number;
  /** Rotation slot (objective) within the event set. */
  slot: number;
  /** Point in the event set's question sequence where the trigger is dropped in. */
  sequenceOrder: number;
};

type GeneratorEventSet = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  maxQuestionCount: number;
  /** Triggers drawn by default (0 = none). */
  triggerCount: number;
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
  version_code: string | null;
  title: string;
  status: string | null;
  created_at: string;
};

const AIRCRAFT_EQUIPMENT_OPTIONS: { value: AircraftEquipment; label: string; detail: string }[] = [
  { value: "six_pack", label: "Standard six-pack instruments", detail: "Vacuum or electric gyros, pitot-static instruments" },
  { value: "taa", label: "Technically advanced (glass cockpit, e.g., G1000)", detail: "PFD/MFD with AHRS and air data computer" },
];

type LinkedRequest = {
  id: string;
  request_number: string | null;
  applicant_name_snapshot: string | null;
  aircraft_make: string | null;
  aircraft_model: string | null;
  aircraft_registration: string | null;
  aircraft_is_taa: boolean | null;
  flight_airport_id: string | null;
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

export default function GeneratePoaPage() {
  const [testTypeId, setTestTypeId] = useState("");

  const [testType, setTestType] = useState<PracticalTestType | null>(null);

  const [practicalTestTypes, setPracticalTestTypes] = useState<
    PracticalTestType[]
  >([]);

  const [loadingTestTypes, setLoadingTestTypes] = useState(true);

  const [libraryQuestions, setQuestions] = useState<LibraryQuestion[]>([]);

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
  // Triggers in the examiner's previous POA for this practical test; the next
  // POA avoids them so the same objectives come with different circumstances.
  const [previousTriggerIds, setPreviousTriggerIds] = useState<Set<string>>(new Set());

  // Aircraft equipment for airplane tests: six-pack or TAA (glass cockpit).
  // Preset from the applicant's request (its "TAA airplane" box) when the POA
  // is built from a request; otherwise the examiner picks.
  const [aircraftEquipment, setAircraftEquipment] = useState<AircraftEquipment | "">("");
  const [linkedRequest, setLinkedRequest] = useState<LinkedRequest | null>(null);
  // Examiner-written POA template for this certificate and class (Kele, Oct 2026).
  const [poaTemplate, setPoaTemplate] = useState<LoadedPoaTemplate | null>(null);
  const isAirplaneTest = Boolean(
    testType &&
      (["ASEL", "AMEL", "ASES", "AMES"].includes((testType.class_code ?? "").trim().toUpperCase()) ||
        (testType.rating_code ?? "").toUpperCase().includes("AIRPLANE")),
  );
  const poaEquipment: AircraftEquipment | null = isAirplaneTest && aircraftEquipment ? aircraftEquipment : null;
  const equipmentMissing = isAirplaneTest && !aircraftEquipment;

  useEffect(() => {
    const requestId = new URLSearchParams(window.location.search).get("requestId")?.trim();
    if (!requestId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await createClient()
        .from("practical_test_requests")
        .select("id, request_number, applicant_name_snapshot, aircraft_make, aircraft_model, aircraft_registration, aircraft_is_taa, flight_airport_id")
        .eq("id", requestId)
        .maybeSingle();
      if (cancelled || !data) return;
      setLinkedRequest(data as LinkedRequest);
      setAircraftEquipment(data.aircraft_is_taa ? "taa" : "six_pack");
    })();
    return () => { cancelled = true; };
  }, []);
  const questions = useMemo(
    () => libraryQuestions.filter((question) => !question.aircraft_equipment || question.aircraft_equipment === poaEquipment),
    [libraryQuestions, poaEquipment],
  );
  // Questions written for the other equipment leave the selection.
  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => questions.some((question) => question.id === id)));
  }, [questions]);

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
            aircraft_equipment,
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
            version_code,
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

    return `${poa.version_code || `Version ${index + 1}`}${dateText ? ` — ${dateText}` : ""}`;
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

    // Instrument instructor tests are named "Instrument Instructor Airplane" (or
    // Helicopter) in practical_test_types; the FAA table keys them "Instrument Instructor".
    if (
      additionalMapCertificateKey === "CFI" &&
      ratingName.toLowerCase().startsWith("instrument instructor")
    ) {
      return "Instrument Instructor";
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

  // Additional Rating Task Tables list Tasks by Area (II_C…). For flight instructor tests the
  // Areas after I use the AI./HI. codes, not FI. (Fundamentals of Instructing), so the map codes
  // take the first prefix that isn't FI.
  const additionalMapPrefix =
    complianceAcsPrefixes.find((prefix) => prefix !== "FI") ?? complianceAcsPrefixes[0] ?? "";


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
          additionalMapPrefix,
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
          additionalMapPrefix,
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
          leg_nm,
          aircraft,
          initial_conditions,
          examiner_notes,
          mission_code,
          fills,
          location_needs
        `,
        )
        .eq("is_active", true)
        // Draft scenarios (reason for the flight not written yet).
        .eq("is_draft", false)
        .order("scenario_name", {
          ascending: true,
        });

      // Only scenarios assigned to this practical test. (It used to fall back
      // to every scenario when none were assigned, so a Flight Instructor test
      // offered Private and Commercial scenarios.)
      if (mappingError || mappedIds.length === 0) {
        setScenarioOptions([]);
        setSelectedScenarioId("");
        setLoadingScenarios(false);
        return;
      }

      scenarioQuery = scenarioQuery.in("id", mappedIds);

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
      // The oral event sets come from the library, in order, with the
      // number of questions each should hold (minimum_question_count).
      const { data: sequenceRows, error: sequenceError } = await supabase
        .from("poa_event_sets")
        .select("id, code, name, description, sort_order, minimum_question_count, trigger_count")
        .eq("is_active", true)
        .eq("exam_section", "oral")
        .order("sort_order", { ascending: true });

      if (cancelled) return;
      if (sequenceError) { setErrorMessage(`Event sets could not be loaded: ${sequenceError.message}`); return; }
      const eventSets = (sequenceRows ?? []).map((row, index) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        sortOrder: index + 1,
        maxQuestionCount: Math.max(1, row.minimum_question_count ?? 15),
        triggerCount: Math.max(0, row.trigger_count ?? 1),
      }));
      if (eventSets.length === 0) {
        setErrorMessage("No active oral event sets were found. Activate the event sets before generating.");
        return;
      }

      const eventSetIds = eventSets.map((eventSet) => eventSet.id);
      if (eventSetIds.length === 0) return;

      const { data: optionRows, error: optionError } = await supabase
        .from("poa_event_set_trigger_options")
        .select(`
          event_set_id,
          option_order,
          trigger_slot,
          sequence_order,
          is_active,
          class_codes,
          certificate_codes,
          aircraft_equipment,
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

      // A trigger option may be limited to some aircraft classes (seaplane
      // triggers to ASES/AMES, flat tire to ASEL/AMEL), to some certificates
      // (instrument triggers to INSTRUMENT) and to the aircraft equipment;
      // no list = any.
      const poaClass = (testType?.class_code ?? "").trim().toUpperCase();
      const poaCertificate = (testType?.certificate_code ?? "").trim().toUpperCase();
      const allChoices = (optionRows ?? []).filter((row) => {
        const { class_codes: classes, certificate_codes: certificates, aircraft_equipment: equipment } =
          row as { class_codes?: string[] | null; certificate_codes?: string[] | null; aircraft_equipment?: string | null };
        return (!classes || classes.length === 0 || classes.includes(poaClass)) &&
          (!certificates || certificates.length === 0 || certificates.includes(poaCertificate)) &&
          (!equipment || equipment === poaEquipment);
      }).map((row) => {
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
          slot: row.trigger_slot ?? 1,
          sequenceOrder: row.sequence_order ?? 500,
        };
      }).filter((choice) => choice.id);

      // Triggers written for a scenario (poa_scenario_triggers) are used only
      // with that scenario, and fill their event-set slots in place of the
      // general triggers there.
      const { data: scenarioTriggerRows } = await supabase
        .from("poa_scenario_triggers")
        .select("scenario_id, trigger_id");
      if (cancelled) return;
      const ownTriggerIds = new Set<string>();
      const linkedTriggerIds = new Set<string>();
      for (const row of scenarioTriggerRows ?? []) {
        const triggerId = String(row.trigger_id || "");
        linkedTriggerIds.add(triggerId);
        if (String(row.scenario_id) === selectedScenarioId) ownTriggerIds.add(triggerId);
      }
      const ownSlots = new Set(
        allChoices
          .filter((choice) => ownTriggerIds.has(choice.id))
          .map((choice) => `${choice.eventSetId}:${choice.slot}`),
      );
      const choices = allChoices.filter((choice) =>
        ownTriggerIds.has(choice.id) ||
        (!linkedTriggerIds.has(choice.id) && !ownSlots.has(`${choice.eventSetId}:${choice.slot}`)),
      );

      // The examiner's previous POA for this practical test: its triggers are
      // avoided so this POA rotates to different ones.
      let previous = new Set<string>();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && testType?.id) {
        const { data: lastPoa } = await supabase
          .from("generated_plan_of_actions")
          .select("id")
          .eq("examiner_profile_id", user.id)
          .eq("practical_test_type_id", testType.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastPoa?.id) {
          const { data: lastTriggers } = await supabase
            .from("generated_plan_of_action_triggers")
            .select("trigger_library_id")
            .eq("generated_plan_of_action_id", lastPoa.id)
            .eq("timeline_kind", "trigger_option");
          previous = new Set((lastTriggers ?? []).map((row) => row.trigger_library_id).filter((id): id is string => Boolean(id)));
        }
      }
      if (cancelled) return;

      setGeneratorEventSets(eventSets);
      setCompatibleTriggers(choices);
      setPreviousTriggerIds(previous);
      setSelectedTriggerIds(pickRotatedTriggers({ events: eventSets, options: choices, previousTriggerIds: previous }));
    }

    void loadTriggerChoices();
    return () => { cancelled = true; };
  }, [selectedScenarioId, testType?.id, testType?.class_code, testType?.certificate_code, poaEquipment]);

  useEffect(() => {
    setScenarioTimeline(null);
    setQuestionEventAssignments({});
    setEventItemOrder({});
  }, [testType?.id, additionalRatingHeld, selectedScenarioId, poaEquipment]);

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
        return [item, ...options];
      });
      return { ...current, timeline };
    });
  }, [selectedTriggerIds, compatibleTriggers, eventItemOrder]);

  useEffect(() => {
    let cancelled = false;
    async function loadPoaTemplate() {
      setPoaTemplate(null);
      if (!testType?.id || !testType.certificate_code) return;
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const loaded = await loadSharedPoaTemplate(supabase, testType, userData.user?.id ?? null);
      if (!cancelled && loaded) setPoaTemplate(loaded);
    }
    void loadPoaTemplate();
    return () => { cancelled = true; };
  }, [testType?.id, testType?.certificate_code, testType?.class_code]);

  // The template panel offers only the scenarios written for the template's story, when it has any.
  const templateScenarioOptions = useMemo(() => {
    const ids = poaTemplate?.scenarioIds ?? [];
    return ids.length ? scenarioOptions.filter((scenario) => ids.includes(scenario.id)) : scenarioOptions;
  }, [poaTemplate, scenarioOptions]);

  // One page, one flow (Kele, Nov 11 2026): generate from the examiner's script when one exists;
  // building by hand (timeline, flight tasks, compliance) is the fallback.
  const [buildMode, setBuildMode] = useState<"template" | "manual">("template");
  const useTemplate = buildMode === "template" && Boolean(poaTemplate);
  const templateLimitsScenarios = Boolean(poaTemplate?.scenarioIds?.length);
  const visibleScenarioOptions = useTemplate ? templateScenarioOptions : scenarioOptions;
  useEffect(() => {
    if (!selectedScenarioId || loadingScenarios) return;
    if (!visibleScenarioOptions.some((scenario) => scenario.id === selectedScenarioId)) setSelectedScenarioId("");
  }, [visibleScenarioOptions, selectedScenarioId, loadingScenarios]);

  // Least input (Kele, Nov 11 2026): with a script, the scenario is picked for you, rotating away
  // from the last POA's. The examiner can still change it.
  const autoPickedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!useTemplate || !poaTemplate || loadingScenarios || !visibleScenarioOptions.length) return;
    if (selectedScenarioId || autoPickedFor.current === poaTemplate.id) return;
    autoPickedFor.current = poaTemplate.id;
    const fresh = visibleScenarioOptions.filter((scenario) => scenario.id !== poaTemplate.previousScenarioId);
    const pool = fresh.length ? fresh : visibleScenarioOptions;
    setSelectedScenarioId(pool[Math.floor(Math.random() * pool.length)].id);
  }, [useTemplate, poaTemplate, loadingScenarios, visibleScenarioOptions, selectedScenarioId]);

  // The applicant's weak areas (Kele, Nov 11 2026): knowledge test, previous attempt, and what tests
  // with the same instructor, school and US state often miss. Generic POAs (no request) have none.
  const [focus, setFocus] = useState<FocusSummary | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusOff, setFocusOff] = useState<FocusSource[]>([]);
  useEffect(() => {
    let cancelled = false;
    setFocus(null);
    if (!linkedRequest || !testType) return;
    setFocusLoading(true);
    void loadFocusAreas(createClient(), linkedRequest.id, complianceAcsPrefixes[0] ?? "")
      .then((summary) => {
        if (!cancelled) setFocus(summary);
      })
      .finally(() => {
        if (!cancelled) setFocusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedRequest, testType, complianceAcsPrefixes]);
  const activeFocusAreas = useMemo(
    () => (focus?.areas ?? []).filter((area) => !focusOff.includes(area.source)),
    [focus, focusOff],
  );

  const selectedScenario = useMemo(
    () =>
      scenarioOptions.find((scenario) => scenario.id === selectedScenarioId) ??
      null,
    [scenarioOptions, selectedScenarioId],
  );

  const generateBlockers = [
    !selectedScenarioId ? "a scenario" : null,
    equipmentMissing ? "the aircraft equipment" : null,
    isAdditionalIssuance && !additionalRatingHeld ? "the rating already held" : null,
  ].filter((item): item is string => Boolean(item));

  // Real places for the POA (Kele, Nov 11 2026): picked near the request's test airport.
  const [poaLocations, setPoaLocations] = useState<PoaLocations | null>(null);
  const locationNeeds = useMemo(() => {
    const classCode = (testType?.class_code ?? "").trim().toUpperCase();
    const ratingCode = (testType?.rating_code ?? "").trim().toUpperCase();
    return {
      legNm: selectedScenario?.leg_nm ?? parseLegNm(selectedScenario?.destination),
      destinationKind: (["ASES", "AMES"].includes(classCode) ? "seaplane" : "airport") as "seaplane" | "airport",
      instrument:
        testType?.certificate_code === "INSTRUMENT" ||
        testType?.certificate_code === "ATP" ||
        ratingCode.startsWith("CFII"),
      stops: selectedScenario?.location_needs?.stops ?? [],
      preferRiver: Boolean(selectedScenario?.location_needs?.prefer_river),
    };
  }, [testType, selectedScenario]);
  const aircraftFill = useMemo(() => {
    const made = [linkedRequest?.aircraft_make, linkedRequest?.aircraft_model].filter(Boolean).join(" ").trim();
    return made ? `the ${made}` : "the aircraft";
  }, [linkedRequest]);
  // Real clearance, frequencies, tower hours and approach fixes for instrument POAs (Kele, Nov 11 2026).
  const [ifrContext, setIfrContext] = useState<IfrContext | null>(null);
  useEffect(() => {
    let cancelled = false;
    setIfrContext(null);
    if (!locationNeeds.instrument || !poaLocations?.destination) return;
    void (async () => {
      const inputs = await loadIfrInputs(createClient(), poaLocations, poaEquipment === "taa" || poaEquipment === "six_pack" ? poaEquipment : null);
      if (!cancelled && inputs) setIfrContext(buildIfrContext(inputs));
    })();
    return () => { cancelled = true; };
  }, [poaLocations, poaEquipment, locationNeeds.instrument]);
  /** [departure], [destination], [practice area], [aircraft], [clearance]… for this POA. */
  const poaFills = useMemo(
    () => ({
      ...locationFills(poaLocations, {
        destination: selectedScenario?.destination ?? null,
        departure: selectedScenario?.departure ?? null,
      }),
      aircraft: selectedScenario?.aircraft || aircraftFill,
      // Words for the template that depend on the job (Kele, Nov 11 2026): [passenger], [landing site], ...
      ...(selectedScenario?.fills ?? {}),
      ...(selectedScenario?.location_needs?.stops?.length && !poaLocations?.stops?.length
        ? { "ferry stops": "the stops you plan along the route" }
        : {}),
      ...(ifrContext?.fills ?? {}),
    }),
    [poaLocations, selectedScenario, aircraftFill, ifrContext],
  );
  const poaMission = selectedScenario?.mission_code ?? null;
  /** Items needing IFR fill-ins this POA can't supply are skipped (no made-up fixes). */
  const fillCheck = useMemo(
    () => ({
      keys: [...IFR_FILL_KEYS, ...STOP_FILL_KEYS],
      // Ferry-stop fill-ins count only when real stops were picked.
      available: new Set([
        ...Object.keys(ifrContext?.fills ?? {}),
        ...Object.keys(locationFills(poaLocations, {})).filter((key) => (STOP_FILL_KEYS as readonly string[]).includes(key)),
      ]),
    }),
    [ifrContext, poaLocations],
  );
  const fillText = useCallback(
    (text: string | null | undefined) => (text ? fillTemplateText(text, poaFills) : text ?? null),
    [poaFills],
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

  // Within an event set: the flight sequence, each trigger dropped in at its
  // point with the questions it raises right after it. An order the examiner
  // arranged by hand wins; anything new joins in sequence after it.
  const effectiveEventItemOrder = Object.fromEntries(timelineEditorEventSets.map((eventSet) => {
    const eventTriggers = selectedTriggerIds[eventSet.id] ?? [];
    const sequenced = orderEventItems({
      questions: timelineEditorQuestions
        .filter((question) => question.selected && question.assignedEventSetId === eventSet.id)
        .map((question) => {
          const rule = eventQuestionRules.find((candidate) => candidate.question_id === question.id && candidate.event_set_id === eventSet.id && candidate.review_status === "approved");
          const ruleTriggers = rule && !rule.applies_to_all_triggers ? rule.poa_event_set_question_triggers.map((link) => link.trigger_id) : [];
          const linkedTriggers = triggerQuestionLinks.filter((link) => link.question_id === question.id).map((link) => link.trigger_id);
          return {
            id: question.id,
            order: rule?.sequence_order ?? 100,
            followsTriggerIds: [...ruleTriggers, ...linkedTriggers].filter((id) => eventTriggers.includes(id)),
            afterTrigger: rule?.trigger_timing === "after_trigger",
          };
        }),
      triggers: eventTriggers.map((id) => ({
        id,
        position: compatibleTriggers.find((trigger) => trigger.id === id && trigger.eventSetId === eventSet.id)?.sequenceOrder ?? 500,
      })),
    });
    const manual = (eventItemOrder[eventSet.id] ?? []).filter((key) => sequenced.includes(key));
    return [eventSet.id, [...manual, ...sequenced.filter((key) => !manual.includes(key))]];
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

  // One button (Kele, Nov 12 2026): building by hand starts from a compliant draft as soon as
  // the scenario and choices above are set, instead of separate Build buttons. Each set of
  // choices is drafted once; changing the scenario, equipment or rating held drafts again.
  const draftedFor = useRef<string | null>(null);
  const draftKey = [
    testType?.id,
    selectedScenarioId,
    poaEquipment,
    additionalRatingHeld,
    generatorEventSets.map((eventSet) => eventSet.id).join(","),
  ].join("|");
  useEffect(() => {
    if (useTemplate || loading || loadingTimeline || scenarioTimeline) return;
    if (!testType || !selectedScenarioId || equipmentMissing) return;
    if (isAdditionalIssuance && !additionalRatingHeld) return;
    if (!generatorEventSets.length || !requiredComplianceCodes.length) return;
    if (draftedFor.current === draftKey) return;
    draftedFor.current = draftKey;
    void buildScenarioTimeline(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useTemplate, loading, loadingTimeline, scenarioTimeline, draftKey, equipmentMissing, isAdditionalIssuance, requiredComplianceCodes.length]);

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

      if (equipmentMissing) {
        throw new Error(
          "Select the aircraft equipment (six-pack or glass cockpit) before building the Scenario Timeline.",
        );
      }

      if (isAdditionalIssuance && !additionalRatingHeld) {
        throw new Error(
          "Select the rating already held before building the Scenario Timeline.",
        );
      }

      const draft = automaticallyPopulate ? buildCompliantDraft({
        events: generatorEventSets,
        triggers: compatibleTriggers.map(trigger => ({ id: trigger.id, eventSetId: trigger.eventSetId, position: trigger.sequenceOrder })),
        // Each automatic build rotates: random within each slot, avoiding the
        // previous POA's triggers.
        triggerSelections: pickRotatedTriggers({ events: generatorEventSets, options: compatibleTriggers, previousTriggerIds }),
        requiredOnly: isAdditionalIssuance,
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
          additionalMapPrefix,
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
            return [{ kind: "event_set", label: "Event Set", title: eventSet.name, narrative: eventSet.description, phase: eventSet.code.toLowerCase(), event_set_id: eventSet.id, event_set_code: eventSet.code, max_question_count: eventSet.maxQuestionCount }, ...options];
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
        const shortfall = draft.shortEventSets.length
          ? `The question bank can't fill ${draft.shortEventSets.map(e => `${e.name} (${e.count} of ${e.target})`).join(", ")} yet. `
          : "";
        setMessage(`POA draft built. ${draft.provisionalQuestionIds.length ? `${draft.provisionalQuestionIds.length} questions were placed provisionally; review their event sets. ` : ""}${shortfall}Review the Timeline, Flight Tasks, and Compliance tabs before generating.`);
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

    if (!poaLocations) {
      setErrorMessage("Enter the test airport under Locations so the POA gets real places.");

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

          aircraft_equipment: poaEquipment,

          practical_test_request_id: linkedRequest?.id ?? null,

          location_snapshot: poaLocations ? locationSnapshot(poaLocations) : null,
          ifr_snapshot: ifrContext ? { ...ifrContext.snapshot, fills: ifrContext.fills } : null,

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

      /*
       * One running position for the whole oral timeline, so the printed POA
       * shows each event set in order and, inside it, questions and triggers
       * interleaved exactly as sequenced (the print groups by event set and
       * sorts by these positions).
       */
      const timelinePositions = new Map<string, number>();
      let position = 0;
      for (const item of scenarioTimeline.timeline ?? []) {
        if (item.kind === "trigger_option") continue;
        position += 10;
        timelinePositions.set(`item:${(scenarioTimeline.timeline ?? []).indexOf(item)}`, position);
        if (item.kind === "event_set" && item.event_set_id) {
          for (const key of effectiveEventItemOrder[item.event_set_id] ?? []) {
            position += 10;
            timelinePositions.set(key.startsWith("trigger:") ? `${item.event_set_id}:${key}` : key, position);
          }
        }
      }

      const snapshots = orderedSelected.map(({ question, rule }, index) => ({
        generated_plan_of_action_id: generated.id,

        question_library_id: question.id,

        acs_reference_snapshot: acsReferenceForQuestion(question),

        acs_references_snapshot: acsReferencesForQuestion(question),

        question_snapshot: fillText(question.question),

        answer_snapshot: fillText(question.answer),

        reference_snapshot: question.reference,

        topic_snapshot: question.topic,

        task_name_snapshot: question.task_name,

        question_type_snapshot: question.question_type,

        event_set_id: questionEventAssignments[question.id] ?? rule?.event_set_id ?? null,

        question_rule_id: rule?.id ?? null,

        sequence_stage: rule?.sequence_stage ?? null,

        trigger_timing: rule && effectiveEventItemOrder[rule.event_set_id]
          ? (effectiveEventItemOrder[rule.event_set_id] ?? []).slice(0, (effectiveEventItemOrder[rule.event_set_id] ?? []).indexOf(`question:${question.id}`)).some((key) => key.startsWith("trigger:")) ? "after_trigger" : "before_trigger"
          : rule?.trigger_timing ?? null,

        trigger_option_id: (rule ? selectedTriggerForRule(rule) : null) ?? triggerQuestionLinks.find(link => link.question_id === question.id && selectedCandidateTriggerIds.has(link.trigger_id) && compatibleTriggers.some(trigger => trigger.id === link.trigger_id && trigger.eventSetId === (questionEventAssignments[question.id] ?? rule?.event_set_id)))?.trigger_id ?? null,

        sort_order: timelinePositions.get(`question:${question.id}`) ?? position + (index + 1) * 10,
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
          trigger_text_snapshot: fillText(item.title),
          trigger_narrative_snapshot: fillText(item.narrative ?? item.title),
          branch_worthy: Boolean(item.branch_worthy),
          source_trigger_id: item.source_trigger_id ?? null,
          // Every trigger placed in the sequence is used in this POA.
          is_selected: item.kind === "trigger_option",
          sort_order:
            (item.kind === "trigger_option" && item.event_set_id
              ? timelinePositions.get(`${item.event_set_id}:trigger:${item.trigger_id}`)
              : timelinePositions.get(`item:${index}`)) ?? position + (index + 1) * 10,
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

  async function generateFromTemplate() {
    if (!testType || !poaTemplate) return;
    setMessage("");
    setErrorMessage("");
    setGeneratedPoaId("");

    if (!title.trim()) {
      setErrorMessage("Enter a Plan of Action title.");
      return;
    }
    if (!selectedScenario) {
      setErrorMessage("Select a scenario. It opens the POA with the reason for the flight.");
      return;
    }
    if (!poaLocations) {
      setErrorMessage("Enter the test airport under Locations so the POA gets real places.");
      return;
    }
    if (equipmentMissing) {
      setErrorMessage("Select the aircraft equipment (six-pack or glass cockpit) before generating.");
      return;
    }
    if (isAdditionalIssuance && !additionalRatingHeld) {
      setErrorMessage("Select the rating already held before generating.");
      return;
    }

    const requiredTaskParents = isAdditionalIssuance
      ? new Set(
          requiredComplianceCodes
            .map(taskParentFromReference)
            .filter((code): code is string => Boolean(code)),
        )
      : null;
    const assembled = assembleTemplatePoa({
      template: poaTemplate,
      testType,
      scenario: selectedScenario,
      questions,
      equipment: poaEquipment,
      fills: poaFills,
      fillCheck,
      requiredComplianceCodes,
      requiredTaskParents,
      complianceAcsPrefixes,
      focusAreas: activeFocusAreas,
    });
    const { variants, focusPlan, focusByItem, questionRows, triggerCount } = assembled;
    const flightTasks = (selectedFlightTaskDrafts.length
      ? selectedFlightTaskDrafts
      : flightTaskLibrary.filter((task) => task.is_required)
    ).map((task, index) => ({ ...task, sort_order: (index + 1) * 10 }));

    setGenerating(true);
    const supabase = createClient();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in as an examiner.");

      const generated = await saveTemplatePoa(
        supabase,
        {
          examiner_profile_id: user.id,
          practical_test_type_id: testType.id,
          title: title.trim(),
          scenario_name: selectedScenario.scenario_name,
          scenario_id: selectedScenario.id,
          compliance_snapshot: assembled.complianceSnapshot,
          cross_country_required: assembled.crossCountryRequired,
          selection_method: "template",
          template_id: poaTemplate.id,
          template_variants: variants,
          aircraft_equipment: poaEquipment,
          practical_test_request_id: linkedRequest?.id ?? null,
          location_snapshot: poaLocations ? locationSnapshot(poaLocations) : null,
          ifr_snapshot: ifrContext ? { ...ifrContext.snapshot, fills: ifrContext.fills } : null,
          focus_snapshot: focus
            ? {
                areas: activeFocusAreas,
                turned_off: focusOff,
                uncovered: focusPlan.uncovered,
                added: focusPlan.added.length,
                instructor: focus.instructorName,
                school: focus.schoolName,
                state: focus.stateName,
              }
            : null,
          status: "ready",
          notes: `Built from the ${poaTemplate.name} POA template (v${poaTemplate.version}) for ${testType.display_name}.`,
        },
        assembled,
        flightTasks,
      );

      setGeneratedPoaId(generated.id);
      const focusNote = focusByItem.size
        ? ` ${focusByItem.size} question${focusByItem.size === 1 ? "" : "s"} focus on the applicant's weak areas (${focusPlan.added.length} added).`
        : "";
      setMessage(
        `${title.trim()} is ready: ${questionRows.length} questions, ${triggerCount} triggers and ${flightTasks.length} flight tasks.${focusNote}`,
      );
      setPoaTemplate((current) => (current ? { ...current, previousVariants: variants } : current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The Plan of Action could not be generated.");
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
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mt-1 text-xl font-bold text-slate-900">Title and scenario</h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-700">POA Version</span>
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
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Scenario (reason for the flight)</span>
            <select
              value={selectedScenarioId}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
              disabled={loadingScenarios}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
            >
              <option value="">
                {loadingScenarios
                  ? "Loading scenarios…"
                  : visibleScenarioOptions.length === 0
                    ? "No scenarios assigned to this practical test"
                    : "Select a scenario…"}
              </option>
              {visibleScenarioOptions.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.scenario_name}
                </option>
              ))}
            </select>
            {useTemplate && templateLimitsScenarios ? (
              <span className="mt-1 block text-xs text-slate-500">
                Showing the {visibleScenarioOptions.length} scenarios written for your {poaTemplate?.name} script.
                Build by hand to use any of the {scenarioOptions.length} scenarios for this test.
              </span>
            ) : null}
          </label>

            {selectedScenario ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Scenario Brief
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {fillText(selectedScenario.scenario_brief) ||
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

      {!loading && isAirplaneTest ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold text-slate-900">Aircraft equipment</p>

              <p className="mt-1 text-xs text-slate-600">
                Systems questions and triggers follow the airplane&apos;s flight instruments.
              </p>

              {linkedRequest ? (
                <p className="mt-2 text-xs text-slate-700">
                  From request {linkedRequest.request_number ?? ""}
                  {linkedRequest.applicant_name_snapshot ? ` (${linkedRequest.applicant_name_snapshot})` : ""}:{" "}
                  {[linkedRequest.aircraft_make, linkedRequest.aircraft_model, linkedRequest.aircraft_registration].filter(Boolean).join(" ")}
                  {" "}{linkedRequest.aircraft_is_taa ? "marked TAA" : "not marked TAA"}. Change it here if needed.
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  {aircraftEquipment ? "" : "Select one before building the POA."}
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Aircraft equipment">
              {AIRCRAFT_EQUIPMENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                    aircraftEquipment === option.value ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="aircraft-equipment"
                    value={option.value}
                    checked={aircraftEquipment === option.value}
                    onChange={() => setAircraftEquipment(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-800">{option.label}</span>
                    <span className="block text-xs text-slate-500">{option.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>
      ) : null}

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

      {!loading && testType ? (
        <PoaLocationsPanel
          requestAirportId={linkedRequest?.flight_airport_id ?? null}
          needs={locationNeeds}
          scenarioKey={selectedScenarioId}
          onChange={setPoaLocations}
        />
      ) : null}


      {!loading && testType && useTemplate && poaTemplate ? (
        linkedRequest ? (
          <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">
              Why this POA{linkedRequest.applicant_name_snapshot ? `: ${linkedRequest.applicant_name_snapshot}` : ""}
            </p>
            {focusLoading ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking at the knowledge test and past results…
              </p>
            ) : !focus || focus.areas.length === 0 ? (
              <p className="mt-2 text-sm text-slate-700">
                {focus?.knowledgeTestFound
                  ? "No weak areas found, so this POA follows your script as written."
                  : "No knowledge test report or past results to draw on yet, so this POA follows your script as written."}
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  These areas get extra questions. Uncheck any you don&apos;t want.
                </p>
                <div className="mt-3 space-y-3">
                  {(Object.keys(FOCUS_SOURCE_LABEL) as FocusSource[])
                    .filter((source) => focus.areas.some((area) => area.source === source))
                    .map((source) => {
                      const list = focus.areas.filter((area) => area.source === source);
                      const on = !focusOff.includes(source);
                      const who =
                        source === "instructor" ? focus.instructorName : source === "school" ? focus.schoolName : source === "state" ? focus.stateName : null;
                      return (
                        <label key={source} className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 ${on ? "border-sky-300" : "border-slate-200 opacity-60"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setFocusOff((current) => (on ? [...current, source] : current.filter((item) => item !== source)))}
                            className="mt-1 h-5 w-5"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-900">
                              {FOCUS_SOURCE_LABEL[source]}
                              {who ? ` (${who})` : ""}: {list.length} area{list.length === 1 ? "" : "s"}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-600">
                              {list.map((area) => {
                                const name = acsTaskName(area.code);
                                return `${area.code}${name ? ` ${name}` : ""}${source === "knowledge_test" || source === "retest" ? "" : ` (${area.detail})`}`;
                              }).join("; ")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </>
            )}
          </section>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
            Generic POA: no applicant, so it follows your script as written. To add an applicant&apos;s weak areas, open the
            POA from their request.
          </p>
        )
      ) : null}

      {!loading && testType && useTemplate && poaTemplate ? (
        <section className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Generate from your script: {poaTemplate.name} (v{poaTemplate.version})
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Your script in flight order, with follow-ups kept with their questions.{" "}
                {Object.keys(slotVariants(poaTemplate.items)).length} trigger spots rotate; each uses a
                different version from your last POA for this test.
              </p>
              {generateBlockers.length ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">Still needed: {generateBlockers.join(", ")}.</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={generating || generateBlockers.length > 0}
              onClick={() => void generateFromTemplate()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate POA"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setBuildMode("manual")}
            className="mt-4 text-xs font-semibold text-slate-600 underline hover:text-slate-900"
          >
            Build by hand instead (pick questions and triggers yourself)
          </button>
        </section>
      ) : null}


      {!loading && testType && !useTemplate ? (
        <>
          {poaTemplate ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              <span>Building by hand. Pick questions and triggers on the timeline, then cover every ACS task.</span>
              <button
                type="button"
                onClick={() => setBuildMode("template")}
                className="font-semibold text-emerald-800 underline hover:text-emerald-900"
              >
                Use my {poaTemplate.name} script instead
              </button>
            </div>
          ) : null}
      <div className="mt-6 flex gap-1 border-b border-slate-300" role="tablist" aria-label="POA generator views">
        {(["timeline", "flight_tasks", "compliance"] as const).map((tab) => (
          <button key={tab} type="button" role="tab" id={`poa-tab-${tab}`} aria-controls={`poa-panel-${tab}`} aria-selected={generatorTab === tab} onClick={() => setGeneratorTab(tab)} className={`border-b-2 px-6 py-3 text-sm font-bold ${generatorTab === tab ? "border-sky-700 text-sky-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {tab === "timeline" ? "Timeline" : tab === "flight_tasks" ? "Flight Tasks" : "Compliance"}
          </button>
        ))}
      </div>
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
                  onBlur={() => {
                    // Keeps the questions and triggers already picked.
                    if (scenarioTimeline && !loadingTimeline) void buildScenarioTimeline();
                  }}
                  className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />

                <span className="text-sm text-slate-500">ft MSL</span>
              </div>
            </label>

            {scenarioTimeline || (!loadingTimeline && !generateBlockers.length && generatorEventSets.length > 0) ? (
              <button
                type="button"
                onClick={() => void buildScenarioTimeline(true)}
                disabled={loadingTimeline}
                className="pb-2 text-xs font-semibold text-slate-600 underline hover:text-slate-900 disabled:opacity-50"
              >
                {scenarioTimeline ? "Start over with a fresh draft" : "Build the draft again"}
              </button>
            ) : null}
          </div>
        </div>

        {!scenarioTimeline ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            {loadingTimeline ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Building a draft that covers every ACS task…
              </span>
            ) : (
              <>
                {generateBlockers.length
                  ? `Choose ${generateBlockers.join(", ")} above and a draft that covers every ACS task appears here.`
                  : !generatorEventSets.length
                    ? "This scenario has no event sets for this test yet, so a draft can't be built. Pick another scenario."
                    : "A draft that covers every ACS task appears here."}{" "}
                Then drag questions and triggers to change it.
              </>
            )}
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
                  equipmentMissing ||
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

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">{message}</p>

              {generatedPoaId ? (
                <>
                  <p className="mt-1 text-xs">
                    Generated POA ID: {generatedPoaId}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/examiner/plan-of-action/generated/${encodeURIComponent(generatedPoaId)}/print`}
                      className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      Print POA
                    </a>
                    <a
                      href={`/examiner/plan-of-action/generated/${encodeURIComponent(generatedPoaId)}/edit`}
                      className="inline-flex items-center rounded-xl border border-emerald-700 bg-white px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      Review and change (drag and drop)
                    </a>
                  </div>
                </>
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
    </main>
  );
}
