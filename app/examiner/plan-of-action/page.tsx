"use client";

import {
  FileCheck2,
  FileUp,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PracticalTestType = {
  id: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string;
  is_active: boolean;
  is_offered: boolean;
  sort_order: number;
};

type PlanOfAction = {
  id: string;
  examiner_profile_id: string;
  practical_test_type_id: string;
  title: string;
  scenario_name: string | null;
  source_filename: string;
  source_mime_type: string | null;
  source_size_bytes: number | null;
  storage_bucket: string;
  storage_path: string | null;
  parse_status:
    | "uploaded"
    | "processing"
    | "ready"
    | "error";
  parse_error: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

function sanitizeFilename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function statusLabel(plan: PlanOfAction) {
  if (plan.parse_status === "ready") {
    return "Scenario Ready";
  }

  if (plan.parse_status === "processing") {
    return "Processing";
  }

  if (plan.parse_status === "error") {
    return "Parse Error";
  }

  return "Uploaded";
}

export default function ExaminerPlanOfActionPage() {
  const [testTypes, setTestTypes] = useState<
    PracticalTestType[]
  >([]);

  const [plans, setPlans] = useState<PlanOfAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTestId, setUploadingTestId] =
    useState("");

  const [parsingPlanId, setParsingPlanId] =
    useState("");

  const [deletingPlanId, setDeletingPlanId] =
    useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "You must be signed in as an examiner.",
      );
      setLoading(false);
      return;
    }

    const [typesResult, plansResult] =
      await Promise.all([
        supabase.rpc(
          "examiner_get_practical_test_offerings",
        ),

        supabase
          .from("examiner_plan_of_actions")
          .select(`
            id,
            examiner_profile_id,
            practical_test_type_id,
            title,
            scenario_name,
            source_filename,
            source_mime_type,
            source_size_bytes,
            storage_bucket,
            storage_path,
            parse_status,
            parse_error,
            is_active,
            sort_order,
            created_at
          `)
          .eq("examiner_profile_id", user.id)
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          }),
      ]);

    if (typesResult.error) {
      setErrorMessage(
        `Practical tests could not be loaded: ${typesResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    if (plansResult.error) {
      setErrorMessage(
        `Plans of Action could not be loaded: ${plansResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    setTestTypes(
      (
        (typesResult.data ?? []) as PracticalTestType[]
      ).filter(
        (testType) =>
          testType.is_active &&
          testType.is_offered,
      ),
    );

    setPlans(
      (plansResult.data ?? []) as PlanOfAction[],
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const plansByTest = useMemo(() => {
    const result = new Map<
      string,
      PlanOfAction[]
    >();

    for (const plan of plans) {
      const existing =
        result.get(plan.practical_test_type_id) ??
        [];

      existing.push(plan);

      result.set(
        plan.practical_test_type_id,
        existing,
      );
    }

    return result;
  }, [plans]);

  async function deletePlan(
    plan: PlanOfAction,
  ) {
    const confirmed = window.confirm(
      `Delete "${plan.scenario_name || plan.title}"?\n\nThis will permanently remove the Plan of Action, generated scenario, and uploaded source file.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingPlanId(plan.id);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    try {
      if (plan.storage_path) {
        const { error: storageError } =
          await supabase.storage
            .from(
              plan.storage_bucket ||
                "examiner-poas",
            )
            .remove([
              plan.storage_path,
            ]);

        if (storageError) {
          throw new Error(
            `The uploaded POA file could not be removed: ${storageError.message}`,
          );
        }
      }

      const { error: deleteError } =
        await supabase
          .from(
            "examiner_plan_of_actions",
          )
          .delete()
          .eq("id", plan.id);

      if (deleteError) {
        throw new Error(
          `The Plan of Action record could not be deleted: ${deleteError.message}`,
        );
      }

      setMessage(
        `${plan.scenario_name || plan.title} was permanently deleted.`,
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Plan of Action could not be deleted.",
      );
    } finally {
      setDeletingPlanId("");
    }
  }

  async function parsePlan(
    planOfActionId: string,
    successPrefix = "Plan of Action",
  ) {
    setParsingPlanId(planOfActionId);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/examiner/plan-of-action/parse",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planOfActionId,
          }),
        },
      );

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        scenarioName?: string;
        oralSections?: number;
        oralQuestions?: number;
        flightTasks?: number;
        draftQuestions?: number;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "The Plan of Action could not be parsed.",
        );
      }

      setMessage(
        `${successPrefix} is Scenario Ready: ${
          result.scenarioName ||
          "Generated scenario"
        } • ${
          result.oralSections ?? 0
        } oral sections • ${
          result.oralQuestions ?? 0
        } oral questions • ${
          result.flightTasks ?? 0
        } flight tasks • ${
          result.draftQuestions ?? 0
        } questions sent for review.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Plan of Action could not be parsed.",
      );
    } finally {
      setParsingPlanId("");
      await loadPage();
    }
  }

  async function uploadPlan(
    testType: PracticalTestType,
    file: File,
  ) {
    setUploadingTestId(testType.id);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "You must be signed in as an examiner.",
      );
      setUploadingTestId("");
      return;
    }

    const safeFilename =
      sanitizeFilename(file.name) ||
      "plan-of-action";

    const title =
      file.name.replace(/\.[^.]+$/, "") ||
      "Plan of Action";

    const { data: inserted, error: insertError } =
      await supabase
        .from("examiner_plan_of_actions")
        .insert({
          examiner_profile_id: user.id,
          practical_test_type_id: testType.id,
          title,
          source_filename: file.name,
          source_mime_type:
            file.type || null,
          source_size_bytes: file.size,
          parse_status: "uploaded",
        })
        .select("id")
        .single();

    if (insertError || !inserted) {
      setErrorMessage(
        `The Plan of Action record could not be created: ${
          insertError?.message ??
          "Unknown database error."
        }`,
      );
      setUploadingTestId("");
      return;
    }

    const storagePath =
      `${user.id}/` +
      `${testType.id}/` +
      `${inserted.id}/` +
      `${safeFilename}`;

    const { error: uploadError } =
      await supabase.storage
        .from("examiner-poas")
        .upload(
          storagePath,
          file,
          {
            upsert: false,
            contentType:
              file.type ||
              "application/octet-stream",
          },
        );

    if (uploadError) {
      await supabase
        .from("examiner_plan_of_actions")
        .update({
          parse_status: "error",
          parse_error:
            `Upload failed: ${uploadError.message}`,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", inserted.id);

      setErrorMessage(
        `The POA file could not be uploaded: ${uploadError.message}`,
      );

      setUploadingTestId("");
      await loadPage();
      return;
    }

    const { error: updateError } =
      await supabase
        .from("examiner_plan_of_actions")
        .update({
          storage_path: storagePath,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", inserted.id);

    if (updateError) {
      setErrorMessage(
        `The upload completed, but its database path could not be saved: ${updateError.message}`,
      );

      setUploadingTestId("");
      await loadPage();
      return;
    }

    setMessage(
      `${file.name} was uploaded. Building the scenario…`,
    );

    setUploadingTestId("");

    await parsePlan(
      inserted.id,
      file.name,
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Examiner Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Plan of Action
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Manage Plans of Action for the
            practical tests you offer. Each uploaded
            POA will become a selectable Oral / Flight
            scenario after it is parsed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/examiner/plan-of-action/questions"
            className="inline-flex items-center rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
          >
            Question Library
          </Link>

          <Link
            href="/examiner/plan-of-action/questions/review"
            className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            Review Imported Questions
          </Link>

          <button
            type="button"
            onClick={() => void loadPage()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading offered practical tests…
        </div>
      ) : testTypes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="font-bold text-slate-900">
            No practical tests selected
          </h2>

          <p className="mt-2 text-slate-600">
            Select the tests you conduct under
            Settings → Practical Tests Offered.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {testTypes.map((testType) => {
            const testPlans =
              plansByTest.get(testType.id) ?? [];

            const readyCount =
              testPlans.filter(
                (plan) =>
                  plan.parse_status === "ready",
              ).length;

            const uploading =
              uploadingTestId === testType.id;

            return (
              <section
                key={testType.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {testType.display_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      {testType.certificate_name}
                      {" • "}
                      {testType.issuance_name}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {testPlans.length} POA
                      {testPlans.length === 1
                        ? ""
                        : "s"}{" "}
                      uploaded
                      {" • "}
                      {readyCount} scenario
                      {readyCount === 1
                        ? ""
                        : "s"}{" "}
                      ready
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="h-4 w-4" />
                      )}

                      {uploading
                        ? "Uploading…"
                        : "Upload POA"}

                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        onChange={(event) => {
                          const file =
                            event.target.files?.[0];

                          event.target.value = "";

                          if (file) {
                            void uploadPlan(
                              testType,
                              file,
                            );
                          }
                        }}
                      />
                    </label>

                    <Link
                      href={`/examiner/plan-of-action/generate?testTypeId=${encodeURIComponent(testType.id)}`}
                      className="inline-flex items-center justify-center rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
                    >
                      Generate POA
                    </Link>
                  </div>
                </div>

                <div className="p-6">
                  {testPlans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                      No Plan of Action has been
                      uploaded for this practical
                      test.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {testPlans.map(
                        (plan, index) => (
                          <div
                            key={plan.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-4"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <FileCheck2
                                className={`mt-0.5 h-5 w-5 shrink-0 ${
                                  plan.parse_status ===
                                  "ready"
                                    ? "text-emerald-600"
                                    : plan.parse_status ===
                                        "error"
                                      ? "text-red-600"
                                      : "text-amber-600"
                                }`}
                              />

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">
                                  Scenario{" "}
                                  {index + 1}
                                  {" — "}
                                  {plan.scenario_name ||
                                    plan.title}
                                </p>

                                <p className="mt-1 truncate text-sm text-slate-500">
                                  {
                                    plan.source_filename
                                  }
                                </p>

                                {plan.parse_error ? (
                                  <p className="mt-1 text-sm text-red-700">
                                    {
                                      plan.parse_error
                                    }
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {(plan.parse_status === "uploaded" ||
                                plan.parse_status === "error") ? (
                                <button
                                  type="button"
                                  disabled={
                                    parsingPlanId === plan.id ||
                                    deletingPlanId === plan.id
                                  }
                                  onClick={() =>
                                    void parsePlan(
                                      plan.id,
                                      plan.source_filename,
                                    )
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {parsingPlanId === plan.id
                                    ? "Parsing…"
                                    : "Parse / Reparse"}
                                </button>
                              ) : null}

                              <button
                                type="button"
                                disabled={
                                  deletingPlanId === plan.id ||
                                  parsingPlanId === plan.id
                                }
                                onClick={() =>
                                  void deletePlan(plan)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingPlanId === plan.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}

                                {deletingPlanId === plan.id
                                  ? "Deleting…"
                                  : "Delete"}
                              </button>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  parsingPlanId === plan.id ||
                                  plan.parse_status === "processing"
                                    ? "bg-sky-100 text-sky-800"
                                    : plan.parse_status ===
                                        "ready"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : plan.parse_status ===
                                          "error"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {parsingPlanId === plan.id
                                  ? "Processing"
                                  : statusLabel(plan)}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
