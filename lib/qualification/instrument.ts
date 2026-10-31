import catalog from "@/data/instrument-qualification.json";

export type QualificationField = {
  key: string; label?: string; type?: string; options?: string[];
  placeholder?: string; optional?: boolean; columns?: QualificationField[];
};
export type Values = Record<string, string | boolean>;
export const instrumentRequirements = catalog;
export const INSTRUMENT_RULE_SET_ID = "7a100000-0000-4000-8000-000000000000";
export const PREVIEW_KEY = "dpe-instrument-qualification-preview-v1";
export function parseEntries(value: unknown): Record<string, string>[] {
  try {
    const rows = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object" && !Array.isArray(row)) : [];
  } catch { return []; }
}
export function fieldsComplete(fields: QualificationField[], values: Values): boolean {
  return fields.every((field) => {
    if (field.optional) return true;
    const value = values[field.key];
    if (field.type === "checkbox") return value === true;
    if (field.type === "yes_no") return typeof value === "boolean";
    if (field.type === "entries") {
      const rows = parseEntries(value);
      return rows.length > 0 && rows.every((row) => fieldsComplete(field.columns ?? [], row));
    }
    if (field.type === "number") return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
    if (field.type === "date") return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    return typeof value === "string" && value.trim() !== "";
  });
}
export function instrumentResult(code: string, values: Values, appointment: string | null, all: Record<string, Values> = {}) {
  const failed = (message: string) => ({ automated_result: "does_not_meet", automated_result_message: message });
  const review = (message = "Entered values saved. Source records and eligibility require instructor/examiner review.") => ({ automated_result: "manual_review", automated_result_message: message });
  const definition = catalog.find((row) => row.requirement_code === code);
  if (!definition) return review();
  if (code === "IR_NAME_COMPARISON") {
    const a = String(all.IR_ID?.legal_name ?? "").trim().toLowerCase();
    const b = String(all.IR_CERTIFICATE?.legal_name ?? "").trim().toLowerCase();
    return review(a && b ? a === b ? "Entered names match. Source identification still requires review." : "Entered names differ. Examiner review required." : "Save identification and certificate names to compare them.");
  }
  if (!fieldsComplete(definition.display_config.fields, values)) return failed("Complete every required field with a valid value.");
  const number = (key: string) => Number(values[key]);
  const date = appointment ? new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(appointment)) : "";
  const start = (months: number) => {
    const [y, m] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 - months, 1)).toISOString().slice(0, 10);
  };
  if (code === "IR_PATHWAY" && (!["Part 61", "Part 141 Graduate"].includes(String(values.training_basis)) || values.existing_instrument !== false || values.concurrent_private !== false)) return failed("This package covers initial Part 61 Instrument Airplane applicants. Select the appropriate separate pathway for this application.");
  if (code === "IR_PATHWAY" && values.training_basis === "Part 141 Graduate") {
    if (!fieldsComplete([{key:"graduation_date",type:"date"}], values)) return failed("Enter a valid Date of Graduation.");
    if (String(values.graduation_date) > qualificationToday()) return failed("Date of Graduation cannot be in the future.");
    if (graduationDateFlag(values)) return review(graduationDateFlag(values)!);
  }
  if (code === "IR_CERTIFICATE_PREREQUISITE" && values.certificate_level === "Other / Concurrent Application") return failed("A concurrent or other certificate application needs the appropriate separate qualification pathway.");
  if (code === "IR_ENGLISH" && values.value !== true) return review("English-language eligibility requires examiner review.");
  if (code === "IR_PIC_XC" && (number("hours") < 50 || number("airplane_hours") < 10 || number("airplane_hours") > number("hours"))) return failed("Enter at least 50 qualifying PIC cross-country hours, with at least 10 in airplanes. Airplane hours cannot exceed the total.");
  if (code === "IR_INSTRUMENT_TOTAL" && number("actual_hours") + number("simulated_hours") + number("device_hours") < 40) return failed("At least 40 qualifying actual or simulated instrument hours are required, including allowable device credit.");
  if (code === "IR_INSTRUCTOR_TIME" && number("hours") < 15) return failed("At least 15 qualifying instrument-training hours with an authorized instrument-airplane instructor are required.");
  if (code === "IR_RECENT_TRAINING") {
    const rows = parseEntries(values.entries);
    if (date && rows.some((row) => row.date < start(2) || row.date > date)) return failed("Every claimed preparation entry must be within 2 calendar months before the practical-test date.");
    if (rows.reduce((sum, row) => sum + Number(row.hours), 0) < 3) return failed("At least 3 instrument flight-training hours in an appropriate airplane are required.");
  }
  if (code === "IR_KNOWLEDGE_TEST" && (number("score") < 70 || number("score") > 100 || (date && (String(values.test_date) > date || String(values.test_date) < start(24))))) return failed("Knowledge-test score must be 70–100 and the test must be within the applicable 24-calendar-month period, no later than the practical test.");
  if (code === "IR_LONG_XC" && (number("logged_distance_nm") < 250 || values.ifr !== true || values.filed !== true)) return failed("The qualifying flight must be at least 250 NM along airways or ATC-directed routing, under IFR with a flight plan filed with ATC.");
  if (code === "IR_LONG_XC") return review("Entered flight details saved. Instructor/examiner must verify the route, an approach at each airport, and three different kinds of approaches.");
  if (code === "IR_TRAINING_AREAS" && (values.ground_training !== true || values.flight_training !== true)) return failed("Required ground and flight training must be completed.");
  if (code.startsWith("IR_ENDORSEMENT_") && date && String(values.endorsement_date) > date) return failed("Endorsement date cannot be after the practical test.");
  // Do not impose a two-month expiration on the knowledge-test or recommendation endorsement itself.
  if (code === "IR_DEVICE_CREDIT") {
    const rows = parseEntries(values.entries);
    const total = rows.reduce((sum, row) => sum + Number(row.hours), 0);
    const batd = rows.filter((row) => row.device_type === "BATD").reduce((sum, row) => sum + Number(row.hours), 0);
    const part142 = rows.some((row) => ["FTD", "FFS"].includes(row.device_type) && row.part142 === "Yes");
    if (batd > 10 || total > 30 || (!part142 && total > 20)) return failed("Claimed device time exceeds the applicable limit. Review BATD, combined credit, and Part 142 eligibility.");
    if (all.IR_INSTRUMENT_TOTAL && total !== Number(all.IR_INSTRUMENT_TOTAL.device_hours)) return failed("Device-entry hours must match device hours claimed in the instrument-time total.");
    return review("Device hours require review of FAA approvals, authorized instruction, tasks, and combined credit limits.");
  }
  return review();
}

