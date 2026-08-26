"use client";

import Link from "next/link";

import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  X,
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


type QuestionType =
  | "knowledge"
  | "risk_management"
  | "skill"
  | "scenario"
  | "other";


type Difficulty =
  | "basic"
  | "standard"
  | "advanced";


type AcsApplicability = {
  id?: string;

  certificate_name: string;

  acs_reference: string;
};


type PracticalTestType = {
  id: string;

  certificate_name: string;

  certificate_code: string;

  rating_name: string;

  rating_code: string;

  category_name:
    | string
    | null;

  class_name:
    | string
    | null;

  display_name: string;
};


type QuestionPracticalTestType = {
  practical_test_type_id: string;

  practical_test_types:
    | PracticalTestType
    | PracticalTestType[]
    | null;
};


type QuestionRecord = {
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

  question_type: QuestionType;

  difficulty: Difficulty;

  source_type: string;

  is_active: boolean;

  created_at: string;

  poa_question_acs_applicability:
    AcsApplicability[];

  poa_question_practical_test_types:
    QuestionPracticalTestType[];
};


type QuestionForm = {
  id:
    | string
    | null;

  question: string;

  answer: string;

  reference: string;

  topic: string;

  taskName: string;

  questionType: QuestionType;

  difficulty: Difficulty;

  acsApplicability:
    Record<string, string>;
};


type TaskQuestion = {
  question: QuestionRecord;

  acsReference: string;
};


type TaskGroup = {
  acsReference: string;

  taskName: string;

  questions: TaskQuestion[];
};


const EMPTY_FORM: QuestionForm = {
  id: null,

  question: "",

  answer: "",

  reference: "",

  topic: "",

  taskName: "",

  questionType:
    "knowledge",

  difficulty:
    "standard",

  acsApplicability: {},
};


function questionTypeLabel(
  value: QuestionType,
) {
  switch (value) {
    case "risk_management":
      return "Risk Management";

    case "skill":
      return "Skill";

    case "scenario":
      return "Scenario";

    case "other":
      return "Other";

    default:
      return "Knowledge";
  }
}


function splitAcsReferences(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
    .split(";")
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);
}


function practicalTestTypeFromJoin(
  item: QuestionPracticalTestType,
) {
  if (
    Array.isArray(
      item.practical_test_types,
    )
  ) {
    return (
      item
        .practical_test_types[0] ??
      null
    );
  }

  return (
    item.practical_test_types ??
    null
  );
}


function taskLabelForReference(
  question: QuestionRecord,
  acsReference: string,
) {
  const taskParts =
    String(
      question.task_name ??
        "",
    )
      .split(";")
      .map(
        (item) =>
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

  const topicParts =
    String(
      question.topic ??
        "",
    )
      .split(";")
      .map(
        (item) =>
          item.trim(),
      )
      .filter(Boolean);

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

      sensitivity:
        "base",
    },
  );
}


