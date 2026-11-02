"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const VINTAGE_SOURCE_DOCUMENT =
  "FAA Vintage Aircraft Examiner Designations (10/13/2022)";

type VintageGroup = {
  code: string;
  name: string;
  description: string;
  sort_order: number;
};

type VintageTypeRating = {
  id: string;
  designation: string;
  manufacturer: string;
  model_designation: string;
  note: string | null;
  sort_order: number;
  faa_vintage_type_rating_groups: { group_code: string }[] | null;
};

type RatingAuthorization = {
  id: string;
  vintage_type_rating_id: string;
  is_active: boolean;
};

type GroupAuthorization = {
  id: string;
  group_code: string;
  is_active: boolean;
};

function groupCodes(rating: VintageTypeRating) {
  return (rating.faa_vintage_type_rating_groups ?? []).map(
    (link) => link.group_code,
  );
}

export function useVintageTypeRatings(examinerProfileId: string) {
  const [groups, setGroups] = useState<VintageGroup[]>([]);
  const [ratings, setRatings] = useState<VintageTypeRating[]>([]);
  const [ratingAuthorizations, setRatingAuthorizations] = useState<
    Map<string, RatingAuthorization>
  >(new Map());
  const [groupAuthorizations, setGroupAuthorizations] = useState<
    Map<string, GroupAuthorization>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    if (!examinerProfileId) return;

    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const [groupResult, ratingResult, ratingAuthResult, groupAuthResult] =
      await Promise.all([
        supabase
          .from("faa_vintage_aircraft_groups")
          .select("code, name, description, sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("faa_vintage_type_ratings")
          .select(
            `
              id,
              designation,
              manufacturer,
              model_designation,
              note,
              sort_order,
              faa_vintage_type_rating_groups ( group_code )
            `,
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("examiner_vintage_type_rating_authorizations")
          .select("id, vintage_type_rating_id, is_active")
          .eq("examiner_profile_id", examinerProfileId),
        supabase
          .from("examiner_vintage_group_authorizations")
          .select("id, group_code, is_active")
          .eq("examiner_profile_id", examinerProfileId),
      ]);

    const failed =
      groupResult.error ||
      ratingResult.error ||
      ratingAuthResult.error ||
      groupAuthResult.error;

    if (failed) {
      console.error("Unable to load vintage type ratings:", failed);
      setErrorMessage(
        `The Vintage Aircraft Type-Rating Library could not be loaded: ${failed.message}`,
      );
      setLoading(false);
      return;
    }

    setGroups((groupResult.data ?? []) as VintageGroup[]);
    setRatings((ratingResult.data ?? []) as VintageTypeRating[]);

    const ratingMap = new Map<string, RatingAuthorization>();
    for (const row of (ratingAuthResult.data ?? []) as RatingAuthorization[]) {
      ratingMap.set(row.vintage_type_rating_id, row);
    }
    setRatingAuthorizations(ratingMap);

    const groupMap = new Map<string, GroupAuthorization>();
    for (const row of (groupAuthResult.data ?? []) as GroupAuthorization[]) {
      groupMap.set(row.group_code, row);
    }
    setGroupAuthorizations(groupMap);

    setLoading(false);
  }, [examinerProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const authorizedGroupCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const [code, row] of groupAuthorizations) {
      if (row.is_active) codes.add(code);
    }
    return codes;
  }, [groupAuthorizations]);

  /** Group that covers this rating, if any of its groups is checked. */
  const coveringGroup = useCallback(
    (rating: VintageTypeRating) =>
      groupCodes(rating).find((code) => authorizedGroupCodes.has(code)) ??
      null,
    [authorizedGroupCodes],
  );

  const isAuthorized = useCallback(
    (rating: VintageTypeRating) =>
      Boolean(coveringGroup(rating)) ||
      Boolean(ratingAuthorizations.get(rating.id)?.is_active),
    [coveringGroup, ratingAuthorizations],
  );

  const authorizedCount = useMemo(
    () => ratings.filter((rating) => isAuthorized(rating)).length,
    [isAuthorized, ratings],
  );

  async function toggleRating(rating: VintageTypeRating) {
    if (!examinerProfileId || savingKey) return;

    setSavingKey(`rating:${rating.id}`);
    setMessage("");
    setErrorMessage("");

    const current = ratingAuthorizations.get(rating.id);
    const nextActive = !current?.is_active;

    const { data, error } = await createClient()
      .from("examiner_vintage_type_rating_authorizations")
      .upsert(
        {
          examiner_profile_id: examinerProfileId,
          vintage_type_rating_id: rating.id,
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "examiner_profile_id,vintage_type_rating_id" },
      )
      .select("id, vintage_type_rating_id, is_active")
      .single();

    if (error) {
      console.error("Unable to update vintage type rating:", error);
      setErrorMessage(
        `The ${rating.designation} authorization could not be updated: ${error.message}`,
      );
      setSavingKey("");
      return;
    }

    setRatingAuthorizations((existing) => {
      const next = new Map(existing);
      next.set(rating.id, data as RatingAuthorization);
      return next;
    });
    setMessage(
      `${rating.designation} is now ${nextActive ? "authorized" : "not authorized"}.`,
    );
    setSavingKey("");
  }

  async function toggleGroup(group: VintageGroup) {
    if (!examinerProfileId || savingKey) return;

    setSavingKey(`group:${group.code}`);
    setMessage("");
    setErrorMessage("");

    const current = groupAuthorizations.get(group.code);
    const nextActive = !current?.is_active;

    const { data, error } = await createClient()
      .from("examiner_vintage_group_authorizations")
      .upsert(
        {
          examiner_profile_id: examinerProfileId,
          group_code: group.code,
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "examiner_profile_id,group_code" },
      )
      .select("id, group_code, is_active")
      .single();

    if (error) {
      console.error("Unable to update vintage group:", error);
      setErrorMessage(
        `The ${group.name} authorization could not be updated: ${error.message}`,
      );
      setSavingKey("");
      return;
    }

    setGroupAuthorizations((existing) => {
      const next = new Map(existing);
      next.set(group.code, data as GroupAuthorization);
      return next;
    });
    setMessage(
      nextActive
        ? `${group.name} is authorized. Every vintage type rating in ${group.name} is now offered.`
        : `${group.name} is no longer authorized as a whole group.`,
    );
    setSavingKey("");
  }

  async function clearAll() {
    if (!examinerProfileId || savingKey) return false;

    setSavingKey("clear-all");
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();
    const now = new Date().toISOString();

    const [ratingResult, groupResult] = await Promise.all([
      supabase
        .from("examiner_vintage_type_rating_authorizations")
        .update({ is_active: false, updated_at: now })
        .eq("examiner_profile_id", examinerProfileId)
        .eq("is_active", true),
      supabase
        .from("examiner_vintage_group_authorizations")
        .update({ is_active: false, updated_at: now })
        .eq("examiner_profile_id", examinerProfileId)
        .eq("is_active", true),
    ]);

    const failed = ratingResult.error || groupResult.error;
    if (failed) {
      console.error("Unable to clear vintage authorizations:", failed);
      setErrorMessage(
        `The vintage type-rating authorizations could not be cleared: ${failed.message}`,
      );
      setSavingKey("");
      return false;
    }

    setRatingAuthorizations((existing) => {
      const next = new Map(existing);
      for (const [id, row] of next) next.set(id, { ...row, is_active: false });
      return next;
    });
    setGroupAuthorizations((existing) => {
      const next = new Map(existing);
      for (const [code, row] of next) {
        next.set(code, { ...row, is_active: false });
      }
      return next;
    });
    setMessage("All vintage type-rating authorizations were cleared.");
    setSavingKey("");
    return true;
  }

  return {
    groups,
    ratings,
    loading,
    savingKey,
    message,
    errorMessage,
    authorizedGroupCodes,
    authorizedCount,
    selectionCount:
      authorizedGroupCodes.size +
      Array.from(ratingAuthorizations.values()).filter((row) => row.is_active)
        .length,
    coveringGroup,
    isAuthorized,
    toggleRating,
    toggleGroup,
    clearAll,
  };
}

