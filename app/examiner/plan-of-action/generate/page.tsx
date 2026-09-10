"use client";

import Link from "next/link";

import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  Shuffle,
  TriangleAlert,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type TaskQuestion = {
  question: LibraryQuestion;
  acsReference: string;
};

type TaskGroup = {
  acsReference: string;
  taskName: string;
  questions: TaskQuestion[];
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
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function taskLabelForReference(
  question: LibraryQuestion,
  acsReference: string,
) {
  const taskParts = String(question.task_name ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  const exact = taskParts.find(
    (part) => part === acsReference || part.startsWith(`${acsReference} `),
  );

  if (exact) {
    return exact
      .replace(
        new RegExp(
          `^${acsReference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`,
        ),
        "",
      )
      .trim();
  }

  if (taskParts.length === 1 && taskParts[0]) {
    return taskParts[0].replace(/^[A-Z]+\.[IVX]+\.[A-Z0-9/]+\s*/, "").trim();
  }

  const topicParts = String(question.topic ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  if (topicParts.length === 1 && topicParts[0]) {
    return topicParts[0];
  }

  return "ACS Task";
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

function elementKindFromReference(reference: string) {
  const cleaned = reference.trim().toUpperCase();
  const match = cleaned.match(/\.([KRS])(?:\d|$)/);
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

function chooseRandom<T>(items: T[]) {
  if (!items.length) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export default function GeneratePoaPage() {
  const [testTypeId, setTestTypeId] = useState("");

  const [testType, setTestType] = useState<PracticalTestType | null>(null);

  const [practicalTestTypes, setPracticalTestTypes] = useState<
    PracticalTestType[]
  >([]);

  const [loadingTestTypes, setLoadingTestTypes] = useState(true);

  const [questions, setQuestions] = useState<LibraryQuestion[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectionMethod, setSelectionMethod] = useState<
    "manual" | "random" | "automatic"
  >("manual");

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(),
  );

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );

  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState("Generated Plan of Action");

  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [generatedPoaId, setGeneratedPoaId] = useState("");

  const [savedPoaVersions, setSavedPoaVersions] =
    useState<SavedGeneratedPoa[]>([]);


  const [scenarioOptions, setScenarioOptions] =
    useState<GeneratorScenarioOption[]>([]);

  const [selectedScenarioId, setSelectedScenarioId] =
    useState("");

  const [loadingScenarios, setLoadingScenarios] =
    useState(false);


  const [loadingPoaVersions, setLoadingPoaVersions] =
    useState(false);

  const [selectedPoaVersionId, setSelectedPoaVersionId] =
    useState("new");

  const [additionalRatingHeld, setAdditionalRatingHeld] =
    useState("");

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
     * Important:
     * Questions must be associated with THIS
     * practical test type, not merely the same
     * certificate family.
     */
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
      .eq(
        "poa_question_practical_test_types.practical_test_type_id",
        loadedTestType.id,
      )
      .order("created_at", {
        ascending: true,
      });

    if (questionError) {
      setErrorMessage(
        `Question Library could not be loaded: ${questionError.message}`,
      );

      setLoading(false);

      return;
    }

    setQuestions((questionData ?? []) as LibraryQuestion[]);

    setSelectedIds([]);
    setSelectionMethod("manual");
    setExpandedTasks(new Set());
    setExpandedQuestionId(null);

    setLoading(false);
  }, [testTypeId]);

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

      const { data, error } =
        await supabase
          .from("generated_plan_of_actions")
          .select(`
            id,
            title,
            status,
            created_at
          `)
          .eq(
            "examiner_profile_id",
            user.id,
          )
          .eq(
            "practical_test_type_id",
            testTypeId,
          )
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

      setSavedPoaVersions(
        (data ?? []) as SavedGeneratedPoa[],
      );

      setLoadingPoaVersions(false);
    }

    void loadSavedPoaVersions();

    return () => {
      cancelled = true;
    };
  }, [testTypeId]);

  function formatSavedPoaVersion(
    poa: SavedGeneratedPoa,
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

  function selectPoaVersion(
    value: string,
  ) {
    setSelectedPoaVersionId(
      value,
    );

    if (value === "new") {
      return;
    }

    window.location.href =
      `/examiner/plan-of-action/generated/${encodeURIComponent(
        value,
      )}/edit`;
  }

  function selectPracticalTest(nextTestTypeId: string) {
    setTestTypeId(nextTestTypeId);

    setTestType(null);
    setQuestions([]);
    setSelectedIds([]);
    setSelectionMethod("manual");
    setExpandedTasks(new Set());
    setExpandedQuestionId(null);
    setSearchText("");
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

    const code =
      (testType.issuance_code ?? "")
        .trim()
        .toUpperCase();

    const name =
      (testType.issuance_name ?? "")
        .trim()
        .toLowerCase();

    return (
      code === "ADDITIONAL" ||
      name.includes("additional")
    );
  }, [testType]);

  const additionalMapCertificateKey =
    useMemo(() => {
      if (!testType) {
        return "";
      }

      const certificate =
        testType.certificate_name
          .trim()
          .toLowerCase();

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

  const additionalTargetRatingKey =
    useMemo(() => {
      if (!testType) {
        return "";
      }

      const classCode =
        (testType.class_code ?? "")
          .trim()
          .toUpperCase();

      if (
        ["ASEL", "AMEL", "ASES", "AMES"].includes(
          classCode,
        )
      ) {
        return classCode;
      }

      return testType.rating_name.trim();
    }, [testType]);

  const additionalHeldOptions =
    useMemo(() => {
      if (
        !isAdditionalIssuance ||
        !additionalMapCertificateKey ||
        !additionalTargetRatingKey
      ) {
        return [];
      }

      const certificateMaps =
        (
          ADDITIONAL_MAPS as Record<
            string,
            Record<string, unknown>
          >
        )[additionalMapCertificateKey] ?? {};

      const prefix =
        `${additionalTargetRatingKey}_from_`;

      return Object.keys(certificateMaps)
        .filter((key) =>
          key.startsWith(prefix),
        )
        .map((key) =>
          key.slice(prefix.length),
        )
        .sort((a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          ),
        );
    }, [
      additionalMapCertificateKey,
      additionalTargetRatingKey,
      isAdditionalIssuance,
    ]);

  const filteredQuestions = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return questions;
    }

    return questions.filter((question) => {
      const acsText = question.poa_question_acs_applicability
        .map((item) => item.acs_reference)
        .join(" ");

      const haystack = [
        acsText,
        question.question,
        question.answer ?? "",
        question.reference ?? "",
        question.topic ?? "",
        question.task_name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [questions, searchText]);

  const taskGroups = useMemo(() => {
    if (!testType) {
      return [];
    }

    const groups = new Map<string, TaskGroup>();

    for (const question of filteredQuestions) {
      const references = [
        ...new Set(
          question.poa_question_acs_applicability
            .filter(
              (item) => item.certificate_name === testType.certificate_name,
            )
            .flatMap((item) => splitAcsReferences(item.acs_reference)),
        ),
      ];

      for (const acsReference of references) {
        const taskName = taskLabelForReference(question, acsReference);

        const existing = groups.get(acsReference);

        if (existing) {
          if (
            !existing.questions.some((item) => item.question.id === question.id)
          ) {
            existing.questions.push({
              question,
              acsReference,
            });
          }

          if (existing.taskName === "ACS Task" && taskName !== "ACS Task") {
            existing.taskName = taskName;
          }
        } else {
          groups.set(acsReference, {
            acsReference,
            taskName,
            questions: [
              {
                question,
                acsReference,
              },
            ],
          });
        }
      }
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,

        questions: group.questions.sort((a, b) =>
          a.question.question.localeCompare(b.question.question),
        ),
      }))
      .sort((a, b) => compareAcsReferences(a.acsReference, b.acsReference));
  }, [filteredQuestions, testType]);

  const [generatorTab, setGeneratorTab] = useState<"questions" | "compliance">(
    "questions",
  );

  const selectedQuestions = useMemo(
    () => questions.filter((question) => selectedIds.includes(question.id)),
    [questions, selectedIds],
  );

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

      if (prefix && prefixSet.has(prefix)) {
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
  }, [complianceAcsPrefixes]);

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
           * Question Library questions.
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

  const coveredComplianceCount = complianceCodes.filter((code) =>
    coveredComplianceCodes.has(code),
  ).length;

  function selectedCountForTask(group: TaskGroup) {
    return new Set(
      group.questions
        .filter((item) => selectedIds.includes(item.question.id))
        .map((item) => item.question.id),
    ).size;
  }

  function toggleTask(acsReference: string) {
    setExpandedTasks((current) => {
      const next = new Set(current);

      if (next.has(acsReference)) {
        next.delete(acsReference);
      } else {
        next.add(acsReference);
      }

      return next;
    });
  }

  function toggleQuestion(questionId: string) {
    setSelectionMethod("manual");
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function selectAllDisplayed() {
    setSelectionMethod("manual");
    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...filteredQuestions.map((question) => question.id),
      ]),
    ]);
  }

  function clearSelection() {
    setSelectionMethod("manual");
    setSelectedIds([]);
    setMessage("");
    setErrorMessage("");
    setGeneratedPoaId("");
  }

  function randomSelection() {
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);

    setSelectionMethod("random");
    setSelectedIds(
      shuffled
        .slice(0, Math.min(20, shuffled.length))
        .map((question) => question.id),
    );
    setMessage(
      `Quick Random 20 selected ${Math.min(20, shuffled.length)} question${
        Math.min(20, shuffled.length) === 1 ? "" : "s"
      }. This is not an ACS-compliance check.`,
    );
    setErrorMessage("");
    setGeneratedPoaId("");
  }

  function buildCompliantSelection() {
    if (!testType) {
      return;
    }

    const prefixSet = new Set(complianceAcsPrefixes);
    const taskCandidates = new Map<
      string,
      { K: LibraryQuestion[]; R: LibraryQuestion[]; any: LibraryQuestion[] }
    >();

    for (const question of questions) {
      for (const applicability of question.poa_question_acs_applicability) {
        if (applicability.certificate_name !== testType.certificate_name) {
          continue;
        }

        for (const reference of splitAcsReferences(applicability.acs_reference)) {
          const prefix = acsPrefix(reference);
          const taskParent = taskParentFromReference(reference);
          const elementKind = elementKindFromReference(reference);

          if (!prefix || !prefixSet.has(prefix) || !taskParent) {
            continue;
          }

          const current =
            taskCandidates.get(taskParent) ?? { K: [], R: [], any: [] };

          if (!current.any.some((item) => item.id === question.id)) {
            current.any.push(question);
          }

          if (elementKind === "K" && !current.K.some((item) => item.id === question.id)) {
            current.K.push(question);
          }

          if (elementKind === "R" && !current.R.some((item) => item.id === question.id)) {
            current.R.push(question);
          }

          taskCandidates.set(taskParent, current);
        }
      }
    }

    /*
     * FAA-S-ACS-7B Appendix 3: for an INITIAL Commercial ASEL/ASES
     * practical test, Area V requires A or B, C or D, and E.
     * Pick one from each alternative pair so an automatic POA does not
     * incorrectly require both alternatives.
     */
    const excludedTaskParents = new Set<string>();
    const commercialSingleEngine =
      (testType.certificate_code ?? "").toUpperCase() === "COMMERCIAL" &&
      (testType.category_code ?? "").toUpperCase() === "AIRPLANE" &&
      ["ASEL", "ASES"].includes((testType.class_code ?? "").toUpperCase()) &&
      isOriginalIssuance(testType);

    if (commercialSingleEngine) {
      const firstPair = chooseRandom(["CA.V.A", "CA.V.B"]);
      const secondPair = chooseRandom(["CA.V.C", "CA.V.D"]);

      for (const candidate of ["CA.V.A", "CA.V.B"]) {
        if (candidate !== firstPair) {
          excludedTaskParents.add(candidate);
        }
      }

      for (const candidate of ["CA.V.C", "CA.V.D"]) {
        if (candidate !== secondPair) {
          excludedTaskParents.add(candidate);
        }
      }
    }

    const selected = new Set<string>();
    let taskCount = 0;
    let missingKnowledge = 0;
    let missingRisk = 0;

    for (const [taskParent, candidates] of [...taskCandidates.entries()].sort(
      ([a], [b]) => compareAcsReferences(a, b),
    )) {
      if (excludedTaskParents.has(taskParent)) {
        continue;
      }

      taskCount += 1;

      const knowledgeQuestion = chooseRandom(candidates.K);
      const riskQuestion = chooseRandom(candidates.R);

      if (knowledgeQuestion) {
        selected.add(knowledgeQuestion.id);
      } else {
        missingKnowledge += 1;
      }

      if (riskQuestion) {
        selected.add(riskQuestion.id);
      } else {
        missingRisk += 1;
      }

      if (!knowledgeQuestion && !riskQuestion) {
        const fallback = chooseRandom(candidates.any);
        if (fallback) {
          selected.add(fallback.id);
        }
      }
    }

    const selectedList = [...selected];

    setSelectionMethod("automatic");
    setSelectedIds(selectedList);
    setErrorMessage("");
    setGeneratedPoaId("");
    setMessage(
      `Built an ACS-driven selection with ${selectedList.length} question${
        selectedList.length === 1 ? "" : "s"
      } across ${taskCount} Task${taskCount === 1 ? "" : "s"}. ${
        missingKnowledge + missingRisk > 0
          ? `${missingKnowledge} Knowledge and ${missingRisk} Risk coverage slot${
              missingKnowledge + missingRisk === 1 ? "" : "s"
            } have no mapped Question Library item; review the Compliance tab before generating.`
          : "Knowledge and Risk coverage is represented for every Task found in the current practical-test Question Library."
      }`,
    );
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

      const {
        data: mappings,
        error: mappingError,
      } = await supabase
        .from("poa_scenario_practical_test_types")
        .select("scenario_id")
        .eq(
          "practical_test_type_id",
          testType.id,
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
        setLoadingScenarios(false);
        return;
      }

      setScenarioOptions(
        (scenarios ?? []) as GeneratorScenarioOption[],
      );

      setSelectedScenarioId("");
      setLoadingScenarios(false);
    }

    void loadGeneratorScenarios();

    return () => {
      cancelled = true;
    };
  }, [testType?.id]);

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

          scenario_name:
            selectedScenario?.scenario_name ??
            null,

          selection_method: selectionMethod,

          status: "ready",

          notes: `Generated from Question Library for ${testType.display_name}. Selection method: ${selectionMethod}.`,
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
       * Preserve the selected order by ACS task,
       * then question text. The snapshots remain
       * immutable after generation.
       */
      const orderedSelected = [...selectedQuestions].sort((a, b) => {
        const aRef = acsReferenceForQuestion(a);

        const bRef = acsReferenceForQuestion(b);

        const refCompare = compareAcsReferences(aRef, bRef);

        if (refCompare !== 0) {
          return refCompare;
        }

        return a.question.localeCompare(b.question);
      });

      let generatedFlightTasks =
        deriveAllFlightTasksFromAcsCatalog(
          complianceAcsPrefixes,
        );

      if (isAdditionalIssuance) {
        if (!additionalRatingHeld) {
          throw new Error(
            "Select the rating already held before generating an Additional Rating POA.",
          );
        }

        const certificateMaps =
          (
            ADDITIONAL_MAPS as Record<
              string,
              Record<string, unknown>
            >
          )[additionalMapCertificateKey] ?? {};

        const mapKey =
          `${additionalTargetRatingKey}_from_${additionalRatingHeld}`;

        const parentCodes =
          normalizeAdditionalMapCodes(
            certificateMaps[mapKey],
            complianceAcsPrefixes[0] ?? "",
          );

        if (parentCodes.length === 0) {
          throw new Error(
            `No Additional Rating ACS task map was found for ${mapKey}.`,
          );
        }

        generatedFlightTasks =
          filterFlightTasksByParentCodes(
            generatedFlightTasks,
            parentCodes,
          );
      }

      const commercialSingleEngineOriginal =
        (testType.certificate_code ?? "")
          .toUpperCase() === "COMMERCIAL" &&
        (testType.category_code ?? "")
          .toUpperCase() === "AIRPLANE" &&
        ["ASEL", "ASES"].includes(
          (testType.class_code ?? "")
            .toUpperCase(),
        ) &&
        isOriginalIssuance(testType);

      if (commercialSingleEngineOriginal) {
        const selectedParents = new Set(
          selectedQuestions.flatMap(
            (question) =>
              acsReferencesForQuestion(question)
                .map((reference) =>
                  taskParentFromReference(reference),
                )
                .filter(
                  (value): value is string =>
                    Boolean(value),
                ),
          ),
        );

        const chooseFromPair = (
          first: string,
          second: string,
        ) => {
          if (
            selectedParents.has(first) &&
            !selectedParents.has(second)
          ) {
            return first;
          }

          if (
            selectedParents.has(second) &&
            !selectedParents.has(first)
          ) {
            return second;
          }

          return first;
        };

        const firstChoice =
          chooseFromPair(
            "CA.V.A",
            "CA.V.B",
          );

        const secondChoice =
          chooseFromPair(
            "CA.V.C",
            "CA.V.D",
          );

        generatedFlightTasks =
          generatedFlightTasks
            .filter(
              (task) =>
                ![
                  "CA.V.A",
                  "CA.V.B",
                  "CA.V.C",
                  "CA.V.D",
                ].includes(
                  task.acs_task_code_snapshot,
                ) ||
                task.acs_task_code_snapshot ===
                  firstChoice ||
                task.acs_task_code_snapshot ===
                  secondChoice,
            )
            .map((task, index) => ({
              ...task,
              sort_order:
                (index + 1) * 10,
            }));
      }

      const snapshots = orderedSelected.map((question, index) => ({
        generated_plan_of_action_id: generated.id,

        question_library_id: question.id,

        acs_reference_snapshot: acsReferenceForQuestion(question),

        question_snapshot: question.question,

        answer_snapshot: question.answer,

        reference_snapshot: question.reference,

        topic_snapshot: question.topic,

        task_name_snapshot: question.task_name,

        question_type_snapshot: question.question_type,

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

      const {
        error: flightTaskError,
      } = await supabase.rpc(
        "examiner_replace_generated_poa_flight_tasks",
        {
          p_generated_plan_of_action_id:
            generated.id,
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
            href="/examiner/plan-of-action/questions"
            className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100"
          >
            Question Library
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

      {testType && isAdditionalIssuance ? (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Rating Already Held
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Required to determine the correct FAA
                Additional Rating flight-task matrix.
              </p>
            </div>

            <select
              value={additionalRatingHeld}
              onChange={(event) =>
                setAdditionalRatingHeld(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500"
            >
              <option value="">
                Select rating already held
              </option>

              {additionalHeldOptions.map(
                (held) => (
                  <option
                    key={held}
                    value={held}
                  >
                    {held}
                  </option>
                ),
              )}
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
          Loading Question Library…
        </div>
      ) : null}

      {!loading && testType ? (
        <>
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  POA Version
                </span>

                <select
                  value={selectedPoaVersionId}
                  onChange={(event) =>
                    selectPoaVersion(
                      event.target.value,
                    )
                  }
                  disabled={loadingPoaVersions}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
                >
                  <option value="new">
                    {loadingPoaVersions
                      ? "Loading saved POAs…"
                      : `New POA — ${testType.display_name}`}
                  </option>

                  {savedPoaVersions.map(
                    (poa, index) => (
                      <option
                        key={poa.id}
                        value={poa.id}
                      >
                        {formatSavedPoaVersion(
                          poa,
                          index,
                        )}
                      </option>
                    ),
                  )}
                </select>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    New POA Title
                  </span>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(
                        event.target.value,
                      )
                    }
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

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                Scenario Library Selection
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Scenario
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Select the scenario that will organize this
                Plan of Action chronologically.
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
                    setSelectedScenarioId(
                      event.target.value,
                    )
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

                  {scenarioOptions.map(
                    (scenario) => (
                      <option
                        key={scenario.id}
                        value={scenario.id}
                      >
                        {scenario.scenario_name}
                      </option>
                    ),
                  )}
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


          <div className="mt-6 flex gap-1 border-b border-slate-300">
            <button
              type="button"
              onClick={() => setGeneratorTab("questions")}
              className={`border-b-2 px-6 py-3 text-sm font-bold ${
                generatorTab === "questions"
                  ? "border-sky-700 text-sky-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Questions
            </button>

            <button
              type="button"
              onClick={() => setGeneratorTab("compliance")}
              className={`border-b-2 px-6 py-3 text-sm font-bold ${
                generatorTab === "compliance"
                  ? "border-sky-700 text-sky-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Compliance
            </button>
          </div>

          {generatorTab === "questions" ? (
            <>
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <label className="min-w-0 flex-1">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Search Question Library
                    </span>

                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                      <input
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder="Question, ACS reference, topic, source reference..."
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
                      />
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={buildCompliantSelection}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Check className="h-4 w-4" />
                      Build Compliant Selection
                    </button>

                    <button
                      type="button"
                      onClick={selectAllDisplayed}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Select Displayed
                    </button>

                    <button
                      type="button"
                      onClick={randomSelection}
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-100"
                    >
                      <Shuffle className="h-4 w-4" />
                      Quick Random 20
                    </button>

                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600">
                  {filteredQuestions.length} applicable library question
                  {filteredQuestions.length === 1 ? "" : "s"} across{" "}
                  <strong>{taskGroups.length}</strong> ACS Task
                  {taskGroups.length === 1 ? "" : "s"}.
                </p>
              </section>

              {questions.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="font-bold text-slate-900">
                    No applicable library questions
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Add or approve Question Library questions for this practical
                    test before generating a POA.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {taskGroups.map((group) => {
                    const taskExpanded = expandedTasks.has(group.acsReference);

                    const selectedCount = selectedCountForTask(group);

                    return (
                      <section
                        key={group.acsReference}
                        className={`overflow-hidden rounded-2xl border bg-white ${
                          selectedCount > 0
                            ? "border-sky-300"
                            : "border-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(group.acsReference)}
                          className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            {taskExpanded ? (
                              <ChevronDown className="h-5 w-5 text-slate-600" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-600" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-mono text-sm font-bold text-sky-800">
                                {group.acsReference}
                              </span>

                              <span className="font-bold text-slate-900">
                                {group.taskName}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {group.questions.length} available
                            </span>

                            {selectedCount > 0 ? (
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                                {selectedCount} selected
                              </span>
                            ) : null}
                          </div>
                        </button>

                        {taskExpanded ? (
                          <div className="border-t border-slate-200 bg-slate-50/40 p-3 sm:p-4">
                            <div className="space-y-2">
                              {group.questions.map(
                                ({ question, acsReference }) => {
                                  const selected = selectedIds.includes(
                                    question.id,
                                  );

                                  const questionKey = `${acsReference}:${question.id}`;

                                  const expanded =
                                    expandedQuestionId === questionKey;

                                  return (
                                    <article
                                      key={questionKey}
                                      className={`overflow-hidden rounded-xl border bg-white ${
                                        selected
                                          ? "border-sky-400 ring-1 ring-sky-200"
                                          : "border-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-start gap-4 px-4 py-4">
                                        <label className="mt-1 flex shrink-0 cursor-pointer items-center">
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() =>
                                              toggleQuestion(question.id)
                                            }
                                            className="h-5 w-5"
                                          />
                                        </label>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedQuestionId(
                                              expanded ? null : questionKey,
                                            )
                                          }
                                          className="flex min-w-0 flex-1 items-start gap-4 text-left"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="rounded-lg bg-sky-100 px-2.5 py-1 font-mono text-xs font-bold text-sky-800">
                                                {acsReference}
                                              </span>

                                              {question.topic ? (
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                  {question.topic}
                                                </span>
                                              ) : null}
                                            </div>

                                            <p className="mt-3 font-semibold leading-6 text-slate-900">
                                              {question.question}
                                            </p>
                                          </div>

                                          {expanded ? (
                                            <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                                          ) : (
                                            <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                                          )}
                                        </button>
                                      </div>

                                      {expanded ? (
                                        <div className="border-t border-slate-200 bg-slate-50/40 px-5 py-5">
                                          <div className="grid gap-5 lg:grid-cols-2">
                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Answer
                                              </p>

                                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                                {question.answer ||
                                                  "No answer entered."}
                                              </p>
                                            </div>

                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Reference
                                              </p>

                                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                                {question.reference ||
                                                  "No reference entered."}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}
                                    </article>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {generatorTab === "compliance" ? (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    ACS Compliance
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    A Knowledge or Risk element turns green when at least one
                    selected question covers that ACS parent code. Flight Skill
                    elements will be connected to the maneuver list later.
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Covered
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {coveredComplianceCount} / {complianceCodes.length}
                  </p>
                </div>
              </div>

              {complianceCodes.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  No ACS compliance elements are available for this practical
                  test.
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  {complianceCodes.map((code) => {
                    const covered = coveredComplianceCodes.has(code);

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
                                Flight maneuver coverage will be connected
                                later.
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

          <section className="sticky bottom-4 mt-8 rounded-2xl border border-slate-300 bg-white/95 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">
                  {selectedQuestions.length} question
                  {selectedQuestions.length === 1 ? "" : "s"} selected
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Only checked questions will be included in the generated POA.
                  Current selection mode: <strong>{selectionMethod}</strong>.
                </p>
              </div>

              <button
                type="button"
                disabled={generating || selectedQuestions.length === 0}
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
