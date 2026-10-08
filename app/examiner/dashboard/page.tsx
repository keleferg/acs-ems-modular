"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DashboardRequest = {
  id: string;
  request_number: string;
  status: string;
  applicant_name_snapshot: string;
  certificate_sought: string;
  rating_sought: string;
  submitted_at: string | null;
  created_at: string;
  accepted_at: string | null;
  scheduled_start_at: string | null;
  scheduled_location: string | null;
  dms_preapproval_number: string | null;
};

const closedStatuses = new Set([
  "completed",
  "declined",
  "cancelled",
  "cancelled_by_applicant",
  "cancelled_by_examiner",
  "no_show",
]);

const attentionStatuses = new Set([
  "submitted",
  "under_review",
  "awaiting_applicant_information",
  "accepted",
  "scheduling",
  "reschedule_required",
]);

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClasses(status: string) {
  switch (status) {
    case "submitted":
    case "under_review":
      return "border-sky-200 bg-sky-50 text-sky-800";

    case "accepted":
    case "scheduled":
    case "confirmed":
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "awaiting_applicant_information":
    case "scheduling":
    case "reschedule_required":
      return "border-amber-200 bg-amber-50 text-amber-800";

    case "declined":
    case "cancelled":
    case "cancelled_by_applicant":
    case "cancelled_by_examiner":
    case "no_show":
      return "border-red-200 bg-red-50 text-red-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getHoursUntilAppointment(request: DashboardRequest, now: number) {
  if (!request.scheduled_start_at) {
    return null;
  }

  const appointmentTime = new Date(request.scheduled_start_at).getTime();

  if (Number.isNaN(appointmentTime)) {
    return null;
  }

  return (appointmentTime - now) / (1000 * 60 * 60);
}

function needsDmsAttention(request: DashboardRequest, now: number) {
  if (!request.scheduled_start_at || closedStatuses.has(request.status)) {
    return false;
  }

  const hoursUntilAppointment = getHoursUntilAppointment(request, now);

  if (hoursUntilAppointment === null) {
    return false;
  }

  return (
    hoursUntilAppointment <= 72 &&
    hoursUntilAppointment >= 0 &&
    !request.dms_preapproval_number?.trim()
  );
}

function dmsWarningClasses(request: DashboardRequest, now: number) {
  if (!needsDmsAttention(request, now)) {
    return "border-slate-200 bg-white";
  }

  const hoursUntilAppointment = getHoursUntilAppointment(request, now);

  if (hoursUntilAppointment !== null && hoursUntilAppointment <= 48) {
    return "border-red-300 bg-red-50";
  }

  return "border-amber-300 bg-amber-50";
}

export default function ExaminerDashboardPage() {
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [clock, setClock] = useState(0);

  const loadDashboard = useCallback(async () => {
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

    if (roleError) {
      setPageError(
        `Your examiner access could not be verified: ${roleError.message}`,
      );
      setLoading(false);
      return;
    }

    if (!roleRows || roleRows.length === 0) {
      setPageError("Examiner or administrator access is required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("practical_test_requests")
      .select(
        `
        id,
        request_number,
        status,
        applicant_name_snapshot,
        certificate_sought,
        rating_sought,
        submitted_at,
        created_at,
        accepted_at,
        scheduled_start_at,
        scheduled_location,
        dms_preapproval_number
      `,
      )
      .order("submitted_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setPageError(`Dashboard data could not be loaded: ${error.message}`);
      setRequests([]);
    } else {
      setRequests((data ?? []) as DashboardRequest[]);
    }

    setClock(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setClock(Date.now());

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const submittedRequests = useMemo(
    () => requests.filter((request) => request.status === "submitted"),
    [requests],
  );

  const underReviewRequests = useMemo(
    () =>
      requests.filter((request) =>
        [
          "under_review",
          "awaiting_applicant_information",
          "accepted",
          "scheduling",
          "reschedule_required",
        ].includes(request.status),
      ),
    [requests],
  );

  const upcomingAppointments = useMemo(() => {
    return requests
      .filter((request) => {
        if (!request.scheduled_start_at) {
          return false;
        }

        if (closedStatuses.has(request.status)) {
          return false;
        }

        return new Date(request.scheduled_start_at).getTime() >= clock;
      })
      .sort(
        (first, second) =>
          new Date(first.scheduled_start_at as string).getTime() -
          new Date(second.scheduled_start_at as string).getTime(),
      );
  }, [clock, requests]);

  const completedThisMonth = useMemo(() => {
    const now = new Date(clock);

    return requests.filter((request) => {
      if (request.status !== "completed") {
        return false;
      }

      const activityDate = new Date(
        request.scheduled_start_at ?? request.created_at,
      );

      return (
        activityDate.getFullYear() === now.getFullYear() &&
        activityDate.getMonth() === now.getMonth()
      );
    });
  }, [clock, requests]);

  const dmsAttentionRequests = useMemo(
    () =>
      requests
        .filter((request) => needsDmsAttention(request, clock))
        .sort((first, second) => {
          const firstTime = new Date(
            first.scheduled_start_at as string,
          ).getTime();

          const secondTime = new Date(
            second.scheduled_start_at as string,
          ).getTime();

          return firstTime - secondTime;
        }),
    [clock, requests],
  );

  const requestsNeedingAttention = useMemo(
    () =>
      requests
        .filter((request) => {
          if (attentionStatuses.has(request.status)) {
            return true;
          }

          return needsDmsAttention(request, clock);
        })
        .sort((first, second) => {
          const firstSubmitted = first.submitted_at ?? first.created_at;

          const secondSubmitted = second.submitted_at ?? second.created_at;

          return (
            new Date(secondSubmitted).getTime() -
            new Date(firstSubmitted).getTime()
          );
        })
        .slice(0, 6),
    [clock, requests],
  );

  const summaryCards = [
    {
      label: "New Requests",
      value: submittedRequests.length,
      description: "Submitted and awaiting initial review",
      icon: ClipboardList,
      href: "/examiner/requests",
    },
    {
      label: "Under Review",
      value: underReviewRequests.length,
      description: "Active requests requiring examiner action",
      icon: Clock3,
      href: "/examiner/requests",
    },
    {
      label: "Upcoming Tests",
      value: upcomingAppointments.length,
      description: "Future scheduled practical tests",
      icon: CalendarDays,
      href: "/examiner/calendar",
    },
    {
      label: "Completed This Month",
      value: completedThisMonth.length,
      description: "Practical tests completed this month",
      icon: CheckCircle2,
      href: "/examiner/historical-records",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Examiner Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Examiner Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Review requests, appointments, and practical-test activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-600">
                  {card.label}
                </p>

                <Icon aria-hidden className="h-5 w-5 text-amber-700" />
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? "—" : card.value}
              </p>

              <p className="mt-2 text-sm leading-5 text-slate-500">
                {card.description}
              </p>
            </Link>
          );
        })}
      </section>

      {dmsAttentionRequests.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <FileWarning
              aria-hidden
              className="mt-0.5 h-6 w-6 shrink-0 text-red-700"
            />

            <div>
              <h2 className="text-xl font-bold text-red-950">
                DMS preapproval attention
              </h2>

              <p className="mt-1 text-sm text-red-800">
                {dmsAttentionRequests.length} upcoming practical test
                {dmsAttentionRequests.length === 1 ? "" : "s"} are within 72
                hours and do not have a DMS preapproval number.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {dmsAttentionRequests.slice(0, 4).map((request) => (
              <Link
                key={request.id}
                href={`/examiner/requests?request=${request.id}`}
                className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-white px-4 py-4 transition hover:border-red-400 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {request.applicant_name_snapshot}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {request.request_number} · {request.certificate_sought} ·{" "}
                    {request.rating_sought}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="font-semibold text-red-800">
                    {formatDateTime(request.scheduled_start_at)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    DMS number missing
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Requests needing attention
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Active requests requiring examiner review or follow-up
              </p>
            </div>

            <Link
              href="/examiner/requests"
              className="shrink-0 text-sm font-semibold text-sky-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-500">Loading requests…</p>
          ) : null}

          {!loading && requestsNeedingAttention.length === 0 ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  aria-hidden
                  className="h-5 w-5 text-emerald-700"
                />

                <p className="font-semibold text-emerald-900">
                  No requests currently require attention.
                </p>
              </div>
            </div>
          ) : null}

          {!loading && requestsNeedingAttention.length > 0 ? (
            <div className="mt-5 space-y-3">
              {requestsNeedingAttention.map((request) => (
                <Link
                  key={request.id}
                  href={`/examiner/requests?request=${request.id}`}
                  className={`block rounded-xl border p-4 transition hover:border-sky-300 ${dmsWarningClasses(
                    request,
                    clock,
                  )}`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-bold text-slate-900">
                        {request.applicant_name_snapshot}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {request.request_number} · {request.certificate_sought}{" "}
                        · {request.rating_sought}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                        request.status,
                      )}`}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  {needsDmsAttention(request, clock) ? (
                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-800">
                      <AlertTriangle aria-hidden className="h-4 w-4" />
                      DMS preapproval number required
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Upcoming appointments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Next confirmed or scheduled practical tests
              </p>
            </div>

            <Link
              href="/examiner/calendar"
              className="shrink-0 text-sm font-semibold text-sky-700 hover:underline"
            >
              Calendar
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-500">Loading appointments…</p>
          ) : null}

          {!loading && upcomingAppointments.length === 0 ? (
            <p className="mt-6 text-slate-500">
              No upcoming practical tests are scheduled.
            </p>
          ) : null}

          {!loading && upcomingAppointments.length > 0 ? (
            <div className="mt-5 divide-y divide-slate-200">
              {upcomingAppointments.slice(0, 6).map((request) => (
                <Link
                  key={request.id}
                  href={`/examiner/requests?request=${request.id}`}
                  className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {request.applicant_name_snapshot}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {request.certificate_sought} · {request.rating_sought}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {request.scheduled_location ?? "Location not entered"}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-slate-900">
                      {formatDateTime(request.scheduled_start_at)}
                    </p>

                    <span
                      className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                        request.status,
                      )}`}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
