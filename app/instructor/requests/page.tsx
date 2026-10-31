"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CLOSED_STATUSES,
  formatHst,
  loadStudentRequests,
  qualificationLabel,
  requestStatusClasses,
  requestStatusLabel,
  resultLabel,
  testName,
  type StudentRequest,
} from "@/lib/instructor/data";

// My Student's Requests (Kele, Oct 31 2026): every request that lists the instructor's CFI certificate
// number, its status and examiner, and "Validate Qualification Review" for packages waiting for them.

type Filter = "active" | "all" | "closed";

export default function InstructorRequestsPage() {
  const [requests, setRequests] = useState<StudentRequest[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    loadStudentRequests()
      .then(setRequests)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Your students' requests could not be loaded."));
  }, []);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (requests ?? []).filter((request) => {
      const closed = CLOSED_STATUSES.has(request.status);
      if (filter === "active" && closed) return false;
      if (filter === "closed" && !closed) return false;
      if (!term) return true;
      return [request.applicant_name, request.request_number, request.certificate_sought, request.rating_sought, request.examiner_name]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [requests, filter, search]);

  async function openReview(request: StudentRequest) {
    if (!request.wizard_id) return;
    setOpening(request.id);
    setError("");
    try {
      const response = await fetch("/api/qualification/instructor-portal-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wizardId: request.wizard_id }),
      });
      const result = (await response.json()) as { ok: boolean; url?: string; error?: string };
      if (!result.ok || !result.url) throw new Error(result.error ?? "The review could not be opened.");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be opened.");
      setOpening(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">My Student&apos;s Requests</h1>
      <p className="mt-1 text-slate-600">
        Checkride requests that list your CFI certificate number as the recommending instructor. When a student submits their
        qualification review, validate it here before it goes to the examiner.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {(["active", "all", "closed"] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === option ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {option === "active" ? "Active" : option === "all" ? "All" : "Completed / closed"}
          </button>
        ))}
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search student, request, examiner…"
          className="ml-auto w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-72"
        />
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {!requests && !error ? <p className="mt-6 text-slate-600">Loading…</p> : null}

      {requests && shown.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          {requests.length ? "No requests match." : "No requests yet. Students appear here when they enter your CFI certificate number on a checkride request."}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {shown.map((request) => {
          const waiting = request.wizard_status === "awaiting_instructor";
          return (
            <article key={request.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${waiting ? "border-amber-300" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{request.applicant_name ?? "Student"}</h2>
                  <p className="text-sm text-slate-700">{testName(request)} · {request.request_number}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusClasses(request.status)}`}>{requestStatusLabel(request.status)}</span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Examiner</dt><dd className="mt-0.5 text-slate-900">{request.examiner_name ?? "Not assigned yet"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Submitted</dt><dd className="mt-0.5 text-slate-900">{formatHst(request.submitted_at)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Checkride</dt><dd className="mt-0.5 text-slate-900">{formatHst(request.scheduled_start_at, true)}{request.scheduled_location ? ` · ${request.scheduled_location}` : ""}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Qualification review</dt><dd className={`mt-0.5 ${waiting ? "font-semibold text-amber-800" : "text-slate-900"}`}>{qualificationLabel(request.wizard_status)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Outcome</dt><dd className="mt-0.5 text-slate-900">{resultLabel(request.test_result)}</dd></div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!waiting || opening === request.id}
                  onClick={() => void openReview(request)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${waiting ? "bg-amber-600 text-white hover:bg-amber-700" : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"}`}
                >
                  {opening === request.id ? "Opening…" : "Validate Qualification Review"}
                </button>
                {!waiting ? (
                  <span className="text-xs text-slate-500">
                    {request.wizard_status === "instructor_certified" || request.wizard_status === "examiner_review" || request.wizard_status === "accepted"
                      ? "Already reviewed."
                      : "Available when the student submits their qualification review."}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