// Every applicant requirement card takes pictures or PDFs (Kele, Oct 30), and each one needs at least one.
// No upload: computed checks, the applicant and instructor certifications (signatures),
// the Part 61 pathway (nothing to photograph), and any requirement whose rule_config says evidence "none".
export const EVIDENCE_RETENTION_DAYS = 3;
// Requests cancelled or declined: pictures are deleted this many days later.
export const CLOSED_EVIDENCE_RETENTION_DAYS = 10;
const NO_EVIDENCE_CODES = new Set(["IR_APPLICANT_CERTIFICATION", "IR_INSTRUCTOR_CERTIFICATION", "APPLICANT_CERTIFICATION", "INSTRUCTOR_CERTIFICATION"]);
const NO_EVIDENCE_TYPES = new Set(["computed", "instructor_certification", "typed_signature"]);
export function supportsQualificationEvidence(requirement: { requirement_code: string; requires_document?: boolean; rule_config: Record<string, unknown> }, values: Record<string, unknown> = {}): boolean {
  if (requirement.rule_config.evidence === "none") return false;
  if (NO_EVIDENCE_TYPES.has(String(requirement.rule_config.answer_type ?? ""))) return false;
  if (NO_EVIDENCE_CODES.has(requirement.requirement_code)) return false;
  if (requirement.requirement_code === "IR_PATHWAY") return values.training_basis === "Part 141 Graduate";
  return true;
}

// What to photograph for each card.
export function evidenceInstruction(requirement: { requirement_code: string; section_code?: string; rule_config: Record<string, unknown> }): string {
  const code = requirement.requirement_code;
  const custom = requirement.rule_config.evidence_instruction;
  if (typeof custom === "string" && custom.trim()) return custom;
  if (code === "IR_PATHWAY") return "Required: upload a copy of your Part 141 graduation certificate.";
  if (code === "IR_ID" || code === "IDENTITY_ID_NAME") return "Required: take a picture of the front of your government-issued photo ID.";
  if (code === "IR_CERTIFICATE" || code === "IDENTITY_PILOT_CERTIFICATE_NAME" || code === "IR_CERTIFICATE_PREREQUISITE") return "Required: take pictures of the front and back of your pilot certificate (or student pilot certificate).";
  if (code === "ELIGIBILITY_AGE") return "Required: a picture of your ID showing your date of birth. You can use your existing ID upload.";
  if (code.endsWith("ENGLISH")) return "Required: a picture of your pilot certificate showing \"English Proficient\". You can use your existing certificate upload.";
  if (code.includes("KNOWLEDGE_TEST")) return "Required: a picture or PDF of your Airman Knowledge Test Report.";
  if (code.includes("APPLICATION")) return "Required: a picture or PDF of your IACRA application summary.";
  if (code.includes("MEDICAL")) return "Required: pictures of the front and back of your medical certificate. For BasicMed, your Comprehensive Medical Examination Checklist and course completion certificate.";
  if (code.includes("DEVICE")) return "Required: the logbook pages showing the device time, with the instructor's signature.";
  if (requirement.section_code === "endorsements" || code.includes("ENDORSEMENT")) return "Required: a picture of the endorsement in your logbook.";
  if (requirement.section_code === "experience" || requirement.section_code === "cross_country") return "Required: pictures of the logbook pages that show these entries.";
  return "Required: a picture or PDF of the document or logbook pages for this requirement.";
}

export function qualificationToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Pacific/Honolulu",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function graduationDateFlag(values: Record<string, unknown>, today = qualificationToday()): string | null {
  if (values.training_basis !== "Part 141 Graduate" || !values.graduation_date) return null;
  const age = (Date.parse(today) - Date.parse(String(values.graduation_date))) / 86400000;
  return age > 60 ? "Date of Graduation is more than 60 days ago. Examiner review required." : null;
}
