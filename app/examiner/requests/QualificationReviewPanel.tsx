"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type QualificationWizardSummary = {
  id: string;
  practical_test_request_id: string;
  rule_set_id: string;
  status: string;
  available_at: string;
  opened_at: string | null;
  applicant_submitted_at: string | null;
  instructor_certified_at: string | null;
  examiner_reviewed_at: string | null;
  accepted_at: string | null;
  current_revision_number: number;
  instructor_name: string | null;
  instructor_email: string | null;
};

type Requirement = {
  id: string;
  section_code: string;
  requirement_code: string;
  requirement_type: string;
  title: string;
  description: string | null;
  regulation_citation: string | null;
  advisory_circular_citation: string | null;
  acs_citation: string | null;
  required: boolean;
  requires_instructor_verification: boolean;
  requires_examiner_review: boolean;
  sort_order: number;
};

type Answer = {
  id: string;
  requirement_id: string;
  answer_value: Record<string, unknown>;
  automated_result: string;
  automated_result_message: string | null;
  applicant_notes: string | null;
  instructor_notes: string | null;
  examiner_notes: string | null;
  instructor_verification_status: string | null;
  examiner_review_status: string | null;
};

type Flag = {
  id: string;
  requirement_id: string | null;
  severity: string;
  title: string;
  message: string;
  source: string;
  resolved: boolean;
  resolution_notes: string | null;
};

type InstructorReview = {
  id: string;
  instructor_name: string;
  instructor_email: string;
  instructor_certificate_number: string | null;
  status: string;
  certification_text: string | null;
  certified_at: string | null;
  review_notes: string | null;
};

type Revision = {
  id: string;
  revision_number: number;
  revision_status: string;
  examiner_review_text: string | null;
  examiner_reviewed_at: string | null;
  is_locked: boolean;
};

type Props = {
  requestNumber: string;
  applicantName: string;
  wizard: QualificationWizardSummary | null;
  onWizardChanged: (wizard: QualificationWizardSummary) => void;
};

function formatStatus(value: string | null | undefined) {
  if (!value) return "Not specified";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusPresentation(wizard: QualificationWizardSummary | null) {
  if (!wizard) {
    return {
      label: "Not Started",
      classes: "border-slate-300 bg-slate-100 text-slate-700",
    };
  }

  switch (wizard.status) {
    case "not_available":
      return {
        label: "Not Available Yet",
        classes: "border-slate-300 bg-slate-100 text-slate-700",
      };

    case "available":
      return {
        label: "Available",
        classes: "border-sky-200 bg-sky-50 text-sky-800",
      };

    case "applicant_in_progress":
      return {
        label: "Applicant In Progress",
        classes: "border-sky-200 bg-sky-50 text-sky-800",
      };

    case "awaiting_instructor":
    case "instructor_changes_required":
      return {
        label: "Awaiting Instructor",
        classes: "border-amber-200 bg-amber-50 text-amber-800",
      };

    case "instructor_certified":
    case "examiner_review":
      return {
        label: "Needs Examiner Review",
        classes: "border-violet-200 bg-violet-50 text-violet-800",
      };

    case "deficiencies_found":
      return {
        label: "Deficiencies Found",
        classes: "border-red-200 bg-red-50 text-red-800",
      };

    case "accepted":
    case "closed":
      return {
        label: "Qualified",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };

    default:
      return {
        label: formatStatus(wizard.status),
        classes: "border-slate-300 bg-slate-100 text-slate-700",
      };
  }
}

function formatAnswerValue(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "No applicant response";
  }

  return Object.entries(value)
    .map(([key, entry]) => {
      const label = key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (typeof entry === "boolean") {
        return `${label}: ${entry ? "Yes" : "No"}`;
      }

      if (entry === null || entry === undefined || entry === "") {
        return `${label}: —`;
      }

      return `${label}: ${String(entry)}`;
    })
    .join("\n");
}

