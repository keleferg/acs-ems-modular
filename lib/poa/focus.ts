/*
 * POA focus areas (Kele, Nov 11 2026): each request's POA leans into the applicant's weak areas.
 * Sources, in order of weight:
 *   - knowledge test: ACS codes missed on the airman knowledge test report
 *   - retest: Tasks graded unsatisfactory on the applicant's previous attempt
 *   - instructor / school / state: Tasks that tests with the same instructor, flight school or
 *     US state (of the test airport) often grade 1 or 2
 * Trends need enough tests behind them so one bad checkride doesn't label a school.
 * The template stays the backbone: a focus area already covered by the script just gets tagged;
 * otherwise one question for it is added in the event set where that Task already comes up.
 */

export type FocusSource = "knowledge_test" | "retest" | "instructor" | "school" | "state";

export const FOCUS_SOURCE_LABEL: Record<FocusSource, string> = {
  knowledge_test: "Knowledge test",
  retest: "Previous attempt",
  instructor: "Instructor trend",
  school: "School trend",
  state: "State trend",
};

export type FocusArea = {
  source: FocusSource;
  /** Element code ("PA.I.D.K3C") for knowledge-test codes, Task code ("PA.X.D") otherwise. */
  code: string;
  /** K, R or S for trends; K for knowledge-test codes. */
  component: "K" | "R" | "S" | null;
  /** Plain words for the summary box, e.g. "5 of 12 tests graded 1 or 2". */
  detail: string;
};

/** Trends count only with at least this many graded tests in the group. */
export const MIN_TREND_TESTS = 5;
/** …and when at least this share of them graded the Task 1 or 2. */
export const MIN_TREND_RATE = 0.25;
const MIN_TREND_COUNT = 2;
const MAX_TREND_AREAS_PER_SOURCE = 3;

/** ACS document prefix (PA, CA, IR, AA, AI, PH, CH, IH, HI) for a request's certificate. */
export function acsPrefixFor(certificate: unknown, category: unknown, rating: unknown): string {
  const cert = String(certificate ?? "").toLowerCase();
  const text = `${cert} ${String(category ?? "")} ${String(rating ?? "")}`.toLowerCase();
  const heli = text.includes("helicopter") || text.includes("rotorcraft");
  if (cert.includes("instructor") || cert === "cfi") {
    if (text.includes("instrument")) return "";
    return heli ? "HI" : "AI";
  }
  if (cert.includes("airline") || cert === "atp") return "AA";
  if (cert.includes("instrument")) return heli ? "IH" : "IR";
  if (cert.includes("commercial")) return heli ? "CH" : "CA";
  if (cert.includes("private")) return heli ? "PH" : "PA";
  return "";
}

/**
 * "PA. Ill. B. K1" / "pa.ill.b.k1" → "PA.III.B.K1". Knowledge test reports are often scanned,
 * so a lowercase l or 1 in the Area numeral is read as I.
 */
export function normalizeElementCode(raw: string): string | null {
  const parts = raw.toUpperCase().replace(/\s+/g, "").split(".").filter(Boolean);
  if (parts.length < 3) return null;
  const [prefix, area, task, ...rest] = parts;
  if (!/^[A-Z]{2}$/.test(prefix)) return null;
  const roman = area.replace(/[L1]/g, "I");
  if (!/^[IVX]+$/.test(roman) || !/^[A-Z]$/.test(task)) return null;
  return [prefix, roman, task, ...rest].join(".");
}

/** "X_D" or "PA.X.D" → "X.D" (Area.Task without the ACS prefix). */
export function normalizeTaskCode(code: string): string {
  const parts = code.toUpperCase().replace(/_/g, ".").split(".").filter(Boolean);
  if (parts.length >= 3 && /^[A-Z]{1,2}$/.test(parts[0]) && /^[IVXL]+$/.test(parts[1])) parts.shift();
  return parts.slice(0, 2).join(".");
}

export const taskOf = (code: string) => code.split(".").slice(0, 3).join(".");
const areaOf = (code: string) => code.split(".").slice(0, 2).join(".");

