"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { supportsQualificationEvidence } from "@/lib/qualification/instrument";
import { legsSummary } from "@/lib/qualification/legs";

// "Validate Qualifications" report (Kele, Oct 31 2026): every qualification item with
// a green check (passes), a yellow triangle (check it yourself) or a red X with the issue.
// Fits on one printed page.

type Status = "pass" | "check" | "issue" | "na";

type Requirement = {
  id: string;
  section_code: string;
  requirement_code: string;
  title: string;
  regulation_citation: string | null;
  required: boolean;
  requires_document: boolean;
  rule_config: Record<string, unknown>;
  display_config: { fields?: Array<{ key: string; label?: string; type?: string }> };
  sort_order: number;
};

type Answer = {
  requirement_id: string;
  answer_value: Record<string, unknown>;
  automated_result: string | null;
  automated_result_message: string | null;
  instructor_verification_status: string | null;
  examiner_review_status: string | null;
};

type Row = { requirement: Requirement; status: Status; entered: string; pictures: number; note: string };

type Report = {
  request: {
    status: string;
    request_number: string;
    applicant_name_snapshot: string | null;
    certificate_sought: string | null;
    rating_sought: string | null;
    scheduled_start_at: string | null;
    scheduled_location: string | null;
  };
  wizard: { status: string; accepted_at: string | null; applicant_submitted_at: string | null; instructor_name: string | null };
  instructorReview: { status: string; instructor_name: string; certified_at: string | null } | null;
  ruleSetName: string;
  rows: Row[];
};

const SECTION_ORDER = ["identity", "eligibility", "knowledge_test", "application", "medical", "experience", "cross_country", "endorsements", "certification"];
const SECTION_NAMES: Record<string, string> = {
  identity: "Identity", eligibility: "Eligibility", knowledge_test: "Knowledge test", application: "Application",
  medical: "Medical certificate", experience: "Aeronautical experience", cross_country: "Cross-country",
  endorsements: "Endorsements", certification: "Certification",
};

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu", month: "short", day: "numeric", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

function enteredSummary(requirement: Requirement, answer: Answer | undefined) {
  if (!answer) return "";
  const labels = new Map((requirement.display_config.fields ?? []).map((field) => [field.key, field.label ?? field.key]));
  const skip = new Set(["instructor_source", "certified", "endorsement_text", "total_distance_nm"]);
  return Object.entries(answer.answer_value ?? {})
    .filter(([key, value]) => !skip.has(key) && hasValue(value))
    .map(([key, value]) => {
      if (key === "legs") return legsSummary(value);
      const text = typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? `${value.length} entries` : String(value);
      const label = key === "value" ? "" : `${labels.get(key) ?? key.replaceAll("_", " ")}: `;
      return `${label}${/^\d{4}-\d{2}-\d{2}$/.test(text) ? formatDate(text) : text}`;
    })
    .join(" · ");
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function classify(
  requirement: Requirement,
  answer: Answer | undefined,
  pictures: number,
  answers: Map<string, Answer>,
  byCode: Map<string, Requirement>,
  instructorStatus: string | null,
  picturesPurged: boolean,
): { status: Status; note: string } {
  const answerType = String(requirement.rule_config.answer_type ?? "");

  if (answerType === "instructor_certification") {
    if (instructorStatus === "certified") return { status: "pass", note: "Instructor certified" };
    if (instructorStatus === "declined") return { status: "issue", note: "Instructor declined to certify" };
    if (instructorStatus === "changes_required") return { status: "issue", note: "Instructor asked for changes" };
    if (instructorStatus === "expired") return { status: "issue", note: "Instructor certification request expired" };
    return { status: "check", note: "Waiting for instructor certification" };
  }

  if (answerType === "computed") {
    const left = byCode.get(String(requirement.rule_config.left_requirement ?? "IDENTITY_ID_NAME")) ?? byCode.get("IR_ID");
    const right = byCode.get(String(requirement.rule_config.right_requirement ?? "IDENTITY_PILOT_CERTIFICATE_NAME")) ?? byCode.get("IR_CERTIFICATE");
    const a = left ? answers.get(left.id)?.answer_value : undefined;
    const b = right ? answers.get(right.id)?.answer_value : undefined;
    const nameA = normalizeName(a?.name_exact ?? a?.legal_name);
    const nameB = normalizeName(b?.name_exact ?? b?.legal_name);
    if (!nameA || !nameB) return { status: "issue", note: "Both names must be entered" };
    return nameA === nameB ? { status: "pass", note: "Names match" } : { status: "check", note: "Names differ — compare the ID and certificate" };
  }

  const answered = answer && Object.values(answer.answer_value ?? {}).some(hasValue);
  if (!answered) return requirement.required ? { status: "issue", note: "Not answered" } : { status: "na", note: "Not applicable" };

  if (answerType === "typed_signature" && answer.answer_value.certified !== true) return { status: "issue", note: "Not signed" };

  if (answer.examiner_review_status === "deficient") return { status: "issue", note: "Marked deficient by examiner" };
  if (answer.instructor_verification_status === "correction_required") return { status: "issue", note: "Instructor requested a correction" };
  if (answer.automated_result === "does_not_meet") return { status: "issue", note: answer.automated_result_message ?? "Does not meet the requirement" };

  if (supportsQualificationEvidence(requirement, answer.answer_value) && pictures === 0 && !picturesPurged) {
    return { status: "issue", note: "No picture attached" };
  }

  if (answer.examiner_review_status === "accepted") return { status: "pass", note: "Accepted by examiner" };
  if (answer.automated_result === "meets") return { status: "pass", note: "" };
  if (answer.automated_result === "manual_review") return { status: "check", note: answer.automated_result_message ?? "Check manually" };
  if (answerType === "typed_signature" || answerType === "yes_no") return { status: "pass", note: "" };
  return { status: "check", note: pictures ? "Compare with the attached pictures" : "Check manually" };
}

function Icon({ status }: { status: Status }) {
  if (status === "pass") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-label="Passes validation" role="img">
        <circle cx="10" cy="10" r="9" fill="#15803d" />
        <path d="M5.5 10.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "check") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-label="Check manually" role="img">
        <path d="M10 1.8L19 18H1z" fill="#eab308" stroke="#a16207" strokeWidth="0.8" strokeLinejoin="round" />
        <rect x="9" y="7" width="2" height="6" rx="1" fill="#1f2937" />
        <circle cx="10" cy="15.2" r="1.1" fill="#1f2937" />
      </svg>
    );
  }
  if (status === "issue") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-label="Known issue" role="img">
        <circle cx="10" cy="10" r="9" fill="#dc2626" />
        <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className="inline-block h-4 w-4 text-center text-xs text-slate-400" aria-label="Not applicable">–</span>;
}

