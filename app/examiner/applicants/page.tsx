"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RequestRow = {
  id: string;
  request_number: string;
  applicant_profile_id: string | null;
  applicant_name_snapshot: string;
  applicant_email_snapshot: string;
  applicant_phone_snapshot: string | null;
  ftn_number_snapshot: string | null;
  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  status: string;
  scheduled_start_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type ApplicantGroup = {
  key: string;
  profileHrefId: string;
  name: string;
  email: string;
  phone: string | null;
  ftn: string | null;
  requests: RequestRow[];
  appointmentCount: number;
  completedCount: number;
  lastInteractionAt: string | null;
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function applicantKey(request: RequestRow) {
  if (request.applicant_profile_id)
    return `profile:${request.applicant_profile_id}`;
  if (normalize(request.applicant_email_snapshot))
    return `email:${normalize(request.applicant_email_snapshot)}`;
  if (normalize(request.ftn_number_snapshot))
    return `ftn:${normalize(request.ftn_number_snapshot)}`;
  return `legacy:${normalize(request.applicant_name_snapshot)}:${normalize(request.applicant_phone_snapshot)}`;
}

function latestDate(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not specified";
}

export default function ExaminerApplicantsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPageError(
        "Your login session could not be verified. Please sign in again.",
      );
      setLoading(false);
      return;
    }

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", user.id)
      .in("role", ["examiner", "administrator"]);

    if (roleError || !roleRows?.length) {
      setPageError(
        roleError?.message ?? "Examiner or administrator access is required.",
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("practical_test_requests")
      .select(
        `
        id, request_number, applicant_profile_id,
        applicant_name_snapshot, applicant_email_snapshot,
        applicant_phone_snapshot, ftn_number_snapshot,
        certificate_sought, category_sought, class_sought, rating_sought,
        status, scheduled_start_at, submitted_at, completed_at, created_at
      `,
      )
      .eq("assigned_examiner_profile_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setPageError(`Applicants could not be loaded: ${error.message}`);
      setRequests([]);
    } else {
      setRequests((data ?? []) as RequestRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadApplicants();
  }, [loadApplicants]);

  const applicants = useMemo<ApplicantGroup[]>(() => {
    const grouped = new Map<string, RequestRow[]>();
    for (const request of requests) {
      const key = applicantKey(request);
      grouped.set(key, [...(grouped.get(key) ?? []), request]);
    }

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const sorted = [...rows].sort(
          (a, b) =>
            new Date(
              latestDate([
                b.completed_at,
                b.scheduled_start_at,
                b.submitted_at,
                b.created_at,
              ]) ?? 0,
            ).getTime() -
            new Date(
              latestDate([
                a.completed_at,
                a.scheduled_start_at,
                a.submitted_at,
                a.created_at,
              ]) ?? 0,
            ).getTime(),
        );
        const latest = sorted[0];
        return {
          key,
          profileHrefId: latest.applicant_profile_id ?? `request-${latest.id}`,
          name: latest.applicant_name_snapshot,
          email: latest.applicant_email_snapshot,
          phone: latest.applicant_phone_snapshot,
          ftn: latest.ftn_number_snapshot,
          requests: sorted,
          appointmentCount: sorted.filter((item) => item.scheduled_start_at)
            .length,
          completedCount: sorted.filter((item) => item.status === "completed")
            .length,
          lastInteractionAt: latestDate(
            sorted.flatMap((item) => [
              item.completed_at,
              item.scheduled_start_at,
              item.submitted_at,
              item.created_at,
            ]),
          ),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  const visibleApplicants = useMemo(() => {
    const query = normalize(search);
    if (!query) return applicants;
    return applicants.filter((applicant) =>
      normalize(
        [
          applicant.name,
          applicant.email,
          applicant.phone,
          applicant.ftn,
          ...applicant.requests.flatMap((request) => [
            request.request_number,
            request.certificate_sought,
            request.category_sought,
            request.class_sought,
            request.rating_sought,
          ]),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    );
  }, [applicants, search]);

  const totalAppointments = applicants.reduce(
    (sum, item) => sum + item.appointmentCount,
    0,
  );
  const totalCompleted = applicants.reduce(
    (sum, item) => sum + item.completedCount,
    0,
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Examiner Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Applicants
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Search applicants you have interacted with and open their profile,
            test history, and private examiner notes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadApplicants()}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Applicants", applicants.length],
          ["Appointments", totalAppointments],
          ["Completed Tests", totalCompleted],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="applicant-search"
          className="text-sm font-bold text-slate-900"
        >
          Search applicants
        </label>
        <input
          id="applicant-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, email, phone, FTN, request number, certificate, or rating"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
        />
      </section>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading applicants…
        </div>
      ) : null}
      {!loading && !visibleApplicants.length ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-4 font-semibold">
            No applicants match the current search.
          </p>
        </div>
      ) : null}

      {!loading && visibleApplicants.length ? (
        <div className="mt-6 space-y-3">
          {visibleApplicants.map((applicant) => (
            <article
              key={applicant.key}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="grid gap-4 md:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1.2fr)_90px_110px_135px_180px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">
                    {applicant.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    FTN: {displayValue(applicant.ftn)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">
                    {applicant.email}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {displayValue(applicant.phone)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Requests
                  </p>
                  <p className="mt-1 font-bold">{applicant.requests.length}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Appointments
                  </p>
                  <p className="mt-1 font-bold">{applicant.appointmentCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Completed Tests
                  </p>
                  <p className="mt-1 font-bold">{applicant.completedCount}</p>
                </div>
                <div className="md:text-right">
                  <p className="mb-2 text-xs text-slate-500">
                    {formatDateTime(applicant.lastInteractionAt)}
                  </p>
                  <Link
                    href={`/examiner/applicants/${encodeURIComponent(applicant.profileHrefId)}`}
                    className="inline-flex whitespace-nowrap rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    View Applicant Profile
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </main>
  );
}
