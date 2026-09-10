"use client";

import {
  Suspense,
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
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import faaAcsComplianceCatalog from "@/data/faa-acs-compliance-catalog.json";
import {
  deriveAllFlightTasksFromAcsCatalog,
  type FlightTaskDraft,
} from "@/lib/poa/flight-tasks";

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
  placement_section: "oral" | "flight";
  category_snapshot: string;
  trigger_text_snapshot: string;
  trigger_narrative_snapshot: string;
  sort_order: number;
};

type ScenarioLibraryOption = {
  id: string;
  scenario_name: string;
  scenario_brief: string | null;
  departure: string | null;
  destination: string | null;
  aircraft: string | null;
  initial_conditions: string | null;
  examiner_notes: string | null;
};

type EditPoaVersionOption = {
  id: string;
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
};

type SnapshotQuestion = {
  id: string | null;
  question_library_id: string | null;
  acs_reference_snapshot: string;
  question_snapshot: string;
  answer_snapshot: string;
  reference_snapshot: string;
  topic_snapshot: string;
  task_name_snapshot: string;
  question_type_snapshot: string;
  sort_order: number;
};

type LibraryQuestion = {
  id: string;
  acs_reference: string;
  question: string;
  answer: string | null;
  reference: string | null;
  topic: string | null;
  task_name: string | null;
  question_type: string;
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
};

