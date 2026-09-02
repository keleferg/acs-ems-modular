"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PpcTypeRatingQuestionPanel from "@/components/poa/ppc-type-rating-question-panel";

type GradeValue = "S" | "U" | "W" | "";

type PpcTask = {
  id: string;
  section_name: string;
  task_number: number;
  task_name: string;
  waiver_allowed: boolean;
  applicability_rule:
    | "all"
    | "helicopter"
    | "single_engine_helicopter";
  sort_order: number;
  grade_value: GradeValue | null;
  remarks: string | null;
};

type PpcTaskSet = {
  id: string;
  code: string;
  name: string;
  faa_form_number: string;
  faa_form_revision: string;
};

type EvaluationPayload = {
  practical_test_request_id: string;
  practical_test_id: string | null;
  certificate_code:
    | "PILOT_PPC_6158"
    | "FLIGHT_ENGINEER_PPC_91529";
  evaluation_status: "draft" | "completed" | "finalized";
  result: string | null;
  approved_status: "Approved" | "Disapproved" | null;
  started_at: string | null;
  aircraft_used: string | null;
  aircraft_configuration:
    | "airplane"
    | "helicopter_single"
    | "helicopter_multi"
    | null;
  examiner_notes: string | null;
  task_set: PpcTaskSet;
  tasks: PpcTask[];
};

type SaveResult = {
  practical_test_id: string;
  task_count: number;
  graded_count: number;
  unsatisfactory_count: number;
  evaluation_status: string;
  result: string | null;
  approved_status: "Approved" | "Disapproved" | null;
  saved_at: string;
};

type EditableTask = PpcTask & {
  grade_value: GradeValue;
  remarks: string;
};

const GRADE_LABELS: Record<Exclude<GradeValue, "">, string> = {
  S: "Satisfactory",
  U: "Unsatisfactory",
  W: "Waiver",
};

function formatSavedTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function PpcEvaluationClient() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId;

  const supabase = useMemo(() => createClient(), []);

  const [payload, setPayload] = useState<EvaluationPayload | null>(null);
  const [tasks, setTasks] = useState<EditableTask[]>([]);

  const [aircraftUsed, setAircraftUsed] = useState("");
  const [aircraftConfiguration, setAircraftConfiguration] =
    useState<
      "airplane" | "helicopter_single" | "helicopter_multi"
    >("airplane");
  const [examinerNotes, setExaminerNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);


  useEffect(() => {
    if (!payload?.aircraft_configuration) {
      return;
    }

    setAircraftConfiguration(
      payload.aircraft_configuration,
    );
  }, [payload?.aircraft_configuration]);

  const loadEvaluation = useCallback(async () => {
    if (!requestId) return;

    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase.rpc(
      "examiner_get_ppc_evaluation",
      {
        p_practical_test_request_id: requestId,
      },
    );

    if (loadError) {
      console.error(loadError);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const next = data as EvaluationPayload;

    setPayload(next);

    setTasks(
      (next.tasks ?? []).map((task) => ({
        ...task,
        grade_value: task.grade_value ?? "",
        remarks: task.remarks ?? "",
      })),
    );

    setAircraftUsed(next.aircraft_used ?? "");
    setExaminerNotes(next.examiner_notes ?? "");

    loadedRef.current = true;
    dirtyRef.current = false;

    setLoading(false);
  }, [requestId, supabase]);

  useEffect(() => {
    void loadEvaluation();
  }, [loadEvaluation]);

  const sections = useMemo(() => {
    const map = new Map<string, EditableTask[]>();

    for (const task of tasks) {
      const existing = map.get(task.section_name) ?? [];
      existing.push(task);
      map.set(task.section_name, existing);
    }

    return Array.from(map.entries());
  }, [tasks]);

  const gradedCount = useMemo(
    () => tasks.filter((task) => task.grade_value !== "").length,
    [tasks],
  );

  const unsatisfactoryCount = useMemo(
    () => tasks.filter((task) => task.grade_value === "U").length,
    [tasks],
  );

  const waiverCount = useMemo(
    () => tasks.filter((task) => task.grade_value === "W").length,
    [tasks],
  );

  const allGraded =
    tasks.length > 0 &&
    gradedCount === tasks.length;

  const previewResult =
    allGraded
      ? unsatisfactoryCount > 0
        ? "Disapproved"
        : "Approved"
      : null;

  const isFinalized =
    payload?.evaluation_status === "finalized";

  function serializedGrades() {
    return tasks
      .filter((task) => task.grade_value !== "")
      .map((task) => ({
        ppc_task_id: task.id,
        grade_value: task.grade_value,
        remarks: task.remarks.trim() || null,
      }));
  }

  const saveEvaluation = useCallback(
    async (finalize = false) => {
      if (!requestId || !loadedRef.current) {
        return null;
      }

      if (finalize && tasks.some((task) => !task.grade_value)) {
        setError(
          `All ${tasks.length} tasks must be graded before finalizing.`,
        );
        return null;
      }

      setError("");
      setMessage("");

      if (finalize) {
        setFinalizing(true);
      } else {
        setSaving(true);
      }

      const { data, error: saveError } = await supabase.rpc(
        "examiner_save_ppc_evaluation",
        {
          p_practical_test_request_id: requestId,
          p_grades: serializedGrades(),
          p_finalize: finalize,
          p_started_at: payload?.started_at ?? null,
          p_aircraft_used: aircraftUsed.trim() || null,
          p_examiner_notes: examinerNotes.trim() || null,
          p_aircraft_configuration:
            payload?.certificate_code === "PILOT_PPC_6158"
              ? aircraftConfiguration
              : null,
        },
      );

      if (saveError) {
        console.error(saveError);
        setError(saveError.message);

        setSaving(false);
        setFinalizing(false);

        return null;
      }

      const result = data as SaveResult;

      dirtyRef.current = false;
      setLastSavedAt(result.saved_at);

      setPayload((current) =>
        current
          ? {
              ...current,
              practical_test_id:
                result.practical_test_id ??
                current.practical_test_id,
              evaluation_status:
                result.evaluation_status as
                  | "draft"
                  | "completed"
                  | "finalized",
              result: result.result,
              approved_status: result.approved_status,
              aircraft_used: aircraftUsed,
              examiner_notes: examinerNotes,
            }
          : current,
      );

      if (finalize) {
        setMessage(
          `PPC finalized — ${result.approved_status}.`,
        );
      } else {
        setMessage("Evaluation saved.");
      }

      setSaving(false);
      setFinalizing(false);

      return result;
    },
    [
      aircraftUsed,
      examinerNotes,
      payload?.started_at,
      requestId,
      supabase,
      tasks,
    ],
  );

  useEffect(() => {
    if (!loadedRef.current || !dirtyRef.current || isFinalized) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveEvaluation(false);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    tasks,
    aircraftUsed,
    examinerNotes,
    isFinalized,
    saveEvaluation,
  ]);

  function setGrade(taskId: string, grade: GradeValue) {
    if (isFinalized) return;

    dirtyRef.current = true;

    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        if (grade === "W" && !task.waiver_allowed) {
          return task;
        }

        return {
          ...task,
          grade_value:
            task.grade_value === grade
              ? ""
              : grade,
        };
      }),
    );
  }

  function setRemarks(taskId: string, remarks: string) {
    if (isFinalized) return;

    dirtyRef.current = true;

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              remarks,
            }
          : task,
      ),
    );
  }

  function setAircraft(value: string) {
    if (isFinalized) return;
    dirtyRef.current = true;
    setAircraftUsed(value);
  }

  function setNotes(value: string) {
    if (isFinalized) return;
    dirtyRef.current = true;
    setExaminerNotes(value);
  }

  async function finalizeEvaluation() {
    if (!allGraded) {
      setError(
        `Grade all ${tasks.length} tasks before finalizing the PPC.`,
      );
      return;
    }

    const expected =
      unsatisfactoryCount > 0
        ? "Disapproved"
        : "Approved";

    const confirmed = window.confirm(
      `Finalize this PPC as ${expected}?\n\n` +
        "Once finalized, this grading screen will become read-only.",
    );

    if (!confirmed) return;

    await saveEvaluation(true);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          Loading FAA Form 8410-1 proficiency check…
        </div>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900">
          <div className="font-semibold">
            Unable to open PPC evaluation
          </div>

          <div className="mt-2 text-sm">
            {error}
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-5 rounded-lg border bg-white px-4 py-2 font-medium"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  if (!payload) return null;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">

        {payload?.certificate_code === "PILOT_PPC_6158" ? (
          <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_280px] md:items-end">
              <div>
                <h2 className="font-bold text-blue-950">
                  Pilot PPC Aircraft Configuration
                </h2>

                <p className="mt-1 text-sm text-blue-800">
                  Select the aircraft configuration so only the
                  applicable FAA Form 8410-1 Pilot tasks are shown.
                </p>
              </div>

              <div>
                <label
                  htmlFor="ppc-aircraft-configuration"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-blue-900"
                >
                  Aircraft Configuration
                </label>

                <select
                  id="ppc-aircraft-configuration"
                  value={aircraftConfiguration}
                  disabled={
                    isFinalized ||
                    saving ||
                    finalizing
                  }
                  onChange={async (event) => {
                    const next =
                      event.target.value as
                        | "airplane"
                        | "helicopter_single"
                        | "helicopter_multi";

                    setAircraftConfiguration(next);

                    setSaving(true);
                    setError("");
                    setMessage("");

                    const {
                      error: configurationError,
                    } = await supabase.rpc(
                      "examiner_save_ppc_evaluation",
                      {
                        p_practical_test_request_id:
                          requestId,
                        p_grades:
                          serializedGrades(),
                        p_finalize: false,
                        p_started_at:
                          payload?.started_at ??
                          null,
                        p_aircraft_used:
                          aircraftUsed.trim() ||
                          null,
                        p_examiner_notes:
                          examinerNotes.trim() ||
                          null,
                        p_aircraft_configuration:
                          next,
                      },
                    );

                    if (configurationError) {
                      console.error(
                        configurationError,
                      );

                      setError(
                        configurationError.message,
                      );

                      setSaving(false);

                      return;
                    }

                    dirtyRef.current = false;
                    setSaving(false);

                    await loadEvaluation();
                  }}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="airplane">
                    Airplane
                  </option>

                  <option value="helicopter_single">
                    Helicopter — Single Engine
                  </option>

                  <option value="helicopter_multi">
                    Helicopter — Multi Engine
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                {aircraftConfiguration === "airplane"
                  ? "Pilot Tasks 1–29"
                  : aircraftConfiguration ===
                      "helicopter_multi"
                    ? "Pilot Tasks 1–31"
                    : "Pilot Tasks 1–32"}
              </span>

              <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800">
                Flight Engineer tasks omitted
              </span>
            </div>
          </section>
        ) : payload?.certificate_code ===
          "FLIGHT_ENGINEER_PPC_91529" ? (
          <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-bold text-blue-950">
              Flight Engineer Proficiency Check
            </h2>

            <p className="mt-1 text-sm text-blue-800">
              FAA Form 8410-1 Flight Engineer Tasks
              1–22 only. Pilot tasks are omitted.
            </p>
          </section>
        ) : null}


      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          ← Back
        </button>

        <div className="text-right text-sm text-slate-500">
          {saving ? (
            <span>Saving…</span>
          ) : lastSavedAt ? (
            <span>
              Saved {formatSavedTime(lastSavedAt)}
            </span>
          ) : null}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b bg-slate-950 px-5 py-5 text-white md:px-7">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            FAA Form {payload.task_set.faa_form_number}
          </div>

          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            {payload.task_set.name}
          </h1>

          <div className="mt-2 text-sm text-slate-300">
            Revision {payload.task_set.faa_form_revision}
          </div>
        </div>

        <div className="grid gap-4 border-b p-5 md:grid-cols-3 md:p-7">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Progress
            </div>

            <div className="mt-1 text-2xl font-bold">
              {gradedCount} / {tasks.length}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unsatisfactory
            </div>

            <div className="mt-1 text-2xl font-bold">
              {unsatisfactoryCount}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Waived
            </div>

            <div className="mt-1 text-2xl font-bold">
              {waiverCount}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b p-5 md:grid-cols-2 md:p-7">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Aircraft / Simulator Used
            </span>

            <input
              value={aircraftUsed}
              disabled={isFinalized}
              onChange={(event) =>
                setAircraft(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2.5 disabled:bg-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Examiner Notes
            </span>

            <input
              value={examinerNotes}
              disabled={isFinalized}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2.5 disabled:bg-slate-100"
            />
          </label>
        </div>

        <div className="p-4 md:p-7">
          {sections.map(([sectionName, sectionTasks]) => (
            <section
              key={sectionName}
              className="mb-7 overflow-hidden rounded-xl border last:mb-0"
            >
              <div className="border-b bg-slate-100 px-4 py-3">
                <h2 className="font-bold uppercase tracking-wide text-slate-800">
                  {sectionName}
                </h2>
              </div>

              <div className="divide-y">
                {sectionTasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid gap-4 p-4 lg:grid-cols-[minmax(280px,1fr)_270px_minmax(240px,0.8fr)] lg:items-center"
                  >
                    <div>
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {task.task_number}
                        </div>

                        <div>
                          <div className="font-semibold text-slate-900">
                            {task.task_name}
                          </div>

                          {task.waiver_allowed ? (
                            <div className="mt-1 text-xs font-medium text-amber-700">
                              FAA waiver permitted
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(["S", "U", "W"] as const).map(
                        (grade) => {
                          const disabled =
                            isFinalized ||
                            (grade === "W" &&
                              !task.waiver_allowed);

                          const selected =
                            task.grade_value === grade;

                          return (
                            <button
                              key={grade}
                              type="button"
                              disabled={disabled}
                              title={
                                grade === "W" &&
                                !task.waiver_allowed
                                  ? "Waiver is not authorized for this task."
                                  : GRADE_LABELS[grade]
                              }
                              onClick={() =>
                                setGrade(task.id, grade)
                              }
                              className={[
                                "rounded-lg border px-3 py-2.5 text-sm font-bold transition",
                                selected
                                  ? grade === "S"
                                    ? "border-green-700 bg-green-700 text-white"
                                    : grade === "U"
                                      ? "border-red-700 bg-red-700 text-white"
                                      : "border-amber-600 bg-amber-500 text-black"
                                  : "bg-white text-slate-700",
                                disabled
                                  ? "cursor-not-allowed opacity-30"
                                  : "hover:bg-slate-50",
                              ].join(" ")}
                            >
                              {grade}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <input
                      value={task.remarks}
                      disabled={isFinalized}
                      onChange={(event) =>
                        setRemarks(
                          task.id,
                          event.target.value,
                        )
                      }
                      placeholder="Remarks"
                      className="w-full rounded-lg border px-3 py-2.5 text-sm disabled:bg-slate-100"
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="sticky bottom-0 mt-5 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur md:p-5">
        {error ? (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
            {message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">
              Current result
            </div>

            <div
              className={[
                "text-xl font-bold",
                previewResult === "Approved"
                  ? "text-green-700"
                  : previewResult === "Disapproved"
                    ? "text-red-700"
                    : "text-slate-700",
              ].join(" ")}
            >
              {payload.approved_status ??
                previewResult ??
                "Complete all tasks"}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isFinalized ? (
              <>
                <button
                  type="button"
                  disabled={saving || finalizing}
                  onClick={() =>
                    void saveEvaluation(false)
                  }
                  className="rounded-lg border bg-white px-5 py-2.5 font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  type="button"
                  disabled={
                    !allGraded ||
                    saving ||
                    finalizing
                  }
                  onClick={() =>
                    void finalizeEvaluation()
                  }
                  className="rounded-lg bg-slate-950 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {finalizing
                    ? "Finalizing…"
                    : previewResult
                      ? `Finalize — ${previewResult}`
                      : "Finalize PPC"}
                </button>
              </>
            ) : (
              <div className="rounded-lg bg-slate-100 px-5 py-2.5 font-semibold text-slate-700">
                PPC Finalized
              </div>
            )}
          </div>
        </div>
      </section>
    
        {isFinalized ? (
          <section className="mb-6 rounded-xl border border-green-300 bg-green-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-green-950">
                  PPC Evaluation Complete
                </h2>

                <p className="mt-1 text-sm text-green-800">
                  Prepare the official FAA Form 8410-1,
                  review the completed form, and capture
                  the examiner signature.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/examiner/ppc/${requestId}/8410-1`,
                  )
                }
                className="shrink-0 rounded-lg bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800"
              >
                Review & Sign FAA 8410-1
              </button>
            </div>
          </section>
        ) : null}

      <PpcTypeRatingQuestionPanel requestId={requestId} />

</main>
  );
}