export function knowledgeTestAreas(missedCodes: string[], prefix: string): FocusArea[] {
  const seen = new Set<string>();
  const areas: FocusArea[] = [];
  for (const raw of missedCodes) {
    const code = normalizeElementCode(raw);
    if (!code || (prefix && !code.startsWith(`${prefix}.`)) || seen.has(code)) continue;
    seen.add(code);
    areas.push({ source: "knowledge_test", code, component: "K", detail: "Missed on the knowledge test" });
  }
  return areas;
}

export type GradeRow = { testId: string; taskCode: string; component: string; value: string };

/** Tasks graded 1 (unsatisfactory) on a previous attempt. */
export function retestAreas(grades: GradeRow[], prefix: string): FocusArea[] {
  const seen = new Set<string>();
  const areas: FocusArea[] = [];
  for (const grade of grades) {
    if (grade.value !== "1") continue;
    const code = `${prefix}.${normalizeTaskCode(grade.taskCode)}`;
    const key = `${code}:${grade.component}`;
    if (seen.has(key)) continue;
    seen.add(key);
    areas.push({
      source: "retest",
      code,
      component: (["K", "R", "S"].includes(grade.component) ? grade.component : null) as FocusArea["component"],
      detail: "Unsatisfactory on the previous attempt",
    });
  }
  return areas;
}

/** Tasks a group of tests (one instructor, school or state) often grades 1 or 2. */
export function trendAreas(source: FocusSource, grades: GradeRow[], prefix: string, groupLabel: string): FocusArea[] {
  const tests = new Set(grades.map((grade) => grade.testId));
  if (tests.size < MIN_TREND_TESTS) return [];
  const byTask = new Map<string, { graded: Set<string>; weak: Set<string>; component: string }>();
  for (const grade of grades) {
    if (!["1", "2", "3", "4"].includes(grade.value)) continue;
    const key = `${normalizeTaskCode(grade.taskCode)}:${grade.component}`;
    const entry = byTask.get(key) ?? { graded: new Set(), weak: new Set(), component: grade.component };
    entry.graded.add(grade.testId);
    if (grade.value === "1" || grade.value === "2") entry.weak.add(grade.testId);
    byTask.set(key, entry);
  }
  return [...byTask.entries()]
    .map(([key, entry]) => ({ task: key.split(":")[0], ...entry, rate: entry.weak.size / entry.graded.size }))
    .filter((entry) => entry.weak.size >= MIN_TREND_COUNT && entry.rate >= MIN_TREND_RATE)
    .sort((a, b) => b.rate - a.rate || b.weak.size - a.weak.size)
    .slice(0, MAX_TREND_AREAS_PER_SOURCE)
    .map((entry) => ({
      source,
      code: `${prefix}.${entry.task}`,
      component: (["K", "R", "S"].includes(entry.component) ? entry.component : null) as FocusArea["component"],
      detail: `${entry.weak.size} of ${entry.graded.size} tests ${groupLabel} graded 1 or 2`,
    }));
}

/* ---------- Putting focus areas into the POA ---------- */

export type FocusBankQuestion = { id: string; references: string[]; isTrigger?: boolean };
export type FocusSequenceItem = { id: string; event_set_id: string; parent_item_id: string | null; question_id: string | null; references: string[] };

export type FocusPlan = {
  /** Existing sequence items (by id) that already cover a focus area, with the sources that apply. */
  tagged: Record<string, FocusSource[]>;
  /** Questions to add: placed right after the chain of `afterItemId`, in its event set. */
  added: Array<{ questionId: string; eventSetId: string; afterItemId: string | null; sources: FocusSource[] }>;
  /** Focus areas with no question in the bank (still listed for the examiner). */
  uncovered: FocusArea[];
};

const MAX_ADDED_QUESTIONS = 10;

function splitElement(code: string) {
  const match = code.match(/^([A-Z]{2}\.[IVX]+\.[A-Z])\.([KRS])(\d+)([A-Z]?)$/);
  return match ? { task: match[1], kind: match[2], number: match[3], letter: match[4] } : null;
}

