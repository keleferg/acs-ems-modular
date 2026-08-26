"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PracticalTestRequest = {
  id: string;
  request_number: string;
  status: string;
  status_reason: string | null;

  fee_amount: number | null;
  dms_preapproval_number: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
  accepted_at: string | null;

  appointment_response_status: string | null;
  appointment_responded_at: string | null;
  appointment_response_notes: string | null;

  applicant_name_snapshot: string;
  applicant_email_snapshot: string;
  applicant_phone_snapshot: string | null;
  ftn_number_snapshot: string | null;

  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  issuance_type: string | null;
  part_141_graduate: boolean | null;

  is_retest: boolean;
  previous_test_date: string | null;
  previous_examiner: string | null;
  retest_areas: string | null;

  flight_school_name_snapshot: string | null;
  oral_test_location: string | null;
  flight_airport_code: string | null;
  flight_airport_icao: string | null;
  flight_airport_name: string | null;

  assigned_examiner_profile_id: string | null;
  examiner_name: string | null;
  examiner_business_name: string | null;
  examiner_email: string | null;
  examiner_reply_to_email: string | null;
  examiner_phone: string | null;

  aircraft_type_designator: string | null;
  aircraft_description: string | null;
  aircraft_make: string | null;
  aircraft_model: string | null;
  aircraft_registration: string | null;
  aircraft_notes: string | null;

  instructor_name: string | null;
  instructor_phone: string | null;
  instructor_email: string | null;
  instructor_certificate_number: string | null;
  instructor_associated_with_school: boolean | null;

  first_available: boolean;
  requested_dates_text: string | null;
  requested_date_1: string | null;
  requested_date_2: string | null;
  requested_date_3: string | null;
  preferred_time: string | null;
  specific_time: string | null;
  scheduling_notes: string | null;

  fee_acknowledged: boolean;
  eligibility_acknowledged: boolean;
  aircraft_acknowledged: boolean;
  request_acknowledged: boolean;

  submitted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
};

type ApplicantRequestPortalDetail = {
  practical_test_request_id: string;

  examiner_profile_id: string | null;
  examiner_name: string | null;
  examiner_business_name: string | null;
  examiner_email: string | null;
  examiner_reply_to_email: string | null;
  examiner_phone: string | null;
};

type ApplicantQualificationWizard = {
  id: string;
  practical_test_request_id: string;
  status: string;
  available_at: string;
  opened_at: string | null;
  applicant_submitted_at: string | null;
  instructor_certified_at: string | null;
  examiner_reviewed_at: string | null;
  accepted_at: string | null;
  current_revision_number: number;
};

type RequestStatusAudit = {
  id: string;
  practical_test_request_id: string;
  previous_status: string | null;
  new_status: string;
  status_reason: string | null;
  changed_by_profile_id: string | null;
  changed_at: string;
};

const closedStatuses = new Set([
  "completed",
  "declined",
  "cancelled",
  "cancelled_by_applicant",
  "cancelled_by_examiner",
  "no_show",
]);

const activeRequestStatuses = new Set([
  "submitted",
  "under_review",
  "awaiting_applicant_information",
  "accepted",
  "scheduling",
  "scheduled",
  "confirmed",
  "reschedule_required",
  "in_progress",
]);

const historicalRequestStatuses = new Set([
  "completed",
  "declined",
  "cancelled",
  "cancelled_by_applicant",
  "cancelled_by_examiner",
  "no_show",
]);

