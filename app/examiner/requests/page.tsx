"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import QualificationReviewPanel, {
  type QualificationWizardSummary,
} from "./QualificationReviewPanel";

type PracticalTestRequest = {
  id: string;
  request_number: string;
  status: string;
  status_reason: string | null;

  applicant_name_snapshot: string;
  applicant_email_snapshot: string;
  applicant_phone_snapshot: string | null;
  ftn_number_snapshot: string | null;

  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  issuance_type: string | null;
  practical_test_type_id: string | null;

  fee_amount: number | null;
  dms_preapproval_number: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
  accepted_at: string | null;

  appointment_response_status: string | null;
  appointment_responded_at: string | null;
  appointment_response_notes: string | null;

  is_retest: boolean;
  part_141_graduate: boolean | null;
  previous_test_date: string | null;
  previous_examiner: string | null;
  retest_areas: string | null;

  flight_school_name_snapshot: string | null;
  oral_test_location: string | null;
  flight_airport_code: string | null;

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
  applicant_comments: string | null;

  fee_acknowledged: boolean;
  eligibility_acknowledged: boolean;
  aircraft_acknowledged: boolean;
  request_acknowledged: boolean;
  acknowledgments_accepted_at: string | null;

  submitted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  source_system: string | null;
  created_at: string;
  updated_at: string | null;
};

type RequestEditDraft = {
  applicant_name_snapshot: string;
  applicant_email_snapshot: string;
  applicant_phone_snapshot: string;
  ftn_number_snapshot: string;

  certificate_sought: string;
  issuance_type: string;
  category_sought: string;
  class_sought: string;
  rating_sought: string;

  is_retest: boolean;
  part_141_graduate: string;
  previous_test_date: string;
  previous_examiner: string;
  retest_areas: string;

  flight_school_name_snapshot: string;
  oral_test_location: string;
  flight_airport_code: string;

  aircraft_description: string;
  aircraft_make: string;
  aircraft_model: string;
  aircraft_registration: string;
  aircraft_notes: string;

  instructor_name: string;
  instructor_phone: string;
  instructor_email: string;
  instructor_certificate_number: string;
  instructor_associated_with_school: string;

  first_available: boolean;
  requested_dates_text: string;
  requested_date_1: string;
  requested_date_2: string;
  requested_date_3: string;
  preferred_time: string;
  specific_time: string;
  scheduling_notes: string;
  applicant_comments: string;
};

type SchedulingLocation = {
  id: string;
  name: string;
  default_oral_test_location: string | null;
  default_airport_code: string | null;
};

type RequestGroupingMode =
  "appointment_date" | "applicant_name" | "test_type" | "flight_school";

type GroupedRequestItem = PracticalTestRequest & {
  requestGroupKey: string;
  requestGroupLabel: string;
};

type RequestHistoryEntry = {
  id: string;
  practical_test_request_id: string;
  entry_text: string;
  entry_type: string;
  created_by_profile_id: string;
  created_by_label: string;
  created_at: string;
  updated_at: string;
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

const statusOptions = [
  {
    value: "submitted",
    label: "Submitted",
  },
  {
    value: "under_review",
    label: "Under Review",
  },
  {
    value: "awaiting_applicant_information",
    label: "Awaiting Applicant Information",
  },
  {
    value: "accepted",
    label: "Accepted",
  },
  {
    value: "scheduling",
    label: "Scheduling",
  },
  {
    value: "reschedule_required",
    label: "Reschedule Required",
  },
  {
    value: "declined",
    label: "Declined",
  },
  {
    value: "cancelled_by_examiner",
    label: "Cancelled by Examiner",
  },
  {
    value: "no_show",
    label: "No Show",
  },
];

const closedStatuses = new Set([
  "completed",
  "declined",
  "cancelled",
  "cancelled_by_applicant",
  "cancelled_by_examiner",
  "no_show",
]);

function createRequestEditDraft(
  request: PracticalTestRequest,
): RequestEditDraft {
  return {
    applicant_name_snapshot: request.applicant_name_snapshot ?? "",
    applicant_email_snapshot: request.applicant_email_snapshot ?? "",
    applicant_phone_snapshot: request.applicant_phone_snapshot ?? "",
    ftn_number_snapshot: request.ftn_number_snapshot ?? "",

    certificate_sought: request.certificate_sought ?? "",
    issuance_type: request.issuance_type ?? "",
    category_sought: request.category_sought ?? "",
    class_sought: request.class_sought ?? "",
    rating_sought: request.rating_sought ?? "",

    is_retest: request.is_retest,
    part_141_graduate:
      request.part_141_graduate === null
        ? ""
        : String(request.part_141_graduate),
    previous_test_date: request.previous_test_date ?? "",
    previous_examiner: request.previous_examiner ?? "",
    retest_areas: request.retest_areas ?? "",

    flight_school_name_snapshot: request.flight_school_name_snapshot ?? "",
    oral_test_location: request.oral_test_location ?? "",
    flight_airport_code: request.flight_airport_code ?? "",

    aircraft_description: request.aircraft_description ?? "",
    aircraft_make: request.aircraft_make ?? "",
    aircraft_model: request.aircraft_model ?? "",
    aircraft_registration: request.aircraft_registration ?? "",
    aircraft_notes: request.aircraft_notes ?? "",

    instructor_name: request.instructor_name ?? "",
    instructor_phone: request.instructor_phone ?? "",
    instructor_email: request.instructor_email ?? "",
    instructor_certificate_number: request.instructor_certificate_number ?? "",
    instructor_associated_with_school:
      request.instructor_associated_with_school === null
        ? ""
        : String(request.instructor_associated_with_school),

    first_available: request.first_available,
    requested_dates_text: request.requested_dates_text ?? "",
    requested_date_1: request.requested_date_1 ?? "",
    requested_date_2: request.requested_date_2 ?? "",
    requested_date_3: request.requested_date_3 ?? "",
    preferred_time: request.preferred_time ?? "",
    specific_time: request.specific_time ?? "",
    scheduling_notes: request.scheduling_notes ?? "",
    applicant_comments: request.applicant_comments ?? "",
  };
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not specified";
}

function yesNo(value: boolean | null | undefined) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not specified";
}

type DmsDeadlineState = "none" | "yellow" | "red" | "green";

function getDmsDeadlineState(
  request: PracticalTestRequest,
  nowMilliseconds: number,
): DmsDeadlineState {
  if (!request.scheduled_start_at || closedStatuses.has(request.status)) {
    return "none";
  }

  const appointmentMilliseconds = new Date(
    request.scheduled_start_at,
  ).getTime();

  if (Number.isNaN(appointmentMilliseconds)) {
    return "none";
  }

  const hoursUntilAppointment =
    (appointmentMilliseconds - nowMilliseconds) / (1000 * 60 * 60);

  const hasDmsPreapproval = Boolean(request.dms_preapproval_number?.trim());

  if (hoursUntilAppointment <= 48) {
    return hasDmsPreapproval ? "green" : "red";
  }

  if (hoursUntilAppointment <= 72 && !hasDmsPreapproval) {
    return "yellow";
  }

  return "none";
}