function ReportContent() {
  const params = useParams<{ id: string }>();
  const requestId = typeof params?.id === "string" ? params.id : "";
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: request, error: requestError } = await supabase
        .from("practical_test_requests")
        .select("status, request_number, applicant_name_snapshot, certificate_sought, rating_sought, scheduled_start_at, scheduled_location")
        .eq("id", requestId)
        .maybeSingle();
      if (requestError || !request) throw new Error(requestError?.message ?? "Request not found.");

      const { data: wizard, error: wizardError } = await supabase
        .from("qualification_wizards")
        .select("id, rule_set_id, status, accepted_at, applicant_submitted_at, instructor_name, current_revision_number")
        .eq("practical_test_request_id", requestId)
        .maybeSingle();
      if (wizardError) throw new Error(wizardError.message);
      if (!wizard) throw new Error("This request has no pretest qualification yet.");

      const { data: revision } = await supabase
        .from("qualification_wizard_revisions")
        .select("id")
        .eq("wizard_id", wizard.id)
        .eq("revision_number", wizard.current_revision_number)
        .maybeSingle();
      if (!revision) throw new Error("The current qualification revision could not be loaded.");

      const [ruleSet, requirementResult, answerResult, evidenceResult, instructorResult] = await Promise.all([
        supabase.from("qualification_rule_sets").select("display_name").eq("id", wizard.rule_set_id).maybeSingle(),
        supabase
          .from("qualification_requirements")
          .select("id, section_code, requirement_code, title, regulation_citation, required, requires_document, rule_config, display_config, sort_order")
          .eq("rule_set_id", wizard.rule_set_id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("qualification_answers")
          .select("requirement_id, answer_value, automated_result, automated_result_message, instructor_verification_status, examiner_review_status")
          .eq("revision_id", revision.id),
        supabase.from("qualification_evidence").select("requirement_id").eq("revision_id", revision.id),
        supabase.from("qualification_instructor_reviews").select("status, instructor_name, certified_at").eq("revision_id", revision.id).maybeSingle(),
      ]);
      if (requirementResult.error) throw new Error(requirementResult.error.message);

      const requirements = (requirementResult.data ?? []) as Requirement[];
      const answers = new Map(((answerResult.data ?? []) as Answer[]).map((answer) => [answer.requirement_id, answer]));
      const pictures = new Map<string, number>();
      for (const row of evidenceResult.data ?? []) pictures.set(String(row.requirement_id), (pictures.get(String(row.requirement_id)) ?? 0) + 1);
      const byCode = new Map(requirements.map((requirement) => [requirement.requirement_code, requirement]));
      const instructorStatus = (instructorResult.data?.status as string | undefined) ?? null;
      // Pictures are deleted a few days after the test, so a missing picture is only an issue before that.
      const picturesPurged = wizard.status === "closed" || ["completed", "declined", "cancelled", "cancelled_by_applicant", "cancelled_by_examiner", "no_show", "unable_to_accommodate"].includes(String(request.status));

      const rows = requirements
        .slice()
        .sort((a, b) => SECTION_ORDER.indexOf(a.section_code) - SECTION_ORDER.indexOf(b.section_code) || a.sort_order - b.sort_order)
        .map((requirement) => {
          const answer = answers.get(requirement.id);
          const count = pictures.get(requirement.id) ?? 0;
          const { status, note } = classify(requirement, answer, count, answers, byCode, instructorStatus, picturesPurged);
          return { requirement, status, entered: enteredSummary(requirement, answer), pictures: count, note };
        });

      if (active) {
        setReport({
          request,
          wizard,
          instructorReview: (instructorResult.data as Report["instructorReview"]) ?? null,
          ruleSetName: ruleSet.data?.display_name ?? "",
          rows,
        });
      }
    }
    load().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "The report could not be loaded."); });
    return () => { active = false; };
  }, [requestId]);

  if (error) return <main className="mx-auto max-w-4xl p-8 text-red-700">{error}</main>;
  if (!report) return <main className="mx-auto max-w-4xl p-8 text-slate-600">Loading the qualification report…</main>;

  const counts = report.rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {} as Record<Status, number>);
  const sections = SECTION_ORDER.filter((code) => report.rows.some((row) => row.requirement.section_code === code));

  return (
    <main className="report mx-auto max-w-5xl bg-white px-6 py-6 text-slate-900">
      <style>{`
        @page { size: letter; margin: 0.35in; }
        @media print {
          .no-print, aside, header.sticky { display: none !important; }
          body, .bg-slate-100 { background: #fff !important; }
          .lg\\:pl-72 { padding-left: 0 !important; }
          .min-h-screen { min-height: 0 !important; }
          .report { max-width: none; padding: 0; font-size: 9px; }
          .report h1 { font-size: 15px; }
          .report td, .report th { padding-top: 1.5px !important; padding-bottom: 1.5px !important; }
          .report svg { width: 11px; height: 11px; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-4 flex justify-end gap-2">
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Print</button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Validate Qualifications</p>
          <h1 className="mt-1 text-2xl font-bold">{report.request.applicant_name_snapshot}</h1>
          <p className="text-sm text-slate-700">
            {report.request.request_number} · {report.ruleSetName || `${report.request.certificate_sought ?? ""} — ${report.request.rating_sought ?? ""}`}
          </p>
        </div>
        <div className="text-right text-sm text-slate-700">
          <p><strong>Test:</strong> {formatDate(report.request.scheduled_start_at, true)}{report.request.scheduled_location ? ` · ${report.request.scheduled_location}` : ""}</p>
          <p><strong>Submitted:</strong> {formatDate(report.wizard.applicant_submitted_at, true)}</p>
          <p><strong>Instructor:</strong> {report.instructorReview?.instructor_name ?? report.wizard.instructor_name ?? "—"}{report.instructorReview?.certified_at ? ` (certified ${formatDate(report.instructorReview.certified_at)})` : ""}</p>
          <p><strong>Status:</strong> {report.wizard.status.replaceAll("_", " ")}{report.wizard.accepted_at ? ` · accepted ${formatDate(report.wizard.accepted_at)}` : ""}</p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <span className="flex items-center gap-1.5"><Icon status="pass" /> {counts.pass ?? 0} pass</span>
        <span className="flex items-center gap-1.5"><Icon status="check" /> {counts.check ?? 0} check manually</span>
        <span className="flex items-center gap-1.5"><Icon status="issue" /> {counts.issue ?? 0} known issue{(counts.issue ?? 0) === 1 ? "" : "s"}</span>
        {counts.na ? <span className="flex items-center gap-1.5"><Icon status="na" /> {counts.na} not applicable</span> : null}
      </div>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-400 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <th className="w-6 py-1"></th>
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2">Entered</th>
            <th className="w-10 py-1 pr-2 text-center">Pics</th>
            <th className="py-1">Issue / check</th>
          </tr>
        </thead>
        {sections.map((section) => (
          <tbody key={section}>
            <tr>
              <td colSpan={5} className="bg-slate-100 px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{SECTION_NAMES[section] ?? section}</td>
            </tr>
            {report.rows.filter((row) => row.requirement.section_code === section).map((row) => (
              <tr key={row.requirement.id} className="border-b border-slate-200 align-top">
                <td className="py-1"><Icon status={row.status} /></td>
                <td className="py-1 pr-2">
                  <span className="font-semibold">{row.requirement.title}</span>
                  {row.requirement.regulation_citation ? <span className="ml-1 text-slate-500">{row.requirement.regulation_citation}</span> : null}
                </td>
                <td className="py-1 pr-2 text-slate-700">{row.entered || "—"}</td>
                <td className="py-1 pr-2 text-center">{row.pictures || "—"}</td>
                <td className={`py-1 ${row.status === "issue" ? "font-semibold text-red-700" : row.status === "check" ? "text-amber-800" : "text-slate-500"}`}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <p className="mt-3 text-[10px] text-slate-500">
        Green: passes the automatic checks (and has its picture). Yellow: the system can&apos;t verify it — check it against the pictures or records.
        Red: a known issue, shown at right. Generated {formatDate(new Date().toISOString(), true)}.
      </p>
    </main>
  );
}

export default function ValidateQualificationsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-8 text-slate-600">Loading…</main>}>
      <ReportContent />
    </Suspense>
  );
}
