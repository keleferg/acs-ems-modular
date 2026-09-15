"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OpenAssignment = {
  id: string;
  request_number: string;

  applicant_name: string;
  applicant_email: string | null;
  applicant_phone: string | null;
  ftn_number: string | null;

  certificate_sought: string;
  issuance_type: string | null;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string | null;
  practical_test_type_id: string | null;

  is_retest: boolean;
  part_141_graduate: boolean | null;
  previous_test_date: string | null;
  previous_examiner: string | null;
  retest_areas: string | null;

  flight_school_name: string | null;

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

  requested_dates_text: string | null;
  requested_date_1: string | null;
  requested_date_2: string | null;
  requested_date_3: string | null;
  preferred_time: string | null;
  specific_time: string | null;
  first_available: boolean;
  scheduling_notes: string | null;
  applicant_comments: string | null;

  fee_acknowledged: boolean;
  eligibility_acknowledged: boolean;
  aircraft_acknowledged: boolean;
  request_acknowledged: boolean;
  acknowledgments_accepted_at: string | null;

  standard_fee: number | null;

  existing_proposal_id: string | null;
  existing_proposal_status: string | null;
  existing_proposed_start_at: string | null;
  existing_proposed_end_at: string | null;
  existing_proposed_location: string | null;
  existing_proposed_fee: number | null;

  submitted_at: string | null;
};

type ProposalDraft = {
  start: string;
  durationMinutes: string;
  location: string;
  fee: string;
  notes: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Pacific/Honolulu",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatIssuance(value: string | null) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function yesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value ? "Yes" : "No";
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return local.toISOString().slice(0, 16);
}

function datePart(value: string | undefined) {
  if (!value) return "";
  return value.split("T")[0] ?? "";
}

function timePart(value: string | undefined) {
  if (!value) return "";
  return value.split("T")[1]?.slice(0, 5) ?? "";
}