const matches = (reference: string, area: FocusArea) => {
  const ref = reference.trim().toUpperCase();
  if (area.source === "knowledge_test") {
    // Same Task and element number; a sub-letter (K3c) only has to match when both have one.
    const [a, b] = [splitElement(ref), splitElement(area.code)];
    if (!a || !b || a.task !== b.task || a.kind !== b.kind || a.number !== b.number) return false;
    return !a.letter || !b.letter || a.letter === b.letter;
  }
  if (!ref.startsWith(`${area.code}.`)) return false;
  // A skill weakness is asked about through the Task's knowledge and risk elements.
  if (!area.component || area.component === "S") return true;
  return ref.slice(area.code.length + 1).startsWith(area.component);
};

/**
 * Decide which script items already cover each focus area and which questions to add.
 * Knowledge-test codes are matched to the element (K3 covers K3a); trends to the Task.
 */
export function planFocus(
  areas: FocusArea[],
  sequence: FocusSequenceItem[],
  bank: FocusBankQuestion[],
  random: () => number = Math.random,
): FocusPlan {
  const tagged: Record<string, FocusSource[]> = {};
  const added: FocusPlan["added"] = [];
  const uncovered: FocusArea[] = [];
  const used = new Set(sequence.map((item) => item.question_id).filter(Boolean) as string[]);
  const addedFor = new Map<string, FocusPlan["added"][number]>();
  const byId = new Map(sequence.map((item) => [item.id, item]));
  const rootOf = (item: FocusSequenceItem) => {
    let current = item;
    while (current.parent_item_id && byId.get(current.parent_item_id)) current = byId.get(current.parent_item_id)!;
    return current;
  };
  // Heaviest sources first, so the 10-question cap keeps knowledge-test and retest areas.
  const order: FocusSource[] = ["knowledge_test", "retest", "instructor", "school", "state"];
  const sorted = [...areas].sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source));

  for (const area of sorted) {
    const covering = sequence.filter((item) => item.references.some((ref) => matches(ref, area)));
    if (covering.length) {
      for (const item of covering) {
        const list = (tagged[item.id] ??= []);
        if (!list.includes(area.source)) list.push(area.source);
      }
      continue;
    }
    const already = [...addedFor.values()].find((entry) => bank.find((q) => q.id === entry.questionId)?.references.some((ref) => matches(ref, area)));
    if (already) {
      if (!already.sources.includes(area.source)) already.sources.push(area.source);
      continue;
    }
    if (added.length >= MAX_ADDED_QUESTIONS) continue;
    const candidates = bank.filter((q) => !q.isTrigger && !used.has(q.id) && q.references.some((ref) => matches(ref, area)));
    if (!candidates.length) {
      uncovered.push(area);
      continue;
    }
    const pick = candidates[Math.floor(random() * candidates.length)] ?? candidates[0];
    used.add(pick.id);
    // Put it where the script already talks about this Task, else this Area, else at the end.
    const task = taskOf(area.code);
    const area2 = areaOf(area.code);
    const near =
      [...sequence].reverse().find((item) => item.references.some((ref) => taskOf(ref.toUpperCase()) === task)) ??
      [...sequence].reverse().find((item) => item.references.some((ref) => areaOf(ref.toUpperCase()) === area2)) ??
      [...sequence].reverse().find((item) => item.event_set_id);
    const anchor = near ? rootOf(near) : null;
    const entry = { questionId: pick.id, eventSetId: anchor?.event_set_id ?? near?.event_set_id ?? "", afterItemId: anchor?.id ?? null, sources: [area.source] };
    added.push(entry);
    addedFor.set(pick.id, entry);
  }
  return { tagged, added, uncovered };
}

/**
 * The end of an item's chain: the last later item whose ancestry reaches it. Added questions go
 * after the whole chain so follow-ups stay with their question.
 */
export function chainEndIndex<T extends { id: string; parent_item_id: string | null }>(sequence: T[], rootId: string): number {
  const start = sequence.findIndex((item) => item.id === rootId);
  if (start < 0) return sequence.length - 1;
  const inChain = new Set([rootId]);
  let end = start;
  for (let i = start + 1; i < sequence.length; i += 1) {
    const parent = sequence[i].parent_item_id;
    if (parent && inChain.has(parent)) {
      inChain.add(sequence[i].id);
      end = i;
    } else break;
  }
  return end;
}
