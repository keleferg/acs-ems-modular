"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type RequestInfo = {
  id: string;
  practical_test_type_id: string | null;
  ppc_type_rating_aircraft_id: string | null;
  ppc_type_rating_designation: string | null;
  ppc_aircraft_civil_model_designation: string | null;
};

type Question = {
  id: string;
  acs_reference: string;
  question: string;
  answer: string | null;
  reference: string | null;
  topic: string | null;
  task_name: string | null;
  question_type: string;
  difficulty: string;
  is_type_specific: boolean;
  type_rating_designation: string | null;
};

export default function PpcTypeRatingQuestionPanel({
  requestId,
}: {
  requestId: string;
}) {
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdPoaId, setCreatedPoaId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: requestRow, error: requestError } = await supabase
      .from("practical_test_requests")
      .select(`
        id,
        practical_test_type_id,
        ppc_type_rating_aircraft_id,
        ppc_type_rating_designation,
        ppc_aircraft_civil_model_designation
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !requestRow) {
      setError(requestError?.message ?? "PPC request could not be loaded.");
      setLoading(false);
      return;
    }

    const loadedRequest = requestRow as RequestInfo;
    setRequest(loadedRequest);

    if (!loadedRequest.ppc_type_rating_aircraft_id) {
      setQuestions([]);
      setError("This proficiency check does not have a type rating selected.");
      setLoading(false);
      return;
    }

    const { data, error: questionError } = await supabase.rpc(
      "examiner_get_type_rating_poa_questions",
      {
        p_type_rating_aircraft_id:
          loadedRequest.ppc_type_rating_aircraft_id,
        p_practical_test_type_id: loadedRequest.practical_test_type_id,
      },
    );

    if (questionError) {
      setError(questionError.message);
      setQuestions([]);
    } else {
      setQuestions((data ?? []) as Question[]);
    }

    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Question[]>();

    questions.forEach((question) => {
      const key = question.acs_reference || "Unassigned ACS";
      map.set(key, [...(map.get(key) ?? []), question]);
    });

    return [...map.entries()];
  }, [questions]);

  function toggle(questionId: string) {
    setSelected((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  async function createPoa() {
    if (
      !request?.ppc_type_rating_aircraft_id ||
      !request.practical_test_type_id
    ) {
      setError(
        "The PPC request is missing its required type-rating information.",
      );
      return;
    }

    if (selected.length === 0) {
      setError("Select at least one question for the POA.");
      return;
    }

    setCreating(true);
    setError("");
    setCreatedPoaId("");

    const supabase = createClient();
    const { data, error: createError } = await supabase.rpc(
      "examiner_create_type_rating_poa",
      {
        p_type_rating_aircraft_id:
          request.ppc_type_rating_aircraft_id,
        p_practical_test_type_id: request.practical_test_type_id,
        p_question_ids: selected,
        p_title: title.trim() || null,
      },
    );

    if (createError) {
      setError(createError.message);
    } else {
      setCreatedPoaId(String(data ?? ""));
    }

    setCreating(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-700" />
            <h2 className="text-xl font-bold text-slate-900">
              Type-Specific Question Library / POA
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {request?.ppc_type_rating_designation ?? "Type rating"}
            {request?.ppc_aircraft_civil_model_designation
              ? ` — ${request.ppc_aircraft_civil_model_designation}`
              : ""}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Questions assigned specifically to this FAA type rating are
            included automatically. Generic questions mapped to this
            practical-test type are also eligible.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm">
          <span className="font-bold text-indigo-800">{selected.length}</span>{" "}
          selected
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {createdPoaId ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Type-rating POA created successfully.{" "}
          <Link
            href="/examiner/plan-of-action"
            className="font-bold text-emerald-800 underline"
          >
            Open Plan of Action Library
          </Link>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          Loading applicable questions…
        </p>
      ) : questions.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          No Question Library entries are currently assigned to this type
          rating.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map(([acsReference, items]) => (
            <div
              key={acsReference}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-mono text-sm font-bold text-slate-800">
                  {acsReference}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {items.length} question{items.length === 1 ? "" : "s"}
                </span>
              </div>

              {items.map((question) => (
                <label
                  key={question.id}
                  className="flex cursor-pointer gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={() => toggle(question.id)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {question.is_type_specific ? (
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                          TYPE SPECIFIC
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          GENERIC
                        </span>
                      )}

                      {question.task_name ? (
                        <span className="text-xs text-slate-500">
                          {question.task_name}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 font-semibold text-slate-900">
                      {question.question}
                    </p>

                    {question.reference ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Reference: {question.reference}
                      </p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={`${request?.ppc_type_rating_designation ?? "Type Rating"} POA`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() => void createPoa()}
            disabled={creating || selected.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckSquare className="h-4 w-4" />
            {creating ? "Creating POA…" : "Create POA from Selected"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
