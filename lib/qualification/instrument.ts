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

export function supportsQualificationEvidence(requirement: { requirement_code: string; requires_document: boolean; rule_config: Record<string, unknown> }, values: Record<string, unknown> = {}): boolean {
  if (requirement.requirement_code === "IR_PATHWAY") return values.training_basis === "Part 141 Graduate";
  if (["IR_ENGLISH", "IR_APPLICANT_CERTIFICATION", "IR_INSTRUCTOR_CERTIFICATION"].includes(requirement.requirement_code)) return false;
  if (requirement.requirement_code === "IR_MEDICAL" && ["BasicMed", "Other / Examiner Review"].includes(String(values.qualification_type))) return false;
  return Boolean(requirement.requires_document || requirement.rule_config.instrument_rule);
}

export function qualificationToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Pacific/Honolulu",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function graduationDateFlag(values: Record<string, unknown>, today = qualificationToday()): string | null {
  if (values.training_basis !== "Part 141 Graduate" || !values.graduation_date) return null;
  const age = (Date.parse(today) - Date.parse(String(values.graduation_date))) / 86400000;
  return age > 60 ? "Date of Graduation is more than 60 days ago. Examiner review required." : null;
}
