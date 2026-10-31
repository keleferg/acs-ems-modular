"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CONFIRMED_STATUSES,
  formatHst,
  loadStudentRequests,
  resultLabel,
  testName,
  type StudentRequest,
} from "@/lib/instructor/data";

// Reports (Kele, Oct 31 2026): the instructor's students' scheduled and completed tests and the outcome.

type Filter = "all" | "scheduled" | "completed";

function outcomeClasses(result: string | null) {
  if (result === "pass") return "bg-emerald-100 text-emerald-800";
  if (result === "fail") return "bg-red-100 text-red-800";
  if (result) return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-600";
}

export default function InstructorReportsPage() {
  const [requests, setRequests] = useState<StudentRequest[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    loadStudentRequests()
      .then(setRequests)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Your reports could not be loaded."));
  }, []);

  const rows = useMemo(() => {
    const tests = (requests ?? []).filter((request) => request.status === "completed" || request.test_result || (CONFIRMED_STATUSES.has(request.status) && request.scheduled_start_at));
    return tests
      .filter((request) => {
        const completed = request.status === "completed" || Boolean(request.test_result);
        return filter === "all" || (filter === "completed" ? completed : !completed);
      })
      .sort((a, b) => String(b.test_completed_at ?? b.completed_at ?? b.scheduled_start_at).localeCompare(String(a.test_completed_at ?? a.completed_at ?? a.scheduled_start_at)));
  }, [requests, filter]);

  const completed = (requests ?? []).filter((request) => request.test_result === "pass" || request.test_result === "fail");
  const passes = completed.filter((request) => request.test_result === "pass").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-slate-600">Your students&apos; scheduled and completed practical tests.</p>

      {requests ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Completed</p><p className="mt-2 text-3xl font-bold">{completed.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Passed</p><p className="mt-2 text-3xl font-bold text-emerald-700">{passes}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Pass rate</p><p className="mt-2 text-3xl font-bold">{completed.length ? `${Math.round((passes / completed.length) * 100)}%` : "—"}</p></div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", "scheduled", "completed"] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === option ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {option === "all" ? "All" : option === "scheduled" ? "Scheduled" : "Completed"}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {!requests && !error ? <p className="mt-6 text-slate-600">Loading…</p> : null}

      {requests ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3">Examiner</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.length ? (
                rows.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3 text-slate-700">{formatHst(request.test_completed_at ?? request.completed_at ?? request.scheduled_start_at)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{request.applicant_name}</td>
                    <td className="px-4 py-3 text-slate-700">{testName(request)}<span className="block text-xs text-slate-500">{request.request_number}</span></td>
                    <td className="px-4 py-3 text-slate-700">{request.examiner_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${outcomeClasses(request.test_result)}`}>
                        {request.test_result ? resultLabel(request.test_result) : request.status === "completed" ? "Completed" : "Scheduled"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No tests to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