function resultClasses(value: string | null | undefined) {
  switch (value) {
    case "meets":
    case "accepted":
    case "verified":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "does_not_meet":
    case "deficient":
    case "correction_required":
      return "border-red-200 bg-red-50 text-red-800";

    case "manual_review":
    case "examiner_review":
      return "border-amber-200 bg-amber-50 text-amber-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function QualificationReviewPanel({
  requestNumber,
  applicantName,
  wizard,
  onWizardChanged,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [instructorReview, setInstructorReview] =
    useState<InstructorReview | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const presentation = getStatusPresentation(wizard);

  async function loadDetails(force = false) {
    if (!wizard || (loaded && !force) || loading) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: revisionRow, error: revisionError } = await supabase
      .from("qualification_wizard_revisions")
      .select(
        `
        id,
        revision_number,
        revision_status,
        examiner_review_text,
        examiner_reviewed_at,
        is_locked
        `,
      )
      .eq("wizard_id", wizard.id)
      .eq("revision_number", wizard.current_revision_number)
      .maybeSingle();

    if (revisionError || !revisionRow) {
      setError(
        revisionError?.message ??
          "The current qualification revision could not be loaded.",
      );
      setLoading(false);
      return;
    }

    const revisionId = revisionRow.id;

    const [
      requirementResult,
      answerResult,
      flagResult,
      instructorResult,
    ] = await Promise.all([
      supabase
        .from("qualification_requirements")
        .select(
          `
          id,
          section_code,
          requirement_code,
          requirement_type,
          title,
          description,
          regulation_citation,
          advisory_circular_citation,
          acs_citation,
          required,
          requires_instructor_verification,
          requires_examiner_review,
          sort_order
          `,
        )
        .eq("rule_set_id", wizard.rule_set_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),

      supabase
        .from("qualification_answers")
        .select(
          `
          id,
          requirement_id,
          answer_value,
          automated_result,
          automated_result_message,
          applicant_notes,
          instructor_notes,
          examiner_notes,
          instructor_verification_status,
          examiner_review_status
          `,
        )
        .eq("revision_id", revisionId),

      supabase
        .from("qualification_flags")
        .select(
          `
          id,
          requirement_id,
          severity,
          title,
          message,
          source,
          resolved,
          resolution_notes
          `,
        )
        .eq("revision_id", revisionId)
        .order("created_at", { ascending: true }),

      supabase
        .from("qualification_instructor_reviews")
        .select(
          `
          id,
          instructor_name,
          instructor_email,
          instructor_certificate_number,
          status,
          certification_text,
          certified_at,
          review_notes
          `,
        )
        .eq("revision_id", revisionId)
        .maybeSingle(),
    ]);

    if (requirementResult.error) {
      setError(requirementResult.error.message);
    } else if (answerResult.error) {
      setError(answerResult.error.message);
    } else if (flagResult.error) {
      setError(flagResult.error.message);
    } else if (instructorResult.error) {
      setError(instructorResult.error.message);
    } else {
      setRevision(revisionRow as Revision);
      setRequirements((requirementResult.data ?? []) as Requirement[]);
      setAnswers((answerResult.data ?? []) as Answer[]);
      setFlags((flagResult.data ?? []) as Flag[]);
      setInstructorReview(
        (instructorResult.data as InstructorReview | null) ?? null,
      );
      setNotes(revisionRow.examiner_review_text ?? "");
      setLoaded(true);
    }

    setLoading(false);
  }

  async function disposition(
    action: "accept" | "return_for_correction",
  ) {
    if (!wizard || saving) return;

    if (action === "return_for_correction" && !notes.trim()) {
      setError("Enter correction instructions before returning the package.");
      return;
    }

    const actionLabel =
      action === "accept"
        ? "accept this qualification package"
        : "return this qualification package to the applicant for correction";

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    const { data, error: dispositionError } = await supabase.rpc(
      "examiner_disposition_pretest_qualification",
      {
        p_wizard_id: wizard.id,
        p_action: action,
        p_notes: notes.trim() || null,
      },
    );

    if (dispositionError) {
      setError(dispositionError.message);
      setSaving(false);
      return;
    }

    const updatedWizard = Array.isArray(data) ? data[0] : data;

    if (!updatedWizard) {
      setError("The disposition completed but no updated wizard was returned.");
      setSaving(false);
      return;
    }

    onWizardChanged(updatedWizard as QualificationWizardSummary);

    setLoaded(false);
    setMessage(
      action === "accept"
        ? "Qualification accepted."
        : "Qualification returned to the applicant for correction.",
    );
    setSaving(false);

    await loadDetails(true);
  }

  const answersByRequirement = Object.fromEntries(
    answers.map((answer) => [answer.requirement_id, answer]),
  );

  const flagsByRequirement = flags.reduce<Record<string, Flag[]>>(
    (grouped, flag) => {
      const key = flag.requirement_id ?? "__general";
      grouped[key] ??= [];
      grouped[key].push(flag);
      return grouped;
    },
    {},
  );

  const mayDisposition =
    wizard?.status === "examiner_review" ||
    wizard?.status === "instructor_certified" ||
    wizard?.status === "deficiencies_found";

  return (
    <details
      className="group border-t border-slate-200"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          void loadDetails();
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span>Qualification Review</span>

          <span
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.classes}`}
          >
            {presentation.label}
          </span>
        </div>

        <span className="text-lg text-slate-500 transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="space-y-5 bg-slate-50/60 p-6">
        {!wizard ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">
              Qualification has not been initialized.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              It will be initialized when a qualifying appointment is saved.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {applicantName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {requestNumber} · Revision{" "}
                    {wizard.current_revision_number}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${presentation.classes}`}
                >
                  {presentation.label}
                </span>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Available
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDateTime(wizard.available_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Applicant Submitted
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDateTime(wizard.applicant_submitted_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Instructor Certified
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDateTime(wizard.instructor_certified_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Accepted
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDateTime(wizard.accepted_at)}
                  </dd>
                </div>
              </dl>
            </section>

            {message ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                Loading qualification package…
              </div>
            ) : null}

            {loaded && revision ? (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">
                    Instructor Review
                  </h3>

                  {instructorReview ? (
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          Instructor
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {instructorReview.instructor_name}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          Status
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {formatStatus(instructorReview.status)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          Certificate
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {instructorReview.instructor_certificate_number ||
                            "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          Certified
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {formatDateTime(instructorReview.certified_at)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">
                      No instructor review has been submitted yet.
                    </p>
                  )}
                </section>

                {flags.length > 0 ? (
                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="font-bold text-slate-900">
                      Qualification Flags
                    </h3>

                    <div className="mt-4 space-y-3">
                      {flags.map((flag) => (
                        <div
                          key={flag.id}
                          className={`rounded-lg border p-4 ${
                            flag.resolved
                              ? "border-slate-200 bg-slate-50"
                              : flag.severity === "blocking" ||
                                  flag.severity === "deficiency"
                                ? "border-red-200 bg-red-50"
                                : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">
                              {flag.title}
                            </p>
                            <span className="text-xs font-semibold uppercase text-slate-500">
                              {flag.resolved
                                ? "Resolved"
                                : formatStatus(flag.severity)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-700">
                            {flag.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="space-y-3">
                  {requirements.map((requirement) => {
                    const answer =
                      answersByRequirement[requirement.id] ?? null;

                    const requirementFlags =
                      flagsByRequirement[requirement.id] ?? [];

                    return (
                      <article
                        key={requirement.id}
                        className="rounded-xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                              {formatStatus(requirement.section_code)}
                            </p>
                            <h4 className="mt-1 font-bold text-slate-900">
                              {requirement.title}
                            </h4>

                            {requirement.description ? (
                              <p className="mt-2 text-sm text-slate-600">
                                {requirement.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {answer ? (
                              <>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${resultClasses(
                                    answer.automated_result,
                                  )}`}
                                >
                                  Auto:{" "}
                                  {formatStatus(answer.automated_result)}
                                </span>

                                {requirement.requires_instructor_verification ? (
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${resultClasses(
                                      answer.instructor_verification_status,
                                    )}`}
                                  >
                                    Instructor:{" "}
                                    {formatStatus(
                                      answer.instructor_verification_status,
                                    )}
                                  </span>
                                ) : null}

                                {requirement.requires_examiner_review ? (
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${resultClasses(
                                      answer.examiner_review_status,
                                    )}`}
                                  >
                                    Examiner:{" "}
                                    {formatStatus(
                                      answer.examiner_review_status,
                                    )}
                                  </span>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Applicant Response
                          </p>
                          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-slate-800">
                            {formatAnswerValue(answer?.answer_value)}
                          </pre>

                          {answer?.applicant_notes ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                              <span className="font-semibold">
                                Applicant notes:
                              </span>{" "}
                              {answer.applicant_notes}
                            </p>
                          ) : null}
                        </div>

                        {answer?.automated_result_message ? (
                          <p className="mt-3 text-sm text-slate-600">
                            <span className="font-semibold">
                              Automated review:
                            </span>{" "}
                            {answer.automated_result_message}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                          {requirement.regulation_citation ? (
                            <span>
                              CFR: {requirement.regulation_citation}
                            </span>
                          ) : null}

                          {requirement.advisory_circular_citation ? (
                            <span>
                              AC: {requirement.advisory_circular_citation}
                            </span>
                          ) : null}

                          {requirement.acs_citation ? (
                            <span>ACS: {requirement.acs_citation}</span>
                          ) : null}
                        </div>

                        {requirementFlags.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {requirementFlags.map((flag) => (
                              <div
                                key={flag.id}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                              >
                                <span className="font-semibold">
                                  {flag.title}:
                                </span>{" "}
                                {flag.message}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">
                    Examiner Disposition
                  </h3>

                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    Examiner Notes / Correction Instructions
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Enter examiner review notes or specific correction instructions…"
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>

                  {mayDisposition ? (
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void disposition("return_for_correction")
                        }
                        disabled={saving}
                        className="rounded-lg border border-red-300 bg-white px-5 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Return for Correction"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void disposition("accept")}
                        disabled={saving}
                        className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Accept Qualification"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">
                      Examiner disposition controls will become available after
                      the applicant and required instructor reviews are
                      complete.
                    </p>
                  )}
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </details>
  );
}
