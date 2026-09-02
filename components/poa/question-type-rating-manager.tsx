"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TypeRating = {
  id: string;
  designation: string;
};

type Mapping = {
  id: string;
  type_rating_designation_id: string;
};

export default function QuestionTypeRatingManager({
  questionId,
}: {
  questionId: string;
}) {
  const [ratings, setRatings] = useState<TypeRating[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const [ratingsResult, mappingResult] = await Promise.all([
      supabase
        .from("faa_type_rating_designations")
        .select("id, designation")
        .eq("is_active", true)
        .order("designation"),
      supabase
        .from("poa_question_type_ratings")
        .select("id, type_rating_designation_id")
        .eq("question_id", questionId),
    ]);

    if (ratingsResult.error) {
      setError(ratingsResult.error.message);
      setLoading(false);
      return;
    }

    if (mappingResult.error) {
      setError(mappingResult.error.message);
      setLoading(false);
      return;
    }

    setRatings((ratingsResult.data ?? []) as TypeRating[]);
    setMappings((mappingResult.data ?? []) as Mapping[]);
    setLoading(false);
  }, [questionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIds = useMemo(
    () => new Set(mappings.map((item) => item.type_rating_designation_id)),
    [mappings],
  );

  const visibleRatings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ratings;
    return ratings.filter((item) =>
      item.designation.toLowerCase().includes(q),
    );
  }, [ratings, search]);

  async function toggle(rating: TypeRating) {
    if (workingId) return;

    setWorkingId(rating.id);
    setError("");
    const supabase = createClient();

    try {
      const existing = mappings.find(
        (item) => item.type_rating_designation_id === rating.id,
      );

      if (existing) {
        const { error: deleteError } = await supabase
          .from("poa_question_type_ratings")
          .delete()
          .eq("id", existing.id);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("poa_question_type_ratings")
          .insert({
            question_id: questionId,
            type_rating_designation_id: rating.id,
          });

        if (insertError) throw insertError;
      }

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Type rating could not be updated.",
      );
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
            Type Rating Applicability
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Optional. Select one or more FAA type ratings when this is a
            type-specific question. Leave all unselected for a generic question.
          </p>
        </div>

        <span className="text-sm font-semibold text-slate-600">
          {selectedIds.size} selected
        </span>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search FAA type ratings…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading type ratings…</p>
      ) : (
        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {visibleRatings.map((rating) => {
            const checked = selectedIds.has(rating.id);

            return (
              <label
                key={rating.id}
                className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(workingId)}
                  onChange={() => void toggle(rating)}
                  className="h-4 w-4"
                />
                <span className="font-mono text-sm font-semibold text-slate-800">
                  {rating.designation}
                </span>

                {workingId === rating.id ? (
                  <span className="ml-auto text-xs text-slate-500">
                    Saving…
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
