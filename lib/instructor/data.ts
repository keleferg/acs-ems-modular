import { createClient } from "@/lib/supabase/client";

// Instructor portal data (Kele, Oct 31 2026). Students are the requests whose recommending-instructor
// CFI certificate number matches the signed-in instructor's (database functions instructor_my_*).

export type StudentRequest = {
  id: string;
  request_number: string;
  applicant_name: string | null;
  certificate_sought: string | null;
  rating_sought: string | null;
  status: string;
  submitted_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
  completed_at: string | null;
  examiner_name: string | null;
  wizard_id: string | null;
  wizard_status: string | null;
  test_result: string | null;
  test_completed_at: string | null;
};

export type StudentGrade = {
  practical_test_id: string;
  request_id: string;
  certificate_sought: string | null;
  rating_sought: string | null;
  result: string | null;
  completed_at: string | null;
  task_code: string | null;
  grade_component: string | null;
  grade_value: string | null;
};

export async function loadStudentRequests() {
  const { data, error } = await createClient().rpc("instructor_my_requests");
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentRequest[];
}

export async function loadStudentGrades() {
  const { data, error } = await createClient().rpc("instructor_my_grades");
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentGrade[];
}

export const CONFIRMED_STATUSES = new Set(["confirmed", "scheduled"]);
export const CLOSED_STATUSES = new Set(["completed", "declined", "cancelled", "cancelled_by_applicant", "cancelled_by_examiner", "unable_to_accommodate"]);

const REQUEST_STATUS_LABELS: Record<string, string> = {
  under_review: "Under review",
  awaiting_applicant_information: "Waiting on applicant",
  accepted: "Accepted",
  scheduling: "Scheduling",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  cancelled_by_applicant: "Cancelled by applicant",
  cancelled_by_examiner: "Cancelled by examiner",
  unable_to_accommodate: "Unable to accommodate",
};

export function requestStatusLabel(status: string) {
  return REQUEST_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function requestStatusClasses(status: string) {
  if (CONFIRMED_STATUSES.has(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "completed") return "border-slate-200 bg-slate-100 text-slate-700";
  if (CLOSED_STATUSES.has(status)) return "border-red-200 bg-red-50 text-red-700";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

const QUALIFICATION_LABELS: Record<string, string> = {
  not_available: "Not open yet",
  available: "Open — not started",
  applicant_in_progress: "Student working on it",
  awaiting_instructor: "Waiting for your review",
  instructor_changes_required: "Sent back for changes",
  instructor_certified: "You certified it",
  examiner_review: "With the examiner",
  deficiencies_found: "Examiner found issues",
  accepted: "Accepted by examiner",
  closed: "Closed",
};

export function qualificationLabel(status: string | null) {
  if (!status) return "Not created yet";
  return QUALIFICATION_LABELS[status] ?? status.replaceAll("_", " ");
}

export function resultLabel(result: string | null) {
  if (!result) return "—";
  if (result === "pass") return "Pass";
  if (result === "fail") return "Fail";
  if (result === "discontinued") return "Discontinued";
  return result;
}

export function testName(row: { certificate_sought: string | null; rating_sought: string | null }) {
  return [row.certificate_sought, row.rating_sought].filter(Boolean).join(" — ") || "Practical test";
}

export function formatHst(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export function hstDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
