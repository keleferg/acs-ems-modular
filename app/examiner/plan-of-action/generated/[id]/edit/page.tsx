"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  MapPin,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { TimelineEventEditor } from "@/components/poa/timeline-event-editor";
import faaAcsComplianceCatalog from "@/data/faa-acs-compliance-catalog.json";
import {
  deriveAllFlightTasksFromAcsCatalog,
  type FlightTaskDraft,
} from "@/lib/poa/flight-tasks";
import { flightFamilyFor, flightPlacement } from "@/lib/poa/flight-sequence";
import { PoaLocationsPanel } from "@/components/poa/poa-locations-panel";
import {
  hasFuel,
  locationFills,
  locationSnapshot,
  parseLegNm,
  placeLabel,
  type PoaLocations,
  type StopNeed,
} from "@/lib/poa/locations";
import {
  fillChanges,
  rewriteForNewPlaces,
  savedLocationFills,
  savedPlaceLabel,
  staleValues,
  type SavedLocations,
} from "@/lib/poa/location-rewrite";
import { buildIfrContext, type IfrContext } from "@/lib/poa/ifr-context";
import { loadIfrInputs } from "@/lib/poa/ifr-load";

function savedPoaComplianceParentCode(reference: string) {
  const cleaned = reference.trim().toUpperCase();

  const match = cleaned.match(
    /^([A-Z]{1,5}\.[IVX]+\.[A-Z0-9/]+\.[KRS])/,
  );

  return match?.[1] ?? null;
}

function savedPoaAcsPrefix(reference: string) {
  const match = reference
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{1,5})\./);

  return match?.[1] ?? null;
}

function compareSavedPoaComplianceCodes(
  a: string,
  b: string,
) {
  const ap = a.split(".");
  const bp = b.split(".");

  const order: Record<string, number> = {
    K: 0,
    R: 1,
    S: 2,
  };

  return (
    ap[0].localeCompare(bp[0]) ||
    ap[1].localeCompare(bp[1], undefined, {
      numeric: true,
    }) ||
    ap[2].localeCompare(bp[2], undefined, {
      numeric: true,
    }) ||
    (order[ap[3]] ?? 9) -
      (order[bp[3]] ?? 9)
  );
}

type TriggerLibraryOption = {
  id: string;
  category: string;
  trigger_text: string;
  trigger_narrative: string;
};

type GeneratedPoaTrigger = {
  id?: string;
  trigger_library_id: string | null;
  event_set_id?: string | null;
  placement_section: "oral" | "flight";
  timeline_kind?: string;
  phase?: string | null;
  category_snapshot: string;
  trigger_text_snapshot: string;
  trigger_narrative_snapshot: string;
  branch_worthy?: boolean;
  source_trigger_id?: string | null;
  is_selected?: boolean;
  sort_order: number;
  template_item_id?: string | null;
  template_depth?: number;
  // Stable key for the timeline editor (the row id once saved).
  client_key?: string;
};

type TimelineEventSet = {
  id: string;
  name: string;
  description: string | null;
  minimumQuestionCount: number;
  offered?: boolean;
};

type TimelineLibraryTrigger = {
  id: string;
  eventSetId: string;
  category: string;
  title: string;
  narrative: string;
};

let timelineKeyCounter = 0;