function getDmsDeadlineCardClasses(
  request: PracticalTestRequest,
  nowMilliseconds: number,
) {
  switch (getDmsDeadlineState(request, nowMilliseconds)) {
    case "green":
      return [
        "border-emerald-400",
        "bg-emerald-50",
        "ring-1",
        "ring-emerald-200",
      ].join(" ");

    case "red":
      return ["border-red-500", "bg-red-50", "ring-1", "ring-red-200"].join(
        " ",
      );

    case "yellow":
      return [
        "border-amber-400",
        "bg-amber-50",
        "ring-1",
        "ring-amber-200",
      ].join(" ");

    default:
      return "border-slate-200 bg-white";
  }
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

function normalizeGroupingText(value: string | null | undefined) {
  return String(value || "").trim();
}

function getApplicantSortName(request: PracticalTestRequest) {
  return normalizeGroupingText(request.applicant_name_snapshot);
}

function getTestTypeLabel(request: PracticalTestRequest) {
  return [
    normalizeGroupingText(request.certificate_sought),
    normalizeGroupingText(request.rating_sought),
    formatIssuanceType(request.issuance_type),
  ]
    .filter((value) => value && value !== "Not specified")
    .join(" · ");
}

function getFlightSchoolLabel(request: PracticalTestRequest) {
  return (
    normalizeGroupingText(request.flight_school_name_snapshot) ||
    "No Flight School"
  );
}

function getHawaiiAppointmentDateParts(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  if (!year || !month || !day) {
    return null;
  }

  return {
    key: `${year}-${month}-${day}`,
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Honolulu",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date),
  };
}

function getRequestGrouping(
  request: PracticalTestRequest,
  groupingMode: RequestGroupingMode,
) {
  if (groupingMode === "applicant_name") {
    const applicantName = getApplicantSortName(request);
    const firstCharacter = applicantName.charAt(0).toUpperCase();

    const groupLabel =
      firstCharacter && /[A-Z]/.test(firstCharacter) ? firstCharacter : "#";

    return {
      key: groupLabel,
      label: groupLabel,
    };
  }

  if (groupingMode === "test_type") {
    const testType = getTestTypeLabel(request) || "Unspecified Test Type";

    return {
      key: testType.toLocaleLowerCase(),
      label: testType,
    };
  }

  if (groupingMode === "flight_school") {
    const flightSchool = getFlightSchoolLabel(request);

    return {
      key:
        flightSchool === "No Flight School"
          ? "~~~~no-flight-school"
          : flightSchool.toLocaleLowerCase(),
      label: flightSchool,
    };
  }

  const appointmentDate = getHawaiiAppointmentDateParts(
    request.scheduled_start_at,
  );

  if (!appointmentDate) {
    return {
      key: "9999-99-99",
      label: "No Proposed or Finalized Appointment Date",
    };
  }

  return appointmentDate;
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

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart(
    "day",
  )}T${getPart("hour")}:${getPart("minute")}`;
}

function hawaiiDateTimeLocalToIso(value: string) {
  if (!value) return null;
  return new Date(`${value}:00-10:00`).toISOString();
}

function minutesBetween(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return null;

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60_000);
}

const quarterHourTimes = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;

  const value =
    `${String(hour).padStart(2, "0")}:` + `${String(minute).padStart(2, "0")}`;

  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? "AM" : "PM";

  return {
    value,
    label: `${displayHour}:` + `${String(minute).padStart(2, "0")} ${period}`,
  };
});

function appointmentDatePart(value: string | undefined) {
  return value?.split("T")[0] ?? "";
}

function appointmentTimePart(value: string | undefined) {
  return value?.split("T")[1]?.slice(0, 5) ?? "";
}

function calculateEndIso(startIso: string, durationMinutes: number) {
  const start = new Date(startIso);

  if (
    Number.isNaN(start.getTime()) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return null;
  }

  return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return "Not configured";
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
      <h3 className="font-bold text-slate-900">{title}</h3>

      <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </dl>
    </section>
  );
}

export default function ExaminerRequestsPage() {
  const [requests, setRequests] = useState<PracticalTestRequest[]>([]);
  const [auditByRequest, setAuditByRequest] = useState<
    Record<string, RequestStatusAudit[]>
  >({});

  const [historyByRequest, setHistoryByRequest] = useState<
    Record<string, RequestHistoryEntry[]>
  >({});

  const [historyDrafts, setHistoryDrafts] = useState<Record<string, string>>(
    {},
  );

  const [historyTypeDrafts, setHistoryTypeDrafts] = useState<
    Record<string, string>
  >({});

  const [savingHistoryRequestId, setSavingHistoryRequestId] = useState<
    string | null
  >(null);
  const [directRequestId, setDirectRequestId] = useState<string | null>(null);
  const openedDirectRequestRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [groupingMode, setGroupingMode] =
    useState<RequestGroupingMode>("appointment_date");
  const [deadlineClock, setDeadlineClock] = useState(0);

  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [savingRequestInfoId, setSavingRequestInfoId] = useState<string | null>(
    null,
  );
  const [requestEditDrafts, setRequestEditDrafts] = useState<
    Record<string, RequestEditDraft>
  >({});

  const [dmsDrafts, setDmsDrafts] = useState<Record<string, string>>({});
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [standardFees, setStandardFees] = useState<Record<string, number>>({});
  const [appointmentDrafts, setAppointmentDrafts] = useState<
    Record<string, string>
  >({});
  const [appointmentDurationDrafts, setAppointmentDurationDrafts] = useState<
    Record<string, string>
  >({});
  const [appointmentLocationDrafts, setAppointmentLocationDrafts] = useState<
    Record<string, string>
  >({});
  const [schedulingLocations, setSchedulingLocations] = useState<
    SchedulingLocation[]
  >([]);
  const [defaultDurations, setDefaultDurations] = useState<
    Record<string, number>
  >({});
  const [savingDmsRequestId, setSavingDmsRequestId] = useState<string | null>(
    null,
  );
  const [savingFeeRequestId, setSavingFeeRequestId] = useState<string | null>(
    null,
  );
  const [savingAppointmentRequestId, setSavingAppointmentRequestId] = useState<
    string | null
  >(null);

  const [qualificationWizardsByRequest, setQualificationWizardsByRequest] =
    useState<Record<string, QualificationWizardSummary>>({});

  const loadRequests = useCallback(async () => {
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
      setPageError(
        "Examiner or administrator access is required to review practical test requests.",
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

        applicant_name_snapshot,
        applicant_email_snapshot,
        applicant_phone_snapshot,
        ftn_number_snapshot,

        certificate_sought,
        category_sought,
        class_sought,
        rating_sought,
        issuance_type,
        practical_test_type_id,

        fee_amount,
        dms_preapproval_number,
        scheduled_start_at,
        scheduled_end_at,
        scheduled_location,
        accepted_at,

        appointment_response_status,
        appointment_responded_at,
        appointment_response_notes,

        is_retest,
        part_141_graduate,
        previous_test_date,
        previous_examiner,
        retest_areas,

        flight_school_name_snapshot,
        oral_test_location,
        flight_airport_code,

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
        applicant_comments,

        fee_acknowledged,
        eligibility_acknowledged,
        aircraft_acknowledged,
        request_acknowledged,
        acknowledgments_accepted_at,

        submitted_at,
        cancelled_at,
        cancellation_reason,
        source_system,
        created_at,
        updated_at
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
      console.error("Unable to load examiner requests:", error);

      setPageError(
        `Practical test requests could not be loaded: ${error.message}`,
      );

      setRequests([]);
    } else {
      const loadedRequests = (data ?? []) as PracticalTestRequest[];

      setRequests(loadedRequests);

      setFeeDrafts(
        Object.fromEntries(
          loadedRequests.map((request) => [
            request.id,
            request.fee_amount === null ? "" : String(request.fee_amount),
          ]),
        ),
      );

      const [feeResult, locationResult, durationResult] = await Promise.all([
        supabase
          .from("examiner_practical_test_fees")
          .select("practical_test_type_id, fee_amount")
          .eq("examiner_profile_id", user.id)
          .eq("is_active", true),

        supabase
          .from("flight_schools")
          .select(
            `
            id,
            name,
            default_oral_test_location,
            default_airport_code
          `,
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("practical_test_types")
          .select("id, default_duration_minutes"),
      ]);

      const { data: feeRows, error: feeError } = feeResult;

      if (feeError) {
        console.error("Unable to load standard fees:", feeError);
      } else {
        setStandardFees(
          Object.fromEntries(
            (feeRows ?? []).map((fee) => [
              fee.practical_test_type_id,
              Number(fee.fee_amount),
            ]),
          ),
        );
      }

      if (locationResult.error) {
        console.error(
          "Unable to load scheduling locations:",
          locationResult.error,
        );
        setSchedulingLocations([]);
      } else {
        setSchedulingLocations(
          (locationResult.data ?? []) as SchedulingLocation[],
        );
      }

      if (durationResult.error) {
        console.error(
          "Unable to load default durations:",
          durationResult.error,
        );
        setDefaultDurations({});
      } else {
        setDefaultDurations(
          Object.fromEntries(
            (durationResult.data ?? []).map((testType) => [
              testType.id,
              Number(testType.default_duration_minutes || 240),
            ]),
          ),
        );
      }

      setDmsDrafts(
        Object.fromEntries(
          loadedRequests.map((request) => [
            request.id,
            request.dms_preapproval_number ?? "",
          ]),
        ),
      );

      setAppointmentDrafts(
        Object.fromEntries(
          loadedRequests.map((request) => [
            request.id,
            toDateTimeLocalValue(request.scheduled_start_at),
          ]),
        ),
      );

      setAppointmentDurationDrafts(
        Object.fromEntries(
          loadedRequests.map((request) => [
            request.id,
            String(
              minutesBetween(
                request.scheduled_start_at,
                request.scheduled_end_at,
              ) ?? 240,
            ),
          ]),
        ),
      );

      setAppointmentLocationDrafts(
        Object.fromEntries(
          loadedRequests.map((request) => [
            request.id,
            request.scheduled_location ?? request.oral_test_location ?? "",
          ]),
        ),
      );

      const requestIds = loadedRequests.map((request) => request.id);

      setQualificationWizardsByRequest({});

      if (requestIds.length > 0) {
        const {
          data: qualificationWizardRows,
          error: qualificationWizardError,
        } = await supabase
          .from("qualification_wizards")
          .select(
            `
            id,
            practical_test_request_id,
            rule_set_id,
            status,
            available_at,
            opened_at,
            applicant_submitted_at,
            instructor_certified_at,
            examiner_reviewed_at,
            accepted_at,
            current_revision_number,
            instructor_name,
            instructor_email
            `,
          )
          .in("practical_test_request_id", requestIds);

        if (qualificationWizardError) {
          console.error(
            "Unable to load qualification wizard summaries:",
            qualificationWizardError,
          );
        } else {
          setQualificationWizardsByRequest(
            Object.fromEntries(
              (
                (qualificationWizardRows ?? []) as QualificationWizardSummary[]
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

        const { data: historyRows, error: historyError } = await supabase
          .from("practical_test_request_history")
          .select(
            `
            id,
            practical_test_request_id,
            entry_text,
            entry_type,
            created_by_profile_id,
            created_by_label,
            created_at,
            updated_at
          `,
          )
          .in("practical_test_request_id", requestIds)
          .order("created_at", {
            ascending: false,
          });

        if (historyError) {
          console.error("Unable to load request history:", historyError);

          setHistoryByRequest({});
        } else {
          const groupedHistory: Record<string, RequestHistoryEntry[]> = {};

          for (const historyEntry of (historyRows ??
            []) as RequestHistoryEntry[]) {
            groupedHistory[historyEntry.practical_test_request_id] ??= [];

            groupedHistory[historyEntry.practical_test_request_id].push(
              historyEntry,
            );
          }

          setHistoryByRequest(groupedHistory);
        }
      } else {
        setAuditByRequest({});
        setHistoryByRequest({});
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const requestId = parameters.get("request");

    if (requestId) {
      setDirectRequestId(requestId);
      setStatusFilter("all");
      setSearch("");
    }

    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!directRequestId || loading) {
      return;
    }

    if (openedDirectRequestRef.current === directRequestId) {
      return;
    }

    const requestCard = document.getElementById(
      `examiner-request-${directRequestId}`,
    );

    if (!requestCard) {
      return;
    }

    const requestInfo = requestCard.querySelector("details");

    if (requestInfo instanceof HTMLDetailsElement) {
      requestInfo.open = true;
    }

    requestCard.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    openedDirectRequestRef.current = directRequestId;
  }, [directRequestId, loading, requests]);

  useEffect(() => {
    setDeadlineClock(Date.now());

    const timer = window.setInterval(() => {
      setDeadlineClock(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Synchronize fee drafts from saved request data.
  // If no request-specific fee has been saved yet, use the
  // active standard fee configured for that practical-test type.
  useEffect(() => {
    setFeeDrafts((current) => {
      let changed = false;
      const next = { ...current };

      for (const request of requests) {
        const standardFee = request.practical_test_type_id
          ? (standardFees[request.practical_test_type_id] ?? null)
          : null;

        const effectiveFee =
          request.fee_amount !== null ? request.fee_amount : standardFee;

        if (
          effectiveFee !== null &&
          (next[request.id] === undefined || next[request.id].trim() === "")
        ) {
          next[request.id] = String(effectiveFee);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [requests, standardFees]);

  const statusCounts = useMemo(() => {
    const counts = {
      total: requests.length,
      new: 0,
      active: 0,
      scheduled: 0,
      closed: 0,
    };

    for (const request of requests) {
      if (request.status === "submitted") {
        counts.new += 1;
      }

      if (closedStatuses.has(request.status)) {
        counts.closed += 1;
      } else {
        counts.active += 1;
      }

      if (request.status === "scheduled" || request.status === "confirmed") {
        counts.scheduled += 1;
      }
    }

    return counts;
  }, [requests]);

  const visibleRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      if (statusFilter === "active" && closedStatuses.has(request.status)) {
        return false;
      }

      if (statusFilter === "closed" && !closedStatuses.has(request.status)) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        statusFilter !== "active" &&
        statusFilter !== "closed" &&
        request.status !== statusFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        request.request_number,
        request.applicant_name_snapshot,
        request.applicant_email_snapshot,
        request.applicant_phone_snapshot,
        request.ftn_number_snapshot,
        request.certificate_sought,
        request.category_sought,
        request.class_sought,
        request.rating_sought,
        request.issuance_type,
        request.flight_school_name_snapshot,
        request.flight_airport_code,
        request.aircraft_make,
        request.aircraft_model,
        request.aircraft_registration,
        request.instructor_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [requests, search, statusFilter]);

  const groupedRequests = useMemo<GroupedRequestItem[]>(() => {
    const collator = new Intl.Collator("en-US", {
      sensitivity: "base",
      numeric: true,
    });

    return visibleRequests
      .map((request) => {
        const grouping = getRequestGrouping(request, groupingMode);

        return {
          ...request,
          requestGroupKey: grouping.key,
          requestGroupLabel: grouping.label,
        };
      })
      .sort((left, right) => {
        const groupComparison = collator.compare(
          left.requestGroupKey,
          right.requestGroupKey,
        );

        if (groupComparison !== 0) {
          return groupComparison;
        }

        if (groupingMode === "appointment_date") {
          const leftAppointment = left.scheduled_start_at
            ? new Date(left.scheduled_start_at).getTime()
            : Number.POSITIVE_INFINITY;

          const rightAppointment = right.scheduled_start_at
            ? new Date(right.scheduled_start_at).getTime()
            : Number.POSITIVE_INFINITY;

          if (leftAppointment !== rightAppointment) {
            return leftAppointment - rightAppointment;
          }
        }

        if (groupingMode === "applicant_name") {
          return collator.compare(
            getApplicantSortName(left),
            getApplicantSortName(right),
          );
        }

        if (groupingMode === "test_type") {
          const nameComparison = collator.compare(
            getApplicantSortName(left),
            getApplicantSortName(right),
          );

          if (nameComparison !== 0) {
            return nameComparison;
          }
        }

        if (groupingMode === "flight_school") {
          const testComparison = collator.compare(
            getTestTypeLabel(left),
            getTestTypeLabel(right),
          );

          if (testComparison !== 0) {
            return testComparison;
          }
        }

        return collator.compare(
          getApplicantSortName(left),
          getApplicantSortName(right),
        );
      });
  }, [groupingMode, visibleRequests]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const request of groupedRequests) {
      counts[request.requestGroupKey] =
        (counts[request.requestGroupKey] ?? 0) + 1;
    }

    return counts;
  }, [groupedRequests]);

  function appendAuditEntry(
    requestId: string,
    previousStatus: string,
    newStatus: string,
    statusReason: string | null,
  ) {
    if (previousStatus === newStatus) {
      return;
    }

    const changedAt = new Date().toISOString();

    setAuditByRequest((current) => ({
      ...current,
      [requestId]: [
        ...(current[requestId] ?? []),
        {
          id: `local-${requestId}-${changedAt}`,
          practical_test_request_id: requestId,
          previous_status: previousStatus,
          new_status: newStatus,
          status_reason: statusReason,
          changed_by_profile_id: null,
          changed_at: changedAt,
        },
      ],
    }));
  }

  function beginEditingRequest(request: PracticalTestRequest) {
    if (closedStatuses.has(request.status)) {
      setPageError(
        `${request.request_number} is a historical request and can no longer be edited from the active request workflow.`,
      );
      return;
    }

    setRequestEditDrafts((current) => ({
      ...current,
      [request.id]: createRequestEditDraft(request),
    }));
    setEditingRequestId(request.id);
    setPageError("");
    setMessage("");
  }

  function cancelEditingRequest(requestId: string) {
    setEditingRequestId(null);
    setRequestEditDrafts((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });
  }

  function updateRequestEditDraft<K extends keyof RequestEditDraft>(
    requestId: string,
    field: K,
    value: RequestEditDraft[K],
  ) {
    setRequestEditDrafts((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        [field]: value,
      },
    }));
  }

  async function saveRequestInfo(request: PracticalTestRequest) {
    if (savingRequestInfoId) return;

    if (closedStatuses.has(request.status)) {
      setPageError(
        `${request.request_number} is a historical request and can no longer be edited from the active request workflow.`,
      );
      setEditingRequestId(null);
      return;
    }

    const draft = requestEditDrafts[request.id];

    if (!draft) {
      setPageError("The request edit form could not be loaded.");
      return;
    }

    if (!draft.applicant_name_snapshot.trim()) {
      setPageError("Applicant name is required.");
      return;
    }

    if (!draft.applicant_email_snapshot.trim()) {
      setPageError("Applicant email is required.");
      return;
    }

    if (!draft.certificate_sought.trim()) {
      setPageError("Certificate sought is required.");
      return;
    }

    if (!draft.rating_sought.trim()) {
      setPageError("Rating sought is required.");
      return;
    }

    setSavingRequestInfoId(request.id);
    setPageError("");
    setMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "examiner_update_practical_test_request_info",
      {
        p_request_id: request.id,
        p_changes: draft,
      },
    );

    if (error) {
      setPageError(
        `Request ${request.request_number} could not be updated: ${error.message}`,
      );
      setSavingRequestInfoId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setPageError(
        "The request update completed without returning the updated request.",
      );
      setSavingRequestInfoId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              ...updatedRequest,
            }
          : item,
      ),
    );

    setRequestEditDrafts((current) => {
      const next = { ...current };
      delete next[request.id];
      return next;
    });

    setEditingRequestId(null);
    setSavingRequestInfoId(null);
    setMessage(`Request information saved for ${request.request_number}.`);
  }

  async function updateRequestStatus(
    request: PracticalTestRequest,
    nextStatus: string,
  ) {
    if (savingRequestId || nextStatus === request.status) {
      return;
    }

    if (closedStatuses.has(request.status)) {
      setPageError(
        `${request.request_number} is a historical request and its workflow status is locked.`,
      );
      return;
    }

    const statusesRequiringReason = new Set([
      "awaiting_applicant_information",
      "declined",
      "cancelled",
      "cancelled_by_examiner",
      "no_show",
      "reschedule_required",
    ]);

    const reasonPrompts: Record<string, string> = {
      awaiting_applicant_information:
        "Enter the information needed from the applicant:",
      declined: "Enter the reason this request is being declined:",
      cancelled: "Enter the cancellation reason:",
      cancelled_by_examiner: "Enter the examiner cancellation reason:",
      no_show: "Enter the no-show details:",
      reschedule_required: "Enter the reason rescheduling is required:",
    };

    let statusReason: string | null = null;

    if (statusesRequiringReason.has(nextStatus)) {
      const enteredReason = window.prompt(
        reasonPrompts[nextStatus] ?? "Enter the reason for this status change:",
        request.status_reason ?? "",
      );

      // The examiner pressed Cancel in the prompt.
      if (enteredReason === null) {
        return;
      }

      statusReason = enteredReason.trim();

      if (!statusReason) {
        setPageError("A reason is required for that status.");
        return;
      }
    }

    setSavingRequestId(request.id);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "examiner_update_practical_test_request_status",
      {
        p_request_id: request.id,
        p_new_status: nextStatus,
        p_status_reason: statusReason,
      },
    );

    if (error) {
      console.error("Unable to update request status:", error);

      setPageError(
        `Request ${request.request_number} could not be updated: ${error.message}`,
      );

      setSavingRequestId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setPageError(
        "The status update completed without returning the updated request.",
      );

      setSavingRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: updatedRequest.status,
              status_reason: updatedRequest.status_reason,
              fee_amount: updatedRequest.fee_amount,
              dms_preapproval_number: updatedRequest.dms_preapproval_number,
              scheduled_start_at: updatedRequest.scheduled_start_at,
              scheduled_end_at: updatedRequest.scheduled_end_at,
              scheduled_location: updatedRequest.scheduled_location,
              accepted_at: updatedRequest.accepted_at,
              appointment_response_status:
                updatedRequest.appointment_response_status,
              appointment_responded_at: updatedRequest.appointment_responded_at,
              appointment_response_notes:
                updatedRequest.appointment_response_notes,
              cancelled_at: updatedRequest.cancelled_at,
              cancellation_reason: updatedRequest.cancellation_reason,
              updated_at: updatedRequest.updated_at,
            }
          : item,
      ),
    );

    setFeeDrafts((current) => ({
      ...current,
      [request.id]:
        updatedRequest.fee_amount === null
          ? ""
          : String(updatedRequest.fee_amount),
    }));

    appendAuditEntry(
      request.id,
      request.status,
      updatedRequest.status,
      updatedRequest.status_reason,
    );

    if (request.status !== "accepted" && updatedRequest.status === "accepted") {
      try {
        const emailResponse = await fetch("/api/email/practical-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "request_accepted_applicant",
            requestId: request.id,
          }),
        });

        if (!emailResponse.ok) {
          const emailResult = await emailResponse.json().catch(() => null);

          console.warn(
            "Request was accepted, but the applicant acceptance email was not sent:",
            emailResult,
          );
        }
      } catch (emailError) {
        console.warn(
          "Request was accepted, but the applicant acceptance email request failed:",
          emailError,
        );
      }
    }

    setMessage(
      `${request.request_number} is now ${formatStatus(
        updatedRequest.status,
      )}.`,
    );

    setSavingRequestId(null);
  }

  async function addRequestHistoryEntry(request: PracticalTestRequest) {
    if (savingHistoryRequestId) {
      return;
    }

    const entryText = historyDrafts[request.id]?.trim() ?? "";

    const entryType = historyTypeDrafts[request.id] || "manual_note";

    if (!entryText) {
      setPageError("Enter a history note before saving.");
      return;
    }

    setSavingHistoryRequestId(request.id);
    setPageError("");
    setMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "examiner_add_practical_test_request_history",
      {
        p_request_id: request.id,
        p_entry_text: entryText,
        p_entry_type: entryType,
      },
    );

    if (error) {
      console.error("Unable to add request history entry:", error);

      setPageError(
        `History could not be updated for ${request.request_number}: ${error.message}`,
      );

      setSavingHistoryRequestId(null);
      return;
    }

    const addedEntry = (
      Array.isArray(data) ? data[0] : data
    ) as RequestHistoryEntry | null;

    if (!addedEntry) {
      setPageError("The history entry was saved but was not returned.");

      setSavingHistoryRequestId(null);
      return;
    }

    setHistoryByRequest((current) => ({
      ...current,
      [request.id]: [addedEntry, ...(current[request.id] ?? [])],
    }));

    setHistoryDrafts((current) => ({
      ...current,
      [request.id]: "",
    }));

    setHistoryTypeDrafts((current) => ({
      ...current,
      [request.id]: "manual_note",
    }));

    setSavingHistoryRequestId(null);

    setMessage(`History entry added to ${request.request_number}.`);
  }

  async function saveFeeAmount(request: PracticalTestRequest) {
    if (savingFeeRequestId) return;

    const rawFee = (feeDrafts[request.id] ?? "").trim();
    const feeAmount = Number(rawFee);

    if (!rawFee || !Number.isFinite(feeAmount) || feeAmount < 0) {
      setPageError("Enter a valid fee amount of zero or greater.");
      return;
    }

    setSavingFeeRequestId(request.id);
    setMessage("");
    setPageError("");

    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "examiner_save_practical_test_request_fee",
      {
        p_request_id: request.id,
        p_fee_amount: feeAmount,
      },
    );

    if (error) {
      setPageError(
        `The fee for ${request.request_number} could not be saved: ${error.message}`,
      );
      setSavingFeeRequestId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setPageError(
        "The fee update completed without returning the updated request.",
      );
      setSavingFeeRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              fee_amount: Number(updatedRequest.fee_amount),
              updated_at: updatedRequest.updated_at,
            }
          : item,
      ),
    );

    setFeeDrafts((current) => ({
      ...current,
      [request.id]: String(updatedRequest.fee_amount),
    }));

    setMessage(`Fee saved for ${request.request_number}.`);
    setSavingFeeRequestId(null);
  }

  async function saveDmsPreapprovalNumber(request: PracticalTestRequest) {
    if (savingDmsRequestId) return;

    setSavingDmsRequestId(request.id);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "examiner_save_dms_preapproval_number",
      {
        p_request_id: request.id,
        p_dms_preapproval_number: dmsDrafts[request.id] ?? "",
      },
    );

    if (error) {
      setPageError(
        `The DMS preapproval number for ${request.request_number} could not be saved: ${error.message}`,
      );
      setSavingDmsRequestId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setPageError(
        "The DMS update completed without returning the updated request.",
      );
      setSavingDmsRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              dms_preapproval_number: updatedRequest.dms_preapproval_number,
              updated_at: updatedRequest.updated_at,
            }
          : item,
      ),
    );

    setDmsDrafts((current) => ({
      ...current,
      [request.id]: updatedRequest.dms_preapproval_number ?? "",
    }));

    setMessage(`DMS preapproval number saved for ${request.request_number}.`);
    setSavingDmsRequestId(null);
  }

  async function saveFinalizedAppointment(request: PracticalTestRequest) {
    if (savingAppointmentRequestId) return;

    const scheduledStartAt = hawaiiDateTimeLocalToIso(
      appointmentDrafts[request.id] ?? "",
    );

    const durationMinutes = Number(appointmentDurationDrafts[request.id] ?? "");

    const scheduledLocation = (
      appointmentLocationDrafts[request.id] ?? ""
    ).trim();

    if (!scheduledStartAt) {
      setPageError("Enter an appointment start date and time before saving.");
      return;
    }

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 30 ||
      durationMinutes > 1440
    ) {
      setPageError(
        "Enter an appointment duration between 30 and 1,440 minutes.",
      );
      return;
    }

    if (!scheduledLocation) {
      setPageError("Select or enter an appointment location before saving.");
      return;
    }

    const scheduledEndAt = calculateEndIso(scheduledStartAt, durationMinutes);

    if (!scheduledEndAt) {
      setPageError("The appointment end time could not be calculated.");
      return;
    }

    setSavingAppointmentRequestId(request.id);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "examiner_save_complete_appointment",
      {
        p_request_id: request.id,
        p_scheduled_start_at: scheduledStartAt,
        p_scheduled_end_at: scheduledEndAt,
        p_scheduled_location: scheduledLocation,
      },
    );

    if (error) {
      setPageError(
        `The appointment for ${request.request_number} could not be saved: ${error.message}`,
      );
      setSavingAppointmentRequestId(null);
      return;
    }

    const updatedRequest = Array.isArray(data) ? data[0] : data;

    if (!updatedRequest) {
      setPageError(
        "The appointment update completed without returning the updated request.",
      );
      setSavingAppointmentRequestId(null);
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: updatedRequest.status,
              status_reason: updatedRequest.status_reason,
              scheduled_start_at: updatedRequest.scheduled_start_at,
              scheduled_end_at: updatedRequest.scheduled_end_at,
              scheduled_location: updatedRequest.scheduled_location,
              appointment_response_status:
                updatedRequest.appointment_response_status,
              appointment_responded_at: updatedRequest.appointment_responded_at,
              appointment_response_notes:
                updatedRequest.appointment_response_notes,
              updated_at: updatedRequest.updated_at,
            }
          : item,
      ),
    );

    setAppointmentDrafts((current) => ({
      ...current,
      [request.id]: toDateTimeLocalValue(updatedRequest.scheduled_start_at),
    }));

    setAppointmentDurationDrafts((current) => ({
      ...current,
      [request.id]: String(
        minutesBetween(
          updatedRequest.scheduled_start_at,
          updatedRequest.scheduled_end_at,
        ) ?? durationMinutes,
      ),
    }));

    setAppointmentLocationDrafts((current) => ({
      ...current,
      [request.id]: updatedRequest.scheduled_location ?? scheduledLocation,
    }));

    appendAuditEntry(
      request.id,
      request.status,
      updatedRequest.status,
      updatedRequest.status_reason,
    );

    if (updatedRequest.status === "scheduled") {
      try {
        const emailResponse = await fetch("/api/email/practical-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "request_scheduled_applicant",
            requestId: request.id,
          }),
        });

        if (!emailResponse.ok) {
          const emailResult = await emailResponse.json().catch(() => null);

          console.warn(
            "Appointment was saved, but the applicant scheduling email was not sent:",
            emailResult,
          );
        }
      } catch (emailError) {
        console.warn(
          "Appointment was saved, but the applicant scheduling email request failed:",
          emailError,
        );
      }
    }

    setMessage(
      request.status === "reschedule_required"
        ? `Revised appointment sent for ${request.request_number}.`
        : `Complete appointment saved for ${request.request_number}.`,
    );
    let qualificationMessage = "";

    try {
      const { data: qualificationData, error: qualificationError } =
        await supabase.rpc("initialize_pretest_qualification", {
          p_request_id: request.id,
        });

      if (qualificationError) {
        console.warn(
          "Appointment saved, but pretest qualification initialization failed:",
          qualificationError,
        );

        qualificationMessage = ` Qualification initialization failed: ${qualificationError.message}`;
      } else if (qualificationData) {
        qualificationMessage = " Pretest qualification initialized.";
      } else {
        qualificationMessage =
          " No matching pretest qualification rule set was found.";
      }
    } catch (qualificationError) {
      console.warn(
        "Appointment saved, but pretest qualification initialization failed:",
        qualificationError,
      );

      qualificationMessage =
        " Qualification initialization could not be completed.";
    }

    if (qualificationMessage) {
      setMessage(
        (currentMessage) => `${currentMessage}${qualificationMessage}`,
      );
    }

    setSavingAppointmentRequestId(null);
  }

  function preferredDates(request: PracticalTestRequest) {
    if (request.first_available) {
      return "First available appointment";
    }

    const dates = [
      request.requested_date_1,
      request.requested_date_2,
      request.requested_date_3,
    ]
      .filter((value): value is string => Boolean(value))
      .map(formatDate);

    return dates.join(", ") || displayValue(request.requested_dates_text);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Examiner Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Practical Test Requests
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Review applicant information, requested tests, aircraft, instructors,
          scheduling preferences, and request status.
        </p>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Total",
            value: statusCounts.total,
          },
          {
            label: "New",
            value: statusCounts.new,
          },
          {
            label: "Active",
            value: statusCounts.active,
          },
          {
            label: "Scheduled",
            value: statusCounts.scheduled,
          },
          {
            label: "Closed",
            value: statusCounts.closed,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_240px_auto] lg:items-end">
          <div>
            <label
              htmlFor="request-search"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Search requests
            </label>

            <input
              id="request-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Applicant, FTN, request number, certificate, aircraft…"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Request status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            >
              <option value="active">All active requests</option>

              <option value="all">All requests</option>

              <option value="closed">All closed requests</option>

              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}

              <option value="cancelled_by_applicant">
                Cancelled by Applicant
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="request-grouping"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Group by
            </label>

            <select
              id="request-grouping"
              value={groupingMode}
              onChange={(event) =>
                setGroupingMode(event.target.value as RequestGroupingMode)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            >
              <option value="appointment_date">
                Proposed or Finalized Appointment Date
              </option>

              <option value="applicant_name">Applicant Name</option>

              <option value="test_type">Test Type</option>

              <option value="flight_school">Flight School</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading practical test requests…
        </div>
      ) : null}

      {!loading && !pageError && visibleRequests.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No practical test requests match the current filters.
        </div>
      ) : null}

      {!loading && visibleRequests.length > 0 ? (
        <div className="mt-6 space-y-2">
          {groupedRequests.map((request, requestIndex) => {
            const previousRequest =
              requestIndex > 0 ? groupedRequests[requestIndex - 1] : null;

            const showGroupHeading =
              !previousRequest ||
              previousRequest.requestGroupKey !== request.requestGroupKey;

            const saving = savingRequestId === request.id;
            const applicantRequestedReschedule =
              request.appointment_response_status === "reschedule_requested";
            const isRescheduleRequired =
              request.status === "reschedule_required" ||
              applicantRequestedReschedule;
            const showAppointmentRow = [
              "accepted",
              "scheduling",
              "scheduled",
              "confirmed",
              "reschedule_required",
            ].includes(request.status);
            const savingDms = savingDmsRequestId === request.id;
            const savingFee = savingFeeRequestId === request.id;
            const standardFee = request.practical_test_type_id
              ? (standardFees[request.practical_test_type_id] ?? null)
              : null;
            const feeDraft = feeDrafts[request.id] ?? "";
            const parsedFeeDraft =
              feeDraft.trim() === "" ? null : Number(feeDraft);
            const feeDiffersFromStandard =
              parsedFeeDraft !== null &&
              Number.isFinite(parsedFeeDraft) &&
              standardFee !== null &&
              Math.abs(parsedFeeDraft - standardFee) > 0.004;
            const savingAppointment = savingAppointmentRequestId === request.id;

            return (
              <Fragment key={request.id}>
                {showGroupHeading ? (
                  <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 first:mt-0">
                    <h2 className="font-bold text-slate-800">
                      {request.requestGroupLabel}
                    </h2>

                    <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {groupCounts[request.requestGroupKey] ?? 0}
                    </span>
                  </div>
                ) : null}

                <article
                  id={`examiner-request-${request.id}`}
                  key={request.id}
                  className={`scroll-mt-6 overflow-hidden rounded-lg border shadow-sm transition-colors ${
                    directRequestId === request.id
                      ? "ring-4 ring-amber-300 ring-offset-2"
                      : ""
                  } ${getDmsDeadlineCardClasses(request, deadlineClock)}`}
                >
                  <details
                    className="group/request"
                    open={directRequestId === request.id}
                  >
                    <summary className="cursor-pointer list-none border-b border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-lg text-slate-500 transition-transform group-open/request:rotate-180"
                        >
                          ⌄
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1.5fr)_minmax(0,0.65fr)_minmax(0,1.15fr)_minmax(0,auto)] items-center gap-x-4">
                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-bold text-slate-900"
                                title={request.applicant_name_snapshot}
                              >
                                {request.applicant_name_snapshot}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-medium text-slate-800"
                                title={`${request.certificate_sought} · ${request.rating_sought}`}
                              >
                                {request.certificate_sought} ·{" "}
                                {request.rating_sought}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p
                                className="truncate text-sm text-slate-700"
                                title={
                                  request.status === "confirmed"
                                    ? displayValue(request.scheduled_location)
                                    : displayValue(
                                        request.oral_test_location ??
                                          request.flight_airport_code,
                                      )
                                }
                              >
                                {request.status === "confirmed"
                                  ? displayValue(request.scheduled_location)
                                  : displayValue(
                                      request.oral_test_location ??
                                        request.flight_airport_code,
                                    )}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p
                                className={`truncate text-sm ${
                                  request.status === "confirmed"
                                    ? "font-semibold text-emerald-800"
                                    : "text-slate-700"
                                }`}
                                title={
                                  request.status === "confirmed" &&
                                  request.scheduled_start_at
                                    ? formatDateTime(request.scheduled_start_at)
                                    : preferredDates(request)
                                }
                              >
                                {request.status === "confirmed" &&
                                request.scheduled_start_at
                                  ? formatDateTime(request.scheduled_start_at)
                                  : preferredDates(request)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {request.is_retest ? (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                                  Retest
                                </span>
                              ) : null}

                              <span
                                className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                                  request.status,
                                )}`}
                              >
                                {formatStatus(request.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </summary>

                    <div className="bg-white">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {closedStatuses.has(request.status)
                                ? "Historical Request"
                                : "Examiner Controls"}
                            </p>

                            {saving ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Saving status…
                              </p>
                            ) : null}
                          </div>

                          <select
                            id={`status-${request.id}`}
                            aria-label={`Examiner status for ${request.request_number}`}
                            value={request.status}
                            disabled={
                              closedStatuses.has(request.status) ||
                              (Boolean(savingRequestId) && !saving)
                            }
                            onChange={(event) =>
                              void updateRequestStatus(
                                request,
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 sm:w-64 disabled:opacity-60"
                          >
                            {!statusOptions.some(
                              (status) => status.value === request.status,
                            ) ? (
                              <option value={request.status}>
                                {formatStatus(request.status)}
                              </option>
                            ) : null}

                            {statusOptions.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => beginEditingRequest(request)}
                            disabled={
                              closedStatuses.has(request.status) ||
                              savingRequestInfoId === request.id ||
                              editingRequestId === request.id
                            }
                            className="rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit Request Info
                          </button>
                        </div>

                        {closedStatuses.has(request.status) ? (
                          <p className="mt-3 text-xs font-medium text-slate-500">
                            This request is part of the historical record.
                            Workflow status and request information are locked.
                          </p>
                        ) : null}

                        {!saving && request.status_reason ? (
                          <p className="mt-3 break-words text-xs text-slate-600">
                            <span className="font-semibold">
                              Status reason:
                            </span>{" "}
                            {request.status_reason}
                          </p>
                        ) : null}
                      </div>

                      {editingRequestId === request.id &&
                      requestEditDrafts[request.id] ? (
                        <section className="border-t border-amber-200 bg-amber-50/40 p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                Edit Request Information
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">
                                Changes update this practical-test request and
                                its examiner-facing snapshot information.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => cancelEditingRequest(request.id)}
                                disabled={savingRequestInfoId === request.id}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={() => void saveRequestInfo(request)}
                                disabled={savingRequestInfoId === request.id}
                                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingRequestInfoId === request.id
                                  ? "Saving…"
                                  : "Save Changes"}
                              </button>
                            </div>
                          </div>

                          <div className="mt-6 space-y-6">
                            <section className="rounded-xl border border-slate-200 bg-white p-5">
                              <h4 className="font-bold text-slate-900">
                                Applicant Information
                              </h4>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700">
                                  Applicant Name
                                  <input
                                    type="text"
                                    value={
                                      requestEditDrafts[request.id]
                                        .applicant_name_snapshot
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "applicant_name_snapshot",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Email
                                  <input
                                    type="email"
                                    value={
                                      requestEditDrafts[request.id]
                                        .applicant_email_snapshot
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "applicant_email_snapshot",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Phone
                                  <input
                                    type="text"
                                    value={
                                      requestEditDrafts[request.id]
                                        .applicant_phone_snapshot
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "applicant_phone_snapshot",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  FTN
                                  <input
                                    type="text"
                                    value={
                                      requestEditDrafts[request.id]
                                        .ftn_number_snapshot
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "ftn_number_snapshot",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                  />
                                </label>
                              </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-5">
                              <h4 className="font-bold text-slate-900">
                                Practical Test
                              </h4>

                              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {[
                                  ["certificate_sought", "Certificate"],
                                  ["issuance_type", "Issuance Type"],
                                  ["category_sought", "Category"],
                                  ["class_sought", "Class"],
                                  ["rating_sought", "Rating"],
                                ].map(([field, label]) => (
                                  <label
                                    key={field}
                                    className="text-sm font-semibold text-slate-700"
                                  >
                                    {label}
                                    <input
                                      type="text"
                                      value={
                                        requestEditDrafts[request.id][
                                          field as keyof RequestEditDraft
                                        ] as string
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          field as
                                            | "certificate_sought"
                                            | "issuance_type"
                                            | "category_sought"
                                            | "class_sought"
                                            | "rating_sought",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                    />
                                  </label>
                                ))}

                                <label className="text-sm font-semibold text-slate-700">
                                  Retest
                                  <select
                                    value={
                                      requestEditDrafts[request.id].is_retest
                                        ? "true"
                                        : "false"
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "is_retest",
                                        event.target.value === "true",
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none"
                                  >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                  </select>
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Part 141 Graduate
                                  <select
                                    value={
                                      requestEditDrafts[request.id]
                                        .part_141_graduate
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "part_141_graduate",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none"
                                  >
                                    <option value="">Not specified</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                </label>
                              </div>

                              {requestEditDrafts[request.id].is_retest ? (
                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                  <label className="text-sm font-semibold text-slate-700">
                                    Previous Test Date
                                    <input
                                      type="date"
                                      value={
                                        requestEditDrafts[request.id]
                                          .previous_test_date
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          "previous_test_date",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                    />
                                  </label>

                                  <label className="text-sm font-semibold text-slate-700">
                                    Previous Examiner
                                    <input
                                      type="text"
                                      value={
                                        requestEditDrafts[request.id]
                                          .previous_examiner
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          "previous_examiner",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                    />
                                  </label>

                                  <label className="text-sm font-semibold text-slate-700">
                                    Areas to Retest
                                    <input
                                      type="text"
                                      value={
                                        requestEditDrafts[request.id]
                                          .retest_areas
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          "retest_areas",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                    />
                                  </label>
                                </div>
                              ) : null}
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-5">
                              <h4 className="font-bold text-slate-900">
                                Location and Aircraft
                              </h4>

                              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {[
                                  [
                                    "flight_school_name_snapshot",
                                    "Flight School",
                                  ],
                                  ["oral_test_location", "Oral Test Location"],
                                  ["flight_airport_code", "Flight Airport"],
                                  ["aircraft_make", "Aircraft Make"],
                                  ["aircraft_model", "Aircraft Model"],
                                  ["aircraft_registration", "Registration"],
                                ].map(([field, label]) => (
                                  <label
                                    key={field}
                                    className="text-sm font-semibold text-slate-700"
                                  >
                                    {label}
                                    <input
                                      type="text"
                                      value={
                                        requestEditDrafts[request.id][
                                          field as keyof RequestEditDraft
                                        ] as string
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          field as
                                            | "flight_school_name_snapshot"
                                            | "oral_test_location"
                                            | "flight_airport_code"
                                            | "aircraft_make"
                                            | "aircraft_model"
                                            | "aircraft_registration",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                    />
                                  </label>
                                ))}
                              </div>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700">
                                  Aircraft Description
                                  <textarea
                                    rows={3}
                                    value={
                                      requestEditDrafts[request.id]
                                        .aircraft_description
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "aircraft_description",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Aircraft Notes
                                  <textarea
                                    rows={3}
                                    value={
                                      requestEditDrafts[request.id]
                                        .aircraft_notes
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "aircraft_notes",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>
                              </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-5">
                              <h4 className="font-bold text-slate-900">
                                Instructor Information
                              </h4>

                              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {[
                                  ["instructor_name", "Instructor Name"],
                                  ["instructor_phone", "Instructor Phone"],
                                  ["instructor_email", "Instructor Email"],
                                  [
                                    "instructor_certificate_number",
                                    "Certificate Number",
                                  ],
                                ].map(([field, label]) => (
                                  <label
                                    key={field}
                                    className="text-sm font-semibold text-slate-700"
                                  >
                                    {label}
                                    <input
                                      type={
                                        field === "instructor_email"
                                          ? "email"
                                          : "text"
                                      }
                                      value={
                                        requestEditDrafts[request.id][
                                          field as keyof RequestEditDraft
                                        ] as string
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          field as
                                            | "instructor_name"
                                            | "instructor_phone"
                                            | "instructor_email"
                                            | "instructor_certificate_number",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                    />
                                  </label>
                                ))}

                                <label className="text-sm font-semibold text-slate-700">
                                  Associated With School
                                  <select
                                    value={
                                      requestEditDrafts[request.id]
                                        .instructor_associated_with_school
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "instructor_associated_with_school",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                                  >
                                    <option value="">Not specified</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                </label>
                              </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-5">
                              <h4 className="font-bold text-slate-900">
                                Scheduling Preferences
                              </h4>

                              <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={
                                    requestEditDrafts[request.id]
                                      .first_available
                                  }
                                  onChange={(event) =>
                                    updateRequestEditDraft(
                                      request.id,
                                      "first_available",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                First available appointment
                              </label>

                              <div className="mt-4 grid gap-4 md:grid-cols-3">
                                {[
                                  ["requested_date_1", "Requested Date 1"],
                                  ["requested_date_2", "Requested Date 2"],
                                  ["requested_date_3", "Requested Date 3"],
                                ].map(([field, label]) => (
                                  <label
                                    key={field}
                                    className="text-sm font-semibold text-slate-700"
                                  >
                                    {label}
                                    <input
                                      type="date"
                                      disabled={
                                        requestEditDrafts[request.id]
                                          .first_available
                                      }
                                      value={
                                        requestEditDrafts[request.id][
                                          field as keyof RequestEditDraft
                                        ] as string
                                      }
                                      onChange={(event) =>
                                        updateRequestEditDraft(
                                          request.id,
                                          field as
                                            | "requested_date_1"
                                            | "requested_date_2"
                                            | "requested_date_3",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100"
                                    />
                                  </label>
                                ))}
                              </div>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700">
                                  Requested Dates Text
                                  <input
                                    type="text"
                                    value={
                                      requestEditDrafts[request.id]
                                        .requested_dates_text
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "requested_dates_text",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Preferred Time
                                  <input
                                    type="text"
                                    value={
                                      requestEditDrafts[request.id]
                                        .preferred_time
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "preferred_time",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Specific Time
                                  <input
                                    type="time"
                                    value={
                                      requestEditDrafts[request.id]
                                        .specific_time
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "specific_time",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>
                              </div>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700">
                                  Scheduling Notes
                                  <textarea
                                    rows={4}
                                    value={
                                      requestEditDrafts[request.id]
                                        .scheduling_notes
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "scheduling_notes",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>

                                <label className="text-sm font-semibold text-slate-700">
                                  Applicant Comments
                                  <textarea
                                    rows={4}
                                    value={
                                      requestEditDrafts[request.id]
                                        .applicant_comments
                                    }
                                    onChange={(event) =>
                                      updateRequestEditDraft(
                                        request.id,
                                        "applicant_comments",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                  />
                                </label>
                              </div>
                            </section>
                          </div>

                          <div className="mt-6 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => cancelEditingRequest(request.id)}
                              disabled={savingRequestInfoId === request.id}
                              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => void saveRequestInfo(request)}
                              disabled={savingRequestInfoId === request.id}
                              className="rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingRequestInfoId === request.id
                                ? "Saving Changes…"
                                : "Save Changes"}
                            </button>
                          </div>
                        </section>
                      ) : null}

                      {isRescheduleRequired ? (
                        <div className="border-t border-red-200 bg-red-50 px-5 py-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-red-900">
                                {applicantRequestedReschedule
                                  ? "Applicant Requested an Appointment Change"
                                  : "Appointment Reschedule Required"}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-red-800">
                                {displayValue(
                                  applicantRequestedReschedule
                                    ? request.appointment_response_notes
                                    : request.status_reason,
                                )}
                              </p>
                            </div>

                            {applicantRequestedReschedule &&
                            request.appointment_responded_at ? (
                              <p className="shrink-0 text-xs font-semibold text-red-700">
                                Submitted{" "}
                                {formatDateTime(
                                  request.appointment_responded_at,
                                )}
                              </p>
                            ) : null}
                          </div>

                          {request.scheduled_start_at ? (
                            <p className="mt-3 text-xs text-red-700">
                              <span className="font-semibold">
                                Previously proposed appointment:
                              </span>{" "}
                              {formatDateTime(request.scheduled_start_at)}
                              {request.scheduled_end_at
                                ? ` – ${formatDateTime(request.scheduled_end_at)}`
                                : ""}
                              {" · "}
                              {displayValue(request.scheduled_location)}
                            </p>
                          ) : null}

                          <p className="mt-3 text-xs font-medium text-red-800">
                            Enter the replacement date, time, duration, and
                            location in the Appointment Scheduling section
                            below, then select Send Revised Appointment.
                          </p>
                        </div>
                      ) : null}

                      <details className="group border-t border-slate-200">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                          <span>Request Info</span>
                          <span className="text-lg text-slate-500 transition-transform group-open:rotate-180">
                            ⌄
                          </span>
                        </summary>
                        <div className="space-y-5 bg-slate-50/60 p-6">
                          <DetailSection title="Applicant Information">
                            <DetailItem
                              label="Applicant name"
                              value={request.applicant_name_snapshot}
                            />

                            <DetailItem
                              label="Email"
                              value={
                                <a
                                  href={`mailto:${request.applicant_email_snapshot}`}
                                  className="font-semibold text-sky-700 hover:underline"
                                >
                                  {request.applicant_email_snapshot}
                                </a>
                              }
                            />

                            <DetailItem
                              label="Phone"
                              value={displayValue(
                                request.applicant_phone_snapshot,
                              )}
                            />

                            <DetailItem
                              label="FTN"
                              value={displayValue(request.ftn_number_snapshot)}
                            />

                            <DetailItem
                              label="Part 141 graduate"
                              value={yesNo(request.part_141_graduate)}
                            />

                            <DetailItem
                              label="Request source"
                              value={displayValue(request.source_system)}
                            />
                          </DetailSection>

                          <DetailSection title="Practical Test Requested">
                            <DetailItem
                              label="Certificate"
                              value={request.certificate_sought}
                            />

                            <DetailItem
                              label="Issuance"
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
                              label="Retest"
                              value={yesNo(request.is_retest)}
                            />
                          </DetailSection>

                          {request.is_retest ? (
                            <DetailSection title="Retest Information">
                              <DetailItem
                                label="Previous test date"
                                value={formatDate(request.previous_test_date)}
                              />

                              <DetailItem
                                label="Previous examiner"
                                value={displayValue(request.previous_examiner)}
                              />

                              <DetailItem
                                label="Areas to be retested"
                                value={displayValue(request.retest_areas)}
                              />
                            </DetailSection>
                          ) : null}

                          <DetailSection title="Location and Aircraft">
                            <DetailItem
                              label="Flight school"
                              value={displayValue(
                                request.flight_school_name_snapshot,
                              )}
                            />

                            <DetailItem
                              label="Oral test location"
                              value={displayValue(request.oral_test_location)}
                            />

                            <DetailItem
                              label="Flight airport"
                              value={displayValue(request.flight_airport_code)}
                            />

                            <DetailItem
                              label="Aircraft make"
                              value={displayValue(request.aircraft_make)}
                            />

                            <DetailItem
                              label="Aircraft model"
                              value={displayValue(request.aircraft_model)}
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

                          <DetailSection title="Instructor Information">
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
                              value={
                                request.instructor_email ? (
                                  <a
                                    href={`mailto:${request.instructor_email}`}
                                    className="font-semibold text-sky-700 hover:underline"
                                  >
                                    {request.instructor_email}
                                  </a>
                                ) : (
                                  "Not specified"
                                )
                              }
                            />

                            <DetailItem
                              label="Certificate number"
                              value={displayValue(
                                request.instructor_certificate_number,
                              )}
                            />

                            <DetailItem
                              label="Associated with school"
                              value={yesNo(
                                request.instructor_associated_with_school,
                              )}
                            />
                          </DetailSection>

                          <DetailSection title="Scheduling Preferences">
                            <DetailItem
                              label="Requested dates"
                              value={preferredDates(request)}
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

                            <DetailItem
                              label="Applicant comments"
                              value={displayValue(request.applicant_comments)}
                            />
                          </DetailSection>

                          <DetailSection title="Applicant Acknowledgments">
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

                            <DetailItem
                              label="Accepted at"
                              value={formatDateTime(
                                request.acknowledgments_accepted_at,
                              )}
                            />
                          </DetailSection>

                          {request.cancellation_reason ||
                          request.cancelled_at ? (
                            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                              <h3 className="font-bold text-red-900">
                                Cancellation Information
                              </h3>

                              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                                <DetailItem
                                  label="Cancelled at"
                                  value={formatDateTime(request.cancelled_at)}
                                />

                                <DetailItem
                                  label="Reason"
                                  value={displayValue(
                                    request.cancellation_reason,
                                  )}
                                />
                              </dl>
                            </section>
                          ) : null}
                        </div>
                      </details>

                      <details className="group border-t border-slate-200">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                          <span>
                            {isRescheduleRequired
                              ? "Revised Appointment"
                              : "Appointment Scheduling"}
                          </span>
                          <span className="text-lg text-slate-500 transition-transform group-open:rotate-180">
                            ⌄
                          </span>
                        </summary>
                        {showAppointmentRow ? (
                          <div className="bg-amber-50/50 p-6">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  {isRescheduleRequired
                                    ? "Enter Revised Appointment"
                                    : "Appointment Management"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-600">
                                  {isRescheduleRequired
                                    ? "Update the appointment date, time, duration, and location, then send the revised appointment to the applicant."
                                    : "Save the proposed appointment for applicant review. The appointment becomes confirmed only after the applicant accepts it."}
                                </p>
                              </div>

                              {request.status === "confirmed" ? (
                                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                                  Appointment Confirmed
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr_0.65fr] lg:items-end">
                              <div className="lg:col-span-3">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.15fr_0.55fr_1.3fr_auto] xl:items-end">
                                  <div>
                                    <label
                                      htmlFor={`finalized-time-${request.id}`}
                                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                    >
                                      Appointment Start
                                    </label>

                                    <div
                                      id={`finalized-time-${request.id}`}
                                      className="grid grid-cols-[minmax(0,1fr)_minmax(145px,0.7fr)] gap-2"
                                    >
                                      <input
                                        type="date"
                                        aria-label={`Appointment date for ${request.request_number}`}
                                        value={appointmentDatePart(
                                          appointmentDrafts[request.id],
                                        )}
                                        onChange={(event) => {
                                          const existingTime =
                                            appointmentTimePart(
                                              appointmentDrafts[request.id],
                                            ) || "08:00";

                                          setAppointmentDrafts((current) => ({
                                            ...current,
                                            [request.id]: event.target.value
                                              ? `${event.target.value}T${existingTime}`
                                              : "",
                                          }));
                                        }}
                                        className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                      />

                                      <select
                                        aria-label={`Appointment time for ${request.request_number}`}
                                        value={appointmentTimePart(
                                          appointmentDrafts[request.id],
                                        )}
                                        onChange={(event) => {
                                          const existingDate =
                                            appointmentDatePart(
                                              appointmentDrafts[request.id],
                                            );

                                          setAppointmentDrafts((current) => ({
                                            ...current,
                                            [request.id]: existingDate
                                              ? `${existingDate}T${event.target.value}`
                                              : "",
                                          }));
                                        }}
                                        className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                      >
                                        <option value="">Select time</option>

                                        {quarterHourTimes.map((time) => (
                                          <option
                                            key={time.value}
                                            value={time.value}
                                          >
                                            {time.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`duration-${request.id}`}
                                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                    >
                                      Duration
                                    </label>

                                    <select
                                      id={`duration-${request.id}`}
                                      value={
                                        appointmentDurationDrafts[request.id] ??
                                        String(
                                          request.practical_test_type_id
                                            ? (defaultDurations[
                                                request.practical_test_type_id
                                              ] ?? 240)
                                            : 240,
                                        )
                                      }
                                      onChange={(event) =>
                                        setAppointmentDurationDrafts(
                                          (current) => ({
                                            ...current,
                                            [request.id]: event.target.value,
                                          }),
                                        )
                                      }
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                    >
                                      <option value="60">1 hour</option>
                                      <option value="90">1.5 hours</option>
                                      <option value="120">2 hours</option>
                                      <option value="150">2.5 hours</option>
                                      <option value="180">3 hours</option>
                                      <option value="210">3.5 hours</option>
                                      <option value="240">4 hours</option>
                                      <option value="270">4.5 hours</option>
                                      <option value="300">5 hours</option>
                                      <option value="330">5.5 hours</option>
                                      <option value="360">6 hours</option>
                                      <option value="390">6.5 hours</option>
                                      <option value="420">7 hours</option>
                                      <option value="450">7.5 hours</option>
                                      <option value="480">8 hours</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`location-${request.id}`}
                                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                    >
                                      Appointment Location
                                    </label>

                                    <input
                                      id={`location-${request.id}`}
                                      list={`location-options-${request.id}`}
                                      value={
                                        appointmentLocationDrafts[request.id] ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        setAppointmentLocationDrafts(
                                          (current) => ({
                                            ...current,
                                            [request.id]: event.target.value,
                                          }),
                                        )
                                      }
                                      placeholder="Select or enter location"
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                    />

                                    <datalist
                                      id={`location-options-${request.id}`}
                                    >
                                      {schedulingLocations.map((location) => (
                                        <option
                                          key={location.id}
                                          value={
                                            location.default_oral_test_location?.trim() ||
                                            location.name
                                          }
                                        >
                                          {location.name}
                                          {location.default_airport_code
                                            ? ` · ${location.default_airport_code}`
                                            : ""}
                                        </option>
                                      ))}
                                    </datalist>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void saveFinalizedAppointment(request)
                                    }
                                    disabled={
                                      Boolean(savingAppointmentRequestId) ||
                                      !(appointmentDrafts[request.id] ?? "") ||
                                      !(
                                        appointmentLocationDrafts[request.id] ??
                                        ""
                                      ).trim()
                                    }
                                    className="rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingAppointment
                                      ? request.status === "reschedule_required"
                                        ? "Sending…"
                                        : "Saving…"
                                      : request.status === "reschedule_required"
                                        ? "Send Revised Appointment"
                                        : "Save Appointment"}
                                  </button>
                                </div>

                                {request.scheduled_start_at ? (
                                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
                                    <span className="font-semibold">
                                      Saved appointment:
                                    </span>{" "}
                                    {formatDateTime(request.scheduled_start_at)}
                                    {request.scheduled_end_at
                                      ? ` – ${formatDateTime(
                                          request.scheduled_end_at,
                                        )}`
                                      : ""}
                                    {" · "}
                                    {displayValue(request.scheduled_location)}
                                  </div>
                                ) : null}
                              </div>

                              <div>
                                <label
                                  htmlFor={`dms-${request.id}`}
                                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                >
                                  DMS Preapproval Number
                                </label>

                                <div className="flex gap-2">
                                  <input
                                    id={`dms-${request.id}`}
                                    type="text"
                                    value={dmsDrafts[request.id] ?? ""}
                                    onChange={(event) =>
                                      setDmsDrafts((current) => ({
                                        ...current,
                                        [request.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="Enter DMS number"
                                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void saveDmsPreapprovalNumber(request)
                                    }
                                    disabled={Boolean(savingDmsRequestId)}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingDms ? "Saving…" : "Save"}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <label
                                    htmlFor={`fee-${request.id}`}
                                    className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                  >
                                    Fee Amount
                                  </label>

                                  <span className="text-xs font-medium text-slate-500">
                                    Standard: {formatCurrency(standardFee)}
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <div className="relative min-w-0 flex-1">
                                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500">
                                      $
                                    </span>
                                    <input
                                      id={`fee-${request.id}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={feeDraft}
                                      onChange={(event) =>
                                        setFeeDrafts((current) => ({
                                          ...current,
                                          [request.id]: event.target.value,
                                        }))
                                      }
                                      className={`w-full rounded-lg border px-3 py-2 pl-7 text-sm font-semibold outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 ${
                                        feeDiffersFromStandard
                                          ? "border-amber-400 bg-amber-100"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => void saveFeeAmount(request)}
                                    disabled={Boolean(savingFeeRequestId)}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingFee ? "Saving…" : "Save"}
                                  </button>
                                </div>

                                {feeDiffersFromStandard ? (
                                  <p className="mt-1 text-xs font-semibold text-amber-800">
                                    This fee differs from the standard fee.
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 px-6 py-5 text-sm text-slate-600">
                            Appointment confirmation becomes available after
                            this request is moved to Accepted.
                          </div>
                        )}
                      </details>

                      <QualificationReviewPanel
                        requestNumber={request.request_number}
                        applicantName={request.applicant_name_snapshot}
                        wizard={
                          qualificationWizardsByRequest[request.id] ?? null
                        }
                        onWizardChanged={(updatedWizard) =>
                          setQualificationWizardsByRequest((current) => ({
                            ...current,
                            [request.id]: updatedWizard,
                          }))
                        }
                      />

                      <details className="group border-t border-slate-200">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                          <span>History</span>

                          <span className="text-lg text-slate-500 transition-transform group-open:rotate-180">
                            ⌄
                          </span>
                        </summary>

                        <div className="space-y-6 bg-slate-50/60 p-6">
                          <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="font-bold text-slate-900">
                              Add History Entry
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                              Add a dated internal note to maintain a running
                              log for this request.
                            </p>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
                              <div>
                                <label
                                  htmlFor={`history-type-${request.id}`}
                                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                >
                                  Entry Type
                                </label>

                                <select
                                  id={`history-type-${request.id}`}
                                  value={
                                    historyTypeDrafts[request.id] ??
                                    "manual_note"
                                  }
                                  onChange={(event) =>
                                    setHistoryTypeDrafts((current) => ({
                                      ...current,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                >
                                  <option value="manual_note">
                                    General Note
                                  </option>

                                  <option value="phone_call">Phone Call</option>

                                  <option value="email">Email</option>

                                  <option value="document_received">
                                    Document Received
                                  </option>

                                  <option value="appointment_change">
                                    Appointment Change
                                  </option>

                                  <option value="internal_note">
                                    Internal Note
                                  </option>
                                </select>
                              </div>

                              <div>
                                <label
                                  htmlFor={`history-entry-${request.id}`}
                                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                                >
                                  History Note
                                </label>

                                <textarea
                                  id={`history-entry-${request.id}`}
                                  rows={3}
                                  value={historyDrafts[request.id] ?? ""}
                                  onChange={(event) =>
                                    setHistoryDrafts((current) => ({
                                      ...current,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Enter a note about this request…"
                                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  void addRequestHistoryEntry(request)
                                }
                                disabled={
                                  Boolean(savingHistoryRequestId) ||
                                  !(historyDrafts[request.id] ?? "").trim()
                                }
                                className="rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingHistoryRequestId === request.id
                                  ? "Adding…"
                                  : "Add Entry"}
                              </button>
                            </div>
                          </section>

                          <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="font-bold text-slate-900">
                              Running Log
                            </h3>

                            {(historyByRequest[request.id] ?? []).length ===
                            0 ? (
                              <p className="mt-4 text-sm text-slate-500">
                                No manual history entries have been added.
                              </p>
                            ) : (
                              <ol className="mt-5 space-y-4">
                                {(historyByRequest[request.id] ?? []).map(
                                  (historyEntry) => (
                                    <li
                                      key={historyEntry.id}
                                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                                            {formatStatus(
                                              historyEntry.entry_type,
                                            )}
                                          </p>

                                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                                            {historyEntry.entry_text}
                                          </p>
                                        </div>

                                        <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right">
                                          <p className="font-semibold text-slate-600">
                                            {historyEntry.created_by_label}
                                          </p>

                                          <p className="mt-1">
                                            {formatDateTime(
                                              historyEntry.created_at,
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </li>
                                  ),
                                )}
                              </ol>
                            )}
                          </section>

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
                              <ol className="mt-5">
                                {(auditByRequest[request.id] ?? []).map(
                                  (audit, index, history) => (
                                    <li
                                      key={audit.id}
                                      className="relative flex gap-4 pb-6 last:pb-0"
                                    >
                                      {index < history.length - 1 ? (
                                        <span
                                          aria-hidden="true"
                                          className="absolute left-[7px] top-4 h-full w-px bg-slate-200"
                                        />
                                      ) : null}

                                      <span
                                        aria-hidden="true"
                                        className="relative mt-1.5 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-amber-600 ring-1 ring-slate-300"
                                      />

                                      <div>
                                        <p className="font-semibold text-slate-900">
                                          {formatStatus(audit.new_status)}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          {formatDateTime(audit.changed_at)}
                                        </p>

                                        {audit.previous_status ? (
                                          <p className="mt-1 text-xs text-slate-500">
                                            Changed from{" "}
                                            {formatStatus(
                                              audit.previous_status,
                                            )}
                                          </p>
                                        ) : null}

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
                        </div>
                      </details>
                    </div>
                  </details>
                </article>
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