const quarterHourTimes = Array.from(
  { length: 24 * 4 },
  (_, index) => {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;

    const value =
      `${String(hour).padStart(2, "0")}:` +
      `${String(minute).padStart(2, "0")}`;

    const displayHour = hour % 12 || 12;
    const suffix = hour < 12 ? "AM" : "PM";

    return {
      value,
      label:
        `${displayHour}:` +
        `${String(minute).padStart(2, "0")} ${suffix}`,
    };
  },
);

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">
        {value || "—"}
      </div>
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
    <section className="border-t border-slate-200 px-6 py-6">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export default function OpenAssignmentsPanel() {
  const [assignments, setAssignments] =
    useState<OpenAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] =
    useState<Record<string, ProposalDraft>>({});
  const [savingId, setSavingId] =
    useState<string | null>(null);

  const quarterHourValues = useMemo(
    () => new Set(quarterHourTimes.map((item) => item.value)),
    [],
  );

  const loadAssignments = useCallback(async () => {
    setLoading(true);

    const supabase = createClient();

    // Automatically close Any Examiner requests that have remained
    // in Open Assignments for more than 30 days.
    const { error: agingError } = await supabase.rpc(
      "examiner_close_stale_open_assignments",
    );

    if (agingError) {
      setError(agingError.message);
      setAssignments([]);
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase.rpc(
      "examiner_list_open_assignments",
    );

    if (loadError) {
      setError(loadError.message);
      setAssignments([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as OpenAssignment[];

    setAssignments(rows);

    setDrafts((current) => {
      const next = { ...current };

      for (const request of rows) {
        if (next[request.id]) continue;

        next[request.id] = {
          start: toDateTimeLocal(
            request.existing_proposed_start_at,
          ),
          durationMinutes:
            request.existing_proposed_start_at &&
            request.existing_proposed_end_at
              ? String(
                  Math.round(
                    (new Date(
                      request.existing_proposed_end_at,
                    ).getTime() -
                      new Date(
                        request.existing_proposed_start_at,
                      ).getTime()) /
                      60_000,
                  ),
                )
              : "180",
          location:
            request.existing_proposed_location ??
            request.oral_test_location ??
            request.flight_airport_code ??
            "",
          fee:
            request.existing_proposed_fee !== null
              ? String(request.existing_proposed_fee)
              : request.standard_fee !== null
                ? String(request.standard_fee)
                : "",
          notes: "",
        };
      }

      return next;
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  async function submitProposal(request: OpenAssignment) {
    const draft = drafts[request.id];
    if (!draft) return;

    if (!draft.start || !draft.location.trim()) {
      setError(
        "Appointment date/time and location are required.",
      );
      return;
    }

    const selectedTime = timePart(draft.start);

    if (!quarterHourValues.has(selectedTime)) {
      setError(
        "Appointment start time must be on :00, :15, :30, or :45.",
      );
      return;
    }

    const duration = Number(draft.durationMinutes);

    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Enter a valid appointment duration.");
      return;
    }

    const start = new Date(draft.start);

    if (Number.isNaN(start.getTime())) {
      setError("Enter a valid appointment date and time.");
      return;
    }

    const end = new Date(
      start.getTime() + duration * 60_000,
    );

    const fee =
      draft.fee.trim() === "" ? null : Number(draft.fee);

    if (
      fee !== null &&
      (!Number.isFinite(fee) || fee < 0)
    ) {
      setError("Enter a valid fee amount.");
      return;
    }

    setSavingId(request.id);
    setError("");
    setMessage("");

    const supabase = createClient();

    const { error: proposalError } = await supabase.rpc(
      "examiner_submit_assignment_proposal",
      {
        p_request_id: request.id,
        p_start_at: start.toISOString(),
        p_end_at: end.toISOString(),
        p_location: draft.location.trim(),
        p_fee_amount: fee,
        p_notes: draft.notes.trim() || null,
      },
    );

    if (proposalError) {
      setError(proposalError.message);
      setSavingId(null);
      return;
    }

    let emailWarning = "";

    try {
      const emailResponse = await fetch(
        "/api/email/practical-test",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "assignment_proposed_applicant",
            requestId: request.id,
            proposedStartAt: start.toISOString(),
            proposedEndAt: end.toISOString(),
            proposedLocation: draft.location.trim(),
            proposedFee: fee,
            proposalNotes: draft.notes.trim() || null,
          }),
        },
      );

      if (!emailResponse.ok) {
        const rawBody = await emailResponse.text();

        let parsedError = "";

        try {
          const parsed = JSON.parse(rawBody) as { error?: string };
          parsedError = parsed?.error || "";
        } catch {
          parsedError = rawBody;
        }

        emailWarning =
          parsedError ||
          `Email API failed with HTTP ${emailResponse.status}.`;
      }
    } catch {
      emailWarning =
        "The applicant notification email could not be sent.";
    }

    if (emailWarning) {
      setMessage(
        `Proposal saved for ${request.request_number}.`,
      );
      setError(
        `The proposal was saved, but the applicant email was not sent: ${emailWarning}`,
      );
    } else {
      setMessage(
        `Proposal sent for ${request.request_number}. Applicant notification email sent.`,
      );
    }

    setSavingId(null);
    await loadAssignments();
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Practical Test Requests Open Assignments
          </h2>

          <p className="mt-2 max-w-3xl text-slate-600">
            These applicants selected Any Examiner. Review the
            complete request and submit a proposed appointment.
            The request remains open until the applicant accepts
            an examiner proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAssignments()}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {message ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-5 py-5 text-red-800">
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading open assignments…
        </div>
      ) : null}

      {!loading && assignments.length === 0 ? (
        <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-3xl text-slate-500">
            ▰
          </div>

          <p className="mt-5 text-lg font-bold text-slate-900">
            No open assignments
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Requests submitted to Any Examiner will appear here.
          </p>
        </div>
      ) : null}

      {!loading && assignments.length > 0 ? (
        <div className="mt-6 space-y-6">
          {assignments.map((request) => {
            const draft = drafts[request.id] ?? {
              start: "",
              durationMinutes: "180",
              location: "",
              fee: "",
              notes: "",
            };

            const alreadyProposed =
              request.existing_proposal_status === "pending";

            const aircraft =
              [
                request.aircraft_make,
                request.aircraft_model,
                request.aircraft_registration,
              ]
                .filter(Boolean)
                .join(" · ") ||
              request.aircraft_description ||
              "—";

            const requestedDates =
              request.first_available
                ? "First available"
                : request.requested_dates_text ||
                  [
                    request.requested_date_1,
                    request.requested_date_2,
                    request.requested_date_3,
                  ]
                    .filter(Boolean)
                    .map(formatDate)
                    .join(", ") ||
                  "Not specified";

            return (
              <article
                key={request.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <details className="group/assignment">
                  <summary className="cursor-pointer list-none border-b border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-lg text-slate-500 transition-transform group-open/assignment:rotate-180"
                      >
                        ⌄
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1.5fr)_minmax(0,0.65fr)_minmax(0,1.15fr)_minmax(0,auto)] items-center gap-x-4">

                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-bold text-slate-900"
                              title={request.applicant_name}
                            >
                              <span>{request.applicant_name}</span>
                              <span className="ml-2 text-xs font-medium text-slate-500">
                                · {request.request_number}
                              </span>
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium text-slate-800"
                              title={`${request.certificate_sought} · ${request.rating_sought ?? ""}`}
                            >
                              {request.certificate_sought}
                              {request.rating_sought
                                ? ` · ${request.rating_sought}`
                                : ""}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-sm text-slate-700"
                              title={
                                request.oral_test_location ||
                                request.flight_airport_code ||
                                "—"
                              }
                            >
                              {request.oral_test_location ||
                                request.flight_airport_code ||
                                "—"}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-sm text-slate-700"
                              title={requestedDates}
                            >
                              {requestedDates}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {request.is_retest ? (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                                Retest
                              </span>
                            ) : null}

                            <span
                              className={
                                alreadyProposed
                                  ? "whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800"
                                  : "whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                              }
                            >
                              {alreadyProposed
                                ? "Proposal Sent"
                                : "Open Assignment"}
                            </span>
                          </div>

                        </div>
                      </div>
                    </div>
                  </summary>

                {/* PROPOSED APPOINTMENT — ALWAYS FIRST */}
                <section className="border-b border-amber-200 bg-amber-50/60 p-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Proposed Appointment
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {alreadyProposed
                        ? "Update the appointment proposal currently awaiting the applicant's response."
                        : "Enter the appointment you would like to offer this applicant."}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Appointment Start
                      </span>

                      <div className="grid grid-cols-[minmax(0,1fr)_145px] gap-2">
                        <input
                          type="date"
                          aria-label={`Appointment date for ${request.request_number}`}
                          value={datePart(draft.start)}
                          onChange={(event) => {
                            const existingTime =
                              timePart(draft.start) || "08:00";

                            setDrafts((current) => ({
                              ...current,
                              [request.id]: {
                                ...draft,
                                start: event.target.value
                                  ? `${event.target.value}T${existingTime}`
                                  : "",
                              },
                            }));
                          }}
                          className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                        />

                        <select
                          aria-label={`Appointment time for ${request.request_number}`}
                          value={timePart(draft.start)}
                          onChange={(event) => {
                            const existingDate =
                              datePart(draft.start);

                            setDrafts((current) => ({
                              ...current,
                              [request.id]: {
                                ...draft,
                                start: existingDate
                                  ? `${existingDate}T${event.target.value}`
                                  : "",
                              },
                            }));
                          }}
                          className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
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

                    <label>
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Duration
                      </span>

                      <select
                        value={draft.durationMinutes}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...draft,
                              durationMinutes:
                                event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="120">2 hours</option>
                        <option value="150">2.5 hours</option>
                        <option value="180">3 hours</option>
                        <option value="210">3.5 hours</option>
                        <option value="240">4 hours</option>
                        <option value="300">5 hours</option>
                        <option value="360">6 hours</option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Location
                      </span>

                      <input
                        type="text"
                        value={draft.location}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...draft,
                              location: event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Fee
                      </span>

                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                          $
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.fee}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [request.id]: {
                                ...draft,
                                fee: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-sm"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Message to Applicant
                    </span>

                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [request.id]: {
                            ...draft,
                            notes: event.target.value,
                          },
                        }))
                      }
                      placeholder="Optional information about your proposed appointment…"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
                    />
                  </label>

                  {alreadyProposed ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Current proposal:{" "}
                      {formatDateTime(
                        request.existing_proposed_start_at,
                      )}
                    </p>
                  ) : null}

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        void submitProposal(request)
                      }
                      disabled={savingId === request.id}
                      className="rounded-lg bg-amber-700 px-5 py-3 font-bold text-white hover:bg-amber-800 disabled:opacity-50"
                    >
                      {savingId === request.id
                        ? "Sending…"
                        : alreadyProposed
                          ? "Update Proposal"
                          : "Send Proposal"}
                    </button>
                  </div>
                </section>

                <DetailSection title="Applicant Information">
                  <Detail
                    label="Applicant Name"
                    value={request.applicant_name}
                  />
                  <Detail
                    label="FTN"
                    value={request.ftn_number}
                  />
                  <Detail
                    label="Email"
                    value={request.applicant_email}
                  />
                  <Detail
                    label="Phone"
                    value={request.applicant_phone}
                  />
                </DetailSection>

                <DetailSection title="Practical Test">
                  <Detail
                    label="Certificate"
                    value={request.certificate_sought}
                  />
                  <Detail
                    label="Issuance"
                    value={formatIssuance(
                      request.issuance_type,
                    )}
                  />
                  <Detail
                    label="Category"
                    value={request.category_sought}
                  />
                  <Detail
                    label="Class"
                    value={request.class_sought}
                  />
                  <Detail
                    label="Rating"
                    value={request.rating_sought}
                  />
                  <Detail
                    label="Retest"
                    value={yesNo(request.is_retest)}
                  />
                  <Detail
                    label="Part 141 Graduate"
                    value={yesNo(
                      request.part_141_graduate,
                    )}
                  />
                  <Detail
                    label="Submitted"
                    value={formatDateTime(
                      request.submitted_at,
                    )}
                  />

                  {request.is_retest ? (
                    <>
                      <Detail
                        label="Previous Test Date"
                        value={formatDate(
                          request.previous_test_date,
                        )}
                      />
                      <Detail
                        label="Previous Examiner"
                        value={request.previous_examiner}
                      />
                      <Detail
                        label="Retest Areas"
                        value={request.retest_areas}
                      />
                    </>
                  ) : null}
                </DetailSection>

                <DetailSection title="Requested Schedule">
                  <Detail
                    label="Requested Dates"
                    value={requestedDates}
                  />
                  <Detail
                    label="Preferred Time"
                    value={request.preferred_time}
                  />
                  <Detail
                    label="Specific Time"
                    value={
                      request.specific_time
                        ? request.specific_time.slice(0, 5)
                        : "—"
                    }
                  />
                  <Detail
                    label="Requested Location"
                    value={
                      request.oral_test_location ||
                      request.flight_airport_code
                    }
                  />
                  <Detail
                    label="Scheduling Notes"
                    value={request.scheduling_notes}
                  />
                  <Detail
                    label="Applicant Comments"
                    value={request.applicant_comments}
                  />
                </DetailSection>

                <DetailSection title="Flight School & Aircraft">
                  <Detail
                    label="Flight School"
                    value={request.flight_school_name}
                  />
                  <Detail
                    label="Aircraft"
                    value={aircraft}
                  />
                  <Detail
                    label="Aircraft Description"
                    value={request.aircraft_description}
                  />
                  <Detail
                    label="Aircraft Notes"
                    value={request.aircraft_notes}
                  />
                </DetailSection>

                <DetailSection title="Recommending Instructor">
                  <Detail
                    label="Instructor"
                    value={request.instructor_name}
                  />
                  <Detail
                    label="Certificate Number"
                    value={
                      request.instructor_certificate_number
                    }
                  />
                  <Detail
                    label="Phone"
                    value={request.instructor_phone}
                  />
                  <Detail
                    label="Email"
                    value={request.instructor_email}
                  />
                  <Detail
                    label="Associated With School"
                    value={yesNo(
                      request.instructor_associated_with_school,
                    )}
                  />
                </DetailSection>

                <DetailSection title="Applicant Acknowledgments">
                  <Detail
                    label="Fee"
                    value={yesNo(
                      request.fee_acknowledged,
                    )}
                  />
                  <Detail
                    label="Eligibility"
                    value={yesNo(
                      request.eligibility_acknowledged,
                    )}
                  />
                  <Detail
                    label="Aircraft"
                    value={yesNo(
                      request.aircraft_acknowledged,
                    )}
                  />
                  <Detail
                    label="Request"
                    value={yesNo(
                      request.request_acknowledged,
                    )}
                  />
                  <Detail
                    label="Accepted At"
                    value={formatDateTime(
                      request.acknowledgments_accepted_at,
                    )}
                  />
                </DetailSection>
                </details>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
