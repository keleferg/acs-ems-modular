"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ApplicantRequest = {
  id: string;
  request_number: string;
  status: string;
  status_reason: string | null;

  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  issuance_type: string | null;

  submitted_at: string | null;
  created_at: string;
  updated_at: string | null;

  accepted_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
  oral_test_location: string | null;
  flight_airport_code: string | null;

  fee_amount: number | null;
  dms_preapproval_number: string | null;

  appointment_response_status: string | null;
  appointment_responded_at: string | null;
  appointment_response_notes: string | null;

  cancellation_reason: string | null;

  applicant_notification_acknowledged_status: string | null;
  applicant_notification_acknowledged_at: string | null;
};

const closedStatuses = new Set([
  "completed",
  "declined",
  "cancelled",
  "cancelled_by_applicant",
  "cancelled_by_examiner",
  "no_show",
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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return "Not assigned";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
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

function getLocation(request: ApplicantRequest) {
  return (
    request.scheduled_location?.trim() ||
    request.oral_test_location?.trim() ||
    request.flight_airport_code?.trim() ||
    "Location not entered"
  );
}

function getActionMessage(request: ApplicantRequest) {
  switch (request.status) {
    case "submitted":
      return {
        title: "Your request has been submitted",
        description:
          "The examiner has received your practical-test request and will review it.",
        tone: "sky",
      };

    case "under_review":
      return {
        title: "Your request is under review",
        description:
          "The examiner is reviewing your request and scheduling information.",
        tone: "sky",
      };

    case "awaiting_applicant_information":
      return {
        title: "Additional information is required",
        description:
          request.status_reason?.trim() ||
          "Review your request and contact the examiner with the requested information.",
        tone: "amber",
      };

    case "accepted":
      return {
        title: "Your request has been accepted",
        description:
          "The examiner has accepted your request. Appointment scheduling is the next step.",
        tone: "emerald",
      };

    case "scheduling":
      return {
        title: "Your appointment is being scheduled",
        description:
          "The examiner is working with your requested dates and availability.",
        tone: "amber",
      };

    case "scheduled":
      return {
        title: "Your response is required",
        description:
          "Review the finalized appointment and accept it or request a different date and time.",
        tone: "amber",
      };

    case "confirmed":
      return {
        title: "Your appointment is confirmed",
        description:
          "Review your appointment details, fee, location, and DMS preapproval information.",
        tone: "emerald",
      };

    case "reschedule_required":
      return {
        title: "Rescheduling is required",
        description:
          request.status_reason?.trim() ||
          "Contact the examiner to arrange a new practical-test date.",
        tone: "amber",
      };

    case "declined":
      return {
        title: "Your request was declined",
        description:
          request.status_reason?.trim() ||
          "Open your request for additional information.",
        tone: "red",
      };

    case "cancelled_by_examiner":
      return {
        title: "The examiner cancelled this request",
        description:
          request.cancellation_reason?.trim() ||
          "Open your request for additional information.",
        tone: "red",
      };

    case "cancelled_by_applicant":
    case "cancelled":
      return {
        title: "This request was cancelled",
        description:
          request.cancellation_reason?.trim() ||
          "No further action is required.",
        tone: "slate",
      };

    case "completed":
      return {
        title: "Your practical test is complete",
        description:
          "Completed records and released reports will appear in your account.",
        tone: "emerald",
      };

    default:
      return {
        title: formatStatus(request.status),
        description: "Open the request to review its current status.",
        tone: "slate",
      };
  }
}

function actionButtonClasses(tone: string) {
  switch (tone) {
    case "sky":
      return "bg-sky-700 text-white hover:bg-sky-800";

    case "amber":
      return "bg-amber-700 text-white hover:bg-amber-800";

    case "emerald":
      return "bg-emerald-700 text-white hover:bg-emerald-800";

    case "red":
      return "bg-red-800 text-white hover:bg-red-900";

    default:
      return "bg-slate-700 text-white hover:bg-slate-800";
  }
}

function actionToneClasses(tone: string) {
  switch (tone) {
    case "sky":
      return "border-sky-200 bg-sky-50 text-sky-950";

    case "amber":
      return "border-amber-300 bg-amber-50 text-amber-950";

    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";

    case "red":
      return "border-red-200 bg-red-50 text-red-950";

    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export default function ApplicantDashboardPage() {
  const [requests, setRequests] = useState<ApplicantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [clock, setClock] = useState(0);
  const [acknowledgingRequestId, setAcknowledgingRequestId] =
    useState<string | null>(null);

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

    const { data: applicantProfile, error: profileError } = await supabase
      .from("applicant_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (profileError) {
      setPageError(
        `Your applicant profile could not be loaded: ${profileError.message}`,
      );
      setLoading(false);
      return;
    }

    if (!applicantProfile) {
      setPageError(
        "Your applicant profile could not be found. Please complete applicant setup.",
      );
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
        status_reason,

        certificate_sought,
        category_sought,
        class_sought,
        rating_sought,
        issuance_type,

        submitted_at,
        created_at,
        updated_at,

        accepted_at,
        scheduled_start_at,
        scheduled_end_at,
        scheduled_location,
        oral_test_location,
        flight_airport_code,

        fee_amount,
        dms_preapproval_number,

        appointment_response_status,
        appointment_responded_at,
        appointment_response_notes,

        cancellation_reason,

        applicant_notification_acknowledged_status,
        applicant_notification_acknowledged_at
      `,
      )
      .eq("applicant_profile_id", applicantProfile.id)
      .neq("source_system", "sharepoint")
      .order("submitted_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setPageError(
        `Your practical-test requests could not be loaded: ${error.message}`,
      );
      setRequests([]);
    } else {
      setRequests((data ?? []) as ApplicantRequest[]);
    }

    setClock(Date.now());
    setLoading(false);
  }, []);

  async function acknowledgeNotification(
    request: ApplicantRequest,
  ) {
    if (acknowledgingRequestId) {
      return;
    }

    setAcknowledgingRequestId(request.id);
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "applicant_acknowledge_request_notification",
      {
        p_request_id: request.id,
      },
    );

    if (error) {
      console.error(
        "Unable to acknowledge dashboard notification:",
        error,
      );

      setPageError(
        `The notification could not be acknowledged: ${error.message}`,
      );

      setAcknowledgingRequestId(null);
      return;
    }

    const acknowledgedRequest = Array.isArray(data)
      ? data[0]
      : data;

    if (!acknowledgedRequest) {
      setPageError(
        "The notification acknowledgment completed without returning the request.",
      );

      setAcknowledgingRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              applicant_notification_acknowledged_status:
                acknowledgedRequest
                  .applicant_notification_acknowledged_status,
              applicant_notification_acknowledged_at:
                acknowledgedRequest
                  .applicant_notification_acknowledged_at,
            }
          : item,
      ),
    );

    setAcknowledgingRequestId(null);
  }

  useEffect(() => {
    setClock(Date.now());

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activeRequests = useMemo(
    () => requests.filter((request) => !closedStatuses.has(request.status)),
    [requests],
  );

  const nextAppointment = useMemo(() => {
    if (!clock) return undefined;

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
      )[0];
  }, [clock, requests]);

  const mostRelevantRequest = useMemo(() => {
    const unacknowledgedRequests = requests.filter(
      (request) =>
        request.applicant_notification_acknowledged_status !==
        request.status,
    );

    const unacknowledgedNextAppointment =
      nextAppointment &&
      nextAppointment.applicant_notification_acknowledged_status !==
        nextAppointment.status
        ? nextAppointment
        : undefined;

    if (unacknowledgedNextAppointment) {
      return unacknowledgedNextAppointment;
    }

    return (
      unacknowledgedRequests.find(
        (request) => !closedStatuses.has(request.status),
      ) ??
      unacknowledgedRequests[0]
    );
  }, [nextAppointment, requests]);

  const completedRequests = useMemo(
    () => requests.filter((request) => request.status === "completed"),
    [requests],
  );

  const pendingActionCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          ["awaiting_applicant_information", "reschedule_required"].includes(
            request.status,
          ) ||
          (request.status === "scheduled" &&
            request.appointment_response_status !== "accepted"),
      ).length,
    [requests],
  );

  const recentRequests = requests.slice(0, 5);

  const actionMessage = mostRelevantRequest
    ? getActionMessage(mostRelevantRequest)
    : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Applicant Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Applicant Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your practical-test requests and appointments.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh
          </button>

          <Link
            href="/applicant/requests/new"
            className="rounded-lg bg-sky-700 px-5 py-3 text-center font-semibold text-white hover:bg-sky-800"
          >
            Request a Checkride
          </Link>
        </div>
      </div>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      {actionMessage && mostRelevantRequest ? (
        <section
          className={`mt-8 rounded-2xl border p-6 shadow-sm ${actionToneClasses(
            actionMessage.tone,
          )}`}
        >
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                {[
                  "awaiting_applicant_information",
                  "reschedule_required",
                  "declined",
                  "cancelled_by_examiner",
                ].includes(mostRelevantRequest.status) ? (
                  <AlertTriangle aria-hidden className="h-6 w-6 shrink-0" />
                ) : (
                  <CheckCircle2 aria-hidden className="h-6 w-6 shrink-0" />
                )}

                <h2 className="text-xl font-bold">{actionMessage.title}</h2>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6">
                {actionMessage.description}
              </p>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-70">
                {mostRelevantRequest.request_number} ·{" "}
                {mostRelevantRequest.certificate_sought} ·{" "}
                {mostRelevantRequest.rating_sought}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href={`/applicant/requests?request=${mostRelevantRequest.id}`}
                className="rounded-lg border border-current px-4 py-2.5 text-center text-sm font-semibold hover:bg-white/50"
              >
                View Request
              </Link>

              <button
                type="button"
                onClick={() =>
                  void acknowledgeNotification(mostRelevantRequest)
                }
                disabled={Boolean(acknowledgingRequestId)}
                className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonClasses(
                  actionMessage.tone,
                )}`}
              >
                {acknowledgingRequestId === mostRelevantRequest.id
                  ? "Acknowledging…"
                  : "Acknowledge"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-600">
              Active Requests
            </p>

            <ClipboardList aria-hidden className="h-5 w-5 text-sky-700" />
          </div>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? "—" : activeRequests.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Requests currently open or scheduled
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-600">
              Action Required
            </p>

            <AlertTriangle aria-hidden className="h-5 w-5 text-amber-700" />
          </div>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? "—" : pendingActionCount}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Requests requiring your response
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-600">
              Next Appointment
            </p>

            <CalendarDays aria-hidden className="h-5 w-5 text-sky-700" />
          </div>

          <p className="mt-4 text-xl font-bold leading-7 text-slate-900">
            {loading
              ? "Loading…"
              : nextAppointment
                ? formatDateTime(nextAppointment.scheduled_start_at)
                : "None scheduled"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {nextAppointment
              ? getLocation(nextAppointment)
              : "Your next practical-test appointment"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-600">
              Completed Tests
            </p>

            <FileText aria-hidden className="h-5 w-5 text-emerald-700" />
          </div>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? "—" : completedRequests.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Completed practical-test records
          </p>
        </article>
      </section>

      {nextAppointment ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                Next Appointment
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                {nextAppointment.certificate_sought} ·{" "}
                {nextAppointment.rating_sought}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {nextAppointment.request_number}
              </p>
            </div>

            <span
              className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                nextAppointment.status,
              )}`}
            >
              {formatStatus(nextAppointment.status)}
            </span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Date and Time
              </p>

              <p className="mt-2 flex items-start gap-2 font-semibold text-slate-900">
                <Clock3
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                />

                {formatDateTime(nextAppointment.scheduled_start_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Location
              </p>

              <p className="mt-2 flex items-start gap-2 font-semibold text-slate-900">
                <MapPin
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                />

                {getLocation(nextAppointment)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Fee
              </p>

              <p className="mt-2 flex items-start gap-2 font-semibold text-slate-900">
                <DollarSign
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                />

                {formatCurrency(nextAppointment.fee_amount)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                DMS Preapproval
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {nextAppointment.dms_preapproval_number?.trim() || "Pending"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
            <Link
              href={`/applicant/requests?request=${nextAppointment.id}`}
              className="rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800"
            >
              View Appointment Details
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Recent Requests
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your most recent practical-test activity
            </p>
          </div>

          <Link
            href="/applicant/requests"
            className="text-sm font-semibold text-sky-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <p className="mt-5 text-slate-500">Loading requests…</p>
        ) : null}

        {!loading && recentRequests.length === 0 ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="font-semibold text-slate-900">
              No requests have been submitted.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Start a new practical-test request when you are ready.
            </p>

            <Link
              href="/applicant/requests/new"
              className="mt-4 inline-block rounded-lg bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800"
            >
              Request a Checkride
            </Link>
          </div>
        ) : null}

        {!loading && recentRequests.length > 0 ? (
          <div className="mt-5 divide-y divide-slate-200">
            {recentRequests.map((request) => (
              <Link
                key={request.id}
                href={`/applicant/requests?request=${request.id}`}
                className="flex flex-col justify-between gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {request.certificate_sought} · {request.rating_sought}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {request.request_number}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Submitted{" "}
                    {formatDate(request.submitted_at ?? request.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {request.scheduled_start_at ? (
                    <p className="hidden text-right text-sm text-slate-600 md:block">
                      {formatDateTime(request.scheduled_start_at)}
                    </p>
                  ) : null}

                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
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
      </section>
    </main>
  );
}