function snapshotFromLibrary(
  question: LibraryQuestion,
): SnapshotQuestion {
  return {
    id: null,
    question_library_id: question.id,
    acs_reference_snapshot:
      question.acs_reference || "",
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

    "questions" | "compliance" | "flight" | "triggers"

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
          created_at
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
          .select(`
            id,
            question_library_id,
            acs_reference_snapshot,
            question_snapshot,
            answer_snapshot,
            reference_snapshot,
            topic_snapshot,
            task_name_snapshot,
            question_type_snapshot,
            sort_order
          `)
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
            class_name
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
              question_type
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
            libraryData =
              (questionData ??
                []) as LibraryQuestion[];
          }
        }
      }

      if (!cancelled) {
        const loadedSnapshots =
          (snapshotsResult.data ?? []).map(
            (question) => ({
              id: question.id,
              question_library_id:
                question.question_library_id ??
                null,
              acs_reference_snapshot:
                question.acs_reference_snapshot ||
                "",
              question_snapshot:
                question.question_snapshot || "",
              answer_snapshot:
                question.answer_snapshot || "",
              reference_snapshot:
                question.reference_snapshot || "",
              topic_snapshot:
                question.topic_snapshot || "",
              task_name_snapshot:
                question.task_name_snapshot || "",
              question_type_snapshot:
                question.question_type_snapshot ||
                "knowledge",
              sort_order:
                question.sort_order || 0,
            }),
          ) as SnapshotQuestion[];

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

    setQuestions((current) => {
      if (
        fromIndex >= current.length ||
        toIndex >= current.length
      ) {
        return current;
      }

      const copy = [...current];

      const [question] = copy.splice(
        fromIndex,
        1,
      );

      copy.splice(
        toIndex,
        0,
        question,
      );

      return copy;
    });
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
        `Remove this question from this POA?\n\n${question.question_snapshot}\n\nThe Question Library record will NOT be deleted.`,
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
        question_library_id: null,
        acs_reference_snapshot: "",
        question_snapshot:
          "New examiner question",
        answer_snapshot: "",
        reference_snapshot: "",
        topic_snapshot: "",
        task_name_snapshot: "",
        question_type_snapshot:
          "knowledge",
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
        const refs = String(
          question.acs_reference_snapshot || "",
        )
          .split(/[,;\n]+/)
          .map((value) => value.trim())
          .filter(Boolean);

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

    return `Version ${index + 1}${
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
          examiner_notes
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
          .select(`
            id,
            trigger_library_id,
            placement_section,
            category_snapshot,
            trigger_text_snapshot,
            trigger_narrative_snapshot,
            sort_order
          `)
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
          (frozenResult.data ?? [])
            .map(
              (row) => ({
                id: row.id,
                trigger_library_id:
                  row.trigger_library_id ??
                  null,
                placement_section:
                  row.placement_section ===
                  "flight"
                    ? "flight"
                    : "oral",
                category_snapshot:
                  row.category_snapshot || "",
                trigger_text_snapshot:
                  row.trigger_text_snapshot ||
                  "",
                trigger_narrative_snapshot:
                  row.trigger_narrative_snapshot ||
                  "",
                sort_order:
                  row.sort_order || 0,
              }),
            ) as GeneratedPoaTrigger[],
        );
      }
    }

    void loadPoaTriggerData();

    return () => {
      cancelled = true;
    };
  }, [plan?.id]);

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
      trigger_library_id:
        selectedTriggerLibraryItem.id,
      placement_section:
        triggerPlacementSection,
      category_snapshot:
        selectedTriggerLibraryItem.category,
      trigger_text_snapshot:
        selectedTriggerLibraryItem.trigger_text,
      trigger_narrative_snapshot:
        selectedTriggerLibraryItem.trigger_narrative,
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
                    sort_order:
                      (index + 1) * 10,
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
              sort_order:
                (index + 1) * 10,
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
          p_triggers:
            poaTriggers.map(
              (trigger) => ({
                trigger_library_id:
                  trigger.trigger_library_id,
                placement_section:
                  trigger.placement_section,
                category_snapshot:
                  trigger.category_snapshot,
                trigger_text_snapshot:
                  trigger.trigger_text_snapshot,
                trigger_narrative_snapshot:
                  trigger.trigger_narrative_snapshot,
                sort_order:
                  trigger.sort_order,
              }),
            ),
        },
      );

      if (triggerSaveError) {
        throw new Error(
          `Scenario triggers could not be saved: ${triggerSaveError.message}`,
        );
      }


      const {
        data: refreshed,
        error: refreshError,
      } = await supabase
        .from(
          "generated_plan_of_action_questions",
        )
        .select(`
          id,
          question_library_id,
          acs_reference_snapshot,
          question_snapshot,
          answer_snapshot,
          reference_snapshot,
          topic_snapshot,
          task_name_snapshot,
          question_type_snapshot,
          sort_order
        `)
        .eq(
          "generated_plan_of_action_id",
          plan.id,
        )
        .order("sort_order", {
          ascending: true,
        });

      if (refreshError) {
        throw new Error(
          `POA saved, but the refreshed copy could not be loaded: ${refreshError.message}`,
        );
      }

      const refreshedQuestions =
        (refreshed ?? []).map(
          (question) => ({
            id: question.id,
            question_library_id:
              question.question_library_id ??
              null,
            acs_reference_snapshot:
              question.acs_reference_snapshot ||
              "",
            question_snapshot:
              question.question_snapshot ||
              "",
            answer_snapshot:
              question.answer_snapshot ||
              "",
            reference_snapshot:
              question.reference_snapshot ||
              "",
            topic_snapshot:
              question.topic_snapshot ||
              "",
            task_name_snapshot:
              question.task_name_snapshot ||
              "",
            question_type_snapshot:
              question.question_type_snapshot ||
              "knowledge",
            sort_order:
              question.sort_order || 0,
          }),
        ) as SnapshotQuestion[];

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
            POA. The Question Library is not changed.
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
                          Trigger
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
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {trigger.trigger_narrative_snapshot}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removePoaTrigger(index)
                      }
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                    >
                      Remove
                    </button>
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

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Departure
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedScenario.departure ||
                    "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Destination
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedScenario.destination ||
                    "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Aircraft
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedScenario.aircraft ||
                    "Not specified"}
                </p>
              </div>

              <div>
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
      </section>


            <div className="mt-8 flex gap-1 border-b border-slate-300">
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
              Add From Question Library
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
                placeholder="Search applicable Question Library..."
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
                                ? "New from Question Library"
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
                            ACS Reference
                          </span>

                          <input
                            value={
                              question.acs_reference_snapshot
                            }
                            onChange={(event) =>
                              updateQuestion(
                                index,
                                {
                                  acs_reference_snapshot:
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

                return (
                  <article
                    key={taskUiKey}
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
