"use client";

import { useEffect, useMemo, useState } from "react";

import { loadStudentGrades, testName, type StudentGrade } from "@/lib/instructor/data";

// My Data (Kele, Oct 31 2026): the instructor's students' pass rates and, for one certificate or rating,
// the ACS tasks that are strongest and weakest on average. Grades are the examiner's 1–4 task grades
// (higher is stronger), averaged over Knowledge, Risk management and Skill.

type TestRow = { id: string; test: string; result: string | null; completedAt: string | null };
type TaskRow = { task: string; average: number; count: number; tests: number };

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function Bar({ label, value, max, display, tone = "sky", note }: { label: string; value: number; max: number; display: string; tone?: "sky" | "emerald" | "red" | "amber"; note?: string }) {
  const colours = { sky: "bg-sky-600", emerald: "bg-emerald-600", red: "bg-red-500", amber: "bg-amber-500" };
  return (
    <div className="grid grid-cols-[minmax(7rem,14rem)_1fr_4.5rem] items-center gap-3 text-sm">
      <span className="truncate text-slate-700" title={label}>{label}</span>
      <div className="h-5 rounded bg-slate-100">
        <div className={`h-5 rounded ${colours[tone]}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </div>
      <span className="text-right font-semibold tabular-nums text-slate-900">
        {display}
        {note ? <span className="block text-[11px] font-normal text-slate-500">{note}</span> : null}
      </span>
    </div>
  );
}

export default function InstructorDataPage() {
  const [grades, setGrades] = useState<StudentGrade[] | null>(null);
  const [error, setError] = useState("");
  const [selectedTest, setSelectedTest] = useState("");

  useEffect(() => {
    loadStudentGrades()
      .then(setGrades)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Your data could not be loaded."));
  }, []);

  const tests = useMemo(() => {
    const map = new Map<string, TestRow>();
    for (const row of grades ?? []) {
      if (!map.has(row.practical_test_id)) {
        map.set(row.practical_test_id, { id: row.practical_test_id, test: testName(row), result: row.result, completedAt: row.completed_at });
      }
    }
    return [...map.values()];
  }, [grades]);

  const byTest = useMemo(() => {
    const map = new Map<string, { passes: number; graded: number; total: number }>();
    for (const test of tests) {
      const entry = map.get(test.test) ?? { passes: 0, graded: 0, total: 0 };
      entry.total += 1;
      if (test.result === "pass" || test.result === "fail") entry.graded += 1;
      if (test.result === "pass") entry.passes += 1;
      map.set(test.test, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [tests]);

  const byYear = useMemo(() => {
    const map = new Map<string, { pass: number; fail: number }>();
    for (const test of tests) {
      if (!test.completedAt || (test.result !== "pass" && test.result !== "fail")) continue;
      const year = new Date(test.completedAt).getFullYear().toString();
      const entry = map.get(year) ?? { pass: 0, fail: 0 };
      entry[test.result] += 1;
      map.set(year, entry);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tests]);

  const activeTest = selectedTest || byTest[0]?.[0] || "";
  const tasks = useMemo(() => {
    const map = new Map<string, { values: number[]; tests: Set<string> }>();
    for (const row of grades ?? []) {
      if (testName(row) !== activeTest || !row.task_code) continue;
      const value = Number(row.grade_value);
      if (!Number.isFinite(value) || value < 1 || value > 4) continue;
      const entry = map.get(row.task_code) ?? { values: [], tests: new Set<string>() };
      entry.values.push(value);
      entry.tests.add(row.practical_test_id);
      map.set(row.task_code, entry);
    }
    return [...map.entries()]
      .map(([task, entry]) => ({ task, average: average(entry.values) ?? 0, count: entry.values.length, tests: entry.tests.size }) as TaskRow)
      .sort((a, b) => b.average - a.average || a.task.localeCompare(b.task));
  }, [grades, activeTest]);

  if (error) return <main className="mx-auto max-w-6xl px-6 py-10"><p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p></main>;
  if (!grades) return <main className="mx-auto max-w-6xl px-6 py-10 text-slate-600">Loading your data…</main>;

  const graded = tests.filter((test) => test.result === "pass" || test.result === "fail");
  const passRate = graded.length ? Math.round((graded.filter((test) => test.result === "pass").length / graded.length) * 100) : null;
  const strongest = tasks.slice(0, 5);
  const weakest = [...tasks].sort((a, b) => a.average - b.average || a.task.localeCompare(b.task)).slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">My Data</h1>
      <p className="mt-1 text-slate-600">How your students have done on their practical tests.</p>

      {tests.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No completed practical tests yet for students who listed your CFI certificate number.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Practical tests</p><p className="mt-2 text-3xl font-bold">{tests.length}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Overall pass rate</p><p className="mt-2 text-3xl font-bold">{passRate === null ? "—" : `${passRate}%`}</p><p className="text-xs text-slate-500">{graded.length} pass/fail results</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Certificates &amp; ratings</p><p className="mt-2 text-3xl font-bold">{byTest.length}</p></div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Pass rate by certificate or rating</h2>
              <div className="mt-4 space-y-3">
                {byTest.map(([name, entry]) => (
                  <Bar
                    key={name}
                    label={name}
                    value={entry.graded ? (entry.passes / entry.graded) * 100 : 0}
                    max={100}
                    display={entry.graded ? `${Math.round((entry.passes / entry.graded) * 100)}%` : "—"}
                    note={`${entry.passes}/${entry.graded}`}
                    tone="emerald"
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Pass and fail by year</h2>
              <div className="mt-4 space-y-3">
                {byYear.length ? (
                  byYear.map(([year, entry]) => {
                    const total = entry.pass + entry.fail;
                    return (
                      <div key={year} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3 text-sm">
                        <span className="text-slate-700">{year}</span>
                        <div className="flex h-5 overflow-hidden rounded bg-slate-100">
                          <div className="bg-emerald-600" style={{ width: `${(entry.pass / total) * 100}%` }} title={`${entry.pass} passed`} />
                          <div className="bg-red-500" style={{ width: `${(entry.fail / total) * 100}%` }} title={`${entry.fail} failed`} />
                        </div>
                        <span className="text-right text-xs text-slate-600">{entry.pass} pass · {entry.fail} fail</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-600">No pass/fail results yet.</p>
                )}
              </div>
              <p className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Pass</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> Fail</span>
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Strong and weak tasks</h2>
                <p className="text-sm text-slate-600">Average examiner grade per ACS task, 1–4 (higher is stronger), across all your students.</p>
              </div>
              <select value={activeTest} onChange={(event) => setSelectedTest(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                {byTest.map(([name]) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {tasks.length ? (
              <>
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700">Strongest</h3>
                    <div className="mt-3 space-y-2">
                      {strongest.map((task) => <Bar key={task.task} label={task.task} value={task.average} max={4} display={task.average.toFixed(2)} note={`${task.tests} test${task.tests === 1 ? "" : "s"}`} tone="emerald" />)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-red-700">Weakest</h3>
                    <div className="mt-3 space-y-2">
                      {weakest.map((task) => <Bar key={task.task} label={task.task} value={task.average} max={4} display={task.average.toFixed(2)} note={`${task.tests} test${task.tests === 1 ? "" : "s"}`} tone="red" />)}
                    </div>
                  </div>
                </div>
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-semibold text-sky-700">All {tasks.length} tasks</summary>
                  <div className="mt-3 space-y-2">
                    {tasks.map((task) => <Bar key={task.task} label={task.task} value={task.average} max={4} display={task.average.toFixed(2)} tone={task.average < 2.5 ? "amber" : "sky"} />)}
                  </div>
                </details>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-600">No task grades recorded for this certificate or rating yet.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