function isHistoricalRequest(status: string) {
  return historicalRequestStatuses.has(status);
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatIssuanceType(value: string | null) {
  if (!value) return "Not specified";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string | null) {
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

function yesNo(value: boolean | null | undefined) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not specified";
}

function displayValue(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned || "Not specified";
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

function getAirportDisplay(request: PracticalTestRequest) {
  const identifier =
    request.flight_airport_icao?.trim() || request.flight_airport_code?.trim();

  const name = request.flight_airport_name?.trim();

  if (identifier && name) {
    return `${identifier} — ${name}`;
  }

  return identifier || name || "Not specified";
}

function getAircraftDisplay(request: PracticalTestRequest) {
  const makeModel = [
    request.aircraft_make?.trim(),
    request.aircraft_model?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const designator = request.aircraft_type_designator?.trim();

  if (makeModel && designator) {
    return `${makeModel} · FAA type ${designator}`;
  }

  return (
    makeModel ||
    request.aircraft_description?.trim() ||
    designator ||
    "Not specified"
  );
}

function getAppointmentLocation(request: PracticalTestRequest) {
  return (
    request.scheduled_location?.trim() ||
    request.oral_test_location?.trim() ||
    getAirportDisplay(request)
  );
}

function getNextAction(request: PracticalTestRequest) {
  switch (request.status) {
    case "submitted":
      return {
        title: "Request submitted",
        description:
          "Your request has been received and is awaiting initial examiner review.",
        classes: "border-sky-200 bg-sky-50 text-sky-950",
      };

    case "under_review":
      return {
        title: "Examiner review in progress",
        description:
          "The examiner is reviewing your request, qualifications, and scheduling information.",
        classes: "border-sky-200 bg-sky-50 text-sky-950",
      };

    case "awaiting_applicant_information":
      return {
        title: "Applicant action required",
        description:
          request.status_reason?.trim() ||
          "The examiner needs additional information before continuing.",
        classes: "border-amber-300 bg-amber-50 text-amber-950",
      };

    case "accepted":
      return {
        title: "Request accepted",
        description:
          "Your request has been accepted. The next step is finalizing the appointment date and time.",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-950",
      };

    case "scheduling":
      return {
        title: "Scheduling in progress",
        description:
          "The examiner is coordinating your practical-test appointment.",
        classes: "border-amber-300 bg-amber-50 text-amber-950",
      };

    case "scheduled":
      return {
        title: "Appointment scheduled",
        description:
          "Review the appointment details below. Final confirmation may still be pending.",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-950",
      };

    case "confirmed":
      return {
        title: "Appointment confirmed",
        description:
          "Your practical-test appointment is confirmed. Review all appointment, fee, and DMS information below.",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-950",
      };

    case "reschedule_required":
      return {
        title: "Rescheduling required",
        description:
          request.status_reason?.trim() ||
          "Contact the examiner to arrange a new appointment.",
        classes: "border-amber-300 bg-amber-50 text-amber-950",
      };

    case "declined":
      return {
        title: "Request declined",
        description:
          request.status_reason?.trim() ||
          "The examiner declined this request.",
        classes: "border-red-200 bg-red-50 text-red-950",
      };

    case "cancelled_by_examiner":
      return {
        title: "Cancelled by examiner",
        description:
          request.cancellation_reason?.trim() ||
          request.status_reason?.trim() ||
          "The examiner cancelled this request.",
        classes: "border-red-200 bg-red-50 text-red-950",
      };

    case "cancelled":
    case "cancelled_by_applicant":
      return {
        title: "Request cancelled",
        description:
          request.cancellation_reason?.trim() ||
          "This request has been cancelled.",
        classes: "border-slate-300 bg-slate-50 text-slate-900",
      };

    case "completed":
      return {
        title: "Practical test completed",
        description: "This practical-test request is complete.",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-950",
      };

    case "no_show":
      return {
        title: "No show",
        description:
          request.status_reason?.trim() ||
          "This appointment was recorded as a no show.",
        classes: "border-red-200 bg-red-50 text-red-950",
      };

    default:
      return {
        title: formatStatus(request.status),
        description:
          request.status_reason?.trim() ||
          "Review the request information below.",
        classes: "border-slate-200 bg-slate-50 text-slate-900",
      };
  }
}

function qualificationPresentation(wizard: ApplicantQualificationWizard) {
  switch (wizard.status) {
    case "not_available":
      return {
        label: "Not Available Yet",
        title: "Pretest Qualification",
        description: `Your pretest qualification opens ${formatDateTime(
          wizard.available_at,
        )}. It becomes available 48 hours before your practical test.`,
        classes: "border-slate-300 bg-slate-50 text-slate-900",
        badge: "border-slate-300 bg-white text-slate-700",
        buttonLabel: null,
      };

    case "available":
      return {
        label: "Available Now",
        title: "Pretest Qualification",
        description:
          "Your pretest qualification is now available. Complete it before your practical test.",
        classes: "border-sky-200 bg-sky-50 text-sky-950",
        badge: "border-sky-200 bg-white text-sky-800",
        buttonLabel: "Begin Qualification",
      };

    case "applicant_in_progress":
      return {
        label: "In Progress",
        title: "Pretest Qualification",
        description:
          "Your qualification package is in progress. Continue where you left off.",
        classes: "border-sky-200 bg-sky-50 text-sky-950",
        badge: "border-sky-200 bg-white text-sky-800",
        buttonLabel: "Continue Qualification",
      };

    case "awaiting_instructor":
      return {
        label: "Awaiting Instructor",
        title: "Pretest Qualification Submitted",
        description:
          "Your qualification package has been submitted and is awaiting instructor certification.",
        classes: "border-amber-200 bg-amber-50 text-amber-950",
        badge: "border-amber-300 bg-white text-amber-800",
        buttonLabel: "View Qualification",
      };

    case "instructor_changes_required":
      return {
        label: "Corrections Required",
        title: "Qualification Corrections Required",
        description:
          "Your instructor requested corrections to the qualification package.",
        classes: "border-amber-300 bg-amber-50 text-amber-950",
        badge: "border-amber-300 bg-white text-amber-800",
        buttonLabel: "Make Corrections",
      };

    case "instructor_certified":
    case "examiner_review":
      return {
        label: "Examiner Review",
        title: "Pretest Qualification",
        description:
          "Your instructor review is complete and the qualification package is awaiting examiner review.",
        classes: "border-violet-200 bg-violet-50 text-violet-950",
        badge: "border-violet-200 bg-white text-violet-800",
        buttonLabel: "View Qualification",
      };

    case "deficiencies_found":
      return {
        label: "Attention Required",
        title: "Qualification Needs Attention",
        description:
          "The examiner identified items that require correction or additional review.",
        classes: "border-red-200 bg-red-50 text-red-950",
        badge: "border-red-200 bg-white text-red-800",
        buttonLabel: "Review Qualification",
      };

    case "accepted":
    case "closed":
      return {
        label: "Qualified",
        title: "Pretest Qualification Complete",
        description:
          "Your qualification package has been reviewed and accepted.",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-950",
        badge: "border-emerald-200 bg-white text-emerald-800",
        buttonLabel: "View Qualification",
      };

    default:
      return {
        label: formatStatus(wizard.status),
        title: "Pretest Qualification",
        description: "Review the current status of your qualification package.",
        classes: "border-slate-200 bg-slate-50 text-slate-900",
        badge: "border-slate-300 bg-white text-slate-700",
        buttonLabel: "View Qualification",
      };
  }
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </dl>
    </section>
  );
}

export default function ApplicantRequestsPage() {
  const [requests, setRequests] = useState<PracticalTestRequest[]>([]);
  const [auditByRequest, setAuditByRequest] = useState<
    Record<string, RequestStatusAudit[]>
  >({});

  const [qualificationWizardsByRequest, setQualificationWizardsByRequest] =
    useState<Record<string, ApplicantQualificationWizard>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedNumber, setSubmittedNumber] = useState("");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );

  const [requestToCancel, setRequestToCancel] =
    useState<PracticalTestRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState("");

  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(
    null,
  );
  const [requestToReschedule, setRequestToReschedule] =
    useState<PracticalTestRequest | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const submittedRequestNumber = parameters.get("submitted") ?? "";
    const requestedRequestId = parameters.get("request");

    setSubmittedNumber(submittedRequestNumber);

    if (requestedRequestId) {
      setExpandedRequestId(requestedRequestId);
    }

    let cancelled = false;

    async function loadRequests() {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setErrorMessage(
          "Your login session could not be verified. Please sign in again.",
        );
        setLoading(false);
        return;
      }

      const { data: applicantProfile, error: applicantProfileError } =
        await supabase
          .from("applicant_profiles")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

      if (cancelled) return;

      if (applicantProfileError) {
        setErrorMessage(
          `Your applicant profile could not be loaded: ${applicantProfileError.message}`,
        );
        setLoading(false);
        return;
      }

      if (!applicantProfile) {
        setErrorMessage("Your applicant profile has not been created.");
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

          fee_amount,
          dms_preapproval_number,
          scheduled_start_at,
          scheduled_end_at,
          scheduled_location,
          accepted_at,

          appointment_response_status,
          appointment_responded_at,
          appointment_response_notes,

          applicant_name_snapshot,
          applicant_email_snapshot,
          applicant_phone_snapshot,
          ftn_number_snapshot,

          certificate_sought,
          category_sought,
          class_sought,
          rating_sought,
          issuance_type,
          part_141_graduate,

          is_retest,
          previous_test_date,
          previous_examiner,
          retest_areas,

          flight_school_name_snapshot,
          oral_test_location,
          flight_airport_code,
          flight_airport_icao,
          flight_airport_name,

          assigned_examiner_profile_id,

          aircraft_type_designator,
          aircraft_description,
          aircraft_make,
          aircraft_model,
          aircraft_registration,
          aircraft_notes,

          instructor_name,
          instructor_phone,
          instructor_email,
          instructor_certificate_number,
          instructor_associated_with_school,

          first_available,
          requested_dates_text,
          requested_date_1,
          requested_date_2,
          requested_date_3,
          preferred_time,
          specific_time,
          scheduling_notes,

          fee_acknowledged,
          eligibility_acknowledged,
          aircraft_acknowledged,
          request_acknowledged,

          submitted_at,
          cancelled_at,
          cancellation_reason,
          created_at
        `,
        )
        .eq("applicant_profile_id", applicantProfile.id)
        .or("source_system.is.null,source_system.neq.sharepoint")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Unable to load practical test requests:", error);
        setErrorMessage(`Your requests could not be loaded: ${error.message}`);
        setRequests([]);
      } else {
        const baseRequests = (data ?? []).map((request) => ({
          ...(request as PracticalTestRequest),
          examiner_name: null,
          examiner_business_name: null,
          examiner_email: null,
          examiner_reply_to_email: null,
          examiner_phone: null,
        }));

        const { data: portalDetailRows, error: portalDetailError } =
          await supabase.rpc("applicant_get_request_portal_details");

        if (cancelled) return;

        if (portalDetailError) {
          console.error(
            "Unable to load assigned examiner details:",
            portalDetailError,
          );
        }

        const portalDetailsByRequest = new Map(
          ((portalDetailRows ?? []) as ApplicantRequestPortalDetail[]).map(
            (detail) => [detail.practical_test_request_id, detail],
          ),
        );

        const loadedRequests = baseRequests.map((request) => {
          const detail = portalDetailsByRequest.get(request.id);

          return {
            ...request,
            examiner_name: detail?.examiner_name ?? null,
            examiner_business_name: detail?.examiner_business_name ?? null,
            examiner_email: detail?.examiner_email ?? null,
            examiner_reply_to_email: detail?.examiner_reply_to_email ?? null,
            examiner_phone: detail?.examiner_phone ?? null,
          };
        });

        setRequests(loadedRequests);

        if (submittedRequestNumber && !requestedRequestId) {
          const submittedRequest = loadedRequests.find(
            (request) => request.request_number === submittedRequestNumber,
          );

          if (submittedRequest) {
            setExpandedRequestId(submittedRequest.id);
          }
        }

        const requestIds = loadedRequests.map((request) => request.id);

        setQualificationWizardsByRequest({});

        if (requestIds.length > 0) {
          const { data: qualificationRows, error: qualificationError } =
            await supabase
              .from("qualification_wizards")
              .select(
                `
              id,
              practical_test_request_id,
              status,
              available_at,
              opened_at,
              applicant_submitted_at,
              instructor_certified_at,
              examiner_reviewed_at,
              accepted_at,
              current_revision_number
              `,
              )
              .in("practical_test_request_id", requestIds);

          if (cancelled) return;

          if (qualificationError) {
            console.error(
              "Unable to load qualification status:",
              qualificationError,
            );
          } else {
            setQualificationWizardsByRequest(
              Object.fromEntries(
                (
                  (qualificationRows ?? []) as ApplicantQualificationWizard[]
                ).map((wizard) => [wizard.practical_test_request_id, wizard]),
              ),
            );
          }
          const { data: auditRows, error: auditError } = await supabase
            .from("practical_test_request_status_audit")
            .select(
              `
              id,
              practical_test_request_id,
              previous_status,
              new_status,
              status_reason,
              changed_by_profile_id,
              changed_at
            `,
            )
            .in("practical_test_request_id", requestIds)
            .order("changed_at", { ascending: true });

          if (cancelled) return;

          if (auditError) {
            console.error("Unable to load request status history:", auditError);
            setAuditByRequest({});
          } else {
            const grouped: Record<string, RequestStatusAudit[]> = {};

            for (const audit of (auditRows ?? []) as RequestStatusAudit[]) {
              grouped[audit.practical_test_request_id] ??= [];
              grouped[audit.practical_test_request_id].push(audit);
            }

            setAuditByRequest(grouped);
          }
        } else {
          setAuditByRequest({});
        }
      }

      setLoading(false);
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const cancellableStatuses = new Set([
    "draft",
    "submitted",
    "under_review",
    "awaiting_applicant_information",
    "accepted",
    "scheduling",
    "scheduled",
    "confirmed",
    "reschedule_required",
  ]);

  function addLocalAudit(
    request: PracticalTestRequest,
    nextStatus: string,
    reason: string | null,
  ) {
    const changedAt = new Date().toISOString();

    setAuditByRequest((current) => ({
      ...current,
      [request.id]: [
        ...(current[request.id] ?? []),
        {
          id: `local-${request.id}-${changedAt}`,
          practical_test_request_id: request.id,
          previous_status: request.status,
          new_status: nextStatus,
          status_reason: reason,
          changed_by_profile_id: null,
          changed_at: changedAt,
        },
      ],
    }));
  }

  async function acceptAppointment(request: PracticalTestRequest) {
    if (respondingRequestId) return;

    setRespondingRequestId(request.id);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "applicant_accept_practical_test_appointment",
      {
        p_request_id: request.id,
      },
    );

    if (error) {
      setErrorMessage(
        `The appointment could not be accepted: ${error.message}`,
      );
      setRespondingRequestId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setErrorMessage(
        "The appointment response completed without returning the updated request.",
      );
      setRespondingRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: updatedRequest.status,
              status_reason: updatedRequest.status_reason,
              appointment_response_status:
                updatedRequest.appointment_response_status,
              appointment_responded_at: updatedRequest.appointment_responded_at,
              appointment_response_notes:
                updatedRequest.appointment_response_notes,
            }
          : item,
      ),
    );

    addLocalAudit(request, "confirmed", null);

    try {
      const emailResponse = await fetch("/api/email/practical-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "appointment_accepted_examiner",
          requestId: request.id,
        }),
      });

      if (!emailResponse.ok) {
        const emailResult = await emailResponse.json().catch(() => null);

        console.warn(
          "Appointment was accepted, but the examiner notification email was not sent:",
          emailResult,
        );
      }
    } catch (emailError) {
      console.warn(
        "Appointment was accepted, but the examiner notification request failed:",
        emailError,
      );
    }

    setRespondingRequestId(null);
  }

  async function requestReschedule() {
    if (!requestToReschedule || respondingRequestId) return;

    const reason = rescheduleReason.trim();

    if (!reason) {
      setRescheduleError(
        "Please explain why you need a different appointment.",
      );
      return;
    }

    setRespondingRequestId(requestToReschedule.id);
    setRescheduleError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "applicant_request_appointment_reschedule",
      {
        p_request_id: requestToReschedule.id,
        p_response_notes: reason,
      },
    );

    if (error) {
      setRescheduleError(error.message);
      setRespondingRequestId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setRescheduleError(
        "The reschedule request completed without returning the updated request.",
      );
      setRespondingRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === requestToReschedule.id
          ? {
              ...item,
              status: updatedRequest.status,
              status_reason: updatedRequest.status_reason,
              appointment_response_status:
                updatedRequest.appointment_response_status,
              appointment_responded_at: updatedRequest.appointment_responded_at,
              appointment_response_notes:
                updatedRequest.appointment_response_notes,
            }
          : item,
      ),
    );

    addLocalAudit(requestToReschedule, "reschedule_required", reason);

    try {
      const emailResponse = await fetch("/api/email/practical-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "appointment_reschedule_requested_examiner",
          requestId: requestToReschedule.id,
        }),
      });

      if (!emailResponse.ok) {
        const emailResult = await emailResponse.json().catch(() => null);

        console.warn(
          "Appointment change was requested, but the examiner notification email was not sent:",
          emailResult,
        );
      }
    } catch (emailError) {
      console.warn(
        "Appointment change was requested, but the examiner notification request failed:",
        emailError,
      );
    }

    setRequestToReschedule(null);
    setRescheduleReason("");
    setRescheduleError("");
    setRespondingRequestId(null);
  }

  async function cancelRequest() {
    if (!requestToCancel || cancelling) return;

    const reason = cancellationReason.trim();

    if (!reason) {
      setCancellationError("Please enter a reason for cancellation.");
      return;
    }

    setCancelling(true);
    setCancellationError("");

    const supabase = createClient();

    const { error } = await supabase.rpc("cancel_own_practical_test_request", {
      p_request_id: requestToCancel.id,
      p_cancellation_reason: reason,
    });

    if (error) {
      console.error("Unable to cancel request:", error);
      setCancellationError(error.message);
      setCancelling(false);
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestToCancel.id
          ? {
              ...request,
              status: "cancelled_by_applicant",
              cancellation_reason: reason,
              cancelled_at: new Date().toISOString(),
            }
          : request,
      ),
    );

    setAuditByRequest((current) => ({
      ...current,
      [requestToCancel.id]: [
        ...(current[requestToCancel.id] ?? []),
        {
          id: `local-${Date.now()}`,
          practical_test_request_id: requestToCancel.id,
          previous_status: requestToCancel.status,
          new_status: "cancelled_by_applicant",
          status_reason: reason,
          changed_by_profile_id: null,
          changed_at: new Date().toISOString(),
        },
      ],
    }));

    setRequestToCancel(null);
    setCancellationReason("");
    setCancellationError("");
    setCancelling(false);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Requests</h1>
          <p className="mt-2 text-slate-600">
            View current and previous practical test requests.
          </p>
        </div>

        <Link
          href="/applicant/requests/new"
          className="inline-flex rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800"
        >
          New Request
        </Link>
      </div>

      {submittedNumber ? (
        <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          <p className="font-semibold">
            Practical test request submitted successfully.
          </p>
          <p className="mt-1 text-sm">Request number: {submittedNumber}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-7 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
          Loading requests…
        </div>
      ) : null}

      {!loading && !errorMessage && requests.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
          No requests found.
        </div>
      ) : null}

      {!loading && requests.length > 0 ? (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-end">
            <p className="text-sm font-semibold text-slate-500">
              {
                requests.filter((request) =>
                  activeRequestStatuses.has(request.status),
                ).length
              }{" "}
              active
              {" · "}
              {
                requests.filter((request) =>
                  historicalRequestStatuses.has(request.status),
                ).length
              }{" "}
              historical
            </p>
          </div>

          {[...requests]
            .sort((first, second) => {
              const firstHistorical = isHistoricalRequest(first.status) ? 1 : 0;
              const secondHistorical = isHistoricalRequest(second.status)
                ? 1
                : 0;

              if (firstHistorical !== secondHistorical) {
                return firstHistorical - secondHistorical;
              }

              return (
                new Date(second.submitted_at ?? second.created_at).getTime() -
                new Date(first.submitted_at ?? first.created_at).getTime()
              );
            })
            .map((request, index, sortedRequests) => {
              const expanded = expandedRequestId === request.id;

              const historical = isHistoricalRequest(request.status);

              const previousRequest =
                index > 0 ? sortedRequests[index - 1] : null;

              const showActiveHeading = index === 0 && !historical;

              const showHistoryHeading =
                historical &&
                (!previousRequest ||
                  !isHistoricalRequest(previousRequest.status));

              const preferredDates = [
                request.requested_date_1,
                request.requested_date_2,
                request.requested_date_3,
              ]
                .filter(Boolean)
                .map((date) => formatDate(date));

              return (
                <div key={request.id} className="contents">
                  {showActiveHeading ? (
                    <div className="pb-2 pt-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900">
                            Active Requests
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Requests that are currently being processed or
                            scheduled.
                          </p>
                        </div>

                        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-800">
                          {
                            sortedRequests.filter((item) =>
                              activeRequestStatuses.has(item.status),
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {showHistoryHeading ? (
                    <div className="pb-2 pt-8">
                      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-8">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900">
                            Request History
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Completed, declined, cancelled, and no-show
                            practical test requests.
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                          {
                            sortedRequests.filter((item) =>
                              historicalRequestStatuses.has(item.status),
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRequestId((current) =>
                          current === request.id ? null : request.id,
                        )
                      }
                      aria-expanded={expanded}
                      className="w-full p-6 text-left hover:bg-slate-50"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900">
                              {request.certificate_sought}
                            </h2>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                                request.status,
                              )}`}
                            >
                              {formatStatus(request.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-slate-600">
                            {request.rating_sought}
                          </p>
                        </div>

                        <div className="flex items-start justify-between gap-6 sm:text-right">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {request.request_number}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Submitted {formatDateTime(request.submitted_at)}
                            </p>
                          </div>

                          <span
                            className={`text-xl text-slate-500 transition-transform ${
                              expanded ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          >
                            ⌄
                          </span>
                        </div>
                      </div>

                      <dl className="mt-6 grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-3">
                        <DetailItem
                          label="Requested dates"
                          value={
                            request.first_available
                              ? "First available appointment"
                              : preferredDates.length
                                ? preferredDates.join(", ")
                                : "Not specified"
                          }
                        />

                        <DetailItem
                          label="Flight school"
                          value={
                            request.flight_school_name_snapshot ||
                            "Self / Independent"
                          }
                        />

                        <DetailItem
                          label={
                            request.scheduled_start_at
                              ? "Appointment"
                              : "Airport"
                          }
                          value={
                            request.scheduled_start_at
                              ? formatDateTime(request.scheduled_start_at)
                              : getAirportDisplay(request)
                          }
                        />
                      </dl>

                      <p className="mt-5 text-sm font-semibold text-sky-700">
                        {expanded
                          ? "Hide full request details"
                          : "View full request details"}
                      </p>
                    </button>

                    {expanded ? (
                      <div className="border-t border-slate-200 px-6 py-6">
                        <div className="space-y-5">
                          {(() => {
                            const nextAction = getNextAction(request);

                            const qualificationWizard =
                              qualificationWizardsByRequest[request.id] ?? null;

                            const qualification = qualificationWizard
                              ? qualificationPresentation(qualificationWizard)
                              : null;

                            return (
                              <section
                                className={`rounded-xl border p-5 ${nextAction.classes}`}
                              >
                                <h3 className="font-bold">
                                  {nextAction.title}
                                </h3>
                                <p className="mt-2 text-sm leading-6">
                                  {nextAction.description}
                                </p>
                              </section>
                            );
                          })()}

                          {request.scheduled_start_at ||
                          request.fee_amount !== null ||
                          request.dms_preapproval_number ? (
                            <DetailSection title="Appointment and Examiner Information">
                              <DetailItem
                                label="Appointment date and time"
                                value={formatDateTime(
                                  request.scheduled_start_at,
                                )}
                              />
                              <DetailItem
                                label="Appointment end"
                                value={formatDateTime(request.scheduled_end_at)}
                              />
                              <DetailItem
                                label="Location"
                                value={getAppointmentLocation(request)}
                              />
                              <DetailItem
                                label="Fee"
                                value={formatCurrency(request.fee_amount)}
                              />
                              <DetailItem
                                label="DMS preapproval number"
                                value={
                                  request.dms_preapproval_number?.trim() ||
                                  "Pending"
                                }
                              />
                              <DetailItem
                                label="Accepted"
                                value={formatDateTime(request.accepted_at)}
                              />
                              <DetailItem
                                label="Assigned examiner"
                                value={
                                  request.examiner_name?.trim() ||
                                  "Not assigned"
                                }
                              />
                              <DetailItem
                                label="Examiner business"
                                value={displayValue(
                                  request.examiner_business_name,
                                )}
                              />
                              <DetailItem
                                label="Examiner email"
                                value={displayValue(
                                  request.examiner_reply_to_email ||
                                    request.examiner_email,
                                )}
                              />
                              <DetailItem
                                label="Examiner phone"
                                value={displayValue(request.examiner_phone)}
                              />
                            </DetailSection>
                          ) : null}

                          {request.status === "scheduled" &&
                          request.appointment_response_status !== "accepted" ? (
                            <section className="rounded-xl border border-sky-300 bg-sky-50 p-5">
                              <h3 className="text-lg font-bold text-sky-950">
                                Appointment Response Required
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-sky-900">
                                Review the finalized appointment details above.
                                Accept the appointment or request a different
                                date and time.
                              </p>

                              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                <button
                                  type="button"
                                  disabled={Boolean(respondingRequestId)}
                                  onClick={() =>
                                    void acceptAppointment(request)
                                  }
                                  className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {respondingRequestId === request.id
                                    ? "Saving Response…"
                                    : "Accept Appointment"}
                                </button>

                                <button
                                  type="button"
                                  disabled={Boolean(respondingRequestId)}
                                  onClick={() => {
                                    setRequestToReschedule(request);
                                    setRescheduleReason("");
                                    setRescheduleError("");
                                  }}
                                  className="rounded-lg border border-amber-400 bg-white px-5 py-3 font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Request a Different Time
                                </button>
                              </div>
                            </section>
                          ) : null}

                          {request.appointment_response_status ===
                          "accepted" ? (
                            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                              <h3 className="font-bold text-emerald-950">
                                Appointment Accepted
                              </h3>

                              <p className="mt-2 text-sm text-emerald-900">
                                You accepted this appointment
                                {request.appointment_responded_at
                                  ? ` on ${formatDateTime(
                                      request.appointment_responded_at,
                                    )}`
                                  : ""}
                                .
                              </p>

                              {request.status === "confirmed" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequestToReschedule(request);
                                    setRescheduleReason("");
                                    setRescheduleError("");
                                  }}
                                  className="mt-4 rounded-lg border border-amber-400 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50"
                                >
                                  Request a Schedule Change
                                </button>
                              ) : null}
                            </section>
                          ) : null}

                          {request.appointment_response_status ===
                          "reschedule_requested" ? (
                            <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                              <h3 className="font-bold text-amber-950">
                                Schedule Change Requested
                              </h3>

                              <p className="mt-2 text-sm text-amber-900">
                                The examiner has been asked to provide a new
                                appointment.
                              </p>

                              {request.appointment_response_notes ? (
                                <p className="mt-3 whitespace-pre-wrap rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-slate-800">
                                  {request.appointment_response_notes}
                                </p>
                              ) : null}
                            </section>
                          ) : null}

                          {(() => {
                            const qualificationWizard =
                              qualificationWizardsByRequest[request.id] ?? null;

                            const qualification = qualificationWizard
                              ? qualificationPresentation(qualificationWizard)
                              : null;

                            return qualificationWizard && qualification ? (
                              <section
                                className={`rounded-xl border p-5 ${qualification.classes}`}
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <h3 className="text-base font-bold">
                                        {qualification.title}
                                      </h3>

                                      <span
                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${qualification.badge}`}
                                      >
                                        {qualification.label}
                                      </span>
                                    </div>

                                    <p className="mt-2 max-w-3xl text-sm">
                                      {qualification.description}
                                    </p>

                                    {qualificationWizard.applicant_submitted_at ? (
                                      <p className="mt-2 text-xs font-medium opacity-75">
                                        Submitted{" "}
                                        {formatDateTime(
                                          qualificationWizard.applicant_submitted_at,
                                        )}
                                      </p>
                                    ) : null}
                                  </div>

                                  {qualification.buttonLabel ? (
                                    <Link
                                      href="/applicant/qualification"
                                      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
                                    >
                                      {qualification.buttonLabel}
                                    </Link>
                                  ) : null}
                                </div>
                              </section>
                            ) : null;
                          })()}

                          <DetailSection title="Applicant Information">
                            <DetailItem
                              label="Full legal name"
                              value={request.applicant_name_snapshot}
                            />
                            <DetailItem
                              label="FTN"
                              value={displayValue(request.ftn_number_snapshot)}
                            />
                            <DetailItem
                              label="Phone"
                              value={displayValue(
                                request.applicant_phone_snapshot,
                              )}
                            />
                            <DetailItem
                              label="Email"
                              value={request.applicant_email_snapshot}
                            />
                          </DetailSection>

                          <DetailSection title="Practical Test Requested">
                            <DetailItem
                              label="Certificate"
                              value={request.certificate_sought}
                            />
                            <DetailItem
                              label="Issuance type"
                              value={formatIssuanceType(request.issuance_type)}
                            />
                            <DetailItem
                              label="Category"
                              value={displayValue(request.category_sought)}
                            />
                            <DetailItem
                              label="Class"
                              value={displayValue(request.class_sought)}
                            />
                            <DetailItem
                              label="Rating"
                              value={request.rating_sought}
                            />
                            <DetailItem
                              label="Part 141 graduate"
                              value={yesNo(request.part_141_graduate)}
                            />
                            <DetailItem
                              label="Previously failed"
                              value={yesNo(request.is_retest)}
                            />

                            {request.is_retest ? (
                              <>
                                <DetailItem
                                  label="Previous test date"
                                  value={formatDate(request.previous_test_date)}
                                />
                                <DetailItem
                                  label="Previous examiner"
                                  value={displayValue(
                                    request.previous_examiner,
                                  )}
                                />
                                <DetailItem
                                  label="Retest areas"
                                  value={displayValue(request.retest_areas)}
                                />
                              </>
                            ) : null}
                          </DetailSection>

                          <DetailSection title="Location and Aircraft">
                            <DetailItem
                              label="Flight school"
                              value={
                                request.flight_school_name_snapshot ||
                                "Self / Independent"
                              }
                            />
                            <DetailItem
                              label="Oral-test location"
                              value={displayValue(request.oral_test_location)}
                            />
                            <DetailItem
                              label="Airport"
                              value={getAirportDisplay(request)}
                            />
                            <DetailItem
                              label="Aircraft"
                              value={getAircraftDisplay(request)}
                            />
                            <DetailItem
                              label="FAA aircraft type"
                              value={displayValue(
                                request.aircraft_type_designator,
                              )}
                            />
                            <DetailItem
                              label="Registration"
                              value={displayValue(
                                request.aircraft_registration,
                              )}
                            />
                            <DetailItem
                              label="Aircraft description"
                              value={displayValue(request.aircraft_description)}
                            />
                            <DetailItem
                              label="Aircraft notes"
                              value={displayValue(request.aircraft_notes)}
                            />
                          </DetailSection>

                          <DetailSection title="Instructor">
                            <DetailItem
                              label="Instructor name"
                              value={displayValue(request.instructor_name)}
                            />
                            <DetailItem
                              label="Instructor phone"
                              value={displayValue(request.instructor_phone)}
                            />
                            <DetailItem
                              label="Instructor email"
                              value={displayValue(request.instructor_email)}
                            />
                            <DetailItem
                              label="Certificate number"
                              value={displayValue(
                                request.instructor_certificate_number,
                              )}
                            />
                            <DetailItem
                              label="Associated with flight school"
                              value={yesNo(
                                request.instructor_associated_with_school,
                              )}
                            />
                          </DetailSection>

                          <DetailSection title="Availability">
                            <DetailItem
                              label="First available"
                              value={yesNo(request.first_available)}
                            />
                            <DetailItem
                              label="First preferred date"
                              value={formatDate(request.requested_date_1)}
                            />
                            <DetailItem
                              label="Second preferred date"
                              value={formatDate(request.requested_date_2)}
                            />
                            <DetailItem
                              label="Third preferred date"
                              value={formatDate(request.requested_date_3)}
                            />
                            <DetailItem
                              label="Preferred time"
                              value={displayValue(request.preferred_time)}
                            />
                            <DetailItem
                              label="Specific time"
                              value={displayValue(request.specific_time)}
                            />
                            <DetailItem
                              label="Scheduling notes"
                              value={displayValue(request.scheduling_notes)}
                            />
                          </DetailSection>

                          <DetailSection title="Acknowledgments">
                            <DetailItem
                              label="Fee acknowledged"
                              value={yesNo(request.fee_acknowledged)}
                            />
                            <DetailItem
                              label="Eligibility acknowledged"
                              value={yesNo(request.eligibility_acknowledged)}
                            />
                            <DetailItem
                              label="Aircraft acknowledged"
                              value={yesNo(request.aircraft_acknowledged)}
                            />
                            <DetailItem
                              label="Request acknowledged"
                              value={yesNo(request.request_acknowledged)}
                            />
                          </DetailSection>

                          <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="font-bold text-slate-900">
                              Request Status History
                            </h3>

                            {(auditByRequest[request.id] ?? []).length === 0 ? (
                              <p className="mt-4 text-sm text-slate-500">
                                No status-history entries are available for this
                                request.
                              </p>
                            ) : (
                              <ol className="mt-5 space-y-0">
                                {(auditByRequest[request.id] ?? []).map(
                                  (audit, index, history) => (
                                    <li
                                      key={audit.id}
                                      className="relative flex gap-4 pb-6 last:pb-0"
                                    >
                                      {index < history.length - 1 ? (
                                        <span
                                          className="absolute left-[7px] top-4 h-full w-px bg-slate-200"
                                          aria-hidden="true"
                                        />
                                      ) : null}

                                      <span
                                        className="relative mt-1.5 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-sky-700 ring-1 ring-slate-300"
                                        aria-hidden="true"
                                      />

                                      <div>
                                        <p className="font-semibold text-slate-900">
                                          {formatStatus(audit.new_status)}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          {formatDateTime(audit.changed_at)}
                                        </p>

                                        {audit.status_reason ? (
                                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                            {audit.status_reason}
                                          </p>
                                        ) : null}
                                      </div>
                                    </li>
                                  ),
                                )}
                              </ol>
                            )}
                          </section>

                          {request.cancellation_reason ? (
                            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                              <h3 className="font-bold text-red-900">
                                Cancellation
                              </h3>

                              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                                <DetailItem
                                  label="Cancelled"
                                  value={formatDateTime(request.cancelled_at)}
                                />
                                <DetailItem
                                  label="Reason"
                                  value={request.cancellation_reason}
                                />
                              </dl>
                            </section>
                          ) : null}

                          {cancellableStatuses.has(request.status) ? (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setRequestToCancel(request);
                                  setCancellationReason("");
                                  setCancellationError("");
                                }}
                                className="rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 hover:bg-red-50"
                              >
                                Cancel Request
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                </div>
              );
            })}
        </div>
      ) : null}

      {requestToReschedule ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-request-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2
              id="reschedule-request-title"
              className="text-2xl font-bold text-slate-900"
            >
              Request a Different Appointment
            </h2>

            <p className="mt-3 text-slate-600">
              Explain why the scheduled appointment does not work and provide
              any alternative dates or times that would be helpful.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {requestToReschedule.request_number}
              </p>
              <p className="mt-1">
                {formatDateTime(requestToReschedule.scheduled_start_at)}
              </p>
              <p className="mt-1">
                {getAppointmentLocation(requestToReschedule)}
              </p>
            </div>

            <label
              htmlFor="reschedule-reason"
              className="mt-6 block text-sm font-semibold text-slate-800"
            >
              Explanation and alternate availability
              <span className="ml-1 text-red-600">*</span>
            </label>

            <textarea
              id="reschedule-reason"
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value)}
              rows={6}
              autoFocus
              placeholder="Example: I am unavailable that morning. I can attend after 1:00 PM or on August 12 or 13."
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />

            {rescheduleError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {rescheduleError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(respondingRequestId)}
                onClick={() => {
                  setRequestToReschedule(null);
                  setRescheduleReason("");
                  setRescheduleError("");
                }}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Keep Current Appointment
              </button>

              <button
                type="button"
                disabled={
                  Boolean(respondingRequestId) || !rescheduleReason.trim()
                }
                onClick={() => void requestReschedule()}
                className="rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {respondingRequestId === requestToReschedule.id
                  ? "Submitting…"
                  : "Submit Change Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {requestToCancel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-request-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2
              id="cancel-request-title"
              className="text-2xl font-bold text-slate-900"
            >
              Cancel Practical Test Request
            </h2>

            <p className="mt-3 text-slate-600">
              You are cancelling request{" "}
              <span className="font-semibold text-slate-900">
                {requestToCancel.request_number}
              </span>
              . A reason is required.
            </p>

            <label
              htmlFor="cancellationReason"
              className="mt-6 block text-sm font-semibold text-slate-800"
            >
              Reason for cancellation
              <span className="ml-1 text-red-600">*</span>
            </label>

            <textarea
              id="cancellationReason"
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              rows={5}
              autoFocus
              placeholder="Please explain why you are cancelling this request."
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />

            {cancellationError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {cancellationError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  setRequestToCancel(null);
                  setCancellationReason("");
                  setCancellationError("");
                }}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Keep Request
              </button>

              <button
                type="button"
                disabled={cancelling || !cancellationReason.trim()}
                onClick={() => void cancelRequest()}
                className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
