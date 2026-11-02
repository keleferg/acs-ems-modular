"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ExperimentalDesignation = {
  id: string;
  designation: string;
  faa_group: string;
  group_sort: number;
  group_name: string;
  manufacturer: string;
  model_designation: string;
  current_type_designation: string | null;
  engines: string | null;
  gear_or_wing: string | null;
  sort_order: number;
};

type ExperimentalAuthorization = {
  id: string;
  examiner_profile_id: string;
  experimental_designation_id: string;
  is_active: boolean;
  authorization_notes: string | null;
};

const AUTHORIZATION_COLUMNS = `
  id,
  examiner_profile_id,
  experimental_designation_id,
  is_active,
  authorization_notes
`;

export default function ExperimentalAircraftSettingsPage() {
  const [designations, setDesignations] = useState<ExperimentalDesignation[]>(
    [],
  );
  const [authorizations, setAuthorizations] = useState<
    Map<string, ExperimentalAuthorization>
  >(new Map());
  const [examinerProfileId, setExaminerProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDesignations = useCallback(async () => {
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

    const [designationResult, authorizationResult] = await Promise.all([
      supabase
        .from("faa_experimental_aircraft_designations")
        .select(
          `
            id,
            designation,
            faa_group,
            group_sort,
            group_name,
            manufacturer,
            model_designation,
            current_type_designation,
            engines,
            gear_or_wing,
            sort_order
          `,
        )
        .eq("is_active", true)
        .order("group_sort", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("examiner_experimental_aircraft_authorizations")
        .select(AUTHORIZATION_COLUMNS)
        .eq("examiner_profile_id", user.id),
    ]);

    if (designationResult.error) {
      console.error(
        "Unable to load experimental aircraft designations:",
        designationResult.error,
      );
      setErrorMessage(
        `The FAA experimental aircraft list could not be loaded: ${designationResult.error.message}`,
      );
      setDesignations([]);
      setLoading(false);
      return;
    }

    if (authorizationResult.error) {
      console.error(
        "Unable to load experimental aircraft authorizations:",
        authorizationResult.error,
      );
      setErrorMessage(
        `Your experimental aircraft authorizations could not be loaded: ${authorizationResult.error.message}`,
      );
      setDesignations(
        (designationResult.data ?? []) as ExperimentalDesignation[],
      );
      setLoading(false);
      return;
    }

    const authorizationMap = new Map<string, ExperimentalAuthorization>();
    for (const authorization of (authorizationResult.data ??
      []) as ExperimentalAuthorization[]) {
      authorizationMap.set(
        authorization.experimental_designation_id,
        authorization,
      );
    }

    setDesignations(
      (designationResult.data ?? []) as ExperimentalDesignation[],
    );
    setAuthorizations(authorizationMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDesignations();
  }, [loadDesignations]);

  const selectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [designationId, authorization] of authorizations) {
      if (authorization.is_active) ids.add(designationId);
    }
    return ids;
  }, [authorizations]);

  const selectedCount = selectedIds.size;

  const groups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const designation of designations) {
      if (!seen.has(designation.faa_group)) {
        seen.set(designation.faa_group, designation.group_name);
      }
    }
    return Array.from(seen, ([code, name]) => ({ code, name }));
  }, [designations]);

  const visibleDesignations = useMemo(() => {
    const normalizedSearch = search.trim().toUpperCase();

    return designations.filter((designation) => {
      if (showSelectedOnly && !selectedIds.has(designation.id)) return false;
      if (groupFilter && designation.faa_group !== groupFilter) return false;
      if (!normalizedSearch) return true;

      return [
        designation.designation,
        designation.manufacturer,
        designation.model_designation,
        designation.current_type_designation ?? "",
      ].some((value) => value.toUpperCase().includes(normalizedSearch));
    });
  }, [designations, groupFilter, search, selectedIds, showSelectedOnly]);

  async function toggleAuthorization(designation: ExperimentalDesignation) {
    if (!examinerProfileId || savingId) return;

    setSavingId(designation.id);
    setMessage("");
    setErrorMessage("");

    const currentAuthorization = authorizations.get(designation.id);
    const nextActive = !currentAuthorization?.is_active;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("examiner_experimental_aircraft_authorizations")
      .upsert(
        {
          examiner_profile_id: examinerProfileId,
          experimental_designation_id: designation.id,
          is_active: nextActive,
          authorization_notes:
            currentAuthorization?.authorization_notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "examiner_profile_id,experimental_designation_id" },
      )
      .select(AUTHORIZATION_COLUMNS)
      .single();

    if (error) {
      console.error(
        "Unable to update experimental aircraft authorization:",
        error,
      );
      setErrorMessage(
        `The ${designation.designation} authorization could not be updated: ${error.message}`,
      );
      setSavingId("");
      return;
    }

    const savedAuthorization = data as ExperimentalAuthorization;

    setAuthorizations((current) => {
      const next = new Map(current);
      next.set(designation.id, savedAuthorization);
      return next;
    });

    setMessage(
      `${designation.designation} (${designation.model_designation}) is now ${
        savedAuthorization.is_active ? "authorized" : "not authorized"
      }.`,
    );
    setSavingId("");
  }

  async function clearAllSelections() {
    if (!examinerProfileId || selectedCount === 0 || savingId) return;

    const confirmed = window.confirm(
      `Remove all ${selectedCount} selected experimental aircraft authorizations?`,
    );
    if (!confirmed) return;

    setSavingId("clear-all");
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("examiner_experimental_aircraft_authorizations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("examiner_profile_id", examinerProfileId)
      .eq("is_active", true);

    if (error) {
      console.error(
        "Unable to clear experimental aircraft authorizations:",
        error,
      );
      setErrorMessage(
        `The experimental aircraft authorizations could not be cleared: ${error.message}`,
      );
      setSavingId("");
      return;
    }

    setAuthorizations((current) => {
      const next = new Map(current);
      for (const [id, authorization] of next) {
        next.set(id, { ...authorization, is_active: false });
      }
      return next;
    });

    setMessage("All experimental aircraft authorizations were cleared.");
    setSavingId("");
  }

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Settings
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Authorized Experimental Aircraft
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Select each FAA experimental aircraft designation for which you are
          authorized to administer practical tests.
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
          Loading FAA experimental aircraft list…
        </div>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">
                FAA experimental designations
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {designations.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Authorized</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {selectedCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Source</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                FAA Experimental Aircraft Examiner Designations
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Revised 10/20/2023
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
              <div>
                <label
                  htmlFor="experimental-aircraft-search"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Search experimental aircraft
                </label>
                <input
                  id="experimental-aircraft-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search N-P51, L-39, Mustang, Grumman…"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="experimental-aircraft-group"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  FAA group
                </label>
                <select
                  id="experimental-aircraft-group"
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 lg:w-72"
                >
                  <option value="">All groups</option>
                  {groups.map((group) => (
                    <option key={group.code} value={group.code}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  onChange={(event) =>
                    setShowSelectedOnly(event.target.checked)
                  }
                  className="h-5 w-5 rounded border-slate-300"
                />
                Show selected only
              </label>

              <button
                type="button"
                disabled={selectedCount === 0 || savingId === "clear-all"}
                onClick={() => void clearAllSelections()}
                className="rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingId === "clear-all" ? "Clearing…" : "Clear All"}
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  FAA Experimental Aircraft Library
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {visibleDesignations.length} aircraft shown
                </p>
              </div>
            </div>

            {visibleDesignations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Experimental Designation
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Aircraft
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Engines · Gear/Wing
                      </th>
                      <th className="w-40 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                        Authorized
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleDesignations.map((designation, index) => {
                      const previous = visibleDesignations[index - 1];
                      const startsGroup =
                        !previous ||
                        previous.faa_group !== designation.faa_group;
                      const selected = selectedIds.has(designation.id);
                      const saving = savingId === designation.id;

                      return (
                        <Fragment key={designation.id}>
                          {startsGroup ? (
                            <tr className="bg-amber-50">
                              <td
                                colSpan={4}
                                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-amber-800"
                              >
                                {designation.group_name}
                              </td>
                            </tr>
                          ) : null}

                          <tr className="hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <p className="font-mono text-base font-bold text-slate-900">
                                {designation.designation}
                              </p>
                              {designation.current_type_designation ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  Current type:{" "}
                                  <span className="font-mono">
                                    {designation.current_type_designation}
                                  </span>
                                </p>
                              ) : null}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {designation.model_designation}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {designation.manufacturer}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {[designation.engines, designation.gear_or_wing]
                                .filter((value) => value && value !== "N/A")
                                .join(" · ") || "—"}
                            </td>

                            <td className="px-5 py-4 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${designation.designation} ${designation.model_designation} authorization`}
                                checked={selected}
                                disabled={Boolean(savingId) && !saving}
                                onChange={() =>
                                  void toggleAuthorization(designation)
                                }
                                className="h-5 w-5 rounded border-slate-300 accent-emerald-700"
                              />
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-600">
                No experimental aircraft match the current search.
              </div>
            )}
          </section>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Selecting an aircraft records it as an examiner authorization in
            this system. It does not replace or modify the examiner&apos;s
            official FAA designation or authorization records.
          </p>
        </>
      ) : null}
    </main>
  );
}
