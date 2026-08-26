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
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";


type PracticalTestType = {
  id: string;
  certificate_name: string;
  issuance_name: string;

  category_name:
    | string
    | null;

  class_name:
    | string
    | null;

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

  answer:
    | string
    | null;

  reference:
    | string
    | null;

  topic:
    | string
    | null;

  task_name:
    | string
    | null;

  question_type: string;
  difficulty: string;

  poa_question_acs_applicability:
    AcsApplicability[];

  poa_question_practical_test_types:
    QuestionTestTypeJoin[];
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


function practicalTestDescription(
  testType: PracticalTestType,
) {
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


function splitAcsReferences(
  value:
    | string
    | null
    | undefined,
) {
  return String(value ?? "")
    .split(";")
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}


function taskLabelForReference(
  question: LibraryQuestion,
  acsReference: string,
) {
  const taskParts =
    String(
      question.task_name ??
        "",
    )
      .split(";")
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  const exact =
    taskParts.find(
      (part) =>
        part ===
          acsReference ||
        part.startsWith(
          `${acsReference} `,
        ),
    );

  if (exact) {
    return exact
      .replace(
        new RegExp(
          `^${acsReference.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          )}\\s*`,
        ),
        "",
      )
      .trim();
  }

  if (
    taskParts.length === 1 &&
    taskParts[0]
  ) {
    return taskParts[0]
      .replace(
        /^[A-Z]+\.[IVX]+\.[A-Z0-9/]+\s*/,
        "",
      )
      .trim();
  }

  const topicParts =
    String(
      question.topic ??
        "",
    )
      .split(";")
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  if (
    topicParts.length === 1 &&
    topicParts[0]
  ) {
    return topicParts[0];
  }

  return "ACS Task";
}


function compareAcsReferences(
  a: string,
  b: string,
) {
  return a.localeCompare(
    b,
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}


export default function GeneratePoaPage() {
  const [
    testTypeId,
    setTestTypeId,
  ] = useState("");

  const [
    testType,
    setTestType,
  ] = useState<
    PracticalTestType
    | null
  >(null);

  const [
    practicalTestTypes,
    setPracticalTestTypes,
  ] = useState<
    PracticalTestType[]
  >([]);

  const [
    loadingTestTypes,
    setLoadingTestTypes,
  ] = useState(true);

  const [
    questions,
    setQuestions,
  ] = useState<
    LibraryQuestion[]
  >([]);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<
    string[]
  >([]);

  const [
    expandedTasks,
    setExpandedTasks,
  ] = useState<
    Set<string>
  >(
    () =>
      new Set(),
  );

  const [
    expandedQuestionId,
    setExpandedQuestionId,
  ] = useState<
    string
    | null
  >(null);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState(
    "Generated Plan of Action",
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    generatedPoaId,
    setGeneratedPoaId,
  ] = useState("");


  useEffect(() => {
    let cancelled = false;

    async function initializeGenerator() {
      const params =
        new URLSearchParams(
          window.location.search,
        );

      const id =
        params.get(
          "testTypeId",
        )?.trim() ?? "";

      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from(
          "practical_test_types",
        )
        .select(`
          id,
          certificate_name,
          issuance_name,
          category_name,
          class_name,
          rating_name,
          display_name
        `)
        .eq(
          "is_active",
          true,
        )
        .order(
          "certificate_name",
          {
            ascending: true,
          },
        )
        .order(
          "display_name",
          {
            ascending: true,
          },
        );

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

      setPracticalTestTypes(
        (
          data ??
          []
        ) as PracticalTestType[],
      );

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


  const loadPage =
    useCallback(
      async () => {
        if (!testTypeId) {
          return;
        }

        setLoading(true);
        setErrorMessage("");

        const supabase =
          createClient();

        const {
          data: testTypeData,
          error: testTypeError,
        } = await supabase
          .from(
            "practical_test_types",
          )
          .select(`
            id,
            certificate_name,
            issuance_name,
            category_name,
            class_name,
            rating_name,
            display_name
          `)
          .eq(
            "id",
            testTypeId,
          )
          .maybeSingle();

        if (
          testTypeError ||
          !testTypeData
        ) {
          setErrorMessage(
            testTypeError
              ?.message ||
              "The practical test could not be loaded.",
          );

          setLoading(false);

          return;
        }

        const loadedTestType =
          testTypeData as PracticalTestType;

        setTestType(
          loadedTestType,
        );

        setTitle(
          `${loadedTestType.display_name} Plan of Action`,
        );

        /*
         * Important:
         * Questions must be associated with THIS
         * practical test type, not merely the same
         * certificate family.
         */
        const {
          data: questionData,
          error: questionError,
        } = await supabase
          .from(
            "poa_questions",
          )
          .select(`
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
          `)
          .eq(
            "is_active",
            true,
          )
          .eq(
            "poa_question_practical_test_types.practical_test_type_id",
            loadedTestType.id,
          )
          .order(
            "created_at",
            {
              ascending: true,
            },
          );

        if (questionError) {
          setErrorMessage(
            `Question Library could not be loaded: ${questionError.message}`,
          );

          setLoading(false);

          return;
        }

        setQuestions(
          (
            questionData ??
            []
          ) as LibraryQuestion[],
        );

        setSelectedIds([]);
        setExpandedTasks(
          new Set(),
        );
        setExpandedQuestionId(
          null,
        );

        setLoading(false);
      },
      [
        testTypeId,
      ],
    );


  useEffect(
    () => {
      if (testTypeId) {
        void loadPage();
      }
    },
    [
      loadPage,
      testTypeId,
    ],
  );


  function selectPracticalTest(
    nextTestTypeId: string,
  ) {
    setTestTypeId(
      nextTestTypeId,
    );

    setTestType(null);
    setQuestions([]);
    setSelectedIds([]);
    setExpandedTasks(
      new Set(),
    );
    setExpandedQuestionId(null);
    setSearchText("");
    setMessage("");
    setErrorMessage("");
    setGeneratedPoaId("");

    const url =
      new URL(
        window.location.href,
      );

    if (nextTestTypeId) {
      url.searchParams.set(
        "testTypeId",
        nextTestTypeId,
      );
    } else {
      url.searchParams.delete(
        "testTypeId",
      );

      setLoading(false);
    }

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}`,
    );
  }


  function acsReferencesForQuestion(
    question: LibraryQuestion,
  ) {
    if (!testType) {
      return [];
    }

    return [
      ...new Set(
        question
          .poa_question_acs_applicability
          .filter(
            (item) =>
              item
                .certificate_name ===
              testType
                .certificate_name,
          )
          .flatMap(
            (item) =>
              splitAcsReferences(
                item.acs_reference,
              ),
          ),
      ),
    ];
  }


  const filteredQuestions =
    useMemo(
      () => {
        const search =
          searchText
            .trim()
            .toLowerCase();

        if (!search) {
          return questions;
        }

        return questions.filter(
          (question) => {
            const acsText =
              question
                .poa_question_acs_applicability
                .map(
                  (item) =>
                    item.acs_reference,
                )
                .join(" ");

            const haystack = [
              acsText,
              question.question,
              question.answer ??
                "",
              question.reference ??
                "",
              question.topic ??
                "",
              question.task_name ??
                "",
            ]
              .join(" ")
              .toLowerCase();

            return haystack.includes(
              search,
            );
          },
        );
      },
      [
        questions,
        searchText,
      ],
    );


  const taskGroups =
    useMemo(
      () => {
        if (!testType) {
          return [];
        }

        const groups =
          new Map<
            string,
            TaskGroup
          >();

        for (
          const question
          of filteredQuestions
        ) {
          const references =
            [
              ...new Set(
                question
                  .poa_question_acs_applicability
                  .filter(
                    (item) =>
                      item
                        .certificate_name ===
                      testType
                        .certificate_name,
                  )
                  .flatMap(
                    (item) =>
                      splitAcsReferences(
                        item.acs_reference,
                      ),
                  ),
              ),
            ];

          for (
            const acsReference
            of references
          ) {
            const taskName =
              taskLabelForReference(
                question,
                acsReference,
              );

            const existing =
              groups.get(
                acsReference,
              );

            if (existing) {
              if (
                !existing.questions.some(
                  (item) =>
                    item.question.id ===
                    question.id,
                )
              ) {
                existing.questions.push({
                  question,
                  acsReference,
                });
              }

              if (
                existing.taskName ===
                  "ACS Task" &&
                taskName !==
                  "ACS Task"
              ) {
                existing.taskName =
                  taskName;
              }
            } else {
              groups.set(
                acsReference,
                {
                  acsReference,
                  taskName,
                  questions: [
                    {
                      question,
                      acsReference,
                    },
                  ],
                },
              );
            }
          }
        }

        return [
          ...groups.values(),
        ]
          .map(
            (group) => ({
              ...group,

              questions:
                group.questions.sort(
                  (a, b) =>
                    a.question.question.localeCompare(
                      b.question.question,
                    ),
                ),
            }),
          )
          .sort(
            (a, b) =>
              compareAcsReferences(
                a.acsReference,
                b.acsReference,
              ),
          );
      },
      [
        filteredQuestions,
        testType,
      ],
    );


  const selectedQuestions =
    useMemo(
      () =>
        questions.filter(
          (question) =>
            selectedIds.includes(
              question.id,
            ),
        ),
      [
        questions,
        selectedIds,
      ],
    );


  function selectedCountForTask(
    group: TaskGroup,
  ) {
    return new Set(
      group.questions
        .filter(
          (item) =>
            selectedIds.includes(
              item.question.id,
            ),
        )
        .map(
          (item) =>
            item.question.id,
        ),
    ).size;
  }


  function toggleTask(
    acsReference: string,
  ) {
    setExpandedTasks(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(
            acsReference,
          )
        ) {
          next.delete(
            acsReference,
          );
        } else {
          next.add(
            acsReference,
          );
        }

        return next;
      },
    );
  }


  function toggleQuestion(
    questionId: string,
  ) {
    setSelectedIds(
      (current) =>
        current.includes(
          questionId,
        )
          ? current.filter(
              (id) =>
                id !==
                questionId,
            )
          : [
              ...current,
              questionId,
            ],
    );
  }


  function selectAllDisplayed() {
    setSelectedIds(
      (current) => [
        ...new Set([
          ...current,
          ...filteredQuestions.map(
            (question) =>
              question.id,
          ),
        ]),
      ],
    );
  }


  function clearSelection() {
    setSelectedIds([]);
  }


  function randomSelection() {
    const shuffled =
      [...filteredQuestions].sort(
        () =>
          Math.random() -
          0.5,
      );

    setSelectedIds(
      shuffled
        .slice(
          0,
          Math.min(
            20,
            shuffled.length,
          ),
        )
        .map(
          (question) =>
            question.id,
        ),
    );
  }


  function acsReferenceForQuestion(
    question: LibraryQuestion,
  ) {
    return (
      acsReferencesForQuestion(
        question,
      )[0] ??
      ""
    );
  }


  async function generatePoa() {
    if (!testType) {
      return;
    }

    setMessage("");
    setErrorMessage("");
    setGeneratedPoaId("");

    if (
      selectedQuestions.length ===
      0
    ) {
      setErrorMessage(
        "Select at least one question.",
      );

      return;
    }

    if (!title.trim()) {
      setErrorMessage(
        "Enter a Plan of Action title.",
      );

      return;
    }

    setGenerating(true);

    const supabase =
      createClient();

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "You must be signed in as an examiner.",
        );
      }

      const {
        data: generated,
        error: generatedError,
      } = await supabase
        .from(
          "generated_plan_of_actions",
        )
        .insert({
          examiner_profile_id:
            user.id,

          practical_test_type_id:
            testType.id,

          title:
            title.trim(),

          selection_method:
            "manual",

          status:
            "ready",

          notes:
            `Generated from Question Library for ${testType.display_name}.`,
        })
        .select(
          "id",
        )
        .single();

      if (
        generatedError ||
        !generated
      ) {
        throw new Error(
          generatedError
            ?.message ||
            "The generated POA record could not be created.",
        );
      }

      /*
       * Preserve the selected order by ACS task,
       * then question text. The snapshots remain
       * immutable after generation.
       */
      const orderedSelected =
        [...selectedQuestions].sort(
          (a, b) => {
            const aRef =
              acsReferenceForQuestion(
                a,
              );

            const bRef =
              acsReferenceForQuestion(
                b,
              );

            const refCompare =
              compareAcsReferences(
                aRef,
                bRef,
              );

            if (refCompare !== 0) {
              return refCompare;
            }

            return a.question.localeCompare(
              b.question,
            );
          },
        );

      const snapshots =
        orderedSelected.map(
          (
            question,
            index,
          ) => ({
            generated_plan_of_action_id:
              generated.id,

            question_library_id:
              question.id,

            acs_reference_snapshot:
              acsReferenceForQuestion(
                question,
              ),

            question_snapshot:
              question.question,

            answer_snapshot:
              question.answer,

            reference_snapshot:
              question.reference,

            topic_snapshot:
              question.topic,

            task_name_snapshot:
              question.task_name,

            question_type_snapshot:
              question.question_type,

            sort_order:
              (
                index +
                1
              ) *
              10,
          }),
        );

      const {
        error:
          snapshotError,
      } = await supabase
        .from(
          "generated_plan_of_action_questions",
        )
        .insert(
          snapshots,
        );

      if (snapshotError) {
        await supabase
          .from(
            "generated_plan_of_actions",
          )
          .delete()
          .eq(
            "id",
            generated.id,
          );

        throw new Error(
          `Question snapshots could not be saved: ${snapshotError.message}`,
        );
      }

      setGeneratedPoaId(
        generated.id,
      );

      setMessage(
        `${title.trim()} generated successfully with ${selectedQuestions.length} question${
          selectedQuestions.length ===
          1
            ? ""
            : "s"
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
                {practicalTestDescription(
                  testType,
                )}
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
            onClick={() =>
              void loadPage()
            }
            disabled={
              !testTypeId
            }
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
            <p className="text-sm font-bold text-slate-900">
              Practical Test
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Select the certificate and rating for this Plan of Action.
            </p>
          </div>

          <select
            value={
              testTypeId
            }
            onChange={
              (event) =>
                selectPracticalTest(
                  event.target.value,
                )
            }
            disabled={
              loadingTestTypes
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500"
          >
            <option value="">
              {loadingTestTypes
                ? "Loading practical tests…"
                : "Select a practical test"}
            </option>

            {practicalTestTypes.map(
              (
                practicalTest,
              ) => (
                <option
                  key={
                    practicalTest.id
                  }
                  value={
                    practicalTest.id
                  }
                >
                  {practicalTest.display_name}
                  {" — "}
                  {practicalTestDescription(
                    practicalTest,
                  )}
                </option>
              ),
            )}
          </select>
        </div>
      </section>


      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                {message}
              </p>

              {generatedPoaId ? (
                <p className="mt-1 text-xs">
                  Generated POA ID:{" "}
                  {generatedPoaId}
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


      {!loading &&
      testType ? (
        <>
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  POA Title
                </span>

                <input
                  value={title}
                  onChange={
                    (event) =>
                      setTitle(
                        event.target.value,
                      )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500"
                />
              </label>

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
                    onChange={
                      (event) =>
                        setSearchText(
                          event.target.value,
                        )
                    }
                    placeholder="Question, ACS reference, topic, source reference..."
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
                  />
                </div>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    selectAllDisplayed
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Select Displayed
                </button>

                <button
                  type="button"
                  onClick={
                    randomSelection
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-100"
                >
                  <Shuffle className="h-4 w-4" />
                  Random 20
                </button>

                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              {filteredQuestions.length} applicable library question
              {filteredQuestions.length ===
              1
                ? ""
                : "s"}{" "}
              across{" "}
              <strong>
                {taskGroups.length}
              </strong>{" "}
              ACS Task
              {taskGroups.length ===
              1
                ? ""
                : "s"}.
            </p>
          </section>


          {questions.length ===
          0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-bold text-slate-900">
                No applicable library questions
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Add or approve Question Library questions for this practical test before generating a POA.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {taskGroups.map(
                (group) => {
                  const taskExpanded =
                    expandedTasks.has(
                      group.acsReference,
                    );

                  const selectedCount =
                    selectedCountForTask(
                      group,
                    );

                  return (
                    <section
                      key={
                        group.acsReference
                      }
                      className={`overflow-hidden rounded-2xl border bg-white ${
                        selectedCount > 0
                          ? "border-sky-300"
                          : "border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleTask(
                            group.acsReference,
                          )
                        }
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
                              ({
                                question,
                                acsReference,
                              }) => {
                                const selected =
                                  selectedIds.includes(
                                    question.id,
                                  );

                                const questionKey =
                                  `${acsReference}:${question.id}`;

                                const expanded =
                                  expandedQuestionId ===
                                  questionKey;

                                return (
                                  <article
                                    key={
                                      questionKey
                                    }
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
                                          checked={
                                            selected
                                          }
                                          onChange={() =>
                                            toggleQuestion(
                                              question.id,
                                            )
                                          }
                                          className="h-5 w-5"
                                        />
                                      </label>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedQuestionId(
                                            expanded
                                              ? null
                                              : questionKey,
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
                },
              )}
            </div>
          )}


          <section className="sticky bottom-4 mt-8 rounded-2xl border border-slate-300 bg-white/95 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">
                  {selectedQuestions.length} question
                  {selectedQuestions.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Only checked questions will be included in the generated POA.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  generating ||
                  selectedQuestions.length ===
                    0
                }
                onClick={() =>
                  void generatePoa()
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}

                {generating
                  ? "Generating…"
                  : "Generate POA"}
              </button>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
