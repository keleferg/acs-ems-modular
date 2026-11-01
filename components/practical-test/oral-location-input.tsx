"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Oral-exam location box (Kele, Nov 1 2026). Free text, with suggestions from the whole flight
// school list as you type: local schools (with their saved oral-test location), FAA Part 141/142
// schools and their FAA locations, and added schools.

export type OralLocationSuggestion = {
  flight_school_id: string;
  kind: "school" | "location" | string;
  title: string;
  subtitle: string | null;
  location_text: string;
  default_airport_code: string | null;
  is_featured: boolean;
};

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onPick?: (suggestion: OralLocationSuggestion) => void;
  placeholder?: string;
};

export default function OralLocationInput({ id, value, onChange, onPick, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [results, setResults] = useState<OralLocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Until the examiner types, show the local schools; then search everything.
    const term = typed ? value.trim() : "";
    if (term.length === 1) return;
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await createClient().rpc("search_oral_test_locations", {
        p_search: term,
        p_limit: 25,
      });
      if (cancelled) return;
      if (error) console.error("Unable to search locations:", error);
      setResults(error ? [] : ((data ?? []) as OralLocationSuggestion[]));
      setLoading(false);
    }, term ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, typed, value]);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setTyped(true);
          setOpen(true);
        }}
        onFocus={() => {
          setTyped(false);
          setOpen(true);
        }}
        placeholder={placeholder ?? "Type a school name or address"}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
      />

      {open && (loading || results.length > 0) ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full min-w-[20rem] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {!typed && results.length > 0 ? (
            <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Local schools — type to search all schools
            </p>
          ) : null}
          {loading && results.length === 0 ? <p className="px-4 py-3 text-sm text-slate-600">Searching schools…</p> : null}
          {results.map((item, index) => (
            <button
              key={`${item.flight_school_id}-${item.kind}-${index}`}
              type="button"
              onClick={() => {
                onChange(item.location_text);
                onPick?.(item);
                setOpen(false);
                setTyped(false);
              }}
              className="block w-full border-b border-slate-100 px-4 py-2 text-left last:border-b-0 hover:bg-amber-50"
            >
              <span className="block text-sm font-semibold text-slate-900">
                {item.title}
                {item.default_airport_code ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">· {item.default_airport_code}</span>
                ) : null}
              </span>
              {item.subtitle ? <span className="block text-xs text-slate-500">{item.subtitle}</span> : null}
              <span className="block text-xs text-slate-600">{item.location_text}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
