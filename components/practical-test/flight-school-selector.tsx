"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Searchable flight school picker (Kele, Nov 1 2026). Searches the FAA Part 141 pilot
// schools and Part 142 training centers plus schools people added, like the airport picker.
// Schools that aren't on the FAA list can be added from the bottom of the results.

export type FlightSchoolPick = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  source: "faa" | "added" | string;
  faa_part: string | null;
  faa_certificate_number: string | null;
  default_airport_code: string | null;
  default_oral_test_location: string | null;
};

type SearchRow = FlightSchoolPick & {
  faa_agency_name: string | null;
  dba_names: string[] | null;
  faa_listed: boolean;
  location_count: number;
  matched_location: string | null;
  is_featured: boolean;
};

type Props = {
  /** The selected school. id null with a name = a typed name not linked to the list. */
  value: { id: string | null; name: string } | null;
  onChange: (school: FlightSchoolPick | null) => void;
  placeholder?: string;
  allowAdd?: boolean;
  id?: string;
  disabled?: boolean;
  /** Empty the box after a pick (for "add another school" lists). */
  clearOnSelect?: boolean;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

export function schoolSubtitle(school: Pick<SearchRow, "source" | "faa_part" | "faa_certificate_number" | "city" | "state"> & Partial<SearchRow>) {
  const parts: string[] = [];
  if (school.source === "faa") {
    parts.push(school.faa_part === "142" ? "Part 142 training center" : "Part 141 pilot school");
    if (school.faa_certificate_number) parts.push(`Cert ${school.faa_certificate_number}`);
  } else {
    parts.push("Added school");
  }
  const place = [school.city, school.state].filter(Boolean).join(", ");
  if (place) parts.push(place);
  if (school.location_count && school.location_count > 1) parts.push(`${school.location_count} locations`);
  if (school.source === "faa" && school.faa_listed === false) parts.push("no longer on the FAA list");
  return parts.join(" · ");
}

function toPick(row: SearchRow | FlightSchoolPick): FlightSchoolPick {
  return {
    id: row.id,
    name: row.name,
    city: row.city ?? null,
    state: row.state ?? null,
    source: row.source,
    faa_part: row.faa_part ?? null,
    faa_certificate_number: row.faa_certificate_number ?? null,
    default_airport_code: row.default_airport_code ?? null,
    default_oral_test_location: row.default_oral_test_location ?? null,
  };
}

export default function FlightSchoolSelector({
  value,
  onChange,
  placeholder = "Search school name, city, or FAA certificate…",
  allowAdd = true,
  id,
  disabled,
  clearOnSelect = false,
}: Props) {
  const selectedLabel = value?.name ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [results, setResults] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addCity, setAddCity] = useState("");
  const [addState, setAddState] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const search = query.trim();
    // While the selected name is showing, list the usual schools instead of searching for it.
    const term = selectedLabel && search === selectedLabel ? "" : search;
    if (term.length === 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await createClient().rpc("search_flight_schools", {
        p_search: term,
        p_limit: 30,
      });
      if (cancelled) return;
      if (error) {
        console.error("Unable to search flight schools:", error);
        setResults([]);
      } else {
        setResults((data ?? []) as SearchRow[]);
      }
      setLoading(false);
    }, term ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, query, selectedLabel]);

  function updateQuery(next: string) {
    setQuery(next);
    setOpen(true);
    setAdding(false);
    if (selectedLabel && next !== selectedLabel) onChange(null);
  }

  function choose(row: SearchRow | FlightSchoolPick) {
    setQuery(clearOnSelect ? "" : row.name);
    setOpen(false);
    setAdding(false);
    onChange(toPick(row));
  }

  async function addSchool() {
    const name = query.trim();
    if (name.length < 2) {
      setAddError("Enter the school name.");
      return;
    }
    setSaving(true);
    setAddError("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_flight_school", {
      p_name: name,
      p_city: addCity.trim() || null,
      p_state: addState.trim() || null,
    });
    if (error || !data?.[0]) {
      setSaving(false);
      setAddError(error?.message ?? "The school could not be added.");
      return;
    }
    const added = data[0] as { id: string; name: string };
    const { data: row } = await supabase
      .from("flight_schools")
      .select("id, name, city, state, source, faa_part, faa_certificate_number, default_airport_code, default_oral_test_location")
      .eq("id", added.id)
      .maybeSingle();
    setSaving(false);
    setAddCity("");
    setAddState("");
    choose((row as FlightSchoolPick | null) ?? {
      id: added.id,
      name: added.name,
      city: addCity.trim() || null,
      state: addState.trim().toUpperCase() || null,
      source: "added",
      faa_part: null,
      faa_certificate_number: null,
      default_airport_code: null,
      default_oral_test_location: null,
    });
  }

  const term = query.trim();
  const showingFeatured = !term || (selectedLabel !== "" && term === selectedLabel);
  const exactMatch = results.some((row) => row.name.trim().toLowerCase() === term.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={query}
        disabled={disabled}
        onChange={(event) => updateQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />

      {value?.name ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {value.id ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">School selected</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
              Typed name — not on the school list yet
            </span>
          )}
          {!disabled ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                onChange(null);
                setOpen(true);
              }}
              className="font-semibold text-sky-700 hover:text-sky-900"
            >
              Change
            </button>
          ) : null}
        </div>
      ) : null}

      {open && !disabled ? (
        <div className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {showingFeatured && results.length > 0 ? (
            <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Local schools — type to search all FAA schools
            </p>
          ) : null}

          {loading ? <p className="px-4 py-4 text-sm text-slate-600">Searching flight schools…</p> : null}

          {!loading && term.length === 1 && !showingFeatured ? (
            <p className="px-4 py-4 text-sm text-slate-600">Keep typing to search…</p>
          ) : null}

          {!loading && !showingFeatured && term.length >= 2 && results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-600">No school on the list matches “{term}”.</p>
          ) : null}

          {!loading
            ? results.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => choose(row)}
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-sky-50"
                >
                  <span className="block font-semibold text-slate-900">{row.name}</span>
                  {row.dba_names?.length || (row.faa_agency_name && row.faa_agency_name !== row.name) ? (
                    <span className="block text-xs text-slate-600">
                      {[
                        row.faa_agency_name && row.faa_agency_name !== row.name ? row.faa_agency_name : null,
                        row.dba_names?.length ? `DBA ${row.dba_names.join(", ")}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-slate-500">{schoolSubtitle(row)}</span>
                  {row.matched_location ? (
                    <span className="mt-1 block text-xs text-sky-700">Location: {row.matched_location}</span>
                  ) : null}
                </button>
              ))
            : null}

          {allowAdd && !loading && term.length >= 2 && !showingFeatured && !exactMatch ? (
            adding ? (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Add “{term}” to the school list</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_6rem]">
                  <input
                    value={addCity}
                    onChange={(event) => setAddCity(event.target.value)}
                    placeholder="City (optional)"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600"
                  />
                  <input
                    value={addState}
                    onChange={(event) => setAddState(event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="State"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600"
                  />
                </div>
                {addError ? <p className="mt-2 text-sm text-red-700">{addError}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void addSchool()}
                    disabled={saving}
                    className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {saving ? "Adding…" : "Add school"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="block w-full border-t border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-sky-700 hover:bg-sky-50"
              >
                + Add “{term}” as a school that isn’t on the FAA list
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