export default function PoaQuestionLibraryPage() {
  const [
    questions,
    setQuestions,
  ] = useState<
    QuestionRecord[]
  >([]);

  const [
    practicalTestTypes,
    setPracticalTestTypes,
  ] = useState<
    PracticalTestType[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    certificateFilter,
    setCertificateFilter,
  ] = useState("");

  const [
    ratingFilter,
    setRatingFilter,
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("");

  const [
    expandedQuestionId,
    setExpandedQuestionId,
  ] = useState<
    string
    | null
  >(null);

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
    showEditor,
    setShowEditor,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<QuestionForm>(
    EMPTY_FORM,
  );


  const loadPage =
    useCallback(
      async () => {
        setLoading(true);

        setPageError("");

        const supabase =
          createClient();

        const [
          questionsResult,
          practicalTestTypesResult,
        ] = await Promise.all([
          supabase
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
              source_type,
              is_active,
              created_at,
              poa_question_acs_applicability (
                id,
                certificate_name,
                acs_reference
              ),
              poa_question_practical_test_types (
                practical_test_type_id,
                practical_test_types (
                  id,
                  certificate_name,
                  certificate_code,
                  rating_name,
                  rating_code,
                  category_name,
                  class_name,
                  display_name
                )
              )
            `)
            .eq(
              "is_active",
              true,
            )
            .order(
              "created_at",
              {
                ascending: true,
              },
            ),

          supabase
            .from(
              "practical_test_types",
            )
            .select(`
              id,
              certificate_name,
              certificate_code,
              rating_name,
              rating_code,
              category_name,
              class_name,
              display_name
            `)
            .eq(
              "is_active",
              true,
            )
            .order(
              "sort_order",
              {
                ascending: true,
              },
            ),
        ]);

        if (
          questionsResult.error
        ) {
          setPageError(
            questionsResult
              .error.message,
          );

          setLoading(false);

          return;
        }

        if (
          practicalTestTypesResult.error
        ) {
          setPageError(
            practicalTestTypesResult
              .error.message,
          );

          setLoading(false);

          return;
        }

        setQuestions(
          (
            questionsResult.data ??
            []
          ) as unknown as QuestionRecord[],
        );

        setPracticalTestTypes(
          (
            practicalTestTypesResult.data ??
            []
          ) as PracticalTestType[],
        );

        setLoading(false);
      },
      [],
    );


  useEffect(
    () => {
      void loadPage();
    },
    [loadPage],
  );


  const certificates =
    useMemo(
      () => {
        return [
          ...new Set(
            practicalTestTypes
              .map(
                (item) =>
                  item
                    .certificate_name,
              )
              .filter(Boolean),
          ),
        ].sort(
          (a, b) =>
            a.localeCompare(
              b,
            ),
        );
      },
      [
        practicalTestTypes,
      ],
    );


  const ratingOptions =
    useMemo(
      () => {
        if (
          !certificateFilter
        ) {
          return [];
        }

        const matching =
          practicalTestTypes.filter(
            (item) =>
              item
                .certificate_name ===
              certificateFilter,
          );

        const map =
          new Map<
            string,
            string
          >();

        for (
          const item
          of matching
        ) {
          const key =
            item.rating_code ||
            item.rating_name;

          const label =
            item.rating_name ||
            item.rating_code;

          if (
            key &&
            label
          ) {
            map.set(
              key,
              label,
            );
          }
        }

        return [
          ...map.entries(),
        ]
          .map(
            ([
              value,
              label,
            ]) => ({
              value,
              label,
            }),
          )
          .sort(
            (a, b) =>
              a.label.localeCompare(
                b.label,
              ),
          );
      },
      [
        certificateFilter,
        practicalTestTypes,
      ],
    );


  useEffect(
    () => {
      setRatingFilter(
        "",
      );

      setExpandedTasks(
        new Set(),
      );

      setExpandedQuestionId(
        null,
      );
    },
    [
      certificateFilter,
    ],
  );


  useEffect(
    () => {
      setExpandedTasks(
        new Set(),
      );

      setExpandedQuestionId(
        null,
      );
    },
    [
      ratingFilter,
      typeFilter,
      searchText,
    ],
  );


  const selectedQuestions =
    useMemo(
      () => {
        if (
          !certificateFilter ||
          !ratingFilter
        ) {
          return [];
        }

        const search =
          searchText
            .trim()
            .toLowerCase();

        return questions.filter(
          (question) => {
            const belongsToSelectedTest =
              question
                .poa_question_practical_test_types
                .some(
                  (join) => {
                    const testType =
                      practicalTestTypeFromJoin(
                        join,
                      );

                    if (
                      !testType
                    ) {
                      return false;
                    }

                    const ratingKey =
                      testType.rating_code ||
                      testType.rating_name;

                    return (
                      testType
                        .certificate_name ===
                        certificateFilter &&
                      ratingKey ===
                        ratingFilter
                    );
                  },
                );

            if (
              !belongsToSelectedTest
            ) {
              return false;
            }

            if (
              typeFilter &&
              question.question_type !==
                typeFilter
            ) {
              return false;
            }

            if (!search) {
              return true;
            }

            const applicability =
              question
                .poa_question_acs_applicability
                .map(
                  (item) =>
                    `${item.certificate_name} ${item.acs_reference}`,
                )
                .join(" ");

            const haystack = [
              question.question,
              question.answer ??
                "",
              question.reference ??
                "",
              question.topic ??
                "",
              question.task_name ??
                "",
              applicability,
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
        certificateFilter,
        questions,
        ratingFilter,
        searchText,
        typeFilter,
      ],
    );


  const taskGroups =
    useMemo(
      () => {
        if (
          !certificateFilter ||
          !ratingFilter
        ) {
          return [];
        }

        const groups =
          new Map<
            string,
            TaskGroup
          >();

        for (
          const question
          of selectedQuestions
        ) {
          const matchingApplicability =
            question
              .poa_question_acs_applicability
              .filter(
                (item) =>
                  item
                    .certificate_name ===
                  certificateFilter,
              );

          const references =
            [
              ...new Set(
                matchingApplicability.flatMap(
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

            if (
              existing
            ) {
              if (
                !existing.questions
                  .some(
                    (item) =>
                      item
                        .question.id ===
                      question.id,
                  )
              ) {
                existing.questions.push(
                  {
                    question,
                    acsReference,
                  },
                );
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
        certificateFilter,
        ratingFilter,
        selectedQuestions,
      ],
    );


  const displayedQuestionCount =
    useMemo(
      () =>
        new Set(
          taskGroups.flatMap(
            (group) =>
              group.questions.map(
                (item) =>
                  item
                    .question.id,
              ),
          ),
        ).size,
      [
        taskGroups,
      ],
    );


  function toggleTask(
    acsReference: string,
  ) {
    setExpandedTasks(
      (current) => {
        const next =
          new Set(
            current,
          );

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


  function startNewQuestion() {
    setForm(
      EMPTY_FORM,
    );

    setShowEditor(
      true,
    );

    setMessage("");

    setPageError("");
  }


  function startEdit(
    question: QuestionRecord,
  ) {
    setForm({
      id:
        question.id,

      question:
        question.question,

      answer:
        question.answer ??
        "",

      reference:
        question.reference ??
        "",

      topic:
        question.topic ??
        "",

      taskName:
        question.task_name ??
        "",

      questionType:
        question.question_type,

      difficulty:
        question.difficulty,

      acsApplicability:
        Object.fromEntries(
          question
            .poa_question_acs_applicability
            .map(
              (item) => [
                item
                  .certificate_name,
                item
                  .acs_reference,
              ],
            ),
        ),
    });

    setShowEditor(
      true,
    );

    setMessage("");

    setPageError("");
  }


  function toggleCertificate(
    certificate: string,
  ) {
    setForm(
      (current) => {
        const next = {
          ...current
            .acsApplicability,
        };

        if (
          Object.prototype
            .hasOwnProperty
            .call(
              next,
              certificate,
            )
        ) {
          delete next[
            certificate
          ];
        } else {
          next[
            certificate
          ] = "";
        }

        return {
          ...current,

          acsApplicability:
            next,
        };
      },
    );
  }


  function setAcsReference(
    certificate: string,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,

        acsApplicability: {
          ...current
            .acsApplicability,

          [certificate]:
            value,
        },
      }),
    );
  }


  async function saveQuestion() {
    setMessage("");

    setPageError("");

    if (
      !form.question.trim()
    ) {
      setPageError(
        "Question is required.",
      );

      return;
    }

    const applicability =
      Object.entries(
        form.acsApplicability,
      );

    if (
      applicability.length ===
      0
    ) {
      setPageError(
        "Select at least one applicable ACS certificate.",
      );

      return;
    }

    const missingReference =
      applicability.find(
        ([, acsReference]) =>
          !acsReference.trim(),
      );

    if (
      missingReference
    ) {
      setPageError(
        `Enter an ACS Reference for ${missingReference[0]}.`,
      );

      return;
    }

    setSaving(true);

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

      const firstAcsReference =
        applicability[0][1]
          .trim();

      let questionId =
        form.id;

      const questionPayload = {
        examiner_profile_id:
          user.id,

        acs_reference:
          firstAcsReference,

        question:
          form.question.trim(),

        answer:
          form.answer.trim() ||
          null,

        reference:
          form.reference.trim() ||
          null,

        topic:
          form.topic.trim() ||
          null,

        task_name:
          form.taskName.trim() ||
          null,

        question_type:
          form.questionType,

        difficulty:
          form.difficulty,
      };


      if (questionId) {
        const {
          error: updateError,
        } = await supabase
          .from(
            "poa_questions",
          )
          .update(
            questionPayload,
          )
          .eq(
            "id",
            questionId,
          );

        if (
          updateError
        ) {
          throw updateError;
        }

        const {
          error:
            clearApplicabilityError,
        } = await supabase
          .from(
            "poa_question_acs_applicability",
          )
          .delete()
          .eq(
            "question_id",
            questionId,
          );

        if (
          clearApplicabilityError
        ) {
          throw clearApplicabilityError;
        }
      } else {
        const {
          data: inserted,
          error: insertError,
        } = await supabase
          .from(
            "poa_questions",
          )
          .insert({
            ...questionPayload,

            source_type:
              "manual",

            created_by_profile_id:
              user.id,
          })
          .select(
            "id",
          )
          .single();

        if (
          insertError ||
          !inserted
        ) {
          throw (
            insertError ??
            new Error(
              "Question could not be created.",
            )
          );
        }

        questionId =
          inserted.id;
      }


      const {
        error:
          applicabilityError,
      } = await supabase
        .from(
          "poa_question_acs_applicability",
        )
        .insert(
          applicability.map(
            ([
              certificateName,
              acsReference,
            ]) => ({
              question_id:
                questionId,

              certificate_name:
                certificateName,

              acs_reference:
                acsReference.trim(),
            }),
          ),
        );

      if (
        applicabilityError
      ) {
        throw applicabilityError;
      }


      setMessage(
        form.id
          ? "Question updated."
          : "Question added to the library.",
      );

      setShowEditor(
        false,
      );

      setForm(
        EMPTY_FORM,
      );

      await loadPage();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The question could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }


  async function archiveQuestion(
    question: QuestionRecord,
  ) {
    const confirmed =
      window.confirm(
        `Archive this question?\n\n${question.question}`,
      );

    if (!confirmed) {
      return;
    }

    const supabase =
      createClient();

    const {
      error,
    } = await supabase
      .from(
        "poa_questions",
      )
      .update({
        is_active:
          false,
      })
      .eq(
        "id",
        question.id,
      );

    if (error) {
      setPageError(
        error.message,
      );

      return;
    }

    setMessage(
      "Question archived.",
    );

    await loadPage();
  }


  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Plan of Action
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Question Library
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Select a certificate and rating type to display
            only the ACS Tasks and questions applicable to
            that practical test.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/examiner/plan-of-action"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Plan of Action
          </Link>

          <Link
            href="/examiner/plan-of-action/questions/review"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            Review Imports
          </Link>

          <button
            type="button"
            onClick={
              startNewQuestion
            }
            className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
          >
            <Plus className="h-4 w-4" />

            Add Question
          </button>
        </div>
      </div>


      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}


      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}


      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Active Questions
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {questions.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            ACS Tasks
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {certificateFilter &&
            ratingFilter
              ? taskGroups.length
              : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Displayed Questions
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {certificateFilter &&
            ratingFilter
              ? displayedQuestionCount
              : "—"}
          </p>
        </div>
      </section>


      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px_260px_200px]">
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Search
            </span>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                value={
                  searchText
                }
                onChange={
                  (event) =>
                    setSearchText(
                      event.target.value,
                    )
                }
                placeholder="Question, ACS code, reference..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
              />
            </div>
          </label>


          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Certificate
            </span>

            <select
              value={
                certificateFilter
              }
              onChange={
                (event) =>
                  setCertificateFilter(
                    event.target.value,
                  )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="">
                Select Certificate
              </option>

              {certificates.map(
                (certificate) => (
                  <option
                    key={
                      certificate
                    }
                    value={
                      certificate
                    }
                  >
                    {certificate}
                  </option>
                ),
              )}
            </select>
          </label>


          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Rating Type
            </span>

            <select
              value={
                ratingFilter
              }
              disabled={
                !certificateFilter
              }
              onChange={
                (event) =>
                  setRatingFilter(
                    event.target.value,
                  )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {certificateFilter
                  ? "Select Rating Type"
                  : "Select Certificate First"}
              </option>

              {ratingOptions.map(
                (rating) => (
                  <option
                    key={
                      rating.value
                    }
                    value={
                      rating.value
                    }
                  >
                    {rating.label}
                  </option>
                ),
              )}
            </select>
          </label>


          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Question Type
            </span>

            <select
              value={
                typeFilter
              }
              onChange={
                (event) =>
                  setTypeFilter(
                    event.target.value,
                  )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="">
                All Types
              </option>

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
      </section>


      {showEditor ? (
        <section className="mt-6 rounded-2xl border-2 border-sky-200 bg-sky-50/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {form.id
                  ? "Edit Question"
                  : "Add Question"}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Select every ACS certificate where
                this question applies, then enter
                that certificate&apos;s ACS
                reference.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowEditor(
                  false,
                );

                setForm(
                  EMPTY_FORM,
                );
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>


          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="lg:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Question *
              </span>

              <textarea
                rows={4}
                value={
                  form.question
                }
                onChange={
                  (event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        question:
                          event.target.value,
                      }),
                    )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
              />
            </label>


            <label className="lg:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Answer
              </span>

              <textarea
                rows={5}
                value={
                  form.answer
                }
                onChange={
                  (event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        answer:
                          event.target.value,
                      }),
                    )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
              />
            </label>


            <label className="lg:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Reference
              </span>

              <input
                value={
                  form.reference
                }
                onChange={
                  (event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        reference:
                          event.target.value,
                      }),
                    )
                }
                placeholder="14 CFR §91.213; FAA-H-8083-25"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
              />
            </label>


            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Topic
              </span>

              <input
                value={
                  form.topic
                }
                onChange={
                  (event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        topic:
                          event.target.value,
                      }),
                    )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
              />
            </label>


            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Question Type
              </span>

              <select
                value={
                  form.questionType
                }
                onChange={
                  (event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        questionType:
                          event.target.value as QuestionType,
                      }),
                    )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
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


          <div className="mt-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">
                  Applicable ACS
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Each selected certificate gets its own
                  ACS Reference.
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-500">
                {Object.keys(
                  form.acsApplicability,
                ).length}{" "}
                selected
              </p>
            </div>


            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {certificates.map(
                (certificate) => {
                  const selected =
                    Object.prototype
                      .hasOwnProperty
                      .call(
                        form.acsApplicability,
                        certificate,
                      );

                  return (
                    <div
                      key={
                        certificate
                      }
                      className="border-b border-slate-100 p-4 last:border-b-0"
                    >
                      <div className="grid items-center gap-4 md:grid-cols-[220px_1fr]">
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleCertificate(
                                certificate,
                              )
                            }
                            className="h-4 w-4 shrink-0"
                          />

                          <span className="font-semibold text-slate-800">
                            {certificate}
                          </span>
                        </label>

                        {selected ? (
                          <input
                            value={
                              form
                                .acsApplicability[
                                certificate
                              ] ??
                              ""
                            }
                            onChange={
                              (event) =>
                                setAcsReference(
                                  certificate,
                                  event.target.value,
                                )
                            }
                            placeholder={`ACS Reference for ${certificate}`}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                          />
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not applicable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>


          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowEditor(
                  false,
                );

                setForm(
                  EMPTY_FORM,
                );
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void saveQuestion()
              }
              className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : form.id
                  ? "Save Changes"
                  : "Add to Library"}
            </button>
          </div>
        </section>
      ) : null}


      <section className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            Loading question library…
          </div>
        ) : null}


        {!loading &&
        (!certificateFilter ||
          !ratingFilter) ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />

            <p className="mt-4 text-lg font-semibold text-slate-800">
              Select a Certificate and Rating Type
            </p>

            <p className="mt-2 text-sm text-slate-500">
              The applicable ACS Tasks will appear below.
            </p>
          </div>
        ) : null}


        {!loading &&
        certificateFilter &&
        ratingFilter &&
        taskGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />

            <p className="mt-4 font-semibold text-slate-800">
              No questions found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No ACS Tasks match the current filters.
            </p>
          </div>
        ) : null}


        <div className="space-y-3">
          {taskGroups.map(
            (group) => {
              const taskExpanded =
                expandedTasks.has(
                  group.acsReference,
                );

              return (
                <section
                  key={
                    group.acsReference
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
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

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {group.questions.length}{" "}
                      {group.questions.length ===
                      1
                        ? "question"
                        : "questions"}
                    </span>
                  </button>


                  {taskExpanded ? (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-3 sm:p-4">
                      <div className="space-y-2">
                        {group.questions.map(
                          ({
                            question,
                            acsReference,
                          }) => {
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
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedQuestionId(
                                      expanded
                                        ? null
                                        : questionKey,
                                    )
                                  }
                                  className="flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-slate-50"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-lg bg-sky-100 px-2.5 py-1 font-mono text-xs font-bold text-sky-800">
                                        {acsReference}
                                      </span>

                                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                        {questionTypeLabel(
                                          question.question_type,
                                        )}
                                      </span>
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


                                {expanded ? (
                                  <div className="border-t border-slate-200 px-5 py-5">
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


                                    <div className="mt-5">
                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        ACS Applicability
                                      </p>

                                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                                        {question
                                          .poa_question_acs_applicability
                                          .map(
                                            (item) => (
                                              <div
                                                key={
                                                  `${item.certificate_name}:${item.acs_reference}`
                                                }
                                                className="grid gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[220px_1fr]"
                                              >
                                                <span className="font-semibold text-slate-700">
                                                  {item.certificate_name}
                                                </span>

                                                <span className="font-mono text-sm text-slate-800">
                                                  {item.acs_reference}
                                                </span>
                                              </div>
                                            ),
                                          )}
                                      </div>
                                    </div>


                                    <div className="mt-6 flex justify-end gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startEdit(
                                            question,
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        <Pencil className="h-4 w-4" />

                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void archiveQuestion(
                                            question,
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                                      >
                                        <Archive className="h-4 w-4" />

                                        Archive
                                      </button>
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
      </section>
    </main>
  );
}
