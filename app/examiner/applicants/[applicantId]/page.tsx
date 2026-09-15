"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, GraduationCap, LockKeyhole } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "profile" | "history" | "notes";

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
  issuance_type: string | null;
  status: string;
  source_system: string | null;
  scheduled_start_at: string | null;
  scheduled_location: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type ApplicantProfile = {
  id: string;
  profile_id: string;
  full_legal_name: string | null;
  ftn_number: string | null;
  pilot_certificate_number: string | null;
  mailing_address_line_1: string | null;
  mailing_address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  flight_school_id: string | null;
  flight_school_name_other: string | null;
  setup_completed_at: string | null;
};

type TestRow = {
  id: string;
  practical_test_request_id: string;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type ReportRow = {
  id: string;
  practical_test_id: string;
  report_type: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  generated_at: string;
};

type ExaminerNoteEntry = {
  id: string;
  examiner_profile_id: string;
  applicant_profile_id: string;
  entry_text: string;
  entry_type: string;
  created_by_label: string;
  created_at: string;
};

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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function ExaminerApplicantProfileContent() {
  const params = useParams<{ applicantId: string }>();
  const applicantId = decodeURIComponent(params.applicantId);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [flightSchoolName, setFlightSchoolName] = useState<string | null>(null);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [examinerNoteEntries, setExaminerNoteEntries] = useState<
    ExaminerNoteEntry[]
  >([]);
  const [examinerNoteDraft, setExaminerNoteDraft] = useState("");
  const [examinerNoteType, setExaminerNoteType] = useState("manual_note");
  const [autoDecline, setAutoDecline] = useState(false);
  const [examinerProfileId, setExaminerProfileId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadApplicant() {
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

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", user.id)
        .in("role", ["examiner", "administrator"]);
      if (roleError || !roles?.length) {
        setPageError(
          roleError?.message ?? "Examiner or administrator access is required.",
        );
        setLoading(false);
        return;
      }

      let requestQuery = supabase
        .from("practical_test_requests")
        .select(
          `
        id, request_number, applicant_profile_id,
        applicant_name_snapshot, applicant_email_snapshot, applicant_phone_snapshot, ftn_number_snapshot,
        certificate_sought, category_sought, class_sought, rating_sought, issuance_type,
        status, source_system, scheduled_start_at, scheduled_location, submitted_at, completed_at, created_at
      `,
        )
        .eq("assigned_examiner_profile_id", user.id);

      requestQuery = applicantId.startsWith("request-")
        ? requestQuery.eq("id", applicantId.slice(8))
        : requestQuery.eq("applicant_profile_id", applicantId);

      const { data: requestData, error: requestError } =
        await requestQuery.order("created_at", { ascending: false });
      if (requestError || !requestData?.length) {
        setPageError(
          requestError?.message ??
            "This applicant profile was not found or is not assigned to you.",
        );
        setLoading(false);
        return;
      }

      const loadedRequests = requestData as RequestRow[];
      const linkedApplicantId = loadedRequests[0].applicant_profile_id;
      const requestIds = loadedRequests.map((request) => request.id);

      const [testResult, preferenceResult, profileResult, notesResult] =
        await Promise.all([
          supabase
            .from("practical_tests")
            .select(
              "id, practical_test_request_id, result, started_at, completed_at",
            )
            .in("practical_test_request_id", requestIds),
          linkedApplicantId
            ? supabase
                .from("examiner_applicant_preferences")
                .select("examiner_notes, auto_decline_requests")
                .eq("examiner_profile_id", user.id)
                .eq("applicant_profile_id", linkedApplicantId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          linkedApplicantId
            ? supabase
                .from("applicant_profiles")
                .select(
                  `id, profile_id, full_legal_name, ftn_number, pilot_certificate_number, mailing_address_line_1, mailing_address_line_2, city, state, postal_code, country, flight_school_id, flight_school_name_other, setup_completed_at`,
                )
                .eq("id", linkedApplicantId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          linkedApplicantId
            ? supabase
                .from("examiner_applicant_note_entries")
                .select(
                  "id, examiner_profile_id, applicant_profile_id, entry_text, entry_type, created_by_label, created_at",
                )
                .eq("examiner_profile_id", user.id)
                .eq("applicant_profile_id", linkedApplicantId)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (
        testResult.error ||
        preferenceResult.error ||
        profileResult.error ||
        notesResult.error
      ) {
        setPageError(
          testResult.error?.message ??
            preferenceResult.error?.message ??
            profileResult.error?.message ??
            notesResult.error?.message ??
            "Applicant details could not be loaded.",
        );
        setLoading(false);
        return;
      }

      const loadedTests = (testResult.data ?? []) as TestRow[];
      let loadedReports: ReportRow[] = [];
      if (loadedTests.length) {
        const { data: reportData, error: reportError } = await supabase
          .from("practical_test_reports")
          .select(
            "id, practical_test_id, report_type, storage_bucket, storage_path, file_name, generated_at",
          )
          .in(
            "practical_test_id",
            loadedTests.map((test) => test.id),
          )
          .is("superseded_at", null);
        if (reportError) {
          setPageError(reportError.message);
          setLoading(false);
          return;
        }
        loadedReports = (reportData ?? []) as ReportRow[];
      }

      const loadedProfile = profileResult.data as ApplicantProfile | null;
      let schoolName: string | null =
        loadedProfile?.flight_school_name_other ?? null;
      if (loadedProfile?.flight_school_id) {
        const { data: school } = await supabase
          .from("flight_schools")
          .select("name")
          .eq("id", loadedProfile.flight_school_id)
          .maybeSingle();
        schoolName = school?.name ?? schoolName;
      }

      if (cancelled) return;
      setExaminerProfileId(user.id);
      setRequests(loadedRequests);
      setProfile(loadedProfile);
      setFlightSchoolName(schoolName);
      setTests(loadedTests);
      setReports(loadedReports);
      setExaminerNoteEntries((notesResult.data ?? []) as ExaminerNoteEntry[]);
      setAutoDecline(preferenceResult.data?.auto_decline_requests ?? false);
      setLoading(false);
    }
    void loadApplicant();
    return () => {
      cancelled = true;
    };
  }, [applicantId]);

  const latestRequest = requests[0] ?? null;
  const linkedApplicantId = latestRequest?.applicant_profile_id ?? null;
  const testsByRequest = useMemo(
    () => new Map(tests.map((test) => [test.practical_test_request_id, test])),
    [tests],
  );
  const reportByTest = useMemo(
    () =>
      new Map(
        reports
          .filter(
            (report) => report.report_type === "designee_practical_test_report",
          )
          .map((report) => [report.practical_test_id, report]),
      ),
    [reports],
  );

  async function addExaminerNote() {
    if (!linkedApplicantId || savingNote) return;
    const entryText = examinerNoteDraft.trim();
    if (!entryText) {
      setPageError("Enter an examiner note before saving.");
      return;
    }

    setSavingNote(true);
    setPageError("");
    setMessage("");
    const { data, error } = await createClient().rpc(
      "examiner_add_applicant_note_entry",
      {
        p_applicant_profile_id: linkedApplicantId,
        p_entry_text: entryText,
        p_entry_type: examinerNoteType,
      },
    );
    if (error) {
      setPageError(`Examiner note could not be added: ${error.message}`);
    } else {
      const addedEntry = (
        Array.isArray(data) ? data[0] : data
      ) as ExaminerNoteEntry | null;
      if (!addedEntry) {
        setPageError("The examiner note was saved but was not returned.");
      } else {
        setExaminerNoteEntries((current) => [addedEntry, ...current]);
        setExaminerNoteDraft("");
        setMessage("Your private examiner note was added.");
      }
    }
    setSavingNote(false);
  }

  async function savePreference() {
    if (!linkedApplicantId || !examinerProfileId || savingPreference) return;
    setSavingPreference(true);
    setPageError("");
    setMessage("");
    const { error } = await createClient()
      .from("examiner_applicant_preferences")
      .upsert(
        {
          examiner_profile_id: examinerProfileId,
          applicant_profile_id: linkedApplicantId,
          auto_decline_requests: autoDecline,
        },
        { onConflict: "examiner_profile_id,applicant_profile_id" },
      );
    if (error)
      setPageError(`Request setting could not be saved: ${error.message}`);
    else setMessage("Your private request setting was saved.");
    setSavingPreference(false);
  }

  async function openReport(report: ReportRow) {
    if (openingReportId) return;
    setOpeningReportId(report.id);
    const { data, error } = await createClient()
      .storage.from(report.storage_bucket)
      .createSignedUrl(report.storage_path, 600);
    if (error || !data?.signedUrl)
      setPageError(
        error?.message ?? "The evaluation report could not be opened.",
      );
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setOpeningReportId(null);
  }

  const mailingAddress = profile
    ? [
        profile.mailing_address_line_1,
        profile.mailing_address_line_2,
        [profile.city, profile.state, profile.postal_code]
          .filter(Boolean)
          .join(", ")
          .replace(", ,", ","),
        profile.country,
      ]
        .filter(Boolean)
        .join("\n")
    : "Not specified";

  if (loading)
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading applicant profile…
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/examiner/applicants"
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applicants
      </Link>
      {pageError ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}
      {latestRequest ? (
        <>
          <header className="mt-6 flex items-center gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Applicant Profile
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                {profile?.full_legal_name ||
                  latestRequest.applicant_name_snapshot}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                FTN:{" "}
                {displayValue(
                  profile?.ftn_number || latestRequest.ftn_number_snapshot,
                )}
              </p>
            </div>
          </header>

          <nav
            className="mt-8 flex overflow-x-auto border-b border-slate-200"
            aria-label="Applicant profile sections"
          >
            {(["profile", "history", "notes"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-bold ${activeTab === tab ? "border-amber-600 text-amber-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {tab === "profile"
                  ? "Profile"
                  : tab === "history"
                    ? "Test History"
                    : "Examiner Notes"}
              </button>
            ))}
          </nav>

          {activeTab === "profile" ? (
            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">
                  Contact Information
                </h2>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Info
                    label="Full Legal Name"
                    value={displayValue(
                      profile?.full_legal_name ||
                        latestRequest.applicant_name_snapshot,
                    )}
                  />
                  <Info
                    label="Email"
                    value={displayValue(latestRequest.applicant_email_snapshot)}
                  />
                  <Info
                    label="Phone"
                    value={displayValue(latestRequest.applicant_phone_snapshot)}
                  />
                  <Info
                    label="FTN"
                    value={displayValue(
                      profile?.ftn_number || latestRequest.ftn_number_snapshot,
                    )}
                  />
                </dl>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">Applicant Details</h2>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Info
                    label="Pilot Certificate Number"
                    value={displayValue(profile?.pilot_certificate_number)}
                  />
                  <Info
                    label="Flight School"
                    value={displayValue(flightSchoolName)}
                  />
                  <Info
                    label="Profile Setup"
                    value={
                      profile?.setup_completed_at
                        ? `Completed ${formatDateTime(profile.setup_completed_at)}`
                        : "Not completed"
                    }
                  />
                  <Info
                    label="Requests With You"
                    value={String(requests.length)}
                  />
                </dl>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <h2 className="font-bold text-slate-950">Mailing Address</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {mailingAddress}
                </p>
              </div>
            </section>
          ) : null}

          {activeTab === "history" ? (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-bold text-slate-950">Test History</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Practical-test requests assigned to your examiner account.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Request",
                        "Test",
                        "Appointment",
                        "Status / Result",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-left font-semibold text-slate-700"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((request) => {
                      const test = testsByRequest.get(request.id);
                      const report = test
                        ? reportByTest.get(test.id)
                        : undefined;
                      return (
                        <tr key={request.id} className="align-top">
                          <td className="px-5 py-4">
                            <p className="font-bold">
                              {request.request_number}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(
                                request.submitted_at ?? request.created_at,
                              )}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {request.certificate_sought}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {request.rating_sought}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p>{formatDateTime(request.scheduled_start_at)}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {displayValue(request.scheduled_location)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {formatStatus(request.status)}
                            </p>
                            {test?.result ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Result: {formatStatus(test.result)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-2">
                              <Link
                                href={`/examiner/requests?request=${encodeURIComponent(request.id)}`}
                                className="font-bold text-amber-700 hover:underline"
                              >
                                Open Request
                              </Link>
                              {report ? (
                                <button
                                  type="button"
                                  onClick={() => void openReport(report)}
                                  disabled={Boolean(openingReportId)}
                                  className="inline-flex items-center gap-1 text-left font-bold text-sky-700 hover:underline disabled:opacity-50"
                                >
                                  <FileText className="h-4 w-4" />
                                  {openingReportId === report.id
                                    ? "Opening…"
                                    : "View Report"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeTab === "notes" ? (
            <section className="mt-6 space-y-6 rounded-2xl border border-amber-200 bg-slate-50/60 p-6 shadow-sm">
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <h2 className="font-bold text-slate-950">
                    Private Examiner Notes
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    These notes are visible only to you. Other examiners,
                    applicants, and administrators cannot read them.
                  </p>
                </div>
              </div>
              {linkedApplicantId ? (
                <>
                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="font-bold text-slate-900">
                      Add Examiner Note
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Add a dated private note to maintain a running log for
                      this applicant.
                    </p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
                      <div>
                        <label
                          htmlFor="examiner-note-type"
                          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                        >
                          Entry Type
                        </label>
                        <select
                          id="examiner-note-type"
                          value={examinerNoteType}
                          onChange={(event) => {
                            setExaminerNoteType(event.target.value);
                            setMessage("");
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                        >
                          <option value="manual_note">General Note</option>
                          <option value="phone_call">Phone Call</option>
                          <option value="email">Email</option>
                          <option value="document_received">
                            Document Received
                          </option>
                          <option value="appointment_change">
                            Appointment Change
                          </option>
                          <option value="internal_note">Internal Note</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="examiner-note-entry"
                          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                        >
                          Examiner Note
                        </label>
                        <textarea
                          id="examiner-note-entry"
                          rows={3}
                          value={examinerNoteDraft}
                          onChange={(event) => {
                            setExaminerNoteDraft(event.target.value);
                            setMessage("");
                          }}
                          placeholder="Enter a private note about this applicant…"
                          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void addExaminerNote()}
                        disabled={savingNote || !examinerNoteDraft.trim()}
                        className="rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingNote ? "Adding…" : "Add Entry"}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="font-bold text-slate-900">Running Log</h3>
                    {examinerNoteEntries.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">
                        No examiner notes have been added.
                      </p>
                    ) : (
                      <ol className="mt-5 space-y-4">
                        {examinerNoteEntries.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                                  {formatStatus(entry.entry_type)}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                                  {entry.entry_text}
                                </p>
                              </div>
                              <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right">
                                <p className="font-semibold text-slate-600">
                                  {entry.created_by_label}
                                </p>
                                <p className="mt-1">
                                  {formatDateTime(entry.created_at)}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="font-bold text-slate-900">
                      Request Setting
                    </h3>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                      <input
                        type="checkbox"
                        checked={autoDecline}
                        onChange={(event) => {
                          setAutoDecline(event.target.checked);
                          setMessage("");
                        }}
                        className="mt-1 h-5 w-5 rounded border-red-300 text-red-700"
                      />
                      <span>
                        <span className="block font-bold text-red-900">
                          Automatically decline future requests
                        </span>
                        <span className="mt-1 block text-sm text-red-800">
                          Future requests from this applicant assigned to you
                          will be automatically declined. Existing requests are
                          unchanged.
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => void savePreference()}
                      disabled={savingPreference}
                      className="mt-5 rounded-lg bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {savingPreference ? "Saving…" : "Save Request Setting"}
                    </button>
                  </section>

                  {message ? (
                    <p className="text-sm font-semibold text-emerald-700">
                      {message}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Private notes are unavailable because this legacy request is
                  not linked to an applicant account.
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function ApplicantProfileLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        Loading applicant profile…
      </div>
    </main>
  );
}

export default function ExaminerApplicantProfilePage() {
  return (
    <Suspense fallback={<ApplicantProfileLoading />}>
      <ExaminerApplicantProfileContent />
    </Suspense>
  );
}
