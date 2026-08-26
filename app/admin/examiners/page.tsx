"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  phone: string | null;
  is_active: boolean;
};

type DesigneeProfile = {
  profile_id: string;
  designee_name: string | null;
  business_name: string | null;
  designation_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  mailing_address_city: string | null;
  mailing_address_state: string | null;
};

type PracticalTestRequest = {
  assigned_examiner_profile_id: string | null;
  status: string;
  scheduled_start_at: string | null;
};

type ExaminerRow = {
  profile: Profile;
  designee: DesigneeProfile | null;
  upcomingCount: number;
  completedCount: number;
};

function profileName(profile: Profile) {
  const preferred = profile.preferred_name?.trim();
  const first = preferred || profile.first_name?.trim();
  const last = profile.last_name?.trim();

  return [first, last].filter(Boolean).join(" ") || profile.email || "Unnamed examiner";
}

function examinerName(row: ExaminerRow) {
  return row.designee?.designee_name?.trim() || profileName(row.profile);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function AdminExaminersPage() {
  const [rows, setRows] = useState<ExaminerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadExaminers() {
      setLoading(true);
      setPageError("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setPageError(
          "Your login session could not be verified. Please sign in again.",
        );
        setLoading(false);
        return;
      }

      const { data: adminRoles, error: adminRoleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", user.id)
        .eq("role", "administrator");

      if (cancelled) return;

      if (adminRoleError) {
        setPageError(
          `Administrator access could not be verified: ${adminRoleError.message}`,
        );
        setLoading(false);
        return;
      }

      if (!adminRoles || adminRoles.length === 0) {
        setPageError("Administrator access is required.");
        setLoading(false);
        return;
      }

      const { data: examinerRoles, error: examinerRoleError } = await supabase
        .from("user_roles")
        .select("profile_id")
        .eq("role", "examiner");

      if (cancelled) return;

      if (examinerRoleError) {
        setPageError(
          `Examiner roles could not be loaded: ${examinerRoleError.message}`,
        );
        setLoading(false);
        return;
      }

      const examinerIds = [
        ...new Set(
          (examinerRoles ?? [])
            .map((row) => row.profile_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      if (examinerIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const [
        profilesResult,
        designeeResult,
        requestsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            email,
            first_name,
            last_name,
            preferred_name,
            phone,
            is_active
          `)
          .in("id", examinerIds),

        supabase
          .from("examiner_designee_profiles")
          .select(`
            profile_id,
            designee_name,
            business_name,
            designation_number,
            email,
            phone,
            website,
            mailing_address_city,
            mailing_address_state
          `)
          .in("profile_id", examinerIds),

        supabase
          .from("practical_test_requests")
          .select(`
            assigned_examiner_profile_id,
            status,
            scheduled_start_at
          `)
          .in("assigned_examiner_profile_id", examinerIds),
      ]);

      if (cancelled) return;

      if (profilesResult.error) {
        setPageError(
          `Examiner profiles could not be loaded: ${profilesResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      if (designeeResult.error) {
        setPageError(
          `Designee profiles could not be loaded: ${designeeResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      if (requestsResult.error) {
        setPageError(
          `Examiner activity could not be loaded: ${requestsResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      const profiles = (profilesResult.data ?? []) as Profile[];
      const designees = (designeeResult.data ?? []) as DesigneeProfile[];
      const requests = (requestsResult.data ?? []) as PracticalTestRequest[];

      const designeeByProfile = new Map(
        designees.map((item) => [item.profile_id, item]),
      );

      const now = Date.now();

      const nextRows = profiles
        .map((profile): ExaminerRow => {
          const examinerRequests = requests.filter(
            (request) =>
              request.assigned_examiner_profile_id === profile.id,
          );

          const upcomingCount = examinerRequests.filter((request) => {
            if (!request.scheduled_start_at) return false;

            const start = new Date(request.scheduled_start_at).getTime();

            return (
              Number.isFinite(start) &&
              start >= now &&
              ![
                "completed",
                "cancelled",
                "cancelled_by_applicant",
                "cancelled_by_examiner",
                "declined",
                "no_show",
              ].includes(request.status)
            );
          }).length;

          const completedCount = examinerRequests.filter(
            (request) => request.status === "completed",
          ).length;

          return {
            profile,
            designee: designeeByProfile.get(profile.id) ?? null,
            upcomingCount,
            completedCount,
          };
        })
        .sort((left, right) =>
          examinerName(left).localeCompare(examinerName(right)),
        );

      setRows(nextRows);
      setLoading(false);
    }

    void loadExaminers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        statusFilter === "active" &&
        !row.profile.is_active
      ) {
        return false;
      }

      if (
        statusFilter === "inactive" &&
        row.profile.is_active
      ) {
        return false;
      }

      if (!normalized) return true;

      return [
        examinerName(row),
        row.profile.email,
        row.profile.phone,
        row.designee?.email,
        row.designee?.phone,
        row.designee?.business_name,
        row.designee?.designation_number,
        row.designee?.mailing_address_city,
        row.designee?.mailing_address_state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((row) => row.profile.is_active).length;
  const inactiveCount = rows.length - activeCount;
  const incompleteCount = rows.filter(
    (row) =>
      !row.designee ||
      !row.designee.designee_name?.trim() ||
      !row.designee.designation_number?.trim(),
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-800">
          <CalendarCheck aria-hidden className="h-6 w-6" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Administrator Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Examiners
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Manage examiner identities, designee information, access,
            authorizations, activity, and scheduling configuration.
          </p>
        </div>
      </div>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Total Examiners
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {rows.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">
            Active
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Inactive
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {inactiveCount}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-700">
            Profile Incomplete
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-950">
            {incompleteCount}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Examiner Directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredRows.length} examiner
                {filteredRows.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block min-w-0 sm:w-80">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search examiners…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | "active"
                      | "inactive",
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Loading examiners…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No examiners match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredRows.map((row) => {
              const name = examinerName(row);
              const email =
                row.designee?.email?.trim() ||
                row.profile.email?.trim() ||
                "";
              const phone =
                row.designee?.phone?.trim() ||
                row.profile.phone?.trim() ||
                "";

              const profileComplete = Boolean(
                row.designee?.designee_name?.trim() &&
                  row.designee?.designation_number?.trim(),
              );

              return (
                <article
                  key={row.profile.id}
                  className="px-5 py-5 hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-800">
                        {initials(name) || (
                          <UserRound className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-950">
                            {name}
                          </h3>

                          {row.profile.is_active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                              Inactive
                            </span>
                          )}

                          {profileComplete ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[11px] font-bold text-sky-800">
                              <ShieldCheck className="h-3 w-3" />
                              Designee Profile Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                              <CircleAlert className="h-3 w-3" />
                              Profile Incomplete
                            </span>
                          )}
                        </div>

                        {row.designee?.business_name ? (
                          <p className="mt-1 text-sm font-medium text-slate-600">
                            {row.designee.business_name}
                          </p>
                        ) : null}

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                          {email ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {email}
                            </span>
                          ) : null}

                          {phone ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {phone}
                            </span>
                          ) : null}

                          {row.designee?.designation_number ? (
                            <span>
                              DPE #{row.designee.designation_number}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
                        <p className="text-lg font-bold text-slate-950">
                          {row.upcomingCount}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Upcoming
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
                        <p className="text-lg font-bold text-slate-950">
                          {row.completedCount}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Completed
                        </p>
                      </div>

                      <Link
                        href={`/admin/examiners/${row.profile.id}`}
                        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-3 text-sm font-bold text-white hover:bg-sky-800 sm:col-span-1"
                      >
                        Manage
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
