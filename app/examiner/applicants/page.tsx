"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RequestRow = {
  id: string;
  request_number: string;
  applicant_profile_id: string | null;
  assigned_examiner_profile_id: string | null;

  applicant_name_snapshot: string;
  applicant_email_snapshot: string;
  applicant_phone_snapshot: string | null;
  ftn_number_snapshot: string | null;

  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  issuance_type: string | null;

  status: string;
  source_system: string | null;

  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;

  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type ApplicantPreferenceRow = {
  examiner_profile_id: string;
  applicant_profile_id: string;
  examiner_notes: string | null;
  auto_decline_requests: boolean;
  updated_at: string;
};

type ApplicantPreferenceDraft = {
  examinerNotes: string;
  autoDeclineRequests: boolean;
};

type PracticalTestRow = {
  id: string;
  practical_test_request_id: string;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type PracticalTestReportRow = {
  id: string;
  practical_test_id: string;
  report_type: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  generated_at: string;
  superseded_at: string | null;
};

type ApplicantGroup = {
  key: string;
  applicantProfileId: string | null;
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
  if (request.applicant_profile_id) {
    return `profile:${request.applicant_profile_id}`;
  }

  const email = normalize(request.applicant_email_snapshot);

  if (email) {
    return `email:${email}`;
  }

  const ftn = normalize(request.ftn_number_snapshot);

  if (ftn) {
    return `ftn:${ftn}`;
  }

  return [
    "legacy",
    normalize(request.applicant_name_snapshot),
    normalize(request.applicant_phone_snapshot),
  ].join(":");
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not specified";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Not specified";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function latestDate(values: Array<string | null | undefined>) {
  const validValues = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({
      value,
      milliseconds: new Date(value).getTime(),
    }))
    .filter((item) => !Number.isNaN(item.milliseconds))
    .sort((a, b) => b.milliseconds - a.milliseconds);

  return validValues[0]?.value ?? null;
}

function statusClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "confirmed":
    case "scheduled":
    case "scheduling":
      return "border-sky-200 bg-sky-50 text-sky-800";

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

export default function ExaminerApplicantsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [tests, setTests] = useState<PracticalTestRow[]>([]);
  const [reports, setReports] = useState<PracticalTestReportRow[]>([]);
  const [preferences, setPreferences] = useState<
    Record<string, ApplicantPreferenceDraft>
  >({});

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);
  const [savingPreferenceId, setSavingPreferenceId] = useState<
    string | null
  >(null);
  const [preferenceMessage, setPreferenceMessage] = useState<
    Record<string, string>
  >({});

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

    if (roleError) {
      setPageError(
        `Your examiner access could not be verified: ${roleError.message}`,
      );
      setLoading(false);
      return;
    }

    if (!roleRows || roleRows.length === 0) {
      setPageError(
        "Examiner or administrator access is required to view applicant information.",
      );
      setLoading(false);
      return;
    }

    const { data: requestRows, error: requestError } = await supabase
      .from("practical_test_requests")
      .select(
        `
        id,
        request_number,
        applicant_profile_id,
        assigned_examiner_profile_id,
        applicant_name_snapshot,
        applicant_email_snapshot,
        applicant_phone_snapshot,
        ftn_number_snapshot,
        certificate_sought,
        category_sought,
        class_sought,
        rating_sought,
        issuance_type,
        status,
        source_system,
        scheduled_start_at,
        scheduled_end_at,
        scheduled_location,
        submitted_at,
        completed_at,
        created_at
        `,
      )
      .eq("assigned_examiner_profile_id", user.id)
      .order("created_at", { ascending: false });

    if (requestError) {
      setPageError(
        `Applicant information could not be loaded: ${requestError.message}`,
      );
      setLoading(false);
      return;
    }

    const loadedRequests = (requestRows ?? []) as RequestRow[];
    setRequests(loadedRequests);

    const applicantProfileIds = [
      ...new Set(
        loadedRequests
          .map((request) => request.applicant_profile_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    if (applicantProfileIds.length > 0) {
      const {
        data: preferenceRows,
        error: preferenceError,
      } = await supabase
        .from("examiner_applicant_preferences")
        .select(
          `
          examiner_profile_id,
          applicant_profile_id,
          examiner_notes,
          auto_decline_requests,
          updated_at
          `,
        )
        .eq("examiner_profile_id", user.id)
        .in("applicant_profile_id", applicantProfileIds);

      if (preferenceError) {
        setPageError(
          `Applicant preferences could not be loaded: ${preferenceError.message}`,
        );
        setLoading(false);
        return;
      }

      const loadedPreferences: Record<
        string,
        ApplicantPreferenceDraft
      > = {};

      for (
        const row of
          (preferenceRows ?? []) as ApplicantPreferenceRow[]
      ) {
        loadedPreferences[row.applicant_profile_id] = {
          examinerNotes: row.examiner_notes ?? "",
          autoDeclineRequests:
            row.auto_decline_requests,
        };
      }

      setPreferences(loadedPreferences);
    } else {
      setPreferences({});
    }

    const requestIds = loadedRequests.map((request) => request.id);

    if (requestIds.length === 0) {
      setTests([]);
      setReports([]);
      setLoading(false);
      return;
    }

    const { data: testRows, error: testError } = await supabase
      .from("practical_tests")
      .select(
        `
        id,
        practical_test_request_id,
        result,
        started_at,
        completed_at
        `,
      )
      .in("practical_test_request_id", requestIds);

    if (testError) {
      setPageError(
        `Practical-test records could not be loaded: ${testError.message}`,
      );
      setLoading(false);
      return;
    }

    const loadedTests = (testRows ?? []) as PracticalTestRow[];
    setTests(loadedTests);

    const testIds = loadedTests.map((test) => test.id);

    if (testIds.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }

    const { data: reportRows, error: reportError } = await supabase
      .from("practical_test_reports")
      .select(
        `
        id,
        practical_test_id,
        report_type,
        storage_bucket,
        storage_path,
        file_name,
        generated_at,
        superseded_at
        `,
      )
      .in("practical_test_id", testIds)
      .is("superseded_at", null);

    if (reportError) {
      setPageError(
        `Evaluation reports could not be loaded: ${reportError.message}`,
      );
      setLoading(false);
      return;
    }

    setReports((reportRows ?? []) as PracticalTestReportRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadApplicants();
  }, [loadApplicants]);

  const testsByRequest = useMemo(() => {
    return new Map(
      tests.map((test) => [test.practical_test_request_id, test]),
    );
  }, [tests]);

  const reportsByTest = useMemo(() => {
    const map = new Map<string, PracticalTestReportRow>();

    for (const report of reports) {
      map.set(
        `${report.practical_test_id}:${report.report_type}`,
        report,
      );
    }

    return map;
  }, [reports]);

  const applicants = useMemo<ApplicantGroup[]>(() => {
    const grouped = new Map<string, RequestRow[]>();

    for (const request of requests) {
      const key = applicantKey(request);
      const current = grouped.get(key) ?? [];
      current.push(request);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .map(([key, applicantRequests]) => {
        const sortedRequests = [...applicantRequests].sort((a, b) => {
          const aDate = latestDate([
            a.completed_at,
            a.scheduled_start_at,
            a.submitted_at,
            a.created_at,
          ]);

          const bDate = latestDate([
            b.completed_at,
            b.scheduled_start_at,
            b.submitted_at,
            b.created_at,
          ]);

          return (
            new Date(bDate ?? 0).getTime() -
            new Date(aDate ?? 0).getTime()
          );
        });

        const latestRequest = sortedRequests[0];

        const lastInteractionAt = latestDate(
          sortedRequests.flatMap((request) => [
            request.completed_at,
            request.scheduled_start_at,
            request.submitted_at,
            request.created_at,
          ]),
        );

        return {
          key,
          applicantProfileId:
            latestRequest.applicant_profile_id,
          name: latestRequest.applicant_name_snapshot,
          email: latestRequest.applicant_email_snapshot,
          phone: latestRequest.applicant_phone_snapshot,
          ftn: latestRequest.ftn_number_snapshot,
          requests: sortedRequests,
          appointmentCount: sortedRequests.filter(
            (request) => request.scheduled_start_at !== null,
          ).length,
          completedCount: sortedRequests.filter(
            (request) => request.status === "completed",
          ).length,
          lastInteractionAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requests, testsByRequest]);

  const visibleApplicants = useMemo(() => {
    const normalizedSearch = normalize(search);

    if (!normalizedSearch) {
      return applicants;
    }

    return applicants.filter((applicant) => {
      const requestSearchText = applicant.requests
        .map((request) =>
          [
            request.request_number,
            request.certificate_sought,
            request.category_sought,
            request.class_sought,
            request.rating_sought,
            request.scheduled_location,
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join(" ");

      return normalize(
        [
          applicant.name,
          applicant.email,
          applicant.phone,
          applicant.ftn,
          requestSearchText,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedSearch);
    });
  }, [applicants, search]);

  function updatePreferenceDraft(
    applicantProfileId: string,
    changes: Partial<ApplicantPreferenceDraft>,
  ) {
    setPreferences((current) => ({
      ...current,
      [applicantProfileId]: {
        examinerNotes:
          current[applicantProfileId]?.examinerNotes ?? "",
        autoDeclineRequests:
          current[applicantProfileId]
            ?.autoDeclineRequests ?? false,
        ...changes,
      },
    }));

    setPreferenceMessage((current) => ({
      ...current,
      [applicantProfileId]: "",
    }));
  }

  async function saveApplicantPreference(
    applicant: ApplicantGroup,
  ) {
    const applicantProfileId =
      applicant.applicantProfileId;

    if (!applicantProfileId) {
      setPageError(
        "This legacy applicant does not yet have a linked applicant profile.",
      );
      return;
    }

    if (savingPreferenceId) {
      return;
    }

    const draft =
      preferences[applicantProfileId] ?? {
        examinerNotes: "",
        autoDeclineRequests: false,
      };

    setSavingPreferenceId(applicantProfileId);
    setPageError("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPageError(
        "Your login session could not be verified.",
      );
      setSavingPreferenceId(null);
      return;
    }

    const { error } = await supabase
      .from("examiner_applicant_preferences")
      .upsert(
        {
          examiner_profile_id: user.id,
          applicant_profile_id:
            applicantProfileId,
          examiner_notes:
            draft.examinerNotes.trim() || null,
          auto_decline_requests:
            draft.autoDeclineRequests,
        },
        {
          onConflict:
            "examiner_profile_id,applicant_profile_id",
        },
      );

    if (error) {
      setPageError(
        `Applicant settings could not be saved: ${error.message}`,
      );
      setSavingPreferenceId(null);
      return;
    }

    setPreferenceMessage((current) => ({
      ...current,
      [applicantProfileId]:
        "Applicant settings saved.",
    }));

    setSavingPreferenceId(null);
  }

  async function openReport(report: PracticalTestReportRow) {
    if (openingReportId) return;

    setOpeningReportId(report.id);
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(report.storage_bucket)
      .createSignedUrl(report.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      setPageError(
        `The evaluation report could not be opened: ${
          error?.message ?? "No signed URL was returned."
        }`,
      );
      setOpeningReportId(null);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setOpeningReportId(null);
  }

  const totalAppointments = applicants.reduce(
    (total, applicant) => total + applicant.appointmentCount,
    0,
  );

  const totalCompletedTests = applicants.reduce(
    (total, applicant) => total + applicant.completedCount,
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
            Applicant Info
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Search applicants you have interacted with and review their
            practical-test request, appointment, test, and evaluation-report
            history.
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Applicants
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {applicants.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Appointments
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {totalAppointments}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Completed Tests
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {totalCompletedTests}
          </p>
        </div>
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
          Loading applicant information…
        </div>
      ) : null}

      {!loading && visibleApplicants.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No applicants match the current search.
        </div>
      ) : null}

      {!loading && visibleApplicants.length > 0 ? (
        <div className="mt-6 space-y-3">
          {visibleApplicants.map((applicant) => (
            <article
              key={applicant.key}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <details className="group">
                <summary className="cursor-pointer list-none px-5 py-4 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <div className="grid gap-4 md:grid-cols-[minmax(220px,1.6fr)_minmax(180px,1.3fr)_100px_120px_150px_auto] md:items-center">
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
                      <p className="mt-1 font-bold text-slate-950">
                        {applicant.requests.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Appointments
                      </p>
                      <p className="mt-1 font-bold text-slate-950">
                        {applicant.appointmentCount}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Completed Tests
                      </p>
                      <p className="mt-1 font-bold text-slate-950">
                        {applicant.completedCount}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Last Interaction
                        </p>
                        <p className="mt-1 whitespace-nowrap text-xs text-slate-700">
                          {formatDateTime(applicant.lastInteractionAt)}
                        </p>
                      </div>

                      <span className="text-lg text-slate-500 transition-transform group-open:rotate-180">
                        ⌄
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-200 bg-slate-50/60 p-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-bold text-slate-950">
                      Applicant Contact Information
                    </h2>

                    <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Name
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {applicant.name}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email
                        </dt>
                        <dd className="mt-1 text-sm">
                          <a
                            href={`mailto:${applicant.email}`}
                            className="font-semibold text-sky-700 hover:underline"
                          >
                            {applicant.email}
                          </a>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Phone
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {displayValue(applicant.phone)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          FTN
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {displayValue(applicant.ftn)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {applicant.applicantProfileId ? (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-white p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <h2 className="font-bold text-slate-950">
                            Examiner Notes and Request Settings
                          </h2>

                          <p className="mt-1 text-sm text-slate-600">
                            These notes and settings are private to your examiner
                            account.
                          </p>
                        </div>

                        {preferences[
                          applicant.applicantProfileId
                        ]?.autoDeclineRequests ? (
                          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
                            Auto Decline Enabled
                          </span>
                        ) : null}
                      </div>

                      <label
                        htmlFor={`applicant-notes-${applicant.applicantProfileId}`}
                        className="mt-5 block text-sm font-bold text-slate-900"
                      >
                        Examiner Notes
                      </label>

                      <textarea
                        id={`applicant-notes-${applicant.applicantProfileId}`}
                        value={
                          preferences[
                            applicant.applicantProfileId
                          ]?.examinerNotes ?? ""
                        }
                        onChange={(event) =>
                          updatePreferenceDraft(
                            applicant.applicantProfileId!,
                            {
                              examinerNotes:
                                event.target.value,
                            },
                          )
                        }
                        rows={5}
                        placeholder="Enter private notes about this applicant."
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                      />

                      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <input
                          type="checkbox"
                          checked={
                            preferences[
                              applicant.applicantProfileId
                            ]?.autoDeclineRequests ?? false
                          }
                          onChange={(event) =>
                            updatePreferenceDraft(
                              applicant.applicantProfileId!,
                              {
                                autoDeclineRequests:
                                  event.target.checked,
                              },
                            )
                          }
                          className="mt-1 h-5 w-5 rounded border-red-300 text-red-700 focus:ring-red-500"
                        />

                        <span>
                          <span className="block font-bold text-red-900">
                            Automatically decline future requests
                          </span>

                          <span className="mt-1 block text-sm text-red-800">
                            When a future request from this applicant is assigned
                            to you, it will automatically be declined. Existing
                            requests and appointments will not be changed.
                          </span>
                        </span>
                      </label>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() =>
                            void saveApplicantPreference(
                              applicant,
                            )
                          }
                          disabled={Boolean(
                            savingPreferenceId,
                          )}
                          className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingPreferenceId ===
                          applicant.applicantProfileId
                            ? "Saving…"
                            : "Save Applicant Settings"}
                        </button>

                        {preferenceMessage[
                          applicant.applicantProfileId
                        ] ? (
                          <p className="text-sm font-semibold text-emerald-700">
                            {
                              preferenceMessage[
                                applicant.applicantProfileId
                              ]
                            }
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                      Notes and automatic decline settings are unavailable
                      because this legacy record is not linked to an applicant
                      portal account.
                    </div>
                  )}

                  <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            Request
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            Test
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            Appointment
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            Status / Result
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            Designee Test Report
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {applicant.requests.map((request) => {
                          const test = testsByRequest.get(request.id);
                          const report = test
                            ? reportsByTest.get(
                                `${test.id}:designee_practical_test_report`,
                              )
                            : undefined;

                          return (
                            <tr key={request.id} className="align-top">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-950">
                                  {request.request_number}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Submitted{" "}
                                  {formatDateTime(
                                    request.submitted_at ?? request.created_at,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Source: {displayValue(request.source_system)}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-900">
                                  {request.certificate_sought}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  {request.rating_sought}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatStatus(request.issuance_type)}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-slate-700">
                                {request.scheduled_start_at ? (
                                  <>
                                    <p>
                                      {formatDateTime(
                                        request.scheduled_start_at,
                                      )}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {displayValue(
                                        request.scheduled_location,
                                      )}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-slate-500">
                                    No saved appointment
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                                    request.status,
                                  )}`}
                                >
                                  {formatStatus(request.status)}
                                </span>

                                {test?.result ? (
                                  <p className="mt-2 text-xs font-semibold text-slate-700">
                                    Test result:{" "}
                                    {formatStatus(test.result)}
                                  </p>
                                ) : null}

                                {request.completed_at ||
                                test?.completed_at ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Completed{" "}
                                    {formatDateTime(
                                      test?.completed_at ??
                                        request.completed_at,
                                    )}
                                  </p>
                                ) : null}
                              </td>

                              <td className="px-4 py-4">
                                {report ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void openReport(report)
                                    }
                                    disabled={Boolean(openingReportId)}
                                    className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                                  >
                                    {openingReportId === report.id
                                      ? "Opening…"
                                      : "View Designee Report"}
                                  </button>
                                ) : request.status === "completed" ||
                                  request.completed_at ||
                                  test?.completed_at ? (
                                  <span className="text-xs font-medium text-amber-700">
                                    Report not yet recorded
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-500">
                                    Not applicable
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-4 text-right">
                                <div className="flex flex-col items-end gap-2">
                                  {(request.status === "completed" ||
                                    request.completed_at ||
                                    test?.completed_at) ? (
                                    <Link
                                      href={`/examiner/historical-records?request=${request.id}`}
                                      className="inline-flex rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                                    >
                                      Open Historical Record
                                    </Link>
                                  ) : null}

                                  <Link
                                    href={`/examiner/requests?request=${request.id}`}
                                    className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    Open Request
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : null}
    </main>
  );
}
