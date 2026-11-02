"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FaaAircraftType = {
  id: string;
  manufacturer_model: string;
  manufacturer: string;
  model: string;
  type_designator: string;
  aircraft_class: string | null;
  engine_type: string | null;
};

type Qualification = {
  id: string;
  faa_aircraft_type_id: string;
  is_active: boolean;
  faa_aircraft_types: FaaAircraftType | null;
};

const AIRCRAFT_COLUMNS =
  "id, manufacturer_model, manufacturer, model, type_designator, aircraft_class, engine_type";

const PAGE_SIZE = 50;

const AIRCRAFT_CLASSES = [
  "Fixed-wing",
  "Helicopter",
  "Gyroplane",
  "Powered-lift",
];

/** Letters, numbers and spaces only, so the text is safe inside a PostgREST filter. */
function cleanSearch(value: string) {
  return value
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AircraftAuthorizedSettingsPage() {
  const [examinerProfileId, setExaminerProfileId] = useState("");
  const [qualifications, setQualifications] = useState<
    Map<string, Qualification>
  >(new Map());
  const [aircraft, setAircraft] = useState<FaaAircraftType[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadQualifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "Your login session could not be verified. Please sign in again.",
      );
      setLoading(false);
      return;
    }

    setExaminerProfileId(user.id);

    const { data, error } = await supabase
      .from("examiner_aircraft_qualifications")
      .select(
        `id, faa_aircraft_type_id, is_active, faa_aircraft_types ( ${AIRCRAFT_COLUMNS} )`,
      )
      .eq("examiner_profile_id", user.id);

    if (error) {
      console.error("Unable to load aircraft qualifications:", error);
      setErrorMessage(
        `Your aircraft could not be loaded: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    const map = new Map<string, Qualification>();
    for (const row of (data ?? []) as unknown as Qualification[]) {
      map.set(row.faa_aircraft_type_id, row);
    }
    setQualifications(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQualifications();
  }, [loadQualifications]);

  // Search the FAA aircraft list (server side, a page at a time).
  useEffect(() => {
    if (showSelectedOnly) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setListLoading(true);

      const words = cleanSearch(search);
      let query = createClient()
        .from("faa_aircraft_types")
        .select(AIRCRAFT_COLUMNS, { count: "exact" })
        .eq("is_active", true);

      if (classFilter) query = query.eq("aircraft_class", classFilter);

      if (words) {
        const pattern = `%${words.replace(/ /g, "%")}%`;
        const designator = `%${words.replace(/ /g, "")}%`;
        query = query.or(
          `manufacturer_model.ilike.${pattern},type_designator.ilike.${designator}`,
        );
      }

      const { data, error, count } = await query
        .order("manufacturer", { ascending: true })
        .order("model", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (cancelled) return;

      if (error) {
        console.error("Unable to search FAA aircraft:", error);
        setErrorMessage(
          `The FAA aircraft list could not be searched: ${error.message}`,
        );
        setAircraft([]);
        setTotalMatches(0);
      } else {
        setAircraft((data ?? []) as FaaAircraftType[]);
        setTotalMatches(count ?? 0);
      }

      setListLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [classFilter, page, search, showSelectedOnly]);

  const selectedAircraft = useMemo(() => {
    const words = cleanSearch(search).toUpperCase();
    return Array.from(qualifications.values())
      .filter((row) => row.is_active && row.faa_aircraft_types)
      .map((row) => row.faa_aircraft_types as FaaAircraftType)
      .filter((item) => !classFilter || item.aircraft_class === classFilter)
      .filter(
        (item) =>
          !words ||
          words
            .split(" ")
            .every(
              (word) =>
                item.manufacturer_model.toUpperCase().includes(word) ||
                item.type_designator.toUpperCase().includes(word),
            ),
      )
      .sort(
        (a, b) =>
          a.manufacturer.localeCompare(b.manufacturer) ||
          a.model.localeCompare(b.model),
      );
  }, [classFilter, qualifications, search]);

  const selectedCount = useMemo(
    () =>
      Array.from(qualifications.values()).filter((row) => row.is_active)
        .length,
    [qualifications],
  );

  const rows = showSelectedOnly ? selectedAircraft : aircraft;
  const pageCount = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));

  async function toggleAircraft(item: FaaAircraftType) {
    if (!examinerProfileId || savingId) return;

    setSavingId(item.id);
    setMessage("");
    setErrorMessage("");

    const current = qualifications.get(item.id);
    const nextActive = !current?.is_active;

    const { data, error } = await createClient()
      .from("examiner_aircraft_qualifications")
      .upsert(
        {
          examiner_profile_id: examinerProfileId,
          faa_aircraft_type_id: item.id,
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "examiner_profile_id,faa_aircraft_type_id" },
      )
      .select("id, faa_aircraft_type_id, is_active")
      .single();

    if (error) {
      console.error("Unable to update aircraft:", error);
      setErrorMessage(
        `${item.manufacturer_model} could not be updated: ${error.message}`,
      );
      setSavingId("");
      return;
    }

    setQualifications((existing) => {
      const next = new Map(existing);
      next.set(item.id, {
        ...(data as Omit<Qualification, "faa_aircraft_types">),
        faa_aircraft_types: item,
      });
      return next;
    });
    setMessage(
      `${item.manufacturer_model} is ${nextActive ? "now shown" : "no longer shown"} on your profile.`,
    );
    setSavingId("");
  }

  async function clearAll() {
    if (!examinerProfileId || selectedCount === 0 || savingId) return;
    if (
      !window.confirm(`Remove all ${selectedCount} selected aircraft?`)
    ) {
      return;
    }

    setSavingId("clear-all");
    setMessage("");
    setErrorMessage("");

    const { error } = await createClient()
      .from("examiner_aircraft_qualifications")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("examiner_profile_id", examinerProfileId)
      .eq("is_active", true);

    if (error) {
      console.error("Unable to clear aircraft:", error);
      setErrorMessage(`Your aircraft could not be cleared: ${error.message}`);
      setSavingId("");
      return;
    }

    setQualifications((existing) => {
      const next = new Map(existing);
      for (const [id, row] of next) next.set(id, { ...row, is_active: false });
      return next;
    });
    setMessage("All aircraft were cleared.");
    setSavingId("");
  }

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Settings
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Aircraft Authorized
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Check the aircraft you want to show you are qualified in. The list is
          the same FAA aircraft list applicants use when they book a test.
          Your selections are for display only and never limit which
          checkrides you can schedule.
        </p>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading your aircraft…
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">
                FAA aircraft types
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {showSelectedOnly ? "—" : totalMatches.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Matching the current search
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Selected</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {selectedCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Source</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                FAA aircraft type designators
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Same list as applicant booking
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
              <div>
                <label
                  htmlFor="aircraft-search"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Search aircraft
                </label>
                <input
                  id="aircraft-search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                  placeholder="Search Cessna 172, PA-28, C172, R44…"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="aircraft-class"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Aircraft class
                </label>
                <select
                  id="aircraft-class"
                  value={classFilter}
                  onChange={(event) => {
                    setClassFilter(event.target.value);
                    setPage(0);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 lg:w-48"
                >
                  <option value="">All classes</option>
                  {AIRCRAFT_CLASSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  onChange={(event) => setShowSelectedOnly(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300"
                />
                Show selected only
              </label>

              <button
                type="button"
                disabled={selectedCount === 0 || savingId === "clear-all"}
                onClick={() => void clearAll()}
                className="rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingId === "clear-all" ? "Clearing…" : "Clear All"}
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">FAA Aircraft List</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {showSelectedOnly
                    ? `${rows.length} selected aircraft shown`
                    : listLoading
                      ? "Searching…"
                      : `${totalMatches.toLocaleString()} aircraft match · page ${page + 1} of ${pageCount}`}
                </p>
              </div>

              {!showSelectedOnly && pageCount > 1 ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 0 || listLoading}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= pageCount || listLoading}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Aircraft
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        FAA Type
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Class
                      </th>
                      <th className="w-40 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                        Qualified
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((item) => {
                      const checked = Boolean(
                        qualifications.get(item.id)?.is_active,
                      );
                      const saving = savingId === item.id;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {item.model}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.manufacturer}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-mono text-base font-bold text-slate-900">
                              {item.type_designator}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {[item.aircraft_class, item.engine_type]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${item.manufacturer_model} qualified`}
                              checked={checked}
                              disabled={Boolean(savingId) && !saving}
                              onChange={() => void toggleAircraft(item)}
                              className="h-5 w-5 rounded border-slate-300 accent-emerald-700"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-600">
                {listLoading
                  ? "Searching…"
                  : showSelectedOnly
                    ? "You have not selected any aircraft yet."
                    : "No aircraft match the current search."}
              </div>
            )}
          </section>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            These selections only show which aircraft you are qualified in.
            They do not restrict scheduling and do not replace or modify your
            official FAA designation or authorization records.
          </p>
        </>
      )}
    </main>
  );
}
