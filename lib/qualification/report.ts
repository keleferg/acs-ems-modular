import type { createClient } from "@/lib/supabase/client";

import { supportsQualificationEvidence } from "@/lib/qualification/instrument";
import { legsSummary } from "@/lib/qualification/legs";

// The qualification report data (Kele, Oct 31 2026): used by the Validate Qualifications page and the
// downloadable PDF summary. Every item gets pass / check / issue / na with a short note.

export type Status = "pass" | "check" | "issue" | "na";

export type Requirement = {
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

export type Answer = {
  requirement_id: string;
  answer_value: Record<string, unknown>;
  automated_result: string | null;
  automated_result_message: string | null;
  instructor_verification_status: string | null;
  examiner_review_status: string | null;
};

export type Row = { requirement: Requirement; status: Status; entered: string; pictures: number; note: string };

export type Report = {
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

export const SECTION_ORDER = ["identity", "eligibility", "knowledge_test", "application", "medical", "experience", "cross_country", "endorsements", "certification"];
export const SECTION_NAMES: Record<string, string> = {
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

export function formatDate(value: string | null | undefined, withTime = false) {
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
    if (instructorStatus === "waived") return { status: "pass", note: "Skipped by the examiner" };
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


/** Everything the report is built from, as stored in qualification_report_snapshots.source. */
export type ReportSource = {
  request: Report["request"];
  wizard: Report["wizard"] & { rule_set_id?: string; id?: string };
  ruleSetName: string | null;
  requirements: Requirement[];
  answers: Answer[];
  pictures: Record<string, number>;
  instructorReview: Report["instructorReview"];
  snapshotAt?: string;
};

export function buildReport(source: ReportSource): Report & { storedAt: string | null } {
  const requirements = source.requirements ?? [];
  const answers = new Map((source.answers ?? []).map((answer) => [answer.requirement_id, answer]));
  const byCode = new Map(requirements.map((requirement) => [requirement.requirement_code, requirement]));
  const instructorStatus = source.instructorReview?.status ?? null;
  // Pictures are deleted a few days after the test, so a missing picture is only an issue before that.
  const picturesPurged =
    source.wizard.status === "closed" ||
    ["completed", "declined", "cancelled", "cancelled_by_applicant", "cancelled_by_examiner", "no_show", "unable_to_accommodate"].includes(String(source.request.status));

  const rows = requirements
    .slice()
    .sort((a, b) => SECTION_ORDER.indexOf(a.section_code) - SECTION_ORDER.indexOf(b.section_code) || a.sort_order - b.sort_order)
    .map((requirement) => {
      const answer = answers.get(requirement.id);
      const count = Number(source.pictures?.[requirement.id] ?? 0);
      const { status, note } = classify(requirement, answer, count, answers, byCode, instructorStatus, picturesPurged);
      return { requirement, status, entered: enteredSummary(requirement, answer), pictures: count, note };
    });

  return {
    request: source.request,
    wizard: source.wizard,
    instructorReview: source.instructorReview ?? null,
    ruleSetName: source.ruleSetName ?? "",
    rows,
    storedAt: source.snapshotAt ?? null,
  };
}

type Client = ReturnType<typeof createClient>;

/** The package as it is now. */
export async function loadLiveReportSource(supabase: Client, requestId: string): Promise<ReportSource> {
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
  if (!wizard) throw new Error("This request has no pretest qualification.");

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

  const pictures: Record<string, number> = {};
  for (const row of evidenceResult.data ?? []) pictures[String(row.requirement_id)] = (pictures[String(row.requirement_id)] ?? 0) + 1;

  return {
    request,
    wizard,
    ruleSetName: ruleSet.data?.display_name ?? "",
    requirements: (requirementResult.data ?? []) as Requirement[],
    answers: (answerResult.data ?? []) as Answer[],
    pictures,
    instructorReview: (instructorResult.data as Report["instructorReview"]) ?? null,
  };
}

/**
 * The report for a request: the copy stored when the test was completed (Kele, Oct 31 2026), or the
 * package as it is now when there is no stored copy.
 */
export async function loadQualificationReport(supabase: Client, requestId: string) {
  const { data: stored } = await supabase
    .from("qualification_report_snapshots")
    .select("source")
    .eq("practical_test_request_id", requestId)
    .maybeSingle();
  if (stored?.source) return buildReport(stored.source as ReportSource);
  return buildReport(await loadLiveReportSource(supabase, requestId));
}