function newTimelineKey(prefix: string) {
  timelineKeyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${timelineKeyCounter}`;
}

function questionTimelineKey(question: SnapshotQuestion) {
  return question.client_key || question.id || "";
}

function triggerTimelineKey(trigger: GeneratedPoaTrigger) {
  return trigger.client_key || trigger.id || "";
}

// Rows of the oral timeline that the timeline editor places inside an event set.
function isTimelineTrigger(trigger: GeneratedPoaTrigger) {
  return (
    trigger.placement_section !== "flight" &&
    trigger.timeline_kind !== "scenario" &&
    trigger.timeline_kind !== "event_set"
  );
}

function timelineTriggerLabel(kind: string | undefined) {
  if (kind === "scene") return "Scene";
  if (kind === "trigger_option") return "Trigger option";
  if (!kind || kind === "trigger") return "Trigger";
  return kind.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ScenarioLibraryOption = {
  id: string;
  scenario_name: string;
  scenario_brief: string | null;
  departure: string | null;
  destination: string | null;
  aircraft: string | null;
  initial_conditions: string | null;
  examiner_notes: string | null;
  leg_nm?: number | null;
  location_needs?: { stops?: StopNeed[]; prefer_river?: boolean } | null;
};

type EditPoaVersionOption = {
  id: string;
  version_code: string | null;
  title: string;
  created_at: string;
  status: string | null;
};

type GeneratedPlan = {
  id: string;
  practical_test_type_id: string;
  title: string;
  scenario_name: string | null;
  selection_method: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  location_snapshot?: SavedLocations | null;
  ifr_snapshot?: { fills?: Record<string, string> } & Record<string, unknown> | null;
  aircraft_equipment?: string | null;
  practical_test_request_id?: string | null;
};

/** The applicant's request this POA was built for (aircraft and test airport). */
type LinkedRequest = {
  aircraft_make: string | null;
  aircraft_model: string | null;
  aircraft_registration: string | null;
  flight_airport_id: string | null;
};

type SnapshotQuestion = {
  id: string | null;
  question_library_id: string | null;
  acs_reference_snapshot: string;
  acs_references_snapshot: string[];
  question_snapshot: string;
  answer_snapshot: string;
  reference_snapshot: string;
  topic_snapshot: string;
  task_name_snapshot: string;
  question_type_snapshot: string;
  trigger_option_id: string | null;
  sort_order: number;
  event_set_id?: string | null;
  template_item_id?: string | null;
  template_depth?: number;
  /** Weak areas this question covers (lib/poa/focus.ts), e.g. ["knowledge_test"]. */
  focus_sources?: string[] | null;
  // Stable key for the timeline editor (the row id once saved).
  client_key?: string;
};

const FOCUS_LABEL: Record<string, string> = {
  knowledge_test: "Knowledge test",
  retest: "Previous attempt",
  instructor: "Instructor trend",
  school: "School trend",
  state: "State trend",
};

function mapSnapshotRow(question: Record<string, unknown>): SnapshotQuestion {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const single = text(question.acs_reference_snapshot);
  return {
    id: text(question.id) || null,
    client_key: text(question.id) || undefined,
    question_library_id: text(question.question_library_id) || null,
    acs_reference_snapshot: single,
    acs_references_snapshot: Array.isArray(question.acs_references_snapshot)
      ? question.acs_references_snapshot.filter((value): value is string => typeof value === "string")
      : single
        ? [single]
        : [],
    question_snapshot: text(question.question_snapshot),
    answer_snapshot: text(question.answer_snapshot),
    reference_snapshot: text(question.reference_snapshot),
    topic_snapshot: text(question.topic_snapshot),
    task_name_snapshot: text(question.task_name_snapshot),
    question_type_snapshot: text(question.question_type_snapshot) || "knowledge",
    trigger_option_id: text(question.trigger_option_id) || null,
    sort_order: Number(question.sort_order) || 0,
    event_set_id: text(question.event_set_id) || null,
    template_item_id: text(question.template_item_id) || null,
    template_depth: Number(question.template_depth) || 0,
    focus_sources: Array.isArray(question.focus_sources)
      ? question.focus_sources.filter((value): value is string => typeof value === "string")
      : null,
  };
}

const SNAPSHOT_COLUMNS = `
  id,
  question_library_id,
  acs_reference_snapshot,
  acs_references_snapshot,
  question_snapshot,
  answer_snapshot,
  reference_snapshot,
  topic_snapshot,
  task_name_snapshot,
  question_type_snapshot,
  trigger_option_id,
  sort_order,
  event_set_id,
  template_item_id,
  template_depth,
  focus_sources
`;

function mapTriggerRow(row: Record<string, unknown>): GeneratedPoaTrigger {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    id: text(row.id) || undefined,
    client_key: text(row.id) || undefined,
    trigger_library_id: text(row.trigger_library_id) || null,
    event_set_id: text(row.event_set_id) || null,
    placement_section: row.placement_section === "flight" ? "flight" : "oral",
    timeline_kind: text(row.timeline_kind) || "trigger",
    phase: text(row.phase) || null,
    category_snapshot: text(row.category_snapshot),
    trigger_text_snapshot: text(row.trigger_text_snapshot),
    trigger_narrative_snapshot: text(row.trigger_narrative_snapshot),
    branch_worthy: Boolean(row.branch_worthy),
    source_trigger_id: text(row.source_trigger_id) || null,
    is_selected: Boolean(row.is_selected),
    sort_order: Number(row.sort_order) || 0,
    template_item_id: text(row.template_item_id) || null,
    template_depth: Number(row.template_depth) || 0,
  };
}

const TRIGGER_COLUMNS = `
  id,
  trigger_library_id,
  event_set_id,
  placement_section,
  timeline_kind,
  phase,
  category_snapshot,
  trigger_text_snapshot,
  trigger_narrative_snapshot,
  branch_worthy,
  source_trigger_id,
  is_selected,
  sort_order,
  template_item_id,
  template_depth
`;

type LibraryQuestion = {
  id: string;
  acs_reference: string;
  question: string;
  answer: string | null;
  reference: string | null;
  topic: string | null;
  task_name: string | null;
  question_type: string;
  // Element-level ACS codes for this test's certificate (from poa_question_acs_applicability).
  acs_references?: string[];
};

type FlightTaskSnapshot =
  FlightTaskDraft & {
    id: string | null;
  };

type PracticalTestType = {
  id: string;
  display_name: string;
  certificate_name: string;
  issuance_name: string;
  rating_name: string;
  category_name: string | null;
  class_name: string | null;
  certificate_code?: string | null;
  class_code?: string | null;
  rating_code?: string | null;
};

function snapshotFromLibrary(
  question: LibraryQuestion,
): SnapshotQuestion {
  return {
    id: null,
    client_key: newTimelineKey("new-question"),
    question_library_id: question.id,
    acs_reference_snapshot:
      question.acs_references?.length
        ? question.acs_references.join("; ")
        : question.acs_reference || "",
    acs_references_snapshot: question.acs_references?.length
      ? question.acs_references
      : question.acs_reference
        ? [question.acs_reference]
        : [],
    question_snapshot:
      question.question || "",
    answer_snapshot:
      question.answer || "",
    reference_snapshot:
      question.reference || "",
    topic_snapshot:
      question.topic || "",
    task_name_snapshot:
      question.task_name || "",
    question_type_snapshot:
      question.question_type || "knowledge",
    trigger_option_id: null,
    sort_order: 0,
  };
}

function GeneratedPoaEditContent() {
  const params = useParams<{ id: string }>();

  const id =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [plan, setPlan] =
    useState<GeneratedPlan | null>(null);

  const [testType, setTestType] =
    useState<PracticalTestType | null>(null);

  const [questions, setQuestions] =
    useState<SnapshotQuestion[]>([]);

  const [expandedQuestionKeys, setExpandedQuestionKeys] =
    useState<Set<string>>(new Set());

  const [draggedIndex, setDraggedIndex] =
    useState<number | null>(null);

  const [dragOverIndex, setDragOverIndex] =
    useState<number | null>(null);

  const [editorTab, setEditorTab] = useState<

    "timeline" | "questions" | "compliance" | "flight" | "triggers"

  >("questions");


  const [editPoaVersions, setEditPoaVersions] =


    useState<EditPoaVersionOption[]>([]);






  const [scenarioOptions, setScenarioOptions] =


    useState<ScenarioLibraryOption[]>([]);



  const [selectedScenarioId, setSelectedScenarioId] =


    useState("");



  const [loadingScenarioOptions, setLoadingScenarioOptions] =


    useState(false);


  const [loadingEditPoaVersions, setLoadingEditPoaVersions] =


    useState(false);



  const [flightTasks, setFlightTasks] =
    useState<FlightTaskSnapshot[]>([]);
  const flightFamily = flightFamilyFor(flightTasks.map((task) => task.acs_task_code_snapshot.split(".")[0]));





  const [triggerLibrary, setTriggerLibrary] =



    useState<TriggerLibraryOption[]>([]);




  const [poaTriggers, setPoaTriggers] =



    useState<GeneratedPoaTrigger[]>([]);




  const [selectedTriggerCategory, setSelectedTriggerCategory] =



    useState("all");




  const [selectedTriggerLibraryId, setSelectedTriggerLibraryId] =



    useState("");




  const [triggerPlacementSection, setTriggerPlacementSection] =



    useState<"oral" | "flight">("oral");




  const [triggerPlacementAfter, setTriggerPlacementAfter] =



    useState("start");


  const [expandedFlightTaskKeys, setExpandedFlightTaskKeys] =
    useState<Set<string>>(new Set());

  const [draggedFlightTaskIndex, setDraggedFlightTaskIndex] =
    useState<number | null>(null);

  const [dragOverFlightTaskIndex, setDragOverFlightTaskIndex] =
    useState<number | null>(null);

  const [originalQuestionIds, setOriginalQuestionIds] =
    useState<string[]>([]);

  const [libraryQuestions, setLibraryQuestions] =
    useState<LibraryQuestion[]>([]);

  // Scenario timeline editor: event sets, library mappings and the order inside each event set.
  const [timelineEventSets, setTimelineEventSets] =
    useState<TimelineEventSet[]>([]);

  const [questionEventSetRules, setQuestionEventSetRules] =
    useState<Record<string, string[]>>({});

  const [timelineLibraryTriggers, setTimelineLibraryTriggers] =
    useState<TimelineLibraryTrigger[]>([]);

  const [timelineOrder, setTimelineOrder] =
    useState<Record<string, string[]>>({});

  const [searchText, setSearchText] =
    useState("");

  const [libraryOpen, setLibraryOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setErrorMessage(
            "You must be signed in as an examiner.",
          );
          setLoading(false);
        }

        return;
      }

      const {
        data: planData,
        error: planError,
      } = await supabase
        .from("generated_plan_of_actions")
        .select(`
          id,
          practical_test_type_id,
          title,
          scenario_name,
          selection_method,
          status,
          notes,
          created_at,
          location_snapshot,
          ifr_snapshot,
          aircraft_equipment,
          practical_test_request_id
        `)
        .eq("id", id)
        .eq("examiner_profile_id", user.id)
        .single();

      if (planError || !planData) {
        if (!cancelled) {
          setErrorMessage(
            planError?.message ||
              "Generated Plan of Action could not be loaded.",
          );
          setLoading(false);
        }

        return;
      }

      const [
        snapshotsResult,
        testTypeResult,
        mappingResult,
      ] = await Promise.all([
        supabase
          .from(
            "generated_plan_of_action_questions",
          )
          .select(SNAPSHOT_COLUMNS)
          .eq(
            "generated_plan_of_action_id",
            id,
          )
          .order("sort_order", {
            ascending: true,
          }),

        supabase
          .from("practical_test_types")
          .select(`
            id,
            display_name,
            certificate_name,
            issuance_name,
            rating_name,
            category_name,
            class_name,
            certificate_code,
            class_code,
            rating_code
          `)
          .eq(
            "id",
            planData.practical_test_type_id,
          )
          .single(),

        supabase
          .from(
            "poa_question_practical_test_types",
          )
          .select("question_id")
          .eq(
            "practical_test_type_id",
            planData.practical_test_type_id,
          ),
      ]);

      const flightTaskResult =
        await supabase
          .from(
            "generated_plan_of_action_flight_tasks",
          )
          .select(`
            id,
            acs_task_code_snapshot,
            area_name_snapshot,
            task_name_snapshot,
            skill_elements_snapshot,
            examiner_notes,
            is_required,
            sort_order
          `)
          .eq(
            "generated_plan_of_action_id",
            id,
          )
          .order("sort_order", {
            ascending: true,
          });

      if (flightTaskResult.error) {
        if (!cancelled) {
          setErrorMessage(
            `Flight tasks could not be loaded: ${flightTaskResult.error.message}`,
          );
          setLoading(false);
        }

        return;
      }

      if (snapshotsResult.error) {
        if (!cancelled) {
          setErrorMessage(
            `POA questions could not be loaded: ${snapshotsResult.error.message}`,
          );
          setLoading(false);
        }

        return;
      }

      let libraryData: LibraryQuestion[] = [];

      if (!mappingResult.error) {
        const questionIds = [
          ...new Set(
            (mappingResult.data ?? [])
              .map((row) => row.question_id)
              .filter(Boolean),
          ),
        ];

        if (questionIds.length > 0) {
          const {
            data: questionData,
            error: questionError,
          } = await supabase
            .from("poa_questions")
            .select(`
              id,
              acs_reference,
              question,
              answer,
              reference,
              topic,
              task_name,
              question_type,
              poa_question_acs_applicability ( certificate_name, acs_reference )
            `)
            .eq(
              "examiner_profile_id",
              user.id,
            )
            .eq("is_active", true)
            .in("id", questionIds)
            .order("acs_reference", {
              ascending: true,
            })
            .order("question", {
              ascending: true,
            });

          if (!questionError) {
            // Keep only the element codes for this test's certificate, as the builder does.
            const certificateName =
              testTypeResult.data?.certificate_name ?? null;
            libraryData = (
              (questionData ?? []) as Array<
                LibraryQuestion & {
                  poa_question_acs_applicability?: Array<{ certificate_name: string | null; acs_reference: string | null }> | null;
                }
              >
            ).map(({ poa_question_acs_applicability: applicability, ...question }) => ({
              ...question,
              acs_references: [
                ...new Set(
                  (applicability ?? [])
                    .filter((row) => !row.certificate_name || !certificateName || row.certificate_name === certificateName)
                    .flatMap((row) => String(row.acs_reference ?? "").split(/[,;\n]+/))
                    .map((value) => value.trim())
                    .filter(Boolean),
                ),
              ],
            }));
          }
        }
      }

      if (!cancelled) {
        const loadedSnapshots =
          (snapshotsResult.data ?? []).map(
            (question) => mapSnapshotRow(question as Record<string, unknown>),
          );

        const loadedFlightTasks =
          (flightTaskResult.data ?? []).map(
            (task) => ({
              id: task.id,
              acs_task_code_snapshot:
                task.acs_task_code_snapshot || "",
              area_name_snapshot:
                task.area_name_snapshot || "",
              task_name_snapshot:
                task.task_name_snapshot || "ACS Task",
              skill_elements_snapshot:
                Array.isArray(
                  task.skill_elements_snapshot,
                )
                  ? task.skill_elements_snapshot
                  : [],
              examiner_notes:
                task.examiner_notes || "",
              is_required:
                task.is_required !== false,
              sort_order:
                task.sort_order || 0,
            }),
          ) as FlightTaskSnapshot[];

        setPlan(planData as GeneratedPlan);

        setQuestions(loadedSnapshots);

        setFlightTasks(loadedFlightTasks);

        setOriginalQuestionIds(
          loadedSnapshots
            .map((q) => q.id)
            .filter(
              (value): value is string =>
                Boolean(value),
            ),
        );

        setTestType(
          testTypeResult.data
            ? (testTypeResult.data as PracticalTestType)
            : null,
        );

        setLibraryQuestions(libraryData);

        // POAs built on event sets open on the timeline.
        if (loadedSnapshots.some((question) => question.event_set_id)) {
          setEditorTab("timeline");
        }

        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const filteredLibraryQuestions =
    useMemo(() => {
      const search =
        searchText.trim().toLowerCase();

      if (!search) {
        return libraryQuestions;
      }

      return libraryQuestions.filter(
        (question) =>
          [
            question.acs_reference,
            question.question,
            question.answer,
            question.reference,
            question.topic,
            question.task_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search),
      );
    }, [
      libraryQuestions,
      searchText,
    ]);

  function updateQuestion(
    index: number,
    patch: Partial<SnapshotQuestion>,
  ) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index
          ? {
              ...question,
              ...patch,
            }
          : question,
      ),
    );
  }

  function getQuestionUiKey(
    question: SnapshotQuestion,
    index: number,
  ) {
    return (
      question.id ||
      `new-${question.question_library_id || "poa"}-${index}`
    );
  }

  function toggleQuestionDetails(
    question: SnapshotQuestion,
    index: number,
  ) {
    const key = getQuestionUiKey(
      question,
      index,
    );

    setExpandedQuestionKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function moveQuestionTo(
    fromIndex: number,
    toIndex: number,
  ) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0
    ) {
      return;
    }

    if (
      fromIndex >= questions.length ||
      toIndex >= questions.length
    ) {
      return;
    }

    const copy = [...questions];
    const [question] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, question);
    setQuestions(copy);

    // Keep the timeline in step: inside each event set the questions take the new
    // list order, and scenes and triggers keep their places.
    const nextOrder: Record<string, string[]> = {};
    for (const [eventSetId, keys] of Object.entries(effectiveTimelineOrder)) {
      const questionKeys = copy
        .filter((item) => item.event_set_id === eventSetId)
        .map((item) => `question:${questionTimelineKey(item)}`);
      let next = 0;
      nextOrder[eventSetId] = keys.map((key) =>
        key.startsWith("question:") ? questionKeys[next++] ?? key : key,
      );
    }
    setTimelineOrder(nextOrder);
  }

  function dropQuestion(
    targetIndex: number,
  ) {
    if (draggedIndex === null) {
      return;
    }

    moveQuestionTo(
      draggedIndex,
      targetIndex,
    );

    setDraggedIndex(null);
    setDragOverIndex(null);

    setMessage(
      "Question sequence changed. Click Save Changes to save the new order.",
    );
  }

  function removeQuestion(index: number) {
    const question = questions[index];

    const confirmed =
      window.confirm(
        `Remove this question from this POA?\n\n${question.question_snapshot}\n\nThe Scenario Library record will NOT be deleted.`,
      );

    if (!confirmed) {
      return;
    }

    setQuestions((current) =>
      current.filter(
        (_, i) => i !== index,
      ),
    );
  }

  function addLibraryQuestion(
    libraryQuestion: LibraryQuestion,
  ) {
    setQuestions((current) => [
      ...current,
      snapshotFromLibrary(
        libraryQuestion,
      ),
    ]);

    setMessage(
      "Question added to this POA. Click Save Changes when finished.",
    );
  }

  function addBlankQuestion() {
    setQuestions((current) => [
      ...current,
      {
        id: null,
        client_key: newTimelineKey("new-question"),
        question_library_id: null,
        acs_reference_snapshot: "",
        acs_references_snapshot: [],
        question_snapshot:
          "New examiner question",
        answer_snapshot: "",
        reference_snapshot: "",
        topic_snapshot: "",
        task_name_snapshot: "",
        question_type_snapshot:
          "knowledge",
        trigger_option_id: null,
        sort_order: 0,
      },
    ]);

    setMessage(
      "Blank POA-only question added.",
    );
  }
  const savedPoaPrefixes = useMemo(() => {
    const prefixes = new Set<string>();

    for (const question of questions) {
      const refs = String(
        question.acs_reference_snapshot || "",
      )
        .split(/[,;\n]+/)
        .map((value) => value.trim())
        .filter(Boolean);

      for (const reference of refs) {
        const prefix =
          savedPoaAcsPrefix(reference);

        if (prefix) {
          prefixes.add(prefix);
        }
      }
    }

    for (const task of flightTasks) {
      const prefix =
        savedPoaAcsPrefix(
          task.acs_task_code_snapshot,
        );

      if (prefix) {
        prefixes.add(prefix);
      }
    }

    return [...prefixes];
  }, [questions, flightTasks]);

  const savedPoaComplianceCodes = useMemo(() => {
    const prefixSet =
      new Set(savedPoaPrefixes);

    const codes = new Set<string>();

    for (const entry of faaAcsComplianceCatalog.entries) {
      const code = String(
        entry.code ?? "",
      )
        .trim()
        .toUpperCase();

      const prefix =
        savedPoaAcsPrefix(code);

      if (
        prefix &&
        prefixSet.has(prefix) &&
        /\.(K|R|S)$/.test(code)
      ) {
        codes.add(code);
      }
    }

    return [...codes].sort(
      compareSavedPoaComplianceCodes,
    );
  }, [savedPoaPrefixes]);

  const savedPoaCoveredComplianceCodes =
    useMemo(() => {
      const covered =
        new Set<string>();

      for (const question of questions) {
        // Element codes may be in the text snapshot, the array snapshot, or both.
        const refs = [
          ...String(
            question.acs_reference_snapshot || "",
          )
            .split(/[,;\n]+/)
            .map((value) => value.trim()),
          ...(question.acs_references_snapshot ?? []),
        ].filter(Boolean);

        for (const reference of refs) {
          const parent =
            savedPoaComplianceParentCode(
              reference,
            );

          if (
            parent &&
            (
              parent.endsWith(".K") ||
              parent.endsWith(".R")
            )
          ) {
            covered.add(parent);
          }
        }
      }

      for (const task of flightTasks) {
        if (!task.is_required) {
          continue;
        }

        covered.add(
          `${task.acs_task_code_snapshot
            .trim()
            .toUpperCase()}.S`,
        );
      }

      return covered;
    }, [questions, flightTasks]);

  const savedPoaCoveredCount =
    savedPoaComplianceCodes.filter(
      (code) =>
        savedPoaCoveredComplianceCodes.has(
          code,
        ),
    ).length;

  const savedPoaMissingCount =
    savedPoaComplianceCodes.length -
    savedPoaCoveredCount;
  useEffect(() => {
    let cancelled = false;

    async function loadEditPoaVersions() {
      if (!plan?.id) {
        setEditPoaVersions([]);
        return;
      }

      setLoadingEditPoaVersions(true);

      const supabase = createClient();

      const {
        data: currentPoa,
        error: currentPoaError,
      } = await supabase
        .from("generated_plan_of_actions")
        .select("practical_test_type_id")
        .eq("id", plan.id)
        .single();

      if (
        cancelled ||
        currentPoaError ||
        !currentPoa?.practical_test_type_id
      ) {
        if (!cancelled) {
          setEditPoaVersions([]);
          setLoadingEditPoaVersions(false);
        }

        return;
      }

      const {
        data: versions,
        error: versionsError,
      } = await supabase
        .from("generated_plan_of_actions")
        .select(`
          id,
          version_code,
          title,
          created_at,
          status
        `)
        .eq(
          "practical_test_type_id",
          currentPoa.practical_test_type_id,
        )
        .order("created_at", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (versionsError) {
        setEditPoaVersions([]);
        setLoadingEditPoaVersions(false);
        return;
      }

      setEditPoaVersions(
        (versions ?? []) as EditPoaVersionOption[],
      );

      setLoadingEditPoaVersions(false);
    }

    void loadEditPoaVersions();

    return () => {
      cancelled = true;
    };
  }, [plan?.id]);

  function formatEditPoaVersion(
    poa: EditPoaVersionOption,
    index: number,
  ) {
    const created =
      new Date(poa.created_at);

    const dateText =
      Number.isNaN(created.getTime())
        ? ""
        : created.toLocaleString(
            undefined,
            {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            },
          );

    return `${poa.version_code || `Version ${index + 1}`}${
      dateText
        ? ` — ${dateText}`
        : ""
    }`;
  }

  function jumpToEditPoaVersion(
    value: string,
  ) {
    if (
      !value ||
      value === plan?.id
    ) {
      return;
    }

    window.location.href =
      `/examiner/plan-of-action/generated/${encodeURIComponent(
        value,
      )}/edit`;
  }
  useEffect(() => {
    let cancelled = false;

    async function loadScenarioLibraryOptions() {
      if (!plan?.id) {
        setScenarioOptions([]);
        setSelectedScenarioId("");
        return;
      }

      setLoadingScenarioOptions(true);

      const supabase = createClient();

      const {
        data: currentPoa,
        error: currentPoaError,
      } = await supabase
        .from("generated_plan_of_actions")
        .select("practical_test_type_id")
        .eq("id", plan.id)
        .single();

      if (
        cancelled ||
        currentPoaError ||
        !currentPoa?.practical_test_type_id
      ) {
        if (!cancelled) {
          setScenarioOptions([]);
          setSelectedScenarioId("");
          setLoadingScenarioOptions(false);
        }
        return;
      }

      const {
        data: mappings,
        error: mappingError,
      } = await supabase
        .from("poa_scenario_practical_test_types")
        .select("scenario_id")
        .eq(
          "practical_test_type_id",
          currentPoa.practical_test_type_id,
        );

      if (cancelled) {
        return;
      }

      const mappedIds = mappingError
        ? []
        : (mappings ?? [])
            .map((row) =>
              String(row.scenario_id || ""),
            )
            .filter(Boolean);

      let scenarioQuery = supabase
        .from("poa_scenarios")
        .select(`
          id,
          scenario_name,
          scenario_brief,
          departure,
          destination,
          aircraft,
          initial_conditions,
          examiner_notes,
          leg_nm,
          location_needs
        `)
        .eq("is_active", true)
        .order("scenario_name", {
          ascending: true,
        });

      if (mappedIds.length > 0) {
        scenarioQuery = scenarioQuery.in(
          "id",
          mappedIds,
        );
      }

      const {
        data: scenarios,
        error: scenarioError,
      } = await scenarioQuery;

      if (cancelled) {
        return;
      }

      if (scenarioError) {
        setScenarioOptions([]);
        setSelectedScenarioId("");
        setLoadingScenarioOptions(false);
        return;
      }

      const loaded =
        (scenarios ?? []) as ScenarioLibraryOption[];

      setScenarioOptions(loaded);

      const matchingScenario =
        loaded.find(
          (scenario) =>
            scenario.scenario_name ===
            (plan.scenario_name || ""),
        );

      setSelectedScenarioId(
        matchingScenario?.id || "",
      );

      setLoadingScenarioOptions(false);
    }

    void loadScenarioLibraryOptions();

    return () => {
      cancelled = true;
    };
  }, [plan?.id, plan?.scenario_name]);

  const selectedScenario =
    useMemo(
      () =>
        scenarioOptions.find(
          (scenario) =>
            scenario.id ===
            selectedScenarioId,
        ) ?? null,
      [
        scenarioOptions,
        selectedScenarioId,
      ],
    );

  // This POA's own places and aircraft (Kele, Nov 12 2026). The library
  // scenario leaves them blank; they're picked for each POA and can be changed here.
  const [linkedRequest, setLinkedRequest] = useState<LinkedRequest | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLinkedRequest(null);
    const requestId = plan?.practical_test_request_id;
    if (!requestId) return;
    void createClient()
      .from("practical_test_requests")
      .select("aircraft_make, aircraft_model, aircraft_registration, flight_airport_id")
      .eq("id", requestId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLinkedRequest((data as LinkedRequest | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [plan?.practical_test_request_id]);

  const [changingPlaces, setChangingPlaces] = useState(false);
  /** Places picked on this page and not saved yet. */
  const [newPlaces, setNewPlaces] = useState<PoaLocations | null>(null);
  const [newIfr, setNewIfr] = useState<IfrContext | null>(null);
  const [placesBusy, setPlacesBusy] = useState(false);
  /** Wording the new places couldn't supply, so it still names the old ones. */
  const [placeLeftovers, setPlaceLeftovers] = useState<string[]>([]);
  /** The fill-ins the question and trigger wording currently uses. */
  const [appliedFills, setAppliedFills] = useState<Record<string, string | null> | null>(null);

  const placesInstrument = useMemo(() => {
    const ratingCode = (testType?.rating_code ?? "").trim().toUpperCase();
    return (
      testType?.certificate_code === "INSTRUMENT" ||
      testType?.certificate_code === "ATP" ||
      ratingCode.startsWith("CFII")
    );
  }, [testType]);

  const placeNeeds = useMemo(() => {
    const classCode = (testType?.class_code ?? "").trim().toUpperCase();
    return {
      legNm: selectedScenario?.leg_nm ?? parseLegNm(selectedScenario?.destination),
      destinationKind: (["ASES", "AMES"].includes(classCode) ? "seaplane" : "airport") as "seaplane" | "airport",
      instrument: placesInstrument,
      stops: selectedScenario?.location_needs?.stops ?? [],
      preferRiver: Boolean(selectedScenario?.location_needs?.prefer_river),
    };
  }, [testType, selectedScenario, placesInstrument]);

  const aircraftText = useMemo(() => {
    const made = [linkedRequest?.aircraft_make, linkedRequest?.aircraft_model].filter(Boolean).join(" ").trim();
    const registration = linkedRequest?.aircraft_registration?.trim();
    const equipment =
      plan?.aircraft_equipment === "taa"
        ? "glass cockpit (TAA)"
        : plan?.aircraft_equipment === "six_pack"
          ? "six-pack instruments"
          : "";
    const name = [made, registration ? `(${registration})` : ""].filter(Boolean).join(" ");
    return [name, equipment].filter(Boolean).join(" · ") || null;
  }, [linkedRequest, plan?.aircraft_equipment]);

  /** What the box shows: places changed here, else the saved ones. */
  const shownPlaces = useMemo(() => {
    if (newPlaces) {
      const at = (place: { distance_nm: number; from: string } & Parameters<typeof placeLabel>[0] | null) =>
        place ? `${placeLabel(place)} · ${place.distance_nm} NM from ${place.from}` : null;
      return {
        departure: placeLabel(newPlaces.departure),
        destination: at(newPlaces.destination),
        alternate: at(newPlaces.alternate),
        practice: newPlaces.practice_area ? placeLabel(newPlaces.practice_area) : null,
        pattern: newPlaces.pattern_airport ? placeLabel(newPlaces.pattern_airport) : null,
        stops: (newPlaces.stops ?? []).map(
          (stop) => `${placeLabel(stop)} · ${stop.distance_nm} NM · ${hasFuel(stop) ? `fuel: ${stop.fuel_types}` : "no fuel"}`,
        ),
      };
    }
    const saved = plan?.location_snapshot ?? null;
    if (!saved?.departure) return null;
    const at = (place: SavedLocations["destination"]) =>
      place ? `${savedPlaceLabel(place)}${place.distance_nm != null ? ` · ${place.distance_nm} NM from ${place.from}` : ""}` : null;
    return {
      departure: savedPlaceLabel(saved.departure),
      destination: at(saved.destination),
      alternate: at(saved.alternate),
      practice: saved.practice_area ? savedPlaceLabel(saved.practice_area) : null,
      pattern: saved.pattern_airport ? savedPlaceLabel(saved.pattern_airport) : null,
      stops: (saved.stops ?? []).map(
        (stop) => `${savedPlaceLabel(stop)}${stop.distance_nm != null ? ` · ${stop.distance_nm} NM` : ""} · ${(stop.fuel ?? "").trim() ? `fuel: ${stop.fuel}` : "no fuel"}`,
      ),
    };
  }, [newPlaces, plan?.location_snapshot]);

  const changePlaces = useCallback(
    async (next: PoaLocations | null) => {
      if (!next || !plan) return;
      setPlacesBusy(true);
      try {
        let ifr: IfrContext | null = null;
        if (placesInstrument && next.destination) {
          const equipment = plan.aircraft_equipment === "taa" || plan.aircraft_equipment === "six_pack" ? plan.aircraft_equipment : null;
          const inputs = await loadIfrInputs(createClient(), next, equipment);
          ifr = inputs ? buildIfrContext(inputs) : null;
        }
        const before =
          appliedFills ?? {
            ...savedLocationFills(plan.location_snapshot ?? null, {
              departure: selectedScenario?.departure ?? null,
              destination: selectedScenario?.destination ?? null,
            }),
            ...(plan.ifr_snapshot?.fills ?? {}),
          };
        const after: Record<string, string | null> = {
          ...locationFills(next, {
            departure: selectedScenario?.departure ?? null,
            destination: selectedScenario?.destination ?? null,
          }),
          ...(ifr?.fills ?? {}),
        };
        const changes = fillChanges(before, after);
        const rewrite = (text: string) => rewriteForNewPlaces(text, changes, after);
        setQuestions((current) =>
          current.map((question) => ({
            ...question,
            question_snapshot: rewrite(question.question_snapshot),
            answer_snapshot: rewrite(question.answer_snapshot),
          })),
        );
        setPoaTriggers((current) =>
          current.map((trigger) => ({
            ...trigger,
            trigger_text_snapshot: rewrite(trigger.trigger_text_snapshot),
            trigger_narrative_snapshot: rewrite(trigger.trigger_narrative_snapshot),
          })),
        );
        // Wording that named something the new places don't have (an ILS, a stop with fuel).
        const stale = staleValues(before, after);
        const leftovers = new Set<string>();
        const look = (title: string, ...texts: string[]) => {
          if (stale.some(({ value }) => texts.some((text) => text.includes(value)))) leftovers.add(title);
        };
        questions.forEach((question) => look(question.question_snapshot, question.question_snapshot, question.answer_snapshot));
        poaTriggers.forEach((trigger) => look(trigger.trigger_text_snapshot, trigger.trigger_text_snapshot, trigger.trigger_narrative_snapshot));
        setPlaceLeftovers([...leftovers]);
        setAppliedFills(after);
        setNewIfr(ifr);
        setNewPlaces(next);
      } finally {
        setPlacesBusy(false);
      }
    },
    // questions/poaTriggers are read only to list leftovers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, placesInstrument, appliedFills, selectedScenario, questions, poaTriggers],
  );

  // The panel calls back with the saved places first; only a real change rewrites anything.
  const savedPlaceIds = useMemo(() => {
    const saved = plan?.location_snapshot;
    return saved?.departure
      ? [saved.departure, saved.destination, saved.alternate, saved.practice_area, saved.pattern_airport, ...(saved.stops ?? [])]
          .map((place) => place?.id ?? "")
          .join("|")
      : null;
  }, [plan?.location_snapshot]);
  const onPanelPlaces = useCallback(
    (next: PoaLocations | null) => {
      if (!next) return;
      const ids = [next.departure, next.destination, next.alternate, next.practice_area, next.pattern_airport, ...(next.stops ?? [])]
        .map((place) => place?.id ?? "")
        .join("|");
      if (!newPlaces && ids === savedPlaceIds) return;
      void changePlaces(next);
    },
    [changePlaces, newPlaces, savedPlaceIds],
  );

  function selectScenarioFromLibrary(
    scenarioId: string,
  ) {
    setSelectedScenarioId(
      scenarioId,
    );

    const scenario =
      scenarioOptions.find(
        (item) =>
          item.id === scenarioId,
      );

    setPlan((current) =>
      current
        ? {
            ...current,
            scenario_name:
              scenario?.scenario_name ??
              null,
          }
        : current,
    );
  }
  useEffect(() => {
    let cancelled = false;

    async function loadPoaTriggerData() {
      if (!plan?.id) {
        setTriggerLibrary([]);
        setPoaTriggers([]);
        return;
      }

      const supabase = createClient();

      const [
        libraryResult,
        frozenResult,
      ] = await Promise.all([
        supabase
          .from("poa_triggers")
          .select(`
            id,
            category,
            trigger_text,
            trigger_narrative
          `)
          .eq("is_active", true)
          .not("trigger_narrative", "is", null)
          .order("category", {
            ascending: true,
          })
          .order("trigger_text", {
            ascending: true,
          }),
        supabase
          .from("generated_plan_of_action_triggers")
          .select(TRIGGER_COLUMNS)
          .eq(
            "generated_plan_of_action_id",
            plan.id,
          )
          .order("placement_section", {
            ascending: true,
          })
          .order("sort_order", {
            ascending: true,
          }),
      ]);

      if (cancelled) {
        return;
      }

      if (!libraryResult.error) {
        setTriggerLibrary(
          (libraryResult.data ?? [])
            .filter(
              (row) =>
                Boolean(
                  row.trigger_narrative,
                ),
            )
            .map(
              (row) => ({
                id: row.id,
                category:
                  row.category || "other",
                trigger_text:
                  row.trigger_text || "",
                trigger_narrative:
                  row.trigger_narrative || "",
              }),
            ) as TriggerLibraryOption[],
        );
      }

      if (!frozenResult.error) {
        setPoaTriggers(
          (frozenResult.data ?? []).map((row) =>
            mapTriggerRow(row as Record<string, unknown>),
          ),
        );
      }
    }

    void loadPoaTriggerData();

    return () => {
      cancelled = true;
    };
  }, [plan?.id]);


  useEffect(() => {
    let cancelled = false;

    async function loadTimelineLibrary() {
      if (!plan?.id || !testType) {
        return;
      }

      const supabase = createClient();

      const { data: eventSetRows, error: eventSetError } = await supabase
        .from("poa_event_sets")
        .select("id, name, description, sort_order, minimum_question_count, exam_section, is_active")
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (eventSetError) {
        setErrorMessage(`Event sets could not be loaded: ${eventSetError.message}`);
        return;
      }

      setTimelineEventSets(
        (eventSetRows ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? "Event Set"),
          description: (row.description as string | null) ?? null,
          minimumQuestionCount: Math.max(1, Number(row.minimum_question_count ?? 15)),
          // Only active oral event sets are offered when nothing in this POA uses them yet.
          offered: row.is_active !== false && row.exam_section === "oral",
        })),
      );

      const eventSetIds = (eventSetRows ?? []).map((row) => String(row.id));

      if (eventSetIds.length === 0) return;

      const [ruleResult, optionResult] = await Promise.all([
        supabase
          .from("poa_event_set_question_rules")
          .select("event_set_id, question_id, review_status")
          .in("event_set_id", eventSetIds),
        supabase
          .from("poa_event_set_trigger_options")
          .select(`
            event_set_id,
            option_order,
            is_active,
            class_codes,
            certificate_codes,
            poa_triggers!inner (
              id, category, trigger_text, trigger_narrative, is_active, trigger_role
            )
          `)
          .in("event_set_id", eventSetIds)
          .eq("is_active", true)
          .eq("poa_triggers.is_active", true)
          .eq("poa_triggers.trigger_role", "operational")
          .order("option_order", { ascending: true }),
      ]);

      if (cancelled) return;

      if (!ruleResult.error) {
        const rules: Record<string, string[]> = {};

        for (const row of ruleResult.data ?? []) {
          if (row.review_status && row.review_status !== "approved") continue;
          const questionId = String(row.question_id ?? "");
          const eventSetId = String(row.event_set_id ?? "");
          if (!questionId || !eventSetId) continue;
          rules[questionId] = [...new Set([...(rules[questionId] ?? []), eventSetId])];
        }

        setQuestionEventSetRules(rules);
      }

      if (!optionResult.error) {
        const poaClass = (testType.class_code ?? "").trim().toUpperCase();
        const poaCertificate = (testType.certificate_code ?? "").trim().toUpperCase();

        setTimelineLibraryTriggers(
          (optionResult.data ?? [])
            .filter((row) => {
              const { class_codes: classes, certificate_codes: certificates } =
                row as { class_codes?: string[] | null; certificate_codes?: string[] | null };
              return (
                (!classes || classes.length === 0 || !poaClass || classes.includes(poaClass)) &&
                (!certificates || certificates.length === 0 || !poaCertificate || certificates.includes(poaCertificate))
              );
            })
            .map((row) => {
              const related = Array.isArray(row.poa_triggers) ? row.poa_triggers[0] : row.poa_triggers;
              return {
                id: String(related?.id ?? ""),
                eventSetId: String(row.event_set_id),
                category: String(related?.category ?? "event"),
                title: String(related?.trigger_text ?? "Trigger"),
                narrative: String(related?.trigger_narrative ?? related?.trigger_text ?? ""),
              };
            })
            .filter((trigger) => trigger.id),
        );
      }
    }

    void loadTimelineLibrary();

    return () => {
      cancelled = true;
    };
  }, [plan?.id, testType]);

  // Event sets in the order this POA uses them, then the other active oral event sets.
  const editorEventSets = useMemo(() => {
    const known = new Map(timelineEventSets.map((eventSet) => [eventSet.id, eventSet]));
    const used: string[] = [];
    const oralRows = [
      ...questions.map((question) => ({ eventSetId: question.event_set_id ?? null, sortOrder: question.sort_order || Number.MAX_SAFE_INTEGER, header: false })),
      ...poaTriggers
        .filter((trigger) => trigger.placement_section !== "flight")
        .map((trigger) => ({ eventSetId: trigger.event_set_id ?? null, sortOrder: trigger.sort_order || Number.MAX_SAFE_INTEGER, header: trigger.timeline_kind === "event_set" })),
    ].sort((a, b) => a.sortOrder - b.sortOrder || Number(b.header) - Number(a.header));

    for (const row of oralRows) {
      if (row.eventSetId && !used.includes(row.eventSetId)) used.push(row.eventSetId);
    }

    const headerNames = new Map(
      poaTriggers
        .filter((trigger) => trigger.timeline_kind === "event_set" && trigger.event_set_id)
        .map((trigger) => [trigger.event_set_id as string, trigger.trigger_text_snapshot]),
    );

    const offered = timelineEventSets.filter(
      (eventSet) => eventSet.offered && !used.includes(eventSet.id),
    );

    return [
      ...used.map(
        (eventSetId) =>
          known.get(eventSetId) ?? {
            id: eventSetId,
            name: headerNames.get(eventSetId) || "Event Set",
            description: null,
            minimumQuestionCount: 15,
          },
      ),
      ...offered,
    ];
  }, [timelineEventSets, questions, poaTriggers]);

  const allEditorEventSetIds = useMemo(
    () => editorEventSets.map((eventSet) => eventSet.id),
    [editorEventSets],
  );

  // The order inside each event set: the editor's order where the examiner changed it, otherwise the saved order.
  const effectiveTimelineOrder = useMemo(() => {
    const members: Record<string, Array<{ key: string; sortOrder: number; trigger: boolean }>> = {};

    for (const question of questions) {
      if (!question.event_set_id) continue;
      (members[question.event_set_id] ??= []).push({
        key: `question:${questionTimelineKey(question)}`,
        sortOrder: question.sort_order || Number.MAX_SAFE_INTEGER,
        trigger: false,
      });
    }

    for (const trigger of poaTriggers) {
      if (!trigger.event_set_id || !isTimelineTrigger(trigger)) continue;
      (members[trigger.event_set_id] ??= []).push({
        key: `trigger:${triggerTimelineKey(trigger)}`,
        sortOrder: trigger.sort_order || Number.MAX_SAFE_INTEGER,
        trigger: true,
      });
    }

    const order: Record<string, string[]> = {};

    for (const [eventSetId, entries] of Object.entries(members)) {
      const keys = new Set(entries.map((entry) => entry.key));
      const chosen = (timelineOrder[eventSetId] ?? []).filter((key) => keys.has(key));
      const rest = entries
        .filter((entry) => !chosen.includes(entry.key))
        .sort((a, b) => a.sortOrder - b.sortOrder || Number(b.trigger) - Number(a.trigger))
        .map((entry) => entry.key);
      order[eventSetId] = [...chosen, ...rest];
    }

    return order;
  }, [questions, poaTriggers, timelineOrder]);

  const timelineQuestionEntries = useMemo(() => {
    const placedLibraryIds = new Set(
      questions.map((question) => question.question_library_id).filter(Boolean),
    );

    return [
      ...questions.map((question) => ({
        id: questionTimelineKey(question),
        title: question.question_snapshot.replace(/^TRIGGER:\s*/, "") || "Untitled question",
        label: question.question_snapshot.startsWith("TRIGGER: ")
          ? "Trigger question"
          : question.focus_sources?.length
            ? `Focus: ${question.focus_sources.map((source) => FOCUS_LABEL[source] ?? source).join(", ")}`
            : undefined,
        depth: question.template_depth ?? 0,
        eventSetIds: allEditorEventSetIds,
        assignedEventSetId: question.event_set_id ?? undefined,
        selected: true,
        // Questions already in an event set are moved by dragging them; unplaced ones stay listed so they can be placed.
        hideInLibrary: Boolean(question.event_set_id),
      })),
      ...libraryQuestions
        .filter((question) => !placedLibraryIds.has(question.id))
        .map((question) => ({
          id: `lib:${question.id}`,
          title: question.question,
          eventSetIds: questionEventSetRules[question.id]?.length
            ? questionEventSetRules[question.id]
            : allEditorEventSetIds,
          selected: false,
        })),
    ];
  }, [questions, libraryQuestions, questionEventSetRules, allEditorEventSetIds]);

  const timelineTriggerEntries = useMemo(() => {
    const placedTriggerIds = new Set(
      poaTriggers.map((trigger) => trigger.trigger_library_id).filter(Boolean),
    );

    const libraryById = new Map<string, { trigger: TimelineLibraryTrigger; eventSetIds: string[] }>();

    for (const trigger of timelineLibraryTriggers) {
      if (placedTriggerIds.has(trigger.id)) continue;
      const entry = libraryById.get(trigger.id) ?? { trigger, eventSetIds: [] };
      if (!entry.eventSetIds.includes(trigger.eventSetId)) entry.eventSetIds.push(trigger.eventSetId);
      libraryById.set(trigger.id, entry);
    }

    return [
      ...poaTriggers.filter(isTimelineTrigger).map((trigger) => ({
        id: triggerTimelineKey(trigger),
        title: trigger.trigger_text_snapshot || "Untitled",
        label: timelineTriggerLabel(trigger.timeline_kind),
        depth: trigger.template_depth ?? 0,
        eventSetIds: allEditorEventSetIds,
        assignedEventSetId: trigger.event_set_id ?? undefined,
        selected: true,
        hideInLibrary: Boolean(trigger.event_set_id),
      })),
      ...[...libraryById.values()].map(({ trigger, eventSetIds }) => ({
        id: `libt:${trigger.id}`,
        title: trigger.title,
        eventSetIds,
        selected: false,
      })),
    ];
  }, [poaTriggers, timelineLibraryTriggers, allEditorEventSetIds]);

  // Puts the questions list (Questions tab) in the same order as the timeline.
  function orderQuestionsLikeTimeline(
    list: SnapshotQuestion[],
    order: Record<string, string[]>,
  ) {
    const position = new Map<string, number>();
    let index = 0;

    for (const eventSet of editorEventSets) {
      for (const key of order[eventSet.id] ?? []) {
        position.set(key, index);
        index += 1;
      }
    }

    return list
      .map((question, listIndex) => ({ question, listIndex }))
      .sort((a, b) => {
        const ap = position.get(`question:${questionTimelineKey(a.question)}`) ?? Number.MAX_SAFE_INTEGER;
        const bp = position.get(`question:${questionTimelineKey(b.question)}`) ?? Number.MAX_SAFE_INTEGER;
        return ap - bp || a.listIndex - b.listIndex;
      })
      .map(({ question }) => question);
  }

  function changeTimelineOrder(eventSetId: string, keys: string[]) {
    const nextOrder = { ...effectiveTimelineOrder, [eventSetId]: keys };
    setTimelineOrder(nextOrder);
    setQuestions((current) => orderQuestionsLikeTimeline(current, nextOrder));
    setMessage("Timeline changed. Click Save Changes to save it.");
  }

  function assignTimelineItem(
    kind: "question" | "trigger",
    key: string,
    eventSetId: string,
  ) {
    if (kind === "question") {
      if (key.startsWith("lib:")) {
        const libraryQuestion = libraryQuestions.find((question) => `lib:${question.id}` === key);
        if (!libraryQuestion) return false;
        setQuestions((current) => [
          ...current,
          {
            ...snapshotFromLibrary(libraryQuestion),
            client_key: key,
            event_set_id: eventSetId,
            template_depth: 0,
            sort_order: Number.MAX_SAFE_INTEGER,
          },
        ]);
      } else {
        setQuestions((current) =>
          current.map((question) =>
            questionTimelineKey(question) === key
              ? { ...question, event_set_id: eventSetId }
              : question,
          ),
        );
      }
    } else if (key.startsWith("libt:")) {
      const libraryTrigger = timelineLibraryTriggers.find((trigger) => `libt:${trigger.id}` === key);
      if (!libraryTrigger) return false;
      setPoaTriggers((current) => [
        ...current,
        {
          client_key: key,
          trigger_library_id: libraryTrigger.id,
          event_set_id: eventSetId,
          placement_section: "oral",
          timeline_kind: "trigger",
          phase: null,
          category_snapshot: libraryTrigger.category,
          trigger_text_snapshot: libraryTrigger.title,
          trigger_narrative_snapshot: libraryTrigger.narrative || libraryTrigger.title,
          branch_worthy: false,
          source_trigger_id: null,
          is_selected: false,
          sort_order: Number.MAX_SAFE_INTEGER,
          template_item_id: null,
          template_depth: 0,
        },
      ]);
    } else {
      setPoaTriggers((current) =>
        current.map((trigger) =>
          triggerTimelineKey(trigger) === key
            ? { ...trigger, event_set_id: eventSetId }
            : trigger,
        ),
      );
    }

    setMessage("Timeline changed. Click Save Changes to save it.");
    return true;
  }

  function removeTimelineItem(
    kind: "question" | "trigger",
    key: string,
  ) {
    if (kind === "question") {
      setQuestions((current) => current.filter((question) => questionTimelineKey(question) !== key));
    } else {
      setPoaTriggers((current) => current.filter((trigger) => triggerTimelineKey(trigger) !== key));
    }

    setMessage("Removed from this POA. Click Save Changes to save it. The library record is not deleted.");
  }

  // Sort orders for the whole oral timeline, so print and EMT follow the timeline.
  // Event-set members are written in the timeline order at their event set's place;
  // the scenario and anything outside an event set keep their place.
  function buildTimelinePositions() {
    type Row =
      | { kind: "question"; key: string; sortOrder: number; eventSetId: string | null }
      | { kind: "trigger"; key: string; sortOrder: number; eventSetId: string | null; header: boolean };

    const rows: Row[] = [
      ...questions.map((question, index) => ({
        kind: "question" as const,
        key: questionTimelineKey(question),
        sortOrder: question.id ? question.sort_order : Number.MAX_SAFE_INTEGER - questions.length + index,
        eventSetId: question.event_set_id ?? null,
      })),
      ...poaTriggers
        .filter((trigger) => trigger.placement_section !== "flight")
        .map((trigger) => ({
          kind: "trigger" as const,
          key: triggerTimelineKey(trigger),
          sortOrder: trigger.id ? trigger.sort_order : Number.MAX_SAFE_INTEGER,
          eventSetId: trigger.timeline_kind === "scenario" ? null : trigger.event_set_id ?? null,
          header: trigger.timeline_kind === "event_set",
        })),
    ].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        Number(b.kind === "trigger" && b.header) - Number(a.kind === "trigger" && a.header) ||
        Number(b.kind === "trigger") - Number(a.kind === "trigger"),
    );

    const headerKeys = new Map<string, string>();
    for (const row of rows) {
      if (row.kind === "trigger" && row.header && row.eventSetId && !headerKeys.has(row.eventSetId)) {
        headerKeys.set(row.eventSetId, row.key);
      }
    }

    const sequence: string[] = [];
    const newHeaders: string[] = [];
    const done = new Set<string>();

    function emitEventSet(eventSetId: string) {
      if (done.has(eventSetId)) return;
      done.add(eventSetId);
      const header = headerKeys.get(eventSetId);
      if (header) {
        sequence.push(`trigger:${header}`);
      } else {
        sequence.push(`header:${eventSetId}`);
        newHeaders.push(eventSetId);
      }
      sequence.push(...(effectiveTimelineOrder[eventSetId] ?? []));
    }

    for (const row of rows) {
      if (row.eventSetId) {
        emitEventSet(row.eventSetId);
      } else {
        sequence.push(`${row.kind}:${row.key}`);
      }
    }

    const positions = new Map<string, number>();
    sequence.forEach((key, index) => {
      if (!positions.has(key)) positions.set(key, (index + 1) * 10);
    });

    return { positions, newHeaders };
  }

  const triggerCategories =
    useMemo(
      () =>
        Array.from(
          new Set(
            triggerLibrary.map(
              (trigger) =>
                trigger.category,
            ),
          ),
        ).sort(),
      [triggerLibrary],
    );

  const filteredTriggerLibrary =
    useMemo(
      () =>
        selectedTriggerCategory ===
        "all"
          ? triggerLibrary
          : triggerLibrary.filter(
              (trigger) =>
                trigger.category ===
                selectedTriggerCategory,
            ),
      [
        triggerLibrary,
        selectedTriggerCategory,
      ],
    );

  const selectedTriggerLibraryItem =
    useMemo(
      () =>
        triggerLibrary.find(
          (trigger) =>
            trigger.id ===
            selectedTriggerLibraryId,
        ) ?? null,
      [
        triggerLibrary,
        selectedTriggerLibraryId,
      ],
    );

  function categoryLabel(
    value: string,
  ) {
    if (value === "pilot_aircraft") {
      return "Pilot / Aircraft";
    }

    if (value === "passenger") {
      return "Passenger";
    }

    if (value === "weather") {
      return "Weather";
    }

    if (value === "event") {
      return "Event";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );
  }

  function placementChoices(
    section: "oral" | "flight",
  ) {
    if (section === "oral") {
      return questions.map(
        (question, index) => ({
          value: String(index),
          label: `After Question ${index + 1} — ${
            question.acs_reference_snapshot ||
            "No ACS"
          }`,
        }),
      );
    }

    return flightTasks.map(
      (task, index) => ({
        value: String(index),
        label: `After Flight Task ${index + 1} — ${
          task.acs_task_code_snapshot ||
          "No ACS"
        }`,
      }),
    );
  }

  function triggerSortOrderForPlacement() {
    if (
      triggerPlacementAfter === "start"
    ) {
      return 5;
    }

    const index =
      Number(triggerPlacementAfter);

    if (
      !Number.isFinite(index)
    ) {
      return 5;
    }

    return (index + 1) * 10 + 5;
  }

  function addSelectedTriggerToPoa() {
    if (!selectedTriggerLibraryItem) {
      return;
    }

    const next: GeneratedPoaTrigger = {
      client_key: newTimelineKey("new-trigger"),
      trigger_library_id:
        selectedTriggerLibraryItem.id,
      event_set_id: null,
      placement_section:
        triggerPlacementSection,
      timeline_kind: "trigger",
      phase: triggerPlacementSection === "flight" ? "flight" : "ground",
      category_snapshot:
        selectedTriggerLibraryItem.category,
      trigger_text_snapshot:
        selectedTriggerLibraryItem.trigger_text,
      trigger_narrative_snapshot:
        selectedTriggerLibraryItem.trigger_narrative,
      branch_worthy: false,
      source_trigger_id: null,
      sort_order:
        triggerSortOrderForPlacement(),
    };

    setPoaTriggers(
      (current) => [
        ...current,
        next,
      ].sort(
        (a, b) => {
          if (
            a.placement_section !==
            b.placement_section
          ) {
            return a.placement_section ===
              "oral"
              ? -1
              : 1;
          }

          return (
            a.sort_order -
            b.sort_order
          );
        },
      ),
    );

    setSelectedTriggerLibraryId("");
  }

  function removePoaTrigger(
    index: number,
  ) {
    setPoaTriggers(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
    );
  }

  async function selectTriggerForOral(trigger: GeneratedPoaTrigger) {
    if (!plan?.id || !trigger.event_set_id || !trigger.trigger_library_id) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("examiner_select_generated_poa_trigger", {
      p_generated_plan_of_action_id: plan.id,
      p_event_set_id: trigger.event_set_id,
      p_trigger_id: trigger.trigger_library_id,
    });
    if (error) {
      setErrorMessage(`Trigger could not be activated: ${error.message}`);
      return;
    }
    setPoaTriggers((current) => current.map((item) => ({
      ...item,
      is_selected:
        item.event_set_id === trigger.event_set_id
          ? item.trigger_library_id === trigger.trigger_library_id
          : item.is_selected,
    })));
    setMessage(`Activated trigger: ${trigger.trigger_text_snapshot}`);
  }

  function updatePoaTriggerPlacement(
    index: number,
    section: "oral" | "flight",
    sortOrder: number,
  ) {
    setPoaTriggers(
      (current) =>
        current
          .map(
            (trigger, itemIndex) =>
              itemIndex === index
                ? {
                    ...trigger,
                    placement_section:
                      section,
                    sort_order:
                      sortOrder,
                  }
                : trigger,
          )
          .sort(
            (a, b) => {
              if (
                a.placement_section !==
                b.placement_section
              ) {
                return a.placement_section ===
                  "oral"
                  ? -1
                  : 1;
              }

              return (
                a.sort_order -
                b.sort_order
              );
            },
          ),
    );
  }





  function populateFlightTasksFromAcs() {
    const prefixes = [
      ...new Set(
        questions
          .flatMap((question) =>
            String(
              question.acs_reference_snapshot ||
                "",
            )
              .split(/[,;\n]+/)
              .map((reference) => {
                const match =
                  reference
                    .trim()
                    .toUpperCase()
                    .match(
                      /^([A-Z]{1,5})\./,
                    );

                return match?.[1] ?? null;
              }),
          )
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ];

    const derived =
      deriveAllFlightTasksFromAcsCatalog(
        prefixes,
      );

    setFlightTasks(
      derived.map((task) => ({
        ...task,
        id: null,
      })),
    );

    setExpandedFlightTaskKeys(
      new Set(),
    );

    setMessage(
      `Loaded ${derived.length} ACS flight task${
        derived.length === 1 ? "" : "s"
      } from the complete ACS Skill task set for this POA. Reorder or edit them, then click Save Changes.`,
    );
  }

  function getFlightTaskUiKey(
    task: FlightTaskSnapshot,
    index: number,
  ) {
    return (
      task.id ||
      `${task.acs_task_code_snapshot}-${index}`
    );
  }

  function toggleFlightTaskDetails(
    task: FlightTaskSnapshot,
    index: number,
  ) {
    const key =
      getFlightTaskUiKey(
        task,
        index,
      );

    setExpandedFlightTaskKeys(
      (current) => {
        const next =
          new Set(current);

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      },
    );
  }

  function updateFlightTask(
    index: number,
    patch: Partial<FlightTaskSnapshot>,
  ) {
    setFlightTasks((current) =>
      current.map((task, i) =>
        i === index
          ? {
              ...task,
              ...patch,
            }
          : task,
      ),
    );
  }

  function moveFlightTaskTo(
    fromIndex: number,
    toIndex: number,
  ) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0
    ) {
      return;
    }

    setFlightTasks((current) => {
      if (
        fromIndex >= current.length ||
        toIndex >= current.length
      ) {
        return current;
      }

      const copy = [...current];
      const [task] = copy.splice(
        fromIndex,
        1,
      );

      copy.splice(
        toIndex,
        0,
        task,
      );

      return copy;
    });
  }

  function dropFlightTask(
    targetIndex: number,
  ) {
    if (
      draggedFlightTaskIndex === null
    ) {
      return;
    }

    moveFlightTaskTo(
      draggedFlightTaskIndex,
      targetIndex,
    );

    setDraggedFlightTaskIndex(null);
    setDragOverFlightTaskIndex(null);

    setMessage(
      "Flight task sequence changed. Click Save Changes to save the new order.",
    );
  }

  async function saveChanges() {
    if (!plan) {
      return;
    }

    if (!plan.title.trim()) {
      setErrorMessage(
        "POA title is required.",
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "You must be signed in as an examiner.",
        );
      }

      const {
        error: planUpdateError,
      } = await supabase
        .from("generated_plan_of_actions")
        .update({
          title: plan.title.trim(),
          scenario_name:
            plan.scenario_name?.trim() ||
            null,
          notes:
            plan.notes?.trim() ||
            null,
          // Airports changed on this page (the wording below was already swapped).
          ...(newPlaces
            ? {
                location_snapshot: locationSnapshot(newPlaces),
                ...(placesInstrument
                  ? { ifr_snapshot: newIfr ? { ...newIfr.snapshot, fills: newIfr.fills } : null }
                  : {}),
              }
            : {}),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", plan.id)
        .eq(
          "examiner_profile_id",
          user.id,
        );

      if (planUpdateError) {
        throw new Error(
          `POA header could not be saved: ${planUpdateError.message}`,
        );
      }

      // POAs built on event sets save in timeline order; older POAs keep the list order.
      const usesEventSets =
        questions.some((question) => question.event_set_id) ||
        poaTriggers.some((trigger) => trigger.event_set_id);

      const timeline = usesEventSets ? buildTimelinePositions() : null;

      const questionSortOrder = (question: SnapshotQuestion, index: number) =>
        timeline?.positions.get(`question:${questionTimelineKey(question)}`) ?? (index + 1) * 10;

      const triggerSortOrder = (trigger: GeneratedPoaTrigger) =>
        trigger.placement_section === "flight" || !timeline
          ? trigger.sort_order
          : timeline.positions.get(`trigger:${triggerTimelineKey(trigger)}`) ?? trigger.sort_order;

      const eventSetNames = new Map(editorEventSets.map((eventSet) => [eventSet.id, eventSet.name]));

      const currentExistingIds =
        new Set(
          questions
            .map((question) =>
              question.id,
            )
            .filter(
              (value): value is string =>
                Boolean(value),
            ),
        );

      const deletedIds =
        originalQuestionIds.filter(
          (questionId) =>
            !currentExistingIds.has(
              questionId,
            ),
        );

      if (deletedIds.length > 0) {
        const {
          error: deleteError,
        } = await supabase
          .from(
            "generated_plan_of_action_questions",
          )
          .delete()
          .eq(
            "generated_plan_of_action_id",
            plan.id,
          )
          .in("id", deletedIds);

        if (deleteError) {
          throw new Error(
            `Removed questions could not be saved: ${deleteError.message}`,
          );
        }
      }

      const existingQuestions =
        questions
          .map((question, index) => ({
            question,
            index,
          }))
          .filter(
            ({ question }) =>
              Boolean(question.id),
          );

      const updateResults =
        await Promise.all(
          existingQuestions.map(
            async ({
              question,
              index,
            }) => {
              const { error } =
                await supabase
                  .from(
                    "generated_plan_of_action_questions",
                  )
                  .update({
                    question_library_id:
                      question.question_library_id,
                    acs_reference_snapshot:
                      question.acs_reference_snapshot.trim() ||
                      null,
                    acs_references_snapshot:
                      question.acs_references_snapshot,
                    question_snapshot:
                      question.question_snapshot.trim(),
                    answer_snapshot:
                      question.answer_snapshot.trim() ||
                      null,
                    reference_snapshot:
                      question.reference_snapshot.trim() ||
                      null,
                    topic_snapshot:
                      question.topic_snapshot.trim() ||
                      null,
                    task_name_snapshot:
                      question.task_name_snapshot.trim() ||
                      null,
                    question_type_snapshot:
                      question.question_type_snapshot ||
                      "knowledge",
                    trigger_option_id:
                      question.trigger_option_id,
                    event_set_id:
                      question.event_set_id ?? null,
                    sort_order:
                      questionSortOrder(question, index),
                  })
                  .eq(
                    "generated_plan_of_action_id",
                    plan.id,
                  )
                  .eq(
                    "id",
                    question.id!,
                  );

              return error;
            },
          ),
        );

      const failedUpdate =
        updateResults.find(Boolean);

      if (failedUpdate) {
        throw new Error(
          `One or more edited questions could not be saved: ${failedUpdate.message}`,
        );
      }

      const newQuestions =
        questions
          .map((question, index) => ({
            question,
            index,
          }))
          .filter(
            ({ question }) =>
              !question.id,
          )
          .map(
            ({
              question,
              index,
            }) => ({
              generated_plan_of_action_id:
                plan.id,
              question_library_id:
                question.question_library_id,
              acs_reference_snapshot:
                question.acs_reference_snapshot.trim() ||
                null,
              acs_references_snapshot:
                question.acs_references_snapshot,
              question_snapshot:
                question.question_snapshot.trim(),
              answer_snapshot:
                question.answer_snapshot.trim() ||
                null,
              reference_snapshot:
                question.reference_snapshot.trim() ||
                null,
              topic_snapshot:
                question.topic_snapshot.trim() ||
                null,
              task_name_snapshot:
                question.task_name_snapshot.trim() ||
                null,
              question_type_snapshot:
                question.question_type_snapshot ||
                "knowledge",
              trigger_option_id:
                question.trigger_option_id,
              event_set_id:
                question.event_set_id ?? null,
              template_item_id:
                question.template_item_id ?? null,
              template_depth:
                question.template_depth ?? 0,
              sort_order:
                questionSortOrder(question, index),
            }),
          );

      if (newQuestions.length > 0) {
        const {
          error: insertError,
        } = await supabase
          .from(
            "generated_plan_of_action_questions",
          )
          .insert(newQuestions);

        if (insertError) {
          throw new Error(
            `New questions could not be saved: ${insertError.message}`,
          );
        }
      }

      const flightTaskPayload =
        flightTasks.map(
          (task, index) => ({
            acs_task_code_snapshot:
              task.acs_task_code_snapshot.trim(),
            area_name_snapshot:
              task.area_name_snapshot.trim(),
            task_name_snapshot:
              task.task_name_snapshot.trim() ||
              "ACS Task",
            skill_elements_snapshot:
              task.skill_elements_snapshot,
            examiner_notes:
              task.examiner_notes.trim(),
            is_required:
              task.is_required,
            sort_order:
              (index + 1) * 10,
          }),
        );

      const {
        error: flightTaskSaveError,
      } = await supabase.rpc(
        "examiner_replace_generated_poa_flight_tasks",
        {
          p_generated_plan_of_action_id:
            plan.id,
          p_tasks:
            flightTaskPayload,
        },
      );

      if (flightTaskSaveError) {
        throw new Error(
          `Flight tasks could not be saved: ${flightTaskSaveError.message}`,
        );
      }

      const {
        error: triggerSaveError,
      } = await supabase.rpc(
        "examiner_replace_generated_poa_triggers",
        {
          p_generated_plan_of_action_id:
            plan.id,
          p_triggers: [
            ...poaTriggers.map(
              (trigger) => ({
                trigger_library_id:
                  trigger.trigger_library_id,
                event_set_id:
                  trigger.event_set_id ?? null,
                placement_section:
                  trigger.placement_section,
                timeline_kind:
                  trigger.timeline_kind ?? "trigger",
                phase:
                  trigger.phase ?? null,
                category_snapshot:
                  trigger.category_snapshot,
                trigger_text_snapshot:
                  trigger.trigger_text_snapshot,
                trigger_narrative_snapshot:
                  trigger.trigger_narrative_snapshot,
                branch_worthy:
                  Boolean(trigger.branch_worthy),
                source_trigger_id:
                  trigger.source_trigger_id ?? null,
                is_selected: Boolean(trigger.is_selected),
                sort_order:
                  triggerSortOrder(trigger),
                template_item_id:
                  trigger.template_item_id ?? null,
                template_depth:
                  trigger.template_depth ?? 0,
              }),
            ),
            // Event set headers for event sets that had none yet.
            ...(timeline?.newHeaders ?? []).map((eventSetId) => ({
              trigger_library_id: null,
              event_set_id: eventSetId,
              placement_section: "oral",
              timeline_kind: "event_set",
              phase: null,
              category_snapshot: null,
              trigger_text_snapshot: eventSetNames.get(eventSetId) ?? "Event Set",
              trigger_narrative_snapshot: eventSetNames.get(eventSetId) ?? "Event Set",
              branch_worthy: false,
              source_trigger_id: null,
              is_selected: false,
              sort_order: timeline?.positions.get(`header:${eventSetId}`) ?? 10,
              template_item_id: null,
              template_depth: 0,
            })),
          ],
        },
      );

      if (triggerSaveError) {
        throw new Error(
          `Scenario triggers could not be saved: ${triggerSaveError.message}`,
        );
      }


      const [
        { data: refreshed, error: refreshError },
        { data: refreshedTriggers, error: refreshTriggerError },
      ] = await Promise.all([
        supabase
          .from("generated_plan_of_action_questions")
          .select(SNAPSHOT_COLUMNS)
          .eq("generated_plan_of_action_id", plan.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("generated_plan_of_action_triggers")
          .select(TRIGGER_COLUMNS)
          .eq("generated_plan_of_action_id", plan.id)
          .order("placement_section", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

      if (refreshError || refreshTriggerError) {
        throw new Error(
          `POA saved, but the refreshed copy could not be loaded: ${(refreshError ?? refreshTriggerError)?.message}`,
        );
      }

      const refreshedQuestions =
        (refreshed ?? []).map((question) =>
          mapSnapshotRow(question as Record<string, unknown>),
        );

      setPoaTriggers(
        (refreshedTriggers ?? []).map((row) =>
          mapTriggerRow(row as Record<string, unknown>),
        ),
      );

      setTimelineOrder({});

      if (newPlaces) {
        const savedSnapshot = locationSnapshot(newPlaces) as unknown as SavedLocations;
        setPlan((current) =>
          current
            ? {
                ...current,
                location_snapshot: savedSnapshot,
                ...(placesInstrument
                  ? { ifr_snapshot: newIfr ? { ...newIfr.snapshot, fills: newIfr.fills } : null }
                  : {}),
              }
            : current,
        );
        setNewPlaces(null);
        setNewIfr(null);
        setChangingPlaces(false);
      }

      setQuestions(
        refreshedQuestions,
      );

      setOriginalQuestionIds(
        refreshedQuestions
          .map((question) =>
            question.id,
          )
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      );

      setMessage(
        `Saved ${refreshedQuestions.length} oral question${
          refreshedQuestions.length === 1 ? "" : "s"
        } and ${flightTasks.length} flight task${
          flightTasks.length === 1 ? "" : "s"
        }. EMT and PDF export now use this edited POA.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The POA could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 text-slate-600">
        Loading generated POA…
      </main>
    );
  }

  if (!plan || errorMessage && questions.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          {errorMessage ||
            "Generated POA was not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Generated Plan of Action
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Edit POA
          </h1>

          {testType ? (
            <p className="mt-2 text-lg font-semibold text-slate-700">
              {testType.display_name}
            </p>
          ) : null}

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            These changes affect only this generated
            POA. The Scenario Library is not changed.
            EMT and PDF export use this same frozen
            snapshot.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/examiner/plan-of-action"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to POAs
          </Link>

          <Link
            href={`/examiner/plan-of-action/generated/${encodeURIComponent(plan.id)}/print`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100"
          >
            <Printer className="h-4 w-4" />
            Print Preview
          </Link>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveChanges()
            }
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? "Saving…"
              : "Save Changes"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {message}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          POA Information
        </h2>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Saved POA Version
            </span>

            <select
              value={plan.id}
              onChange={(event) =>
                jumpToEditPoaVersion(
                  event.target.value,
                )
              }
              disabled={
                loadingEditPoaVersions
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
            >
              {loadingEditPoaVersions ? (
                <option value={plan.id}>
                  Loading saved versions…
                </option>
              ) : null}

              {!loadingEditPoaVersions &&
              editPoaVersions.length === 0 ? (
                <option value={plan.id}>
                  Current POA
                </option>
              ) : null}

              {!loadingEditPoaVersions
                ? editPoaVersions.map(
                    (poa, index) => (
                      <option
                        key={poa.id}
                        value={poa.id}
                      >
                        {formatEditPoaVersion(
                          poa,
                          index,
                        )}
                      </option>
                    ),
                  )
                : null}
            </select>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                POA Title
              </span>

              <input
                value={plan.title}
                onChange={(event) =>
                  setPlan({
                    ...plan,
                    title:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              />
            </label>
          </div>

          
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Examiner / Scenario Notes
          </span>

          <textarea
            value={plan.notes || ""}
            onChange={(event) =>
              setPlan({
                ...plan,
                notes:
                  event.target.value,
              })
            }
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          />
        </label>
      </section>

            <section
        className={
          editorTab === "triggers"
            ? "mt-8"
            : "hidden"
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              Chronological Trigger Placement
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Scenario Triggers
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Select a trigger from the Trigger Library and place
              it at the point in the POA where it should occur.
              Trigger narratives are frozen into this POA when
              you save.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Trigger Category
              </span>

              <select
                value={selectedTriggerCategory}
                onChange={(event) => {
                  setSelectedTriggerCategory(
                    event.target.value,
                  );
                  setSelectedTriggerLibraryId("");
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="all">
                  All Trigger Categories
                </option>

                {triggerCategories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {categoryLabel(category)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Trigger
              </span>

              <select
                value={selectedTriggerLibraryId}
                onChange={(event) =>
                  setSelectedTriggerLibraryId(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="">
                  Select a trigger…
                </option>

                {filteredTriggerLibrary.map(
                  (trigger) => (
                    <option
                      key={trigger.id}
                      value={trigger.id}
                    >
                      {trigger.trigger_text}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                POA Section
              </span>

              <select
                value={triggerPlacementSection}
                onChange={(event) => {
                  const section =
                    event.target.value ===
                    "flight"
                      ? "flight"
                      : "oral";
                  setTriggerPlacementSection(
                    section,
                  );
                  setTriggerPlacementAfter(
                    "start",
                  );
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="oral">
                  Oral / Ground
                </option>
                <option value="flight">
                  Flight Portion
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Insert Position
              </span>

              <select
                value={triggerPlacementAfter}
                onChange={(event) =>
                  setTriggerPlacementAfter(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="start">
                  Beginning of this section
                </option>

                {placementChoices(
                  triggerPlacementSection,
                ).map((choice) => (
                  <option
                    key={choice.value}
                    value={choice.value}
                  >
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedTriggerLibraryItem ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-200 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                  {categoryLabel(
                    selectedTriggerLibraryItem.category,
                  )}
                </span>

                <span className="text-sm font-bold text-slate-900">
                  {selectedTriggerLibraryItem.trigger_text}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {selectedTriggerLibraryItem.trigger_narrative}
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="button"
              onClick={addSelectedTriggerToPoa}
              disabled={!selectedTriggerLibraryItem}
              className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Insert Trigger Into POA
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {poaTriggers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-bold text-slate-900">
                No scenario triggers are placed in this POA yet.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Add triggers in the order that events should occur
                during the scenario.
              </p>
            </div>
          ) : (
            poaTriggers.map(
              (trigger, index) => (
                <article
                  key={
                    trigger.id ||
                    `${trigger.trigger_library_id}-${trigger.placement_section}-${trigger.sort_order}-${index}`
                  }
                  className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                          {trigger.timeline_kind === "trigger"
                            ? "Trigger"
                            : (trigger.timeline_kind ?? "Timeline").replaceAll("_", " ")}
                        </span>

                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {trigger.placement_section ===
                          "flight"
                            ? "Flight Portion"
                            : "Oral / Ground"}
                        </span>

                        <span className="text-sm font-bold text-slate-900">
                          {trigger.trigger_text_snapshot}
                        </span>

                        {trigger.is_selected ? (
                          <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                            Selected for oral
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {trigger.trigger_narrative_snapshot}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {trigger.timeline_kind === "trigger_option" ? (
                        <button
                          type="button"
                          onClick={() => void selectTriggerForOral(trigger)}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold ${trigger.is_selected ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"}`}
                        >
                          {trigger.is_selected ? "Active" : "Use this trigger"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removePoaTrigger(index)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Section
                      </span>

                      <select
                        value={trigger.placement_section}
                        onChange={(event) =>
                          updatePoaTriggerPlacement(
                            index,
                            event.target.value ===
                              "flight"
                              ? "flight"
                              : "oral",
                            5,
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="oral">
                          Oral / Ground
                        </option>
                        <option value="flight">
                          Flight Portion
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Position
                      </span>

                      <select
                        value={
                          trigger.sort_order <= 5
                            ? "5"
                            : String(
                                trigger.sort_order,
                              )
                        }
                        onChange={(event) =>
                          updatePoaTriggerPlacement(
                            index,
                            trigger.placement_section,
                            Number(
                              event.target.value,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="5">
                          Beginning
                        </option>

                        {placementChoices(
                          trigger.placement_section,
                        ).map(
                          (choice, choiceIndex) => (
                            <option
                              key={choice.value}
                              value={
                                (choiceIndex + 1) *
                                  10 +
                                5
                              }
                            >
                              {choice.label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </article>
              ),
            )
          )}
        </div>
      </section>

<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
            Scenario Library Selection
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Scenario
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Select a scenario from the Scenario Library
            for this POA.
          </p>
        </div>

        <div className="mt-5">
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Scenario
            </span>

            <select
              value={selectedScenarioId}
              onChange={(event) =>
                selectScenarioFromLibrary(
                  event.target.value,
                )
              }
              disabled={
                loadingScenarioOptions
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
            >
              <option value="">
                {loadingScenarioOptions
                  ? "Loading scenarios…"
                  : scenarioOptions.length === 0
                    ? "No active scenarios in Scenario Library"
                    : "Select a scenario…"}
              </option>

              {!loadingScenarioOptions
                ? scenarioOptions.map(
                    (scenario) => (
                      <option
                        key={scenario.id}
                        value={scenario.id}
                      >
                        {scenario.scenario_name}
                      </option>
                    ),
                  )
                : null}
            </select>
          </label>
        </div>

        {selectedScenario ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Scenario Brief
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {selectedScenario.scenario_brief ||
                    "No scenario brief entered."}
                </p>
              </div>

              <div className="lg:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Initial Conditions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                  {selectedScenario.initial_conditions ||
                    "Not specified"}
                </p>
              </div>

              {selectedScenario.examiner_notes ? (
                <div className="lg:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Scenario Examiner Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {selectedScenario.examiner_notes}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <MapPin className="h-4 w-4 text-sky-700" /> This POA&apos;s airports and aircraft
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Picked for this POA. Change them and the questions and triggers are reworded to match.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChangingPlaces((open) => !open)}
              disabled={!testType || loadingScenarioOptions}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {changingPlaces ? "Done" : shownPlaces ? "Change airports" : "Pick airports"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ["Departure", shownPlaces?.departure],
              ["Destination", shownPlaces?.destination],
              ...(placesInstrument ? [["Alternate", shownPlaces?.alternate] as [string, string | null | undefined]] : []),
              ["Practice area near", shownPlaces?.practice],
              ["Pattern work at", shownPlaces?.pattern],
              ["Aircraft", aircraftText],
            ] as Array<[string, string | null | undefined]>).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className={`mt-1 text-sm font-semibold ${value ? "text-slate-800" : "text-slate-400"}`}>
                  {value || (label === "Aircraft" ? "From the applicant's request (none linked)" : "Not picked yet")}
                </p>
              </div>
            ))}
          </div>

          {shownPlaces?.stops.length ? (
            <div className="mt-4 text-sm text-slate-800">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ferry stops</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                {shownPlaces.stops.map((stop) => (
                  <li key={stop}>{stop}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {!shownPlaces ? (
            <p className="mt-4 text-xs text-amber-800">
              This POA was built before airports were picked for each POA. Click Pick airports to choose
              real ones; the wording is updated to match.
            </p>
          ) : null}

          {changingPlaces && testType && !loadingScenarioOptions ? (
            <PoaLocationsPanel
              requestAirportId={linkedRequest?.flight_airport_id ?? null}
              needs={placeNeeds}
              scenarioKey={selectedScenarioId}
              initial={plan.location_snapshot ?? null}
              onChange={onPanelPlaces}
            />
          ) : null}

          {placesBusy ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating the wording…
            </p>
          ) : null}

          {newPlaces && !placesBusy ? (
            <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
              Airports changed and the wording updated. Click Save Changes to keep them.
            </p>
          ) : null}

          {placeLeftovers.length ? (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">
                These still mention something the new airports don&apos;t have (an approach, a fix or a stop).
                Edit or remove them:
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {placeLeftovers.map((title) => (
                  <li key={title}>{title.length > 140 ? `${title.slice(0, 140)}…` : title}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>


            <div className="mt-8 flex gap-1 border-b border-slate-300">
        <button
          type="button"
          onClick={() => setEditorTab("timeline")}
          className={`border-b-2 px-6 py-3 text-sm font-bold ${
            editorTab === "timeline"
              ? "border-sky-700 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Scenario Timeline
        </button>

        <button
          type="button"
          onClick={() => setEditorTab("questions")}
          className={`border-b-2 px-6 py-3 text-sm font-bold ${
            editorTab === "questions"
              ? "border-sky-700 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Questions
        </button>

        <button
          type="button"
          onClick={() => setEditorTab("compliance")}
          className={`border-b-2 px-6 py-3 text-sm font-bold ${
            editorTab === "compliance"
              ? "border-sky-700 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Compliance
        </button>

        <button
          type="button"
          onClick={() => setEditorTab("flight")}
          className={`border-b-2 px-6 py-3 text-sm font-bold ${
            editorTab === "flight"
              ? "border-sky-700 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Flight Tasks
        </button>
        <button
          type="button"
          onClick={() => setEditorTab("triggers")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${
            editorTab === "triggers"
              ? "bg-sky-600 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Scenario Triggers
        </button>

      </div>

{editorTab === "timeline" ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Scenario Timeline
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Same editor as when you build a POA. Drag items between event sets, reorder them,
                remove them, or add questions and triggers from the library. Click Save Changes to
                save; print and the EMT follow this order.
              </p>
            </div>
          </div>

          {editorEventSets.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Loading event sets…
            </p>
          ) : (
            <TimelineEventEditor
              scenario={{
                title:
                  plan.scenario_name ||
                  poaTriggers.find((trigger) => trigger.timeline_kind === "scenario")?.trigger_text_snapshot ||
                  "Scenario",
                narrative:
                  poaTriggers.find((trigger) => trigger.timeline_kind === "scenario")?.trigger_narrative_snapshot ||
                  selectedScenario?.scenario_brief ||
                  null,
              }}
              eventSets={editorEventSets.map((eventSet) => ({
                id: eventSet.id,
                name: eventSet.name,
                description: eventSet.description,
                maxQuestionCount: Math.max(
                  eventSet.minimumQuestionCount,
                  questions.filter((question) => question.event_set_id === eventSet.id).length,
                ),
              }))}
              questions={timelineQuestionEntries}
              triggers={timelineTriggerEntries}
              itemOrder={effectiveTimelineOrder}
              onOrderChange={changeTimelineOrder}
              onAssign={(kind, key, eventSetId) => assignTimelineItem(kind, key, eventSetId)}
              onRemove={(kind, key) => removeTimelineItem(kind, key)}
            />
          )}
        </section>
      ) : null}

<section className={editorTab === "questions" ? "mt-8" : "hidden"}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              POA Questions
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {questions.length} question
              {questions.length === 1
                ? ""
                : "s"}{" "}
              in this frozen POA.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Drag questions by the handle to change
              their sequence. Click a question to edit
              its details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addBlankQuestion}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Blank Question
            </button>

            <button
              type="button"
              onClick={() =>
                setLibraryOpen(
                  (current) =>
                    !current,
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100"
            >
              <Search className="h-4 w-4" />
              Add From Scenario Library
            </button>
          </div>
        </div>

        {libraryOpen ? (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50/40 p-5">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value,
                  )
                }
                placeholder="Search applicable Scenario Library..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-sky-500"
              />
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {
                filteredLibraryQuestions.length
              }{" "}
              applicable library question
              {filteredLibraryQuestions.length ===
              1
                ? ""
                : "s"}
            </p>

            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredLibraryQuestions.map(
                (question) => (
                  <div
                    key={question.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded bg-sky-100 px-2 py-1 font-mono text-xs font-bold text-sky-800">
                          {
                            question.acs_reference
                          }
                        </span>

                        {question.task_name ? (
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {
                              question.task_name
                            }
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                        {
                          question.question
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        addLibraryQuestion(
                          question,
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {questions.map(
            (question, index) => {
              const questionUiKey =
                getQuestionUiKey(
                  question,
                  index,
                );

              const isExpanded =
                expandedQuestionKeys.has(
                  questionUiKey,
                );

              const isDropTarget =
                dragOverIndex === index &&
                draggedIndex !== index;

              const conditionalTrigger = question.trigger_option_id
                ? poaTriggers.find(
                    (trigger) =>
                      trigger.trigger_library_id === question.trigger_option_id,
                  )
                : null;

              return (
                <article
                  key={questionUiKey}
                  onDragOver={(event) => {
                    event.preventDefault();

                    if (
                      draggedIndex !== null &&
                      draggedIndex !== index
                    ) {
                      event.dataTransfer.dropEffect =
                        "move";

                      setDragOverIndex(
                        index,
                      );
                    }
                  }}
                  onDragLeave={() => {
                    if (
                      dragOverIndex === index
                    ) {
                      setDragOverIndex(
                        null,
                      );
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();

                    dropQuestion(index);
                  }}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    isDropTarget
                      ? "border-sky-500 ring-2 ring-sky-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-stretch">
                    <div
                      draggable
                      title="Drag to reorder"
                      onDragStart={(event) => {
                        setDraggedIndex(
                          index,
                        );

                        event.dataTransfer.effectAllowed =
                          "move";

                        event.dataTransfer.setData(
                          "text/plain",
                          String(index),
                        );
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(
                          null,
                        );

                        setDragOverIndex(
                          null,
                        );
                      }}
                      className="flex shrink-0 cursor-grab items-center border-r border-slate-200 px-3 text-slate-400 hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing"
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleQuestionDetails(
                          question,
                          index,
                        )
                      }
                      className="flex min-w-0 flex-1 items-start gap-4 px-4 py-4 text-left hover:bg-slate-50"
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-sky-100 px-2 py-1 font-mono text-xs font-bold text-sky-800">
                        {question.acs_reference_snapshot ||
                          "NO ACS"}
                      </span>

                      {conditionalTrigger ? (
                        <span
                          className={`mt-0.5 shrink-0 rounded px-2 py-1 text-xs font-bold ${
                            conditionalTrigger.is_selected
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {conditionalTrigger.is_selected
                            ? `Active: ${conditionalTrigger.trigger_text_snapshot}`
                            : `Ask only if used: ${conditionalTrigger.trigger_text_snapshot}`}
                        </span>
                      ) : null}

                      <span className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900">
                        {question.question_snapshot ||
                          "Untitled question"}
                      </span>

                      <span className="mt-1 shrink-0 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </span>
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-5">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Question {index + 1}
                          </p>

                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {question.id
                              ? "Frozen snapshot"
                              : question.question_library_id
                                ? "New from Scenario Library"
                                : "POA-only question"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeQuestion(
                              index,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Question
                        </button>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <label>
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            ACS References
                          </span>

                          <input
                            value={
                              question.acs_references_snapshot.join("; ") ||
                              question.acs_reference_snapshot
                            }
                            onChange={(event) =>
                              updateQuestion(
                                index,
                                {
                                  acs_reference_snapshot:
                                    event.target.value
                                      .split(/[,;\n]+/)
                                      .map((value) => value.trim())
                                      .filter(Boolean)[0] ?? "",
                                  acs_references_snapshot:
                                    event.target.value
                                      .split(/[,;\n]+/)
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                },
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Task Name
                          </span>

                          <input
                            value={
                              question.task_name_snapshot
                            }
                            onChange={(event) =>
                              updateQuestion(
                                index,
                                {
                                  task_name_snapshot:
                                    event.target.value,
                                },
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Question Type
                          </span>

                          <select
                            value={
                              question.question_type_snapshot
                            }
                            onChange={(event) =>
                              updateQuestion(
                                index,
                                {
                                  question_type_snapshot:
                                    event.target.value,
                                },
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="knowledge">
                              Knowledge
                            </option>

                            <option value="risk_management">
                              Risk Management
                            </option>

                            <option value="skill">
                              Skill
                            </option>

                            <option value="scenario">
                              Scenario
                            </option>

                            <option value="other">
                              Other
                            </option>
                          </select>
                        </label>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Question
                        </span>

                        <textarea
                          rows={3}
                          value={
                            question.question_snapshot
                          }
                          onChange={(event) =>
                            updateQuestion(
                              index,
                              {
                                question_snapshot:
                                  event.target.value,
                              },
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6"
                        />
                      </label>

                      <label className="mt-4 block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Examiner Guidance / Answer
                        </span>

                        <textarea
                          rows={3}
                          value={
                            question.answer_snapshot
                          }
                          onChange={(event) =>
                            updateQuestion(
                              index,
                              {
                                answer_snapshot:
                                  event.target.value,
                              },
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6"
                        />
                      </label>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <label>
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Reference
                          </span>

                          <textarea
                            rows={2}
                            value={
                              question.reference_snapshot
                            }
                            onChange={(event) =>
                              updateQuestion(
                                index,
                                {
                                  reference_snapshot:
                                    event.target.value,
                                },
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Topic
                          </span>

                          <textarea
                            rows={2}
                            value={
                              question.topic_snapshot
                            }
                            onChange={(event) =>
                              updateQuestion(
                                index,
                                {
                                  topic_snapshot:
                                    event.target.value,
                                },
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            },
          )}
        </div>
      </section>

            {editorTab === "compliance" ? (
        <section className="mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  Saved POA Compliance
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  ACS Compliance for This Version
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Knowledge and Risk coverage come from
                  the frozen oral questions in this
                  version. Skill coverage comes from
                  required frozen Flight Tasks.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-emerald-800">
                    {savedPoaCoveredCount}
                  </div>

                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Covered
                  </div>
                </div>

                <div
                  className={`rounded-xl border px-5 py-3 text-center ${
                    savedPoaMissingCount === 0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div
                    className={`text-2xl font-bold ${
                      savedPoaMissingCount === 0
                        ? "text-emerald-800"
                        : "text-amber-800"
                    }`}
                  >
                    {savedPoaMissingCount}
                  </div>

                  <div
                    className={`text-xs font-bold uppercase tracking-wide ${
                      savedPoaMissingCount === 0
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    Missing
                  </div>
                </div>
              </div>
            </div>
          </div>

          {savedPoaComplianceCodes.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-bold text-slate-900">
                No ACS compliance entries were found
                for this saved POA.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {savedPoaComplianceCodes.map(
                (code) => {
                  const covered =
                    savedPoaCoveredComplianceCodes.has(
                      code,
                    );

                  return (
                    <div
                      key={code}
                      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                        covered
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {code}
                        </span>

                        <span className="ml-3 text-sm text-slate-600">
                          {code.endsWith(".K")
                            ? "Knowledge"
                            : code.endsWith(".R")
                              ? "Risk Management"
                              : "Skill"}
                        </span>
                      </div>

                      <div
                        className={`shrink-0 text-sm font-bold ${
                          covered
                            ? "text-emerald-800"
                            : "text-amber-800"
                        }`}
                      >
                        {covered
                          ? "✓ Covered"
                          : "⚠ Missing"}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      ) : null}

<section className={editorTab === "flight" ? "mt-8" : "hidden"}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Flight Tasks
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {flightTasks.length} flight task
              {flightTasks.length === 1
                ? ""
                : "s"}{" "}
              in this frozen POA.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Drag tasks by the handle to change the
              planned flight sequence. Click a task to
              expand its ACS skill details and notes.
            </p>
          </div>

          <button
            type="button"
            onClick={populateFlightTasksFromAcs}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100"
          >
            <Plus className="h-4 w-4" />
            Load ACS Flight Tasks
          </button>
        </div>

        {flightTasks.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-bold text-slate-900">
              No flight tasks are frozen in this POA yet.
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Click Load ACS Flight Tasks to build the
              flight portion from this POA&apos;s ACS
              coverage.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {flightTasks.map(
              (task, index) => {
                const taskUiKey =
                  getFlightTaskUiKey(
                    task,
                    index,
                  );

                const isExpanded =
                  expandedFlightTaskKeys.has(
                    taskUiKey,
                  );

                const isDropTarget =
                  dragOverFlightTaskIndex ===
                    index &&
                  draggedFlightTaskIndex !==
                    index;

                // Flight event set header when the set changes (Kele, Nov 12 2026).
                const flightSet = flightPlacement(task.task_name_snapshot, flightFamily).set;
                const previousSet = index > 0 ? flightPlacement(flightTasks[index - 1].task_name_snapshot, flightFamily).set : null;

                return (
                  <Fragment key={taskUiKey}>
                  {previousSet?.code !== flightSet.code ? (
                    <p className="pt-3 text-xs font-bold uppercase tracking-wide text-sky-800">{flightSet.name}</p>
                  ) : null}
                  <article
                    onDragOver={(event) => {
                      event.preventDefault();

                      if (
                        draggedFlightTaskIndex !==
                          null &&
                        draggedFlightTaskIndex !==
                          index
                      ) {
                        event.dataTransfer.dropEffect =
                          "move";

                        setDragOverFlightTaskIndex(
                          index,
                        );
                      }
                    }}
                    onDragLeave={() => {
                      if (
                        dragOverFlightTaskIndex ===
                        index
                      ) {
                        setDragOverFlightTaskIndex(
                          null,
                        );
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      dropFlightTask(index);
                    }}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                      isDropTarget
                        ? "border-sky-500 ring-2 ring-sky-200"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-stretch">
                      <div
                        draggable
                        title="Drag to reorder"
                        onDragStart={(event) => {
                          setDraggedFlightTaskIndex(
                            index,
                          );

                          event.dataTransfer.effectAllowed =
                            "move";

                          event.dataTransfer.setData(
                            "text/plain",
                            String(index),
                          );
                        }}
                        onDragEnd={() => {
                          setDraggedFlightTaskIndex(
                            null,
                          );

                          setDragOverFlightTaskIndex(
                            null,
                          );
                        }}
                        className="flex shrink-0 cursor-grab items-center border-r border-slate-200 px-3 text-slate-400 hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing"
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleFlightTaskDetails(
                            task,
                            index,
                          )
                        }
                        className="flex min-w-0 flex-1 items-start gap-4 px-4 py-4 text-left hover:bg-slate-50"
                      >
                        <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-2 py-1 font-mono text-xs font-bold text-emerald-800">
                          {
                            task.acs_task_code_snapshot
                          }
                        </span>

                        <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-slate-900">
                          {
                            task.task_name_snapshot
                          }
                        </span>

                        <span className="mt-1 shrink-0 text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </span>
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-200 bg-slate-50/40 p-5">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                              ACS Task
                            </span>

                            <input
                              value={
                                task.acs_task_code_snapshot
                              }
                              onChange={(event) =>
                                updateFlightTask(
                                  index,
                                  {
                                    acs_task_code_snapshot:
                                      event.target.value,
                                  },
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                            />
                          </label>

                          <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                              Task Name
                            </span>

                            <input
                              value={
                                task.task_name_snapshot
                              }
                              onChange={(event) =>
                                updateFlightTask(
                                  index,
                                  {
                                    task_name_snapshot:
                                      event.target.value,
                                  },
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                          </label>
                        </div>

                        {task.skill_elements_snapshot.length >
                        0 ? (
                          <div className="mt-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              ACS Skill Elements
                            </p>

                            <div className="mt-2 space-y-2">
                              {task.skill_elements_snapshot.map(
                                (skill) => (
                                  <div
                                    key={
                                      skill.code
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                  >
                                    <span className="font-mono text-xs font-bold text-emerald-800">
                                      {
                                        skill.code
                                      }
                                    </span>

                                    <span className="ml-2 text-slate-700">
                                      {
                                        skill.label
                                      }
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-slate-500">
                            No individual Skill-element text is
                            available in the current ACS catalog
                            snapshot for this Task.
                          </p>
                        )}

                        <label className="mt-4 block">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Examiner Flight Notes
                          </span>

                          <textarea
                            rows={3}
                            value={
                              task.examiner_notes
                            }
                            onChange={(event) =>
                              updateFlightTask(
                                index,
                                {
                                  examiner_notes:
                                    event.target.value,
                                },
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6"
                          />
                        </label>

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={
                                task.is_required
                              }
                              onChange={(event) =>
                                updateFlightTask(
                                  index,
                                  {
                                    is_required:
                                      event.target.checked,
                                  },
                                )
                              }
                            />
                            Required in this POA
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setFlightTasks(
                                (current) =>
                                  current.filter(
                                    (_, i) =>
                                      i !==
                                      index,
                                  ),
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Flight Task
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                  </Fragment>
                );
              },
            )}
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-30 mt-8 rounded-2xl border border-slate-300 bg-white/95 p-5 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-slate-900">
              {questions.length} question
              {questions.length === 1
                ? ""
                : "s"}{" "}
              in POA
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Changes are not visible in EMT or PDF
              until you click Save Changes.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveChanges()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? "Saving…"
              : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function GeneratedPoaEditPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-6 py-10 text-slate-600">
          Loading generated POA…
        </main>
      }
    >
      <GeneratedPoaEditContent />
    </Suspense>
  );
}
