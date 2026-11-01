"use client";

import { Building2, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import FlightSchoolSelector, { schoolSubtitle } from "@/components/practical-test/flight-school-selector";
import AirportSelector from "@/components/practical-test/airport-selector";
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
  website: string | null;
  default_oral_test_location: string | null;
  default_airport_code: string | null;
  notes: string | null;
  admin_edited_fields: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  flight_school_locations: Location[];
};

// The edit form (Kele, Nov 1 2026): every field can be changed. Address/contact fields changed
// here are remembered in admin_edited_fields so an FAA re-import doesn't overwrite them.
type EditDraft = {
  name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  default_oral_test_location: string;
  default_airport_code: string;
  default_airport_label: string;
  notes: string;
  local: boolean;
  is_active: boolean;
};

const EDIT_FIELDS: { key: keyof EditDraft; label: string; wide?: boolean; placeholder?: string }[] = [
  { key: "name", label: "Name shown in the portal", wide: true },
  { key: "address_line_1", label: "Address line 1", wide: true },
  { key: "address_line_2", label: "Address line 2", wide: true },
  { key: "city", label: "City" },
  { key: "state", label: "State", placeholder: "HI" },
  { key: "postal_code", label: "ZIP" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website", placeholder: "https://" },
];

const FIELD_LABELS: Record<string, string> = {
  address_line_1: "address",
  address_line_2: "address line 2",
  city: "city",
  state: "state",
  postal_code: "ZIP",
  phone: "phone",
  email: "email",
  website: "website",
};

function toDraft(school: School): EditDraft {
  return {
    name: school.name,
    address_line_1: school.address_line_1 ?? "",
    address_line_2: school.address_line_2 ?? "",
    city: school.city ?? "",
    state: school.state ?? "",
    postal_code: school.postal_code ?? "",
    phone: school.phone ?? "",
    email: school.email ?? "",
    website: school.website ?? "",
    default_oral_test_location: school.default_oral_test_location ?? "",
    default_airport_code: school.default_airport_code ?? "",
    default_airport_label: school.default_airport_code ?? "",
    notes: school.notes ?? "",
    local: school.sort_order < 4000,
    is_active: school.is_active,
  };
}

function clean(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed;
}

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
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("flight_schools")
      .select(
        `id, name, source, faa_part, faa_certificate_number, faa_agency_name, dba_names, faa_listed, faa_update_date,
         address_line_1, address_line_2, city, state, postal_code, phone, email, website, default_oral_test_location,
         default_airport_code, notes, admin_edited_fields, is_active, sort_order, created_at,
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

  function draftFor(school: School) {
    return drafts[school.id] ?? toDraft(school);
  }

  function updateDraft(school: School, changes: Partial<EditDraft>) {
    setDrafts((current) => ({ ...current, [school.id]: { ...(current[school.id] ?? toDraft(school)), ...changes } }));
  }

  async function saveSchool(school: School) {
    const draft = draftFor(school);
    const name = clean(draft.name);
    if (!name) {
      setErrorMessage("The school needs a name.");
      return;
    }
    const email = clean(draft.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Enter a valid email address, or leave it blank.");
      return;
    }
    let website = clean(draft.website);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    const sortOrder = draft.local
      ? school.sort_order < 4000
        ? school.sort_order
        : 1000
      : school.sort_order < 4000
        ? school.source === "faa"
          ? 5000
          : 4000
        : school.sort_order;
    const update = {
      name,
      address_line_1: clean(draft.address_line_1),
      address_line_2: clean(draft.address_line_2),
      city: clean(draft.city),
      state: clean(draft.state)?.toUpperCase() ?? null,
      postal_code: clean(draft.postal_code),
      phone: clean(draft.phone),
      email: email?.toLowerCase() ?? null,
      website,
      default_oral_test_location: clean(draft.default_oral_test_location),
      default_airport_code: clean(draft.default_airport_code)?.toUpperCase() ?? null,
      notes: clean(draft.notes),
      sort_order: sortOrder,
      is_active: draft.is_active,
    };
    setSavingId(school.id);
    setErrorMessage("");
    setMessage("");
    const { data, error } = await supabase
      .from("flight_schools")
      .update(update)
      .eq("id", school.id)
      .select("admin_edited_fields")
      .single();
    setSavingId(null);
    if (error) {
      setErrorMessage(
        error.code === "23505" ? "Another added school already has that name." : `${school.name} could not be saved: ${error.message}`,
      );
      return;
    }
    setSchools((current) =>
      current.map((item) =>
        item.id === school.id
          ? { ...item, ...update, admin_edited_fields: (data?.admin_edited_fields as string[] | null) ?? item.admin_edited_fields }
          : item,
      ),
    );
    setDrafts((current) => {
      const next = { ...current };
      delete next[school.id];
      return next;
    });
    setMessage(`${name} saved.`);
  }

  async function allowFaaUpdates(school: School) {
    const { error } = await supabase.from("flight_schools").update({ admin_edited_fields: [] }).eq("id", school.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSchools((current) => current.map((item) => (item.id === school.id ? { ...item, admin_edited_fields: [] } : item)));
    setMessage(`The next FAA update will refresh ${school.name}'s address and contact details.`);
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
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveSchool(school);
                    }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Edit school</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {EDIT_FIELDS.map((field) => (
                        <label
                          key={field.key}
                          className={`block text-xs font-semibold text-slate-600 ${field.wide ? "sm:col-span-3" : ""}`}
                        >
                          {field.label}
                          <input
                            value={String(draftFor(school)[field.key] ?? "")}
                            placeholder={field.placeholder}
                            onChange={(event) => updateDraft(school, { [field.key]: event.target.value } as Partial<EditDraft>)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-600"
                          />
                        </label>
                      ))}
                      <label className="block text-xs font-semibold text-slate-600 sm:col-span-3">
                        Oral-test location
                        <textarea
                          rows={2}
                          value={draftFor(school).default_oral_test_location}
                          placeholder="Address and room used for the oral exam"
                          onChange={(event) => updateDraft(school, { default_oral_test_location: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-600"
                        />
                      </label>
                      <div className="text-xs font-semibold text-slate-600 sm:col-span-2">
                        Default airport
                        <div className="mt-1 font-normal">
                          <AirportSelector
                            compact
                            placeholder="Airport (ITO, PHTO, Hilo…)"
                            selectedLabel={draftFor(school).default_airport_label}
                            onSelect={(airport) =>
                              updateDraft(school, {
                                default_airport_code: airport.faa_identifier,
                                default_airport_label: `${airport.faa_identifier} — ${airport.airport_name}`,
                              })
                            }
                            onClear={() => updateDraft(school, { default_airport_code: "", default_airport_label: "" })}
                          />
                        </div>
                      </div>
                      <label className="block text-xs font-semibold text-slate-600 sm:col-span-3">
                        Notes
                        <textarea
                          rows={2}
                          value={draftFor(school).notes}
                          onChange={(event) => updateDraft(school, { notes: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-600"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3">
                        <input
                          type="checkbox"
                          checked={draftFor(school).local}
                          onChange={(event) => updateDraft(school, { local: event.target.checked })}
                          className="h-4 w-4"
                        />
                        Local school — show it first in the school and oral-location pickers
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3">
                        <input
                          type="checkbox"
                          checked={draftFor(school).is_active}
                          onChange={(event) => updateDraft(school, { is_active: event.target.checked })}
                          className="h-4 w-4"
                        />
                        Active — shown in the school search
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={savingId === school.id || !drafts[school.id]}
                        className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                      >
                        {savingId === school.id ? "Saving…" : "Save changes"}
                      </button>
                      {drafts[school.id] ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((current) => {
                              const next = { ...current };
                              delete next[school.id];
                              return next;
                            })
                          }
                          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Undo changes
                        </button>
                      ) : null}
                    </div>

                    {school.source === "faa" && school.admin_edited_fields?.length ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Edited here, so FAA updates won’t change:{" "}
                        {school.admin_edited_fields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}.{" "}
                        <button
                          type="button"
                          onClick={() => void allowFaaUpdates(school)}
                          className="font-semibold text-sky-700 underline hover:text-sky-900"
                        >
                          Let FAA updates change them again
                        </button>
                      </p>
                    ) : null}

                    <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-slate-700">
                      <dt className="text-slate-500">Source</dt>
                      <dd>{school.source === "faa" ? `FAA Part ${school.faa_part}` : "Added (not on the FAA list)"}</dd>
                      {school.faa_certificate_number ? (
                        <>
                          <dt className="text-slate-500">FAA certificate</dt>
                          <dd>{school.faa_certificate_number}</dd>
                        </>
                      ) : null}
                      {school.faa_agency_name && school.faa_agency_name !== school.name ? (
                        <>
                          <dt className="text-slate-500">FAA name</dt>
                          <dd>{school.faa_agency_name}</dd>
                        </>
                      ) : null}
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
                  </form>

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
