"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/*
 * Stage Check Records (Kele, Nov 14 2026): every stage check the signed-in instructor gave in EMT.
 * EMT saves a record (and the Stage Check Summary Report PDF) when the instructor saves, prints or
 * emails the report. Read-only here: stage_checks is EMT-owned (BOUNDARY.md); row security limits
 * the list to the instructor's own stage checks.
 */

type StageCheckRow = {
  id: string;
  stage_check_number: string;
  stage_check_type: string;
  student_name: string;
  instructor_name: string;
  flight_school_name: string;
  aircraft_type: string;
  tail_number: string;
  stage_check_date: string;
  ground_duration: string;
  flight_duration: string;
  readiness: string;
  notes: string | null;
  report_path: string | null;
  submitted_at: string;
  evaluation_state: {
    stage_check_label?: string;
    phase_of_training?: string;
    readiness_label?: string;
    recommending_instructor_email?: string;
  } | null;
};

const READINESS: Record<string, string> = {
  ready: "Ready for the checkride",
  ready_with_review: "Ready after review",
  not_ready: "Not ready",
};

function readinessClasses(readiness: string) {
  if (readiness === "ready") return "bg-emerald-100 text-emerald-800";
  if (readiness === "not_ready") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

function formatDate(value: string) {
  const [y, m, d] = String(value ?? "").split("-").map(Number);
  if (!y || !m || !d) return value || "—";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function InstructorStageChecksPage() {
  const [rows, setRows] = useState<StageCheckRow[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("stage_checks")
      .select(
        "id,stage_check_number,stage_check_type,student_name,instructor_name,flight_school_name,aircraft_type,tail_number,stage_check_date,ground_duration,flight_duration,readiness,notes,report_path,submitted_at,evaluation_state",
      )
      .order("stage_check_date", { ascending: false })
      .order("submitted_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (loadError) setError("Your stage checks could not be loaded.");
        else setRows((data ?? []) as StageCheckRow[]);
      });
  }, []);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows ?? [];
    return (rows ?? []).filter((row) =>
      [row.student_name, row.stage_check_number, row.flight_school_name, row.tail_number, row.evaluation_state?.stage_check_label, row.instructor_name]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      total: list.length,
      ready: list.filter((row) => row.readiness === "ready").length,
      notReady: list.filter((row) => row.readiness === "not_ready").length,
    };
  }, [rows]);

  async function openReport(row: StageCheckRow) {
    if (!row.report_path) return;
    setOpening(row.id);
    const { data, error: urlError } = await createClient().storage.from("stage-check-reports").createSignedUrl(row.report_path, 300);
    setOpening("");
    if (urlError || !data?.signedUrl) {
      setError("The report could not be opened. Try again.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Stage Check Records</h1>
      <p className="mt-1 text-slate-600">Every stage check you gave in the EMT gradesheet, newest first.</p>

      {rows ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Stage checks</p><p className="mt-2 text-3xl font-bold">{counts.total}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Ready</p><p className="mt-2 text-3xl font-bold text-emerald-700">{counts.ready}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Not ready</p><p className="mt-2 text-3xl font-bold text-red-700">{counts.notReady}</p></div>
        </div>
      ) : null}

      <div className="mt-6">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by student, school, tail number or SC number"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base sm:max-w-md"
        />
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {!rows && !error ? <p className="mt-6 text-slate-600">Loading…</p> : null}

      {rows ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Stage check</th>
                <th className="px-4 py-3">Flight school / Aircraft</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shown.length ? (
                shown.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(row.stage_check_date)}
                      <span className="block text-xs text-slate-500">{row.stage_check_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{row.student_name}</span>
                      <span className="block text-xs text-slate-500">Recommending: {row.instructor_name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.evaluation_state?.stage_check_label || row.stage_check_type}
                      {row.evaluation_state?.phase_of_training ? <span className="block text-xs text-slate-500">{row.evaluation_state.phase_of_training}</span> : null}
                      <span className="block text-xs text-slate-500">Ground {row.ground_duration} · Flight {row.flight_duration}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.flight_school_name}
                      <span className="block text-xs text-slate-500">{[row.aircraft_type, row.tail_number].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${readinessClasses(row.readiness)}`}>
                        {row.evaluation_state?.readiness_label || READINESS[row.readiness] || row.readiness}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.report_path ? (
                        <button
                          type="button"
                          onClick={() => openReport(row)}
                          disabled={opening === row.id}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {opening === row.id ? "Opening…" : "Open PDF"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">No PDF</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    {rows.length ? "No stage checks match your search." : "No stage checks yet. They appear here when you save, print or email a Stage Check Summary Report in EMT."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
