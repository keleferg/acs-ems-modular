"use client";

import { Building2, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import FlightSchoolSelector, { schoolSubtitle } from "@/components/practical-test/flight-school-selector";
import { createClient } from "@/lib/supabase/client";

// Schools (Kele, Nov 1 2026): the FAA Part 141 pilot schools and Part 142 training centers
// imported from the FAA facility list, plus schools people added that aren't on it.

type Location = {
  id: string;
  faa_designator_code: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  is_main_base: boolean;
};

type School = {
  id: string;
  name: string;
  source: string;
  faa_part: string | null;
  faa_certificate_number: string | null;
  faa_agency_name: string | null;
  dba_names: string[] | null;
  faa_listed: boolean;
  faa_update_date: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  flight_school_locations: Location[];
};

type Filter = "all" | "141" | "142" | "added" | "hawaii" | "inactive";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "141", label: "Part 141" },
  { key: "142", label: "Part 142" },
  { key: "added", label: "Added" },
  { key: "hawaii", label: "Hawaii" },
  { key: "inactive", label: "Inactive" },
];

const PAGE = 50;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

export default function AdminSchoolsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("flight_schools")
      .select(
        `id, name, source, faa_part, faa_certificate_number, faa_agency_name, dba_names, faa_listed, faa_update_date,
         address_line_1, address_line_2, city, state, postal_code, phone, email, is_active, sort_order, created_at,
         flight_school_locations ( id, faa_designator_code, name, address_line_1, address_line_2, city, state, postal_code, phone, is_main_base )`,
      )
      .order("name", { ascending: true })
      .limit(5000);
    if (error) setErrorMessage(`Schools could not be loaded: ${error.message}`);
    else setSchools((data ?? []) as School[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: schools.filter((s) => s.is_active).length,
      "141": schools.filter((s) => s.is_active && s.faa_part === "141").length,
      "142": schools.filter((s) => s.is_active && s.faa_part === "142").length,
      added: schools.filter((s) => s.is_active && s.source === "added").length,
      hawaii: schools.filter(
        (s) => s.is_active && (s.state === "HI" || s.flight_school_locations.some((l) => l.state === "HI")),
      ).length,
      inactive: schools.filter((s) => !s.is_active).length,
    }),
    [schools],
  );

  const visible = useMemo(() => {
    const term = normalize(search);
    return schools.filter((school) => {
      if (filter === "inactive" ? school.is_active : !school.is_active) return false;
      if (filter === "141" && school.faa_part !== "141") return false;
      if (filter === "142" && school.faa_part !== "142") return false;
      if (filter === "added" && school.source !== "added") return false;
      if (
        filter === "hawaii" &&
        school.state !== "HI" &&
        !school.flight_school_locations.some((l) => l.state === "HI")
      )
        return false;
      if (!term) return true;
      const haystack = normalize(
        [
          school.name,
          school.faa_agency_name,
          ...(school.dba_names ?? []),
          school.city,
          school.state,
          school.faa_certificate_number,
          ...school.flight_school_locations.flatMap((l) => [l.name, l.city, l.state, l.faa_designator_code]),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(term);
    });
  }, [schools, search, filter]);

  async function saveName(school: School) {
    const name = (editingName[school.id] ?? school.name).trim().replace(/\s+/g, " ");
    if (!name || name === school.name) return;
    const { error } = await supabase.from("flight_schools").update({ name }).eq("id", school.id);
    if (error) {
      setErrorMessage(error.code === "23505" ? "Another added school already has that name." : error.message);
      return;
    }
    setSchools((current) => current.map((item) => (item.id === school.id ? { ...item, name } : item)));
    setEditingName((current) => {
      const next = { ...current };
      delete next[school.id];
      return next;
    });
    setMessage(`Renamed to “${name}”.`);
  }

  async function setActive(school: School, isActive: boolean) {
    const { error } = await supabase.from("flight_schools").update({ is_active: isActive }).eq("id", school.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSchools((current) => current.map((item) => (item.id === school.id ? { ...item, is_active: isActive } : item)));
    setMessage(isActive ? `${school.name} is active again.` : `${school.name} is hidden from the school search.`);
  }

  const lastUpdate = schools.map((s) => s.faa_update_date).filter(Boolean).sort().at(-1) ?? null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-sky-100 p-3 text-sky-800">
            <Building2 aria-hidden className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Schools</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              FAA Part 141 pilot schools and Part 142 training centers from the FAA facility list
              {lastUpdate ? ` (FAA data updated ${formatDate(lastUpdate)})` : ""}, plus schools people added
              that aren’t on it. Everyone searches this list when they pick a school.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          <Plus aria-hidden className="h-4 w-4" /> Add a school
        </button>
      </div>

      {adding ? (
        <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Add a school that isn’t on the FAA list</p>
          <p className="mt-1 text-sm text-slate-600">
            Type the name. If it’s already listed you’ll see it — otherwise choose “Add”.
          </p>
          <div className="mt-3 max-w-xl">
            <FlightSchoolSelector
              value={null}
              clearOnSelect
              onChange={(school) => {
                if (!school) return;
                setMessage(`${school.name} is on the list.`);
                setAdding(false);
                void load();
              }}
            />
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}
      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{errorMessage}</div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setFilter(item.key);
              setShown(PAGE);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
              filter === item.key
                ? "border-sky-700 bg-sky-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label} <span className="opacity-75">{counts[item.key]}</span>
          </button>
        ))}
      </div>

      <label className="relative mt-4 block">
        <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setShown(PAGE);
          }}
          placeholder="Search name, DBA, city, state, or FAA certificate…"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
        />
      </label>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-6 text-sm text-slate-600">Loading schools…</p> : null}
        {!loading && visible.length === 0 ? <p className="p-6 text-sm text-slate-600">No schools match.</p> : null}

        {visible.slice(0, shown).map((school) => {
          const open = openId === school.id;
          const locations = [...school.flight_school_locations].sort(
            (a, b) => Number(b.is_main_base) - Number(a.is_main_base) || (a.state ?? "").localeCompare(b.state ?? "") || (a.city ?? "").localeCompare(b.city ?? ""),
          );
          return (
            <div key={school.id} className="border-b border-slate-100 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : school.id)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50"
              >
                {open ? (
                  <ChevronDown aria-hidden className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">
                    {school.name}
                    {school.sort_order < 4000 ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Local</span>
                    ) : null}
                  </span>
                  {school.dba_names?.length || (school.faa_agency_name && school.faa_agency_name !== school.name) ? (
                    <span className="block text-xs text-slate-600">
                      {[
                        school.faa_agency_name && school.faa_agency_name !== school.name ? school.faa_agency_name : null,
                        school.dba_names?.length ? `DBA ${school.dba_names.join(", ")}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {schoolSubtitle({ ...school, location_count: school.flight_school_locations.length })}
                  </span>
                </span>
              </button>

              {open ? (
                <div className="grid gap-5 bg-slate-50 px-12 py-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Name shown in the portal</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={editingName[school.id] ?? school.name}
                        onChange={(event) => setEditingName((current) => ({ ...current, [school.id]: event.target.value }))}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => void saveName(school)}
                        disabled={(editingName[school.id] ?? school.name).trim() === school.name}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                    <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-slate-700">
                      <dt className="text-slate-500">Source</dt>
                      <dd>{school.source === "faa" ? `FAA Part ${school.faa_part}` : "Added (not on the FAA list)"}</dd>
                      {school.faa_certificate_number ? (
                        <>
                          <dt className="text-slate-500">FAA certificate</dt>
                          <dd>{school.faa_certificate_number}</dd>
                        </>
                      ) : null}
                      <dt className="text-slate-500">Address</dt>
                      <dd>
                        {[school.address_line_1, school.address_line_2].filter(Boolean).join(", ") || "—"}
                        {school.city ? <span className="block">{[school.city, school.state].filter(Boolean).join(", ")} {school.postal_code ?? ""}</span> : null}
                      </dd>
                      <dt className="text-slate-500">Phone</dt>
                      <dd>{school.phone ?? "—"}</dd>
                      <dt className="text-slate-500">Email</dt>
                      <dd className="break-all">{school.email ?? "—"}</dd>
                      {school.source === "faa" ? (
                        <>
                          <dt className="text-slate-500">FAA data</dt>
                          <dd>
                            {formatDate(school.faa_update_date)}
                            {school.faa_listed ? "" : " · no longer on the FAA list"}
                          </dd>
                        </>
                      ) : (
                        <>
                          <dt className="text-slate-500">Added</dt>
                          <dd>{formatDate(school.created_at)}</dd>
                        </>
                      )}
                    </dl>
                    <button
                      type="button"
                      onClick={() => void setActive(school, !school.is_active)}
                      className="mt-4 text-sm font-semibold text-sky-700 hover:text-sky-900"
                    >
                      {school.is_active ? "Hide from the school search" : "Make active again"}
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      FAA locations ({locations.length})
                    </p>
                    {locations.length === 0 ? <p className="mt-2 text-slate-500">None — this school was added by hand.</p> : null}
                    <ul className="mt-2 space-y-2">
                      {locations.map((location) => (
                        <li key={location.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="font-semibold text-slate-900">{location.name}</span>
                          {location.is_main_base ? <span className="ml-2 text-xs font-semibold text-emerald-700">Main base</span> : null}
                          <span className="block text-xs text-slate-600">
                            {[location.address_line_1, location.address_line_2].filter(Boolean).join(", ")}
                            {location.city ? ` · ${location.city}, ${location.state ?? ""} ${location.postal_code ?? ""}` : ""}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {location.faa_designator_code}
                            {location.phone ? ` · ${location.phone}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {visible.length > shown ? (
          <button
            type="button"
            onClick={() => setShown((value) => value + PAGE)}
            className="block w-full border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            Show more ({visible.length - shown} left)
          </button>
        ) : null}
      </section>
    </main>
  );
}
