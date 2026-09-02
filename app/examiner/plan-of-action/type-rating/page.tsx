"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TestType = {
  id: string;
  display_name: string;
};

type Aircraft = {
  id: string;
  type_certificate_holder: string | null;
  civil_model_designation: string | null;
  faa_type_rating_designations:
    | { designation: string }
    | { designation: string }[]
    | null;
};

type Question = {
  id: string;
  acs_reference: string;
  question: string;
  reference: string | null;
  task_name: string | null;
  is_type_specific: boolean;
};

function designationOf(row: Aircraft) {
  const value = row.faa_type_rating_designations;
  if (Array.isArray(value)) return value[0]?.designation ?? "";
  return value?.designation ?? "";
}

export default function TypeRatingPoaPage() {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [testTypeId, setTestTypeId] = useState("");
  const [aircraftId, setAircraftId] = useState("");
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const [testResult, aircraftResult] = await Promise.all([
        supabase
          .from("practical_test_types")
          .select("id, display_name")
          .eq("is_active", true)
          .eq("is_offered", true)
          .order("sort_order"),
        supabase
          .from("faa_type_rating_aircraft")
          .select(`
            id,
            type_certificate_holder,
            civil_model_designation,
            faa_type_rating_designations!inner (
              designation
            )
          `)
          .order("sort_order"),
      ]);

      if (cancelled) return;

      if (testResult.error) setError(testResult.error.message);
      else setTestTypes((testResult.data ?? []) as TestType[]);

      if (aircraftResult.error) setError(aircraftResult.error.message);
      else setAircraft((aircraftResult.data ?? []) as Aircraft[]);

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAircraft = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aircraft;

    return aircraft.filter((row) =>
      [
        designationOf(row),
        row.type_certificate_holder ?? "",
        row.civil_model_designation ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [aircraft, search]);

  async function loadQuestions(
    nextAircraftId = aircraftId,
    nextTestTypeId = testTypeId,
  ) {
    if (!nextAircraftId || !nextTestTypeId) {
      setQuestions([]);
      setSelected([]);
      return;
    }

    setQuestionsLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { data, error: loadError } = await supabase.rpc(
      "examiner_get_type_rating_poa_questions",
      {
        p_type_rating_aircraft_id: nextAircraftId,
        p_practical_test_type_id: nextTestTypeId,
      },
    );

    if (loadError) {
      setError(loadError.message);
      setQuestions([]);
    } else {
      setQuestions((data ?? []) as Question[]);
      setSelected([]);
    }

    setQuestionsLoading(false);
  }

  async function createPoa() {
    if (!testTypeId || !aircraftId || selected.length === 0) return;

    setCreating(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: createError } = await supabase.rpc(
      "examiner_create_type_rating_poa",
      {
        p_type_rating_aircraft_id: aircraftId,
        p_practical_test_type_id: testTypeId,
        p_question_ids: selected,
        p_title: title.trim() || null,
      },
    );

    if (createError) setError(createError.message);
    else setMessage("Type-rating Plan of Action created.");

    setCreating(false);
  }

  const groups = useMemo(() => {
    const map = new Map<string, Question[]>();

    for (const q of questions) {
      const key = q.acs_reference || "Unassigned ACS";
      map.set(key, [...(map.get(key) ?? []), q]);
    }

    return [...map.entries()];
  }, [questions]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            Plan of Action
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Type Rating POA
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Select the practical test and FAA type-rated aircraft. The library
            will include questions assigned to that type rating, organized by
            ACS code.
          </p>
        </div>

        <Link
          href="/examiner/plan-of-action/questions"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Question Library
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        {loading ? (
          <p className="text-slate-500">Loading type-rating data…</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Practical Test *
              </span>

              <select
                value={testTypeId}
                onChange={(event) => {
                  const value = event.target.value;
                  setTestTypeId(value);
                  void loadQuestions(aircraftId, value);
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500"
              >
                <option value="">Select practical test</option>
                {testTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Search Type Rating / Aircraft
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="B-737, A-320, DC-6, manufacturer, model…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500"
                />
              </label>

              <select
                value={aircraftId}
                onChange={(event) => {
                  const value = event.target.value;
                  setAircraftId(value);
                  void loadQuestions(value, testTypeId);
                }}
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500"
              >
                <option value="">Select FAA type-rated aircraft</option>
                {visibleAircraft.map((row) => (
                  <option key={row.id} value={row.id}>
                    {designationOf(row)}
                    {row.type_certificate_holder
                      ? ` — ${row.type_certificate_holder}`
                      : ""}
                    {row.civil_model_designation
                      ? ` — ${row.civil_model_designation}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6">
        {questionsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
            Loading applicable questions…
          </div>
        ) : null}

        {!questionsLoading &&
        testTypeId &&
        aircraftId &&
        questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            No questions are currently available for this practical test /
            type rating.
          </div>
        ) : null}

        <div className="space-y-4">
          {groups.map(([acs, items]) => (
            <div
              key={acs}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="font-mono font-bold text-slate-900">
                  {acs}
                </span>
              </div>

              {items.map((q) => (
                <label
                  key={q.id}
                  className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(q.id)
                          ? current.filter((id) => id !== q.id)
                          : [...current, q.id],
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <div>
                    <div className="flex flex-wrap gap-2">
                      {q.is_type_specific ? (
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                          TYPE SPECIFIC
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          GENERIC
                        </span>
                      )}

                      {q.task_name ? (
                        <span className="text-xs text-slate-500">
                          {q.task_name}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 font-semibold text-slate-900">
                      {q.question}
                    </p>

                    {q.reference ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {q.reference}
                      </p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>

      {questions.length > 0 ? (
        <section className="sticky bottom-4 mt-6 rounded-2xl border border-indigo-200 bg-white p-5 shadow-lg">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Type Rating Plan of Action title"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />

              <p className="mt-2 text-sm text-slate-500">
                {selected.length} question{selected.length === 1 ? "" : "s"}{" "}
                selected
              </p>
            </div>

            <button
              type="button"
              onClick={() => void createPoa()}
              disabled={creating || selected.length === 0}
              className="rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Type Rating POA"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
