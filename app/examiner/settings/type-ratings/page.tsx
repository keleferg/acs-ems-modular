"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type TypeRatingDesignation = {
  id: string;
  designation: string;
  is_active: boolean;
  sort_order: number;
  source_document: string;
  source_effective_date: string | null;
};

type TypeRatingAuthorization = {
  id: string;
  examiner_profile_id: string;
  type_rating_designation_id: string;
  is_active: boolean;
  authorization_notes: string | null;
};

export default function TypeRatingsSettingsPage() {
  const [designations, setDesignations] = useState<
    TypeRatingDesignation[]
  >([]);

  const [authorizations, setAuthorizations] = useState<
    Map<string, TypeRatingAuthorization>
  >(new Map());

  const [examinerProfileId, setExaminerProfileId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] =
    useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadTypeRatings = useCallback(async () => {
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

    const [designationResult, authorizationResult] =
      await Promise.all([
        supabase
          .from("faa_type_rating_designations")
          .select(`
            id,
            designation,
            is_active,
            sort_order,
            source_document,
            source_effective_date
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("designation", { ascending: true }),

        supabase
          .from("examiner_type_rating_authorizations")
          .select(`
            id,
            examiner_profile_id,
            type_rating_designation_id,
            is_active,
            authorization_notes
          `)
          .eq("examiner_profile_id", user.id),
      ]);

    if (designationResult.error) {
      console.error(
        "Unable to load FAA type ratings:",
        designationResult.error,
      );

      setErrorMessage(
        `The FAA type-rating library could not be loaded: ${designationResult.error.message}`,
      );

      setDesignations([]);
      setLoading(false);
      return;
    }

    if (authorizationResult.error) {
      console.error(
        "Unable to load examiner authorizations:",
        authorizationResult.error,
      );

      setErrorMessage(
        `Your type-rating authorizations could not be loaded: ${authorizationResult.error.message}`,
      );

      setDesignations(
        (designationResult.data ??
          []) as TypeRatingDesignation[],
      );

      setLoading(false);
      return;
    }

    const authorizationMap = new Map<
      string,
      TypeRatingAuthorization
    >();

    for (
      const authorization of
      (authorizationResult.data ??
        []) as TypeRatingAuthorization[]
    ) {
      authorizationMap.set(
        authorization.type_rating_designation_id,
        authorization,
      );
    }

    setDesignations(
      (designationResult.data ??
        []) as TypeRatingDesignation[],
    );

    setAuthorizations(authorizationMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTypeRatings();
  }, [loadTypeRatings]);

  const selectedIds = useMemo(() => {
    const ids = new Set<string>();

    for (const [designationId, authorization] of authorizations) {
      if (authorization.is_active) {
        ids.add(designationId);
      }
    }

    return ids;
  }, [authorizations]);

  const selectedCount = selectedIds.size;

  const visibleDesignations = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toUpperCase();

    return designations.filter((designation) => {
      if (
        showSelectedOnly &&
        !selectedIds.has(designation.id)
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return designation.designation
        .toUpperCase()
        .includes(normalizedSearch);
    });
  }, [
    designations,
    search,
    selectedIds,
    showSelectedOnly,
  ]);

  async function toggleAuthorization(
    designation: TypeRatingDesignation,
  ) {
    if (!examinerProfileId || savingId) return;

    setSavingId(designation.id);
    setMessage("");
    setErrorMessage("");

    const currentAuthorization =
      authorizations.get(designation.id);

    const nextActive =
      !currentAuthorization?.is_active;

    const supabase = createClient();

    const { data, error } = await supabase
      .from("examiner_type_rating_authorizations")
      .upsert(
        {
          examiner_profile_id: examinerProfileId,
          type_rating_designation_id:
            designation.id,
          is_active: nextActive,
          authorization_notes:
            currentAuthorization
              ?.authorization_notes ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "examiner_profile_id,type_rating_designation_id",
        },
      )
      .select(`
        id,
        examiner_profile_id,
        type_rating_designation_id,
        is_active,
        authorization_notes
      `)
      .single();

    if (error) {
      console.error(
        "Unable to update type-rating authorization:",
        error,
      );

      setErrorMessage(
        `The ${designation.designation} authorization could not be updated: ${error.message}`,
      );

      setSavingId("");
      return;
    }

    const savedAuthorization =
      data as TypeRatingAuthorization;

    setAuthorizations((current) => {
      const next = new Map(current);

      next.set(
        designation.id,
        savedAuthorization,
      );

      return next;
    });

    setMessage(
      `${designation.designation} is now ${
        savedAuthorization.is_active
          ? "authorized"
          : "not authorized"
      }.`,
    );

    setSavingId("");
  }

  async function clearAllSelections() {
    if (
      !examinerProfileId ||
      selectedCount === 0 ||
      savingId
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Remove all ${selectedCount} selected type-rating authorizations?`,
    );

    if (!confirmed) return;

    setSavingId("clear-all");
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("examiner_type_rating_authorizations")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("examiner_profile_id", examinerProfileId)
      .eq("is_active", true);

    if (error) {
      console.error(
        "Unable to clear type-rating authorizations:",
        error,
      );

      setErrorMessage(
        `The type-rating authorizations could not be cleared: ${error.message}`,
      );

      setSavingId("");
      return;
    }

    setAuthorizations((current) => {
      const next = new Map(current);

      for (const [id, authorization] of next) {
        next.set(id, {
          ...authorization,
          is_active: false,
        });
      }

      return next;
    });

    setMessage(
      "All type-rating authorizations were cleared.",
    );

    setSavingId("");
  }

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Settings
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Type Ratings Authorized
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Select each FAA aircraft type rating for which you
          are authorized to administer practical tests.
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
          Loading FAA type-rating library…
        </div>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">
                FAA type ratings
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {designations.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">
                Authorized
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {selectedCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">
                Source
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                FAA Order 8900.1
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Figure 5-88
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <div>
                <label
                  htmlFor="type-rating-search"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Search type ratings
                </label>

                <input
                  id="type-rating-search"
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search A-320, B-737, CE-525S…"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  onChange={(event) =>
                    setShowSelectedOnly(
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 rounded border-slate-300"
                />

                Show selected only
              </label>

              <button
                type="button"
                disabled={
                  selectedCount === 0 ||
                  savingId === "clear-all"
                }
                onClick={() =>
                  void clearAllSelections()
                }
                className="rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingId === "clear-all"
                  ? "Clearing…"
                  : "Clear All"}
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  FAA Type-Rating Library
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {visibleDesignations.length} ratings shown
                </p>
              </div>

              <p className="text-sm font-semibold text-emerald-700">
                {selectedCount} selected
              </p>
            </div>

            {visibleDesignations.length > 0 ? (
              <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
                {visibleDesignations.map(
                  (designation) => {
                    const selected =
                      selectedIds.has(designation.id);

                    const saving =
                      savingId === designation.id;

                    return (
                      <label
                        key={designation.id}
                        className={`flex cursor-pointer items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 transition ${
                          selected
                            ? "bg-emerald-50"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <p
                            className={`font-mono text-base font-bold ${
                              selected
                                ? "text-emerald-900"
                                : "text-slate-900"
                            }`}
                          >
                            {designation.designation}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {selected
                              ? "Authorized"
                              : "Not selected"}
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={
                            Boolean(savingId) && !saving
                          }
                          onChange={() =>
                            void toggleAuthorization(
                              designation,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 accent-emerald-700"
                        />
                      </label>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-600">
                No type ratings match the current search.
              </div>
            )}
          </section>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Selecting a type rating records it as an examiner
            authorization in this system. It does not replace
            or modify the examiner&apos;s official FAA
            designation or authorization records.
          </p>
        </>
      ) : null}
    </main>
  );
}
