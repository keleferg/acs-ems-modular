"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  CLOSED_STATUSES,
  CONFIRMED_STATUSES,
  formatHst,
  hstDateKey,
  loadStudentRequests,
  qualificationLabel,
  requestStatusClasses,
  requestStatusLabel,
  testName,
  type StudentRequest,
} from "@/lib/instructor/data";

// Instructor dashboard (Kele, Oct 31 2026): students' checkride requests and a calendar of confirmed checkrides.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function InstructorDashboardPage() {
  const [requests, setRequests] = useState<StudentRequest[] | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => monthStart(new Date()));

  useEffect(() => {
    loadStudentRequests()
      .then(setRequests)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Your students' requests could not be loaded."));
  }, []);

  const confirmed = useMemo(
    () =>
      (requests ?? [])
        .filter((request) => CONFIRMED_STATUSES.has(request.status) && request.scheduled_start_at)
        .sort((a, b) => String(a.scheduled_start_at).localeCompare(String(b.scheduled_start_at))),
    [requests],
  );
  const upcoming = confirmed.filter((request) => new Date(String(request.scheduled_start_at)).getTime() >= Date.now() - 12 * 3600 * 1000);
  const byDay = useMemo(() => {
    const map = new Map<string, StudentRequest[]>();
    for (const request of confirmed) {
      const key = hstDateKey(String(request.scheduled_start_at));
      map.set(key, [...(map.get(key) ?? []), request]);
    }
    return map;
  }, [confirmed]);

  if (error) return <main className="mx-auto max-w-6xl px-6 py-10"><p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p></main>;
  if (!requests) return <main className="mx-auto max-w-6xl px-6 py-10 text-slate-600">Loading your dashboard…</main>;

  const active = requests.filter((request) => !CLOSED_STATUSES.has(request.status));
  const awaitingReview = requests.filter((request) => request.wizard_status === "awaiting_instructor");
  const results = requests.filter((request) => request.test_result === "pass" || request.test_result === "fail");
  const passRate = results.length ? Math.round((results.filter((request) => request.test_result === "pass").length / results.length) * 100) : null;
  const students = new Set(requests.map((request) => (request.applicant_name ?? "").trim().toLowerCase()).filter(Boolean));

  const first = monthStart(month);
  const cells: Array<Date | null> = [...Array(first.getDay()).fill(null)];
  for (let day = 1; day <= new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length % 7) cells.push(null);
  const todayKey = hstDateKey(new Date().toISOString());

  const stat = (label: string, value: string | number, note?: string) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-600">Students who listed your CFI certificate number on a checkride request.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Students", students.size)}
        {stat("Active requests", active.length)}
        {stat("Waiting for your review", awaitingReview.length, "Qualification packages to validate")}
        {stat("Pass rate", passRate === null ? "—" : `${passRate}%`, `${results.length} completed test${results.length === 1 ? "" : "s"}`)}
      </div>

      {awaitingReview.length ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">Qualification packages waiting for your review</h2>
          <ul className="mt-3 space-y-1 text-sm text-amber-950">
            {awaitingReview.map((request) => (
              <li key={request.id}>
                <strong>{request.applicant_name}</strong> — {testName(request)} ({request.request_number})
              </li>
            ))}
          </ul>
          <Link href="/instructor/requests" className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            Go to My Student&apos;s Requests
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Confirmed checkrides</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50" aria-label="Previous month">‹</button>
              <span className="w-36 text-center text-sm font-semibold text-slate-800">
                {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50" aria-label="Next month">›</button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) return <div key={`blank-${index}`} className="min-h-20 rounded-lg bg-slate-50/50" />;
              const key = dateKey(cell);
              const items = byDay.get(key) ?? [];
              return (
                <div key={key} className={`min-h-20 rounded-lg border p-1 text-left ${key === todayKey ? "border-sky-400 bg-sky-50" : "border-slate-200"}`}>
                  <div className="text-xs font-semibold text-slate-500">{cell.getDate()}</div>
                  {items.map((request) => (
                    <div key={request.id} className="mt-0.5 truncate rounded bg-emerald-100 px-1 text-[11px] font-semibold text-emerald-900" title={`${request.applicant_name} — ${testName(request)} — ${formatHst(request.scheduled_start_at, true)}`}>
                      {new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", hour: "numeric", minute: "2-digit" }).format(new Date(String(request.scheduled_start_at)))} {request.applicant_name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Upcoming confirmed checkrides</h2>
          {upcoming.length ? (
            <ul className="mt-3 divide-y divide-slate-200">
              {upcoming.map((request) => (
                <li key={request.id} className="py-3">
                  <p className="font-semibold text-slate-900">{request.applicant_name}</p>
                  <p className="text-sm text-slate-700">{testName(request)}</p>
                  <p className="text-sm text-slate-600">
                    {formatHst(request.scheduled_start_at, true)}
                    {request.scheduled_location ? ` · ${request.scheduled_location}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">Examiner: {request.examiner_name ?? "—"} · Qualification: {qualificationLabel(request.wizard_status)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No confirmed checkrides coming up.</p>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent checkride requests</h2>
          <Link href="/instructor/requests" className="text-sm font-semibold text-sky-700 hover:underline">See all</Link>
        </div>
        {requests.length ? (
          <ul className="mt-3 divide-y divide-slate-200">
            {requests.slice(0, 8).map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{request.applicant_name}</p>
                  <p className="text-sm text-slate-600">{testName(request)} · {request.request_number} · submitted {formatHst(request.submitted_at)}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${requestStatusClasses(request.status)}`}>{requestStatusLabel(request.status)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No requests yet. Students appear here when they enter your CFI certificate number as their recommending instructor.
          </p>
        )}
      </section>
    </main>
  );
}
