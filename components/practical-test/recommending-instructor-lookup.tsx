"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Recommending-instructor lookup for examiner-created requests.
 *
 * Instructors are saved automatically (database trigger) whenever an
 * applicant or examiner submits a request with instructor details, so the
 * examiner can reuse them here instead of looking them up again.
 */
export type SavedInstructor = {
  instructor_profile_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  certificate_number: string | null;
  flight_school_id: string | null;
  flight_school_name: string | null;
  used_by_applicant: boolean;
  last_used_at: string | null;
};

type Props = {
  applicantId: string;
  /** Called when the examiner picks an instructor from the list or search. */
  onSelect: (instructor: SavedInstructor) => void;
  /** Called with the applicant's own instructors (newest first) after each load. */
  onApplicantInstructorsLoaded: (instructors: SavedInstructor[]) => void;
};

function describe(instructor: SavedInstructor) {
  return [instructor.email, instructor.phone, instructor.certificate_number]
    .filter(Boolean)
    .join(" · ");
}

export default function RecommendingInstructorLookup({
  applicantId,
  onSelect,
  onApplicantInstructorsLoaded,
}: Props) {
  const [applicantInstructors, setApplicantInstructors] = useState<SavedInstructor[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SavedInstructor[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Instructors this applicant has used before.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!applicantId) {
        setApplicantInstructors([]);
        onApplicantInstructorsLoaded([]);
        return;
      }

      const supabase = createClient();
      const { data, error: loadError } = await supabase.rpc(
        "examiner_find_recommending_instructors",
        { p_applicant_profile_id: applicantId, p_search: null },
      );

      if (cancelled) return;

      if (loadError) {
        setError("Saved instructors could not be loaded. You can still type the details.");
        setApplicantInstructors([]);
        onApplicantInstructorsLoaded([]);
        return;
      }

      setError("");
      const list = ((data ?? []) as SavedInstructor[]).filter((item) => item.used_by_applicant);
      setApplicantInstructors(list);
      onApplicantInstructorsLoaded(list);
    }

    void load();
    return () => {
      cancelled = true;
    };
    // onApplicantInstructorsLoaded is intentionally excluded: reload only when the applicant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantId]);

  // Directory search (debounced).
  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const { data, error: searchError } = await supabase.rpc(
        "examiner_find_recommending_instructors",
        { p_applicant_profile_id: null, p_search: term },
      );

      if (cancelled) return;
      setSearching(false);

      if (searchError) {
        setError("Instructor search is unavailable right now.");
        setResults([]);
        return;
      }

      setResults((data ?? []) as SavedInstructor[]);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  function pick(instructor: SavedInstructor) {
    onSelect(instructor);
    setSearch("");
    setResults([]);
  }

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {applicantInstructors.length > 0 ? (
        <div>
          <div className="text-sm font-semibold text-slate-800">
            Instructors this applicant has used
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {applicantInstructors.map((instructor) => (
              <button
                key={instructor.instructor_profile_id}
                type="button"
                onClick={() => pick(instructor)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 transition hover:border-amber-600 hover:bg-amber-50"
              >
                <span className="font-semibold">{instructor.full_name}</span>
                <span className="block text-xs text-slate-500">{describe(instructor)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="block text-sm font-semibold text-slate-800">
        Search saved instructors
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, email, or certificate number"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
        />
      </label>

      {search.trim().length >= 2 ? (
        searching ? (
          <p className="text-sm text-slate-500">Searching…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-500">
            No saved instructor matches. Enter the details below; they&apos;ll be saved with this request.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {results.map((instructor) => (
              <li key={instructor.instructor_profile_id}>
                <button
                  type="button"
                  onClick={() => pick(instructor)}
                  className="w-full px-4 py-3 text-left text-sm transition hover:bg-amber-50"
                >
                  <span className="font-semibold text-slate-900">{instructor.full_name}</span>
                  <span className="block text-xs text-slate-500">{describe(instructor)}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
