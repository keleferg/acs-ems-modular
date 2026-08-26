"use client";

import Link from "next/link";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
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
  certificate_name: string;

  acs_reference: string;
};


type DraftQuestion = {
  id: string;

  source_plan_of_action_id:
    | string
    | null;

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

  acs_applicability:
    AcsApplicability[];

  created_at: string;
};


type SourcePlan = {
  id: string;

  title: string;

  scenario_name:
    | string
    | null;

  source_filename: string;
};


type EditingDraft = {
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


function createEditor(
  draft: DraftQuestion,
): EditingDraft {
  return {
    question:
      draft.question,

    answer:
      draft.answer ??
      "",

    reference:
      draft.reference ??
      "",

    topic:
      draft.topic ??
      "",

    taskName:
      draft.task_name ??
      "",

    questionType:
      draft.question_type,

    difficulty:
      draft.difficulty,

    acsApplicability:
      Object.fromEntries(
        (
          draft.acs_applicability ??
          []
        ).map(
          (item) => [
            item.certificate_name,
            item.acs_reference,
          ],
        ),
      ),
  };
}


export default function PoaQuestionReviewPage() {
  const [
    drafts,
    setDrafts,
  ] = useState<
    DraftQuestion[]
  >([]);

  const [
    certificates,
    setCertificates,
  ] = useState<
    string[]
  >([]);

  const [
    sourcePlans,
    setSourcePlans,
  ] = useState<
    SourcePlan[]
  >([]);

  const [
    editing,
    setEditing,
  ] = useState<
    Record<
      string,
      EditingDraft
    >
  >({});

  const [
    expandedDraftId,
    setExpandedDraftId,
  ] = useState<
    string
    | null
  >(null);

  const [
    busyDraftId,
    setBusyDraftId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const loadPage =
    useCallback(
      async () => {
        setLoading(true);

        setErrorMessage("");

        const supabase =
          createClient();

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          setErrorMessage(
            "You must be signed in as an examiner.",
          );

          setLoading(false);

          return;
        }


        const [
          draftsResult,
          certificateResult,
          plansResult,
        ] = await Promise.all([
          supabase
            .from(
              "poa_question_drafts",
            )
            .select(`
              id,
              source_plan_of_action_id,
              question,
              answer,
              reference,
              topic,
              task_name,
              question_type,
              difficulty,
              acs_applicability,
              created_at
            `)
            .eq(
              "examiner_profile_id",
              user.id,
            )
            .eq(
              "review_status",
              "pending",
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
            .select(
              "certificate_name",
            )
            .eq(
              "is_active",
              true,
            ),

          supabase
            .from(
              "examiner_plan_of_actions",
            )
            .select(`
              id,
              title,
              scenario_name,
              source_filename
            `)
            .eq(
              "examiner_profile_id",
              user.id,
            ),
        ]);


        if (
          draftsResult.error
        ) {
          setErrorMessage(
            draftsResult
              .error.message,
          );

          setLoading(false);

          return;
        }


        if (
          certificateResult.error
        ) {
          setErrorMessage(
            certificateResult
              .error.message,
          );

          setLoading(false);

          return;
        }


        if (
          plansResult.error
        ) {
          setErrorMessage(
            plansResult
              .error.message,
          );

          setLoading(false);

          return;
        }


        const loadedDrafts =
          (
            draftsResult.data ??
            []
          ) as DraftQuestion[];


        setDrafts(
          loadedDrafts,
        );


        setEditing(
          Object.fromEntries(
            loadedDrafts.map(
              (draft) => [
                draft.id,
                createEditor(
                  draft,
                ),
              ],
            ),
          ),
        );


        setCertificates(
          [
            ...new Set(
              (
                certificateResult.data ??
                []
              )
                .map(
                  (row) =>
                    String(
                      row.certificate_name ||
                        "",
                    ).trim(),
                )
                .filter(Boolean),
            ),
          ].sort(
            (a, b) =>
              a.localeCompare(b),
          ),
        );


        setSourcePlans(
          (
            plansResult.data ??
            []
          ) as SourcePlan[],
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


  const sourcePlanById =
    useMemo(
      () =>
        new Map(
          sourcePlans.map(
            (plan) => [
              plan.id,
              plan,
            ],
          ),
        ),
      [sourcePlans],
    );


  function updateEditing(
    draftId: string,

    changes:
      Partial<EditingDraft>,
  ) {
    setEditing(
      (current) => ({
        ...current,

        [draftId]: {
          ...current[
            draftId
          ],

          ...changes,
        },
      }),
    );
  }


  function toggleCertificate(
    draftId: string,

    certificate: string,
  ) {
    const current =
      editing[
        draftId
      ];

    if (!current) {
      return;
    }

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

    updateEditing(
      draftId,
      {
        acsApplicability:
          next,
      },
    );
  }


  function setAcsReference(
    draftId: string,

    certificate: string,

    value: string,
  ) {
    const current =
      editing[
        draftId
      ];

    if (!current) {
      return;
    }

    updateEditing(
      draftId,
      {
        acsApplicability: {
          ...current
            .acsApplicability,

          [certificate]:
            value,
        },
      },
    );
  }


  async function saveDraft(
    draftId: string,
  ) {
    const values =
      editing[
        draftId
      ];

    if (!values) {
      throw new Error(
        "Draft editor could not be loaded.",
      );
    }


    if (
      !values.question.trim()
    ) {
      throw new Error(
        "Question is required.",
      );
    }


    const applicability =
      Object.entries(
        values
          .acsApplicability,
      );


    if (
      applicability.length ===
      0
    ) {
      throw new Error(
        "Select at least one applicable ACS certificate.",
      );
    }


    const missing =
      applicability.find(
        ([, reference]) =>
          !reference.trim(),
      );


    if (missing) {
      throw new Error(
        `Enter an ACS Reference for ${missing[0]}.`,
      );
    }


    const supabase =
      createClient();


    const {
      error,
    } = await supabase
      .from(
        "poa_question_drafts",
      )
      .update({
        question:
          values
            .question
            .trim(),

        answer:
          values
            .answer
            .trim() ||
          null,

        reference:
          values
            .reference
            .trim() ||
          null,

        topic:
          values
            .topic
            .trim() ||
          null,

        task_name:
          values
            .taskName
            .trim() ||
          null,

        question_type:
          values
            .questionType,

        difficulty:
          values
            .difficulty,

        acs_reference:
          applicability[
            0
          ][1].trim(),

        acs_applicability:
          applicability.map(
            ([
              certificateName,
              acsReference,
            ]) => ({
              certificate_name:
                certificateName,

              acs_reference:
                acsReference.trim(),
            }),
          ),

        proposed_practical_test_type_ids:
          [],
      })
      .eq(
        "id",
        draftId,
      );


    if (error) {
      throw new Error(
        `Draft could not be saved: ${error.message}`,
      );
    }
  }


  async function approveDraft(
    draft: DraftQuestion,
  ) {
    setBusyDraftId(
      draft.id,
    );

    setMessage("");

    setErrorMessage("");


    try {
      await saveDraft(
        draft.id,
      );


      const supabase =
        createClient();


      const {
        error,
      } = await supabase.rpc(
        "examiner_approve_poa_question_draft",
        {
          p_draft_id:
            draft.id,
        },
      );


      if (error) {
        throw new Error(
          error.message,
        );
      }


      setDrafts(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              draft.id,
          ),
      );


      setExpandedDraftId(
        null,
      );


      setMessage(
        "Question approved and added to the Question Library.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Question could not be approved.",
      );
    } finally {
      setBusyDraftId("");
    }
  }


  async function rejectDraft(
    draft: DraftQuestion,
  ) {
    const confirmed =
      window.confirm(
        `Reject this imported question?\n\n${draft.question}`,
      );

    if (!confirmed) {
      return;
    }


    setBusyDraftId(
      draft.id,
    );

    setMessage("");

    setErrorMessage("");


    const supabase =
      createClient();


    const {
      error,
    } = await supabase.rpc(
      "examiner_reject_poa_question_draft",
      {
        p_draft_id:
          draft.id,
      },
    );


    if (error) {
      setErrorMessage(
        error.message,
      );

      setBusyDraftId("");

      return;
    }


    setDrafts(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            draft.id,
        ),
    );


    setExpandedDraftId(
      null,
    );


    setMessage(
      "Imported question rejected.",
    );


    setBusyDraftId("");
  }


  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Plan of Action
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Review Imported Questions
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Review each imported question and
            identify which ACS certificate families
            it applies to. Each selected ACS gets
            its own reference.
          </p>
        </div>


        <div className="flex flex-wrap gap-2">
          <Link
            href="/examiner/plan-of-action"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Plan of Action
          </Link>

          <Link
            href="/examiner/plan-of-action/questions"
            className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
          >
            Question Library
          </Link>

          <button
            type="button"
            onClick={() =>
              void loadPage()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />

            Refresh
          </button>
        </div>
      </div>


      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}


      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}


      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading imported questions…
        </div>
      ) : null}


      {!loading &&
      drafts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-600" />

          <p className="mt-4 text-lg font-bold text-slate-900">
            All caught up
          </p>

          <p className="mt-2 text-sm text-slate-600">
            There are no imported questions waiting
            for review.
          </p>
        </div>
      ) : null}


      <div className="mt-6 space-y-4">
        {drafts.map(
          (
            draft,
            index,
          ) => {
            const values =
              editing[
                draft.id
              ];

            if (!values) {
              return null;
            }

            const expanded =
              expandedDraftId ===
              draft.id;

            const busy =
              busyDraftId ===
              draft.id;

            const sourcePlan =
              draft
                .source_plan_of_action_id
                ? sourcePlanById.get(
                    draft
                      .source_plan_of_action_id,
                  )
                : undefined;


            return (
              <article
                key={
                  draft.id
                }
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDraftId(
                      expanded
                        ? null
                        : draft.id,
                    )
                  }
                  className="flex w-full items-start gap-4 px-5 py-5 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        #
                        {
                          index +
                          1
                        }
                      </span>

                      {Object.entries(
                        values
                          .acsApplicability,
                      ).map(
                        ([
                          certificate,
                          acsReference,
                        ]) => (
                          <span
                            key={
                              certificate
                            }
                            className="rounded-lg bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800"
                          >
                            {
                              certificate
                            }
                            {" • "}
                            {acsReference ||
                              "Reference needed"}
                          </span>
                        ),
                      )}
                    </div>


                    <p className="mt-3 font-semibold leading-6 text-slate-900">
                      {
                        values.question
                      }
                    </p>


                    <p className="mt-3 text-xs text-slate-500">
                      Source:{" "}
                      {sourcePlan
                        ?.source_filename ||
                        sourcePlan
                          ?.scenario_name ||
                        sourcePlan
                          ?.title ||
                        "Uploaded POA"}
                    </p>
                  </div>


                  {expanded ? (
                    <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                  )}
                </button>


                {expanded ? (
                  <div className="border-t border-slate-200 bg-slate-50/40 px-5 py-6">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <label className="lg:col-span-2">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Question
                        </span>

                        <textarea
                          rows={4}
                          value={
                            values.question
                          }
                          onChange={
                            (event) =>
                              updateEditing(
                                draft.id,
                                {
                                  question:
                                    event
                                      .target
                                      .value,
                                },
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
                            values.answer
                          }
                          onChange={
                            (event) =>
                              updateEditing(
                                draft.id,
                                {
                                  answer:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
                        />
                      </label>


                      <label className="lg:col-span-2">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Reference
                        </span>

                        <textarea
                          rows={3}
                          value={
                            values.reference
                          }
                          onChange={
                            (event) =>
                              updateEditing(
                                draft.id,
                                {
                                  reference:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-500"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Topic
                        </span>

                        <input
                          value={
                            values.topic
                          }
                          onChange={
                            (event) =>
                              updateEditing(
                                draft.id,
                                {
                                  topic:
                                    event
                                      .target
                                      .value,
                                },
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
                            values
                              .questionType
                          }
                          onChange={
                            (event) =>
                              updateEditing(
                                draft.id,
                                {
                                  questionType:
                                    event
                                      .target
                                      .value as QuestionType,
                                },
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
                      <p className="font-bold text-slate-900">
                        Applicable ACS
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Select certificates only.
                        Category, class, and individual
                        rating do not affect question
                        applicability here.
                      </p>


                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {certificates.map(
                          (
                            certificate,
                          ) => {
                            const selected =
                              Object.prototype
                                .hasOwnProperty
                                .call(
                                  values
                                    .acsApplicability,
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
                                          draft.id,
                                          certificate,
                                        )
                                      }
                                      className="h-4 w-4 shrink-0"
                                    />

                                    <span className="font-semibold text-slate-800">
                                      {
                                        certificate
                                      }
                                    </span>
                                  </label>


                                  {selected ? (
                                    <input
                                      value={
                                        values
                                          .acsApplicability[
                                          certificate
                                        ] ??
                                        ""
                                      }
                                      onChange={
                                        (
                                          event,
                                        ) =>
                                          setAcsReference(
                                            draft.id,

                                            certificate,

                                            event
                                              .target
                                              .value,
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
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void rejectDraft(
                            draft,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />

                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void approveDraft(
                            draft,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}

                        {busy
                          ? "Saving…"
                          : "Approve to Library"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          },
        )}
      </div>
    </main>
  );
}
