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
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

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

        setPlan(planData as GeneratedPlan);

        setQuestions(loadedSnapshots);

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

  function moveQuestion(
    index: number,
    direction: -1 | 1,
  ) {
    setQuestions((current) => {
      const target = index + direction;

      if (
        target < 0 ||
        target >= current.length
      ) {
        return current;
      }

      const copy = [...current];

      const [question] = copy.splice(
        index,
        1,
      );

      copy.splice(
        target,
        0,
        question,
      );

      return copy;
    });
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
        `Saved ${refreshedQuestions.length} questions. EMT and PDF export now use this edited POA.`,
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
          <label>
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

          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Scenario Name
            </span>

            <input
              value={
                plan.scenario_name || ""
              }
              onChange={(event) =>
                setPlan({
                  ...plan,
                  scenario_name:
                    event.target.value,
                })
              }
              placeholder="Optional"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
            />
          </label>
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

      <section className="mt-8">
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

        <div className="mt-6 space-y-4">
          {questions.map(
            (question, index) => (
              <article
                key={
                  question.id ||
                  `new-${index}`
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() =>
                        moveQuestion(
                          index,
                          -1,
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      title="Move down"
                      disabled={
                        index ===
                        questions.length - 1
                      }
                      onClick={() =>
                        moveQuestion(
                          index,
                          1,
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      title="Remove from this POA"
                      onClick={() =>
                        removeQuestion(
                          index,
                        )
                      }
                      className="rounded-lg border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
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
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
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
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                            event.target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6"
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
                            event.target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6"
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
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
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
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </label>
                </div>
              </article>
            ),
          )}
        </div>
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