export type VintageState = ReturnType<typeof useVintageTypeRatings>;

export function VintageLibraryTable({
  vintage,
  search,
  showSelectedOnly,
}: {
  vintage: VintageState;
  search: string;
  showSelectedOnly: boolean;
}) {
  const normalizedSearch = search.trim().toUpperCase();

  const sections = useMemo(() => {
    return vintage.groups
      .map((group) => {
        const groupChecked = vintage.authorizedGroupCodes.has(group.code);
        const rows = vintage.ratings.filter((rating) => {
          if (!groupCodes(rating).includes(group.code)) return false;
          if (showSelectedOnly && !vintage.isAuthorized(rating)) return false;
          if (!normalizedSearch) return true;
          return [
            rating.designation,
            rating.manufacturer,
            rating.model_designation,
            group.name,
          ].some((value) => value.toUpperCase().includes(normalizedSearch));
        });
        return { group, groupChecked, rows };
      })
      .filter((section) => section.rows.length > 0);
  }, [normalizedSearch, showSelectedOnly, vintage]);

  const shownCount = sections.reduce(
    (total, section) => total + section.rows.length,
    0,
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-900">
            Vintage Aircraft Type-Rating Library
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {shownCount} ratings shown. Check a group to authorize every type
            rating in it.
          </p>
        </div>
      </div>

      {vintage.loading ? (
        <div className="p-10 text-center text-slate-600">
          Loading Vintage Aircraft Type-Rating Library…
        </div>
      ) : sections.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Type Rating Designation
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Aircraft
                </th>
                <th className="w-48 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                  Type Rating
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sections.map(({ group, groupChecked, rows }) => {
                const savingGroup = vintage.savingKey === `group:${group.code}`;

                return (
                  <Fragment key={group.code}>
                    <tr className="bg-amber-50">
                      <td colSpan={2} className="px-5 py-3">
                        <p className="text-sm font-bold uppercase tracking-wider text-amber-900">
                          {group.name}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-800">
                          {group.description}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                          <input
                            type="checkbox"
                            aria-label={`Authorize all of ${group.name}`}
                            checked={groupChecked}
                            disabled={Boolean(vintage.savingKey) && !savingGroup}
                            onChange={() => void vintage.toggleGroup(group)}
                            className="h-5 w-5 rounded border-slate-300 accent-emerald-700"
                          />
                          Entire group
                        </label>
                      </td>
                    </tr>

                    {rows.map((rating) => {
                      const covering = vintage.coveringGroup(rating);
                      const checked = vintage.isAuthorized(rating);
                      const saving =
                        vintage.savingKey === `rating:${rating.id}`;
                      const coveringName = covering
                        ? (vintage.groups.find((g) => g.code === covering)
                            ?.name ?? `Group ${covering}`)
                        : "";

                      return (
                        <tr
                          key={`${group.code}-${rating.id}`}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-mono text-base font-bold text-slate-900">
                              {rating.designation}
                            </p>
                            {rating.note ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {rating.note}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {rating.model_designation}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {rating.manufacturer}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${rating.designation} vintage type-rating authorization`}
                              checked={checked}
                              disabled={
                                Boolean(covering) ||
                                (Boolean(vintage.savingKey) && !saving)
                              }
                              onChange={() => void vintage.toggleRating(rating)}
                              className="h-5 w-5 rounded border-slate-300 accent-emerald-700 disabled:opacity-60"
                            />
                            {covering ? (
                              <p className="mt-1 text-xs text-emerald-700">
                                Included with {coveringName}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-10 text-center text-slate-600">
          No vintage type ratings match the current search.
        </div>
      )}
    </>
  );
}
