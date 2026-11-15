/*
 * Stage check Ground / Flight Evaluation builder (Kele, Nov 14 2026). Pure logic, no database:
 * app/api/stage-check/evaluation/route.ts loads the data and calls buildStageCheckEvaluation.
 *
 * End of Course Check only (the Presolo check has its own static exam in EMT). Kele's rules:
 *  - Oral questions come from the examiner's library, minus every question used in a DPE POA in the
 *    last 90 days, so students can't preview checkride questions.
 *  - Same size as a DPE POA for that rating (the average generated POA), same structure: event sets in
 *    flight order, questions in flight sequence, the student's knowledge-test ACS codes always covered.
 *  - Flight Tasks in flight order (same event sets as the DPE flight portion), never exactly the order
 *    of any DPE POA, though they can be similar.
 *  - The oral is never the same as any DPE POA's oral.
 */

export type LibraryQuestion = {
  id: string;
  question: string;
  answer: string | null;
  reference: string | null;
  task_name: string | null;
  /** Every ACS code the question is tagged with (acs_reference plus its applicability rows). */
  codes: string[];
};

/** A Task of the stage check. `ground` = an ACS knowledge-only Area (EMT's area phase "ground"). */
export type StageCheckTask = { code: string; name: string; ground?: boolean };

export type DpePoa = {
  id: string;
  questionIds: string[];
  flightTaskCodes: string[];
};

export type StageCheckQuestion = {
  id: string;
  question_library_id: string;
  question_snapshot: string;
  answer_snapshot: string;
  reference_snapshot: string;
  acs_reference_snapshot: string;
  task_name_snapshot: string;
  sequence_stage: string;
  sort_order: number;
  focus_sources: string[];
};

export type StageCheckFlightTask = {
  acs_task_code_snapshot: string;
  task_name_snapshot: string;
  sequence_stage: string;
  sort_order: number;
  is_required: true;
};

export type StageCheckEvaluation = {
  generated_questions: StageCheckQuestion[];
  generated_flight_tasks: StageCheckFlightTask[];
  generated_triggers: [];
  oral_event_sets: string[];
  flight_event_sets: string[];
  written_review: { required: string[]; covered: string[]; missing: string[] };
  target_question_count: number;
};

/* ------------------------------------------------------------------ codes */

const CODE_RE = /\b([A-Za-z]{2,3})\.([IVXivx]+)\.([A-Za-z])(?:\.([KRSkrs])(\d+)([a-zA-Z])?)?\b/g;

/** "PA.I.A.K1; Private Pilot:CA.I.E; PA.I.G.K1e" → ["PA.I.A.K1", "CA.I.E", "PA.I.G.K1e"] */
export function extractCodes(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text ?? "").matchAll(CODE_RE)) {
    const task = `${m[1].toUpperCase()}.${m[2].toUpperCase()}.${m[3].toUpperCase()}`;
    out.add(m[4] ? `${task}.${m[4].toUpperCase()}${m[5]}${(m[6] ?? "").toLowerCase()}` : task);
  }
  return [...out];
}

export function taskOf(code: string): string {
  return code.split(".").slice(0, 3).join(".");
}

/** Knowledge-test code match at element level: K3 covers K3c; K1 doesn't match K10. Task codes match the Task. */
export function codeCovers(questionCode: string, wanted: string): boolean {
  const q = extractCodes(questionCode)[0] ?? questionCode;
  const w = extractCodes(wanted)[0] ?? wanted;
  if (taskOf(q) !== taskOf(w)) return false;
  const we = w.split(".")[3];
  if (!we) return true;
  const qe = q.split(".")[3];
  if (!qe) return false;
  return qe === we || (qe.startsWith(we) && /[a-z]$/i.test(qe) && qe.length === we.length + 1) || (we.startsWith(qe) && we.length === qe.length + 1 && /[a-z]$/i.test(we));
}

/* ------------------------------------------------------------- event sets */

type SetRule = { name: string; match: RegExp; order?: RegExp[] };

/** Flight event sets, same groups as the DPE flight portion (lib/poa flight sequence, Nov 12). */
const VFR_SETS: SetRule[] = [
  {
    name: "Preflight Preparation",
    match: /pilot qualif|certificates and documents|airworthiness|weather information|cross-country flight planning|national airspace|performance and limitations|operation of systems|human factors|aeromedical|water and seaplane|fundamentals of instructing|technical subject|instructor responsibilit|risk management|endorsement|logbook|teaching|evaluation and|lesson plan|aircraft flight instruments|principles of flight|regulations|navigation systems and radar/i,
    order: [/pilot qualif|certificates and documents/i, /airworthiness/i, /weather/i, /cross-country flight planning/i, /national airspace/i, /performance and limitations/i, /operation of systems/i, /human factors|aeromedical/i],
  },
  { name: "Preflight", match: /preflight assessment|flight deck management|cockpit management|engine start|before takeoff|taxiing|sailing|anchoring|docking|ramping|beaching|preflight inspection/i, order: [/preflight assessment|preflight inspection/i, /flight deck|cockpit/i, /engine start/i, /taxi|sailing/i, /before takeoff/i] },
  { name: "First Takeoff and Departure", match: /^communications, light signals|runway incursion|normal (and crosswind )?takeoff|crosswind takeoff/i, order: [/communications|light signals/i, /runway incursion/i, /takeoff/i] },
  { name: "Climb to Cruise / En Route", match: /level turns|straight climbs|straight descents|pilotage|dead reckoning|navigation systems|diversion|lost procedures|attitude instrument|straight-and-level|constant airspeed|turns to headings|recovery from unusual|radio communications, navigation|supplemental oxygen|pressurization|high.altitude/i, order: [/straight-and-level/i, /constant airspeed climb/i, /pilotage/i, /navigation systems|radio communications/i, /diversion/i, /lost/i, /turns to headings/i, /constant airspeed descent/i, /unusual/i] },
  { name: "Maneuvers", match: /slow flight|stall|spin|steep turn|chandelle|lazy eight|maneuvering with one engine|vmc|one engine inoperative|accelerated|demonstration/i, order: [/slow flight/i, /power-off stall/i, /power-on stall/i, /accelerated/i, /spin/i, /steep turn/i, /chandelle/i, /lazy eight/i] },
  { name: "Emergency Procedures", match: /emergency|systems and equipment malfunction|survival|engine failure during flight/i, order: [/emergency descent/i, /emergency approach/i, /malfunction/i, /equipment and survival/i] },
  { name: "Ground Reference", match: /ground reference|eights on pylons|steep spiral|rectangular course|s-turns|turns around a point/i },
  {
    name: "Takeoffs and Landings",
    match: /traffic pattern|short-field|soft-field|confined|glassy|rough water|slip to a landing|power-off 180|landing|go-around|rejected|engine failure (during takeoff|after liftoff)|approach and landing/i,
    order: [/traffic pattern/i, /takeoff/i, /soft-field approach|short-field approach|confined area approach|glassy water approach|rough water approach/i, /slip/i, /power-off 180/i, /engine failure|inoperative engine/i, /go-around|rejected/i, /normal approach and landing/i],
  },
  { name: "After Landing and Postflight", match: /after landing|parking|securing|postflight|seaplane post-landing/i },
];

const IFR_SETS: SetRule[] = [
  { name: "Preflight Preparation", match: /pilot qualif|weather information|cross-country flight planning|aircraft systems related|aircraft flight instruments and navigation equipment|instrument cockpit check|human factors|fundamentals|technical subject|risk management/i },
  { name: "Preflight", match: /instrument (cockpit|flight deck) check|aircraft systems related|aircraft flight instruments and navigation equipment|preflight/i, order: [/aircraft systems/i, /flight instruments and navigation/i, /check/i] },
  { name: "Clearance and Departure", match: /compliance with air traffic control clearances|clearance|departure/i, order: [/compliance/i, /departure/i] },
  { name: "En Route", match: /instrument flight$|attitude instrument|unusual|intercepting and tracking|dme arc|navigation systems|loss of communications|one engine inoperative.*straight|en route/i, order: [/instrument flight$|attitude instrument/i, /intercepting|dme/i, /unusual/i, /loss of communications/i, /one engine/i] },
  { name: "Holding", match: /holding/i },
  { name: "Approaches", match: /approach|missed|circling|landing from an instrument|loss of primary flight instrument/i, order: [/^precision approach/i, /missed/i, /non-?precision/i, /loss of primary|partial panel/i, /inoperative engine/i, /circling/i, /landing from/i] },
  { name: "After Landing and Postflight", match: /postflight|checking instruments and equipment/i },
];

function isInstrument(prefix: string) {
  return ["IR", "IH", "IP", "PI", "IF"].includes(prefix);
}

function setsFor(prefix: string): SetRule[] {
  return isInstrument(prefix) ? IFR_SETS : VFR_SETS;
}

/**
 * Event set for a Task, by name. Knowledge-only Areas (EMT "ground", or Area I) are Preflight
 * Preparation. Postflight and Emergency are checked first so "After Landing…" and "Emergency
 * Approach and Landing" don't fall into Takeoffs and Landings. Unmatched: end of Maneuvers / En Route.
 */
export function eventSetFor(task: StageCheckTask, prefix: string): string {
  const sets = setsFor(prefix);
  if (task.ground || task.code.split(".")[1] === "I") return sets[0].name;
  const first = ["After Landing and Postflight", "Emergency Procedures", "Takeoffs and Landings"];
  const priority = [...first.map((name) => sets.find((r) => r.name === name)).filter((r): r is SetRule => Boolean(r)), ...sets.slice(1).filter((r) => !first.includes(r.name))];
  const hit = priority.find((rule) => rule.match.test(task.name));
  return hit?.name ?? (isInstrument(prefix) ? "En Route" : "Maneuvers");
}

function rankInSet(task: StageCheckTask, prefix: string, setName: string): number {
  const rule = setsFor(prefix).find((r) => r.name === setName);
  const idx = rule?.order?.findIndex((re) => re.test(task.name)) ?? -1;
  return idx === -1 ? 50 : idx;
}

/* ------------------------------------------------------------- randomness */

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------------------------------------------- filters */

/** Questions that only make sense inside a DPE POA's scenario or trigger ("What's happening, and what do you do?"). */
export function isContextDependent(q: LibraryQuestion): boolean {
  const text = q.question.trim();
  if (text.length < 12) return true;
  if (/^(what'?s happening|what do you do\??$|now what|and then\??$|why\??$|explain\.?$)/i.test(text)) return true;
  if (/\b(this trigger|the trigger|as briefed|the scenario says)\b/i.test(text)) return true;
  return !(q.answer ?? "").trim();
}

function normText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ build */

export type BuildInput = {
  tasks: StageCheckTask[];
  writtenCodes: string[];
  library: LibraryQuestion[];
  /** Library question IDs used in a DPE POA in the last 90 days. */
  recentlyUsedIds: Set<string>;
  /** Every DPE POA (any age) for the uniqueness checks. */
  dpePoas: DpePoa[];
  /** Average DPE POA size for this rating (0 when unknown). */
  dpeAverageQuestionCount: number;
  rng?: Rng;
};

export function buildStageCheckEvaluation(input: BuildInput): StageCheckEvaluation {
  const rng = input.rng ?? Math.random;
  const tasks = input.tasks.filter((t) => /^[A-Z]{2,3}\.[IVX]+\.[A-Z]$/.test(t.code));
  const prefix = tasks[0]?.code.split(".")[0] ?? "PA";
  const taskCodes = new Set(tasks.map((t) => t.code));
  const taskByCode = new Map(tasks.map((t) => [t.code, t]));

  // Pool: active library questions tagged with one of this stage check's Tasks.
  const seenText = new Set<string>();
  const pool: (LibraryQuestion & { taskCodes: string[]; prefixCodes: string[] })[] = [];
  for (const q of input.library) {
    if (isContextDependent(q)) continue;
    const prefixCodes = q.codes.filter((c) => c.startsWith(`${prefix}.`) && taskCodes.has(taskOf(c)));
    if (!prefixCodes.length) continue;
    const key = normText(q.question);
    if (seenText.has(key)) continue;
    seenText.add(key);
    pool.push({ ...q, prefixCodes, taskCodes: [...new Set(prefixCodes.map(taskOf))] });
  }
  const fresh = pool.filter((q) => !input.recentlyUsedIds.has(q.id));

  const target = Math.max(
    tasks.length,
    Math.min(fresh.length, Math.round(input.dpeAverageQuestionCount > 0 ? input.dpeAverageQuestionCount : 118)),
  );

  const picked = new Map<string, { q: (typeof pool)[number]; focus: string[] }>();
  const pick = (q: (typeof pool)[number], focus: string[] = []) => {
    const existing = picked.get(q.id);
    if (existing) {
      existing.focus = [...new Set([...existing.focus, ...focus])];
      return;
    }
    picked.set(q.id, { q, focus });
  };

  // 1. The student's knowledge-test codes: up to 2 questions each, fresh first, then any library question.
  const written = [...new Set(input.writtenCodes.flatMap(extractCodes))].filter((c) => c.startsWith(`${prefix}.`));
  const covered: string[] = [];
  for (const code of written) {
    const matches = (list: typeof pool) => shuffle(list.filter((q) => q.prefixCodes.some((qc) => codeCovers(qc, code))), rng);
    const choice = [...matches(fresh), ...matches(pool.filter((q) => input.recentlyUsedIds.has(q.id)))].slice(0, 2);
    choice.forEach((q) => pick(q, ["knowledge_test"]));
    if (choice.length) covered.push(code);
  }

  // 2. Every Task gets at least one question (fresh only).
  const freshByTask = new Map<string, typeof pool>();
  for (const q of shuffle(fresh, rng)) {
    for (const t of q.taskCodes) {
      if (!freshByTask.has(t)) freshByTask.set(t, []);
      freshByTask.get(t)!.push(q);
    }
  }
  for (const t of tasks) {
    const already = [...picked.values()].some((p) => p.q.taskCodes.includes(t.code));
    if (!already) {
      const q = freshByTask.get(t.code)?.find((x) => !picked.has(x.id));
      if (q) pick(q);
    }
  }

  // 3. Fill to the DPE size, round-robin across Tasks so no Task dominates.
  const order = shuffle(tasks.map((t) => t.code), rng);
  let guard = 0;
  while (picked.size < target && guard++ < target * 50) {
    let added = false;
    for (const t of order) {
      if (picked.size >= target) break;
      const q = freshByTask.get(t)?.find((x) => !picked.has(x.id));
      if (q) {
        pick(q);
        added = true;
      }
    }
    if (!added) break;
  }

  // Order: event set (flight order) → Task rank in its set → ACS order → questions within a Task shuffled.
  const setNames = setsFor(prefix).map((s) => s.name);
  const primaryTask = (q: (typeof pool)[number]) =>
    q.taskCodes.slice().sort((a, b) => acsSortKey(a).localeCompare(acsSortKey(b)))[0];
  const oral = shuffle([...picked.values()], rng)
    .map(({ q, focus }) => {
      const code = primaryTask(q);
      const task = taskByCode.get(code) ?? { code, name: q.task_name ?? code };
      const set = eventSetFor(task, prefix);
      return { q, focus, code, set, setIdx: setNames.indexOf(set), rank: rankInSet(task, prefix, set) };
    })
    .sort((a, b) => a.setIdx - b.setIdx || a.rank - b.rank || acsSortKey(a.code).localeCompare(acsSortKey(b.code)));

  let questions: StageCheckQuestion[] = oral.map((o, i) => ({
    id: `stage-q-${i + 1}-${o.q.id.slice(0, 8)}`,
    question_library_id: o.q.id,
    question_snapshot: o.q.question,
    answer_snapshot: o.q.answer ?? "",
    reference_snapshot: o.q.reference ?? "",
    acs_reference_snapshot: o.q.prefixCodes.join("; "),
    task_name_snapshot: taskByCode.get(o.code)?.name ?? o.q.task_name ?? "",
    sequence_stage: o.set,
    sort_order: (i + 1) * 10,
    focus_sources: o.focus,
  }));

  // Never the same oral as a DPE POA (same questions in the same order, or the same set of questions).
  if (oralMatchesAnyDpe(questions, input.dpePoas)) {
    const spare = shuffle(fresh, rng).find((q) => !picked.has(q.id));
    const at = Math.floor(rng() * questions.length);
    if (spare) {
      questions[at] = {
        ...questions[at],
        question_library_id: spare.id,
        question_snapshot: spare.question,
        answer_snapshot: spare.answer ?? "",
        reference_snapshot: spare.reference ?? "",
        acs_reference_snapshot: spare.prefixCodes.join("; "),
        focus_sources: [],
      };
    } else {
      questions.splice(at, 1);
    }
  }

  // Flight: skill Tasks (not Area I), event sets in flight order, natural order inside a set with the
  // interchangeable middle shuffled; never exactly a DPE POA's order.
  const flightTasks = tasks.filter((t) => !t.ground && t.code.split(".")[1] !== "I");
  let flight = orderFlight(flightTasks, prefix, rng);
  for (let attempt = 0; attempt < 25 && matchesAnyDpeFlight(flight, input.dpePoas); attempt++) {
    flight = orderFlight(flightTasks, prefix, rng, true);
  }
  if (matchesAnyDpeFlight(flight, input.dpePoas)) flight = forceDifferentFlight(flight, prefix);

  return {
    generated_questions: questions,
    generated_flight_tasks: flight.map((t, i) => ({
      acs_task_code_snapshot: t.code,
      task_name_snapshot: t.name,
      sequence_stage: eventSetFor(t, prefix),
      sort_order: (i + 1) * 10,
      is_required: true,
    })),
    generated_triggers: [],
    oral_event_sets: [...new Set(questions.map((q) => q.sequence_stage))],
    flight_event_sets: [...new Set(flight.map((t) => eventSetFor(t, prefix)))],
    written_review: { required: written, covered, missing: written.filter((c) => !covered.includes(c)) },
    target_question_count: target,
  };
}

/** PA.II.B → "PA.002.B" so ACS order sorts correctly. */
export function acsSortKey(code: string): string {
  const [p, area, task, el] = code.split(".");
  const roman: Record<string, number> = { I: 1, V: 5, X: 10 };
  let n = 0;
  for (let i = 0; i < (area ?? "").length; i++) {
    const v = roman[area[i]] ?? 0;
    const next = roman[area[i + 1]] ?? 0;
    n += v < next ? -v : v;
  }
  return `${p}.${String(n).padStart(3, "0")}.${task ?? ""}.${el ?? ""}`;
}

function orderFlight(tasks: StageCheckTask[], prefix: string, rng: Rng, looser = false): StageCheckTask[] {
  const setNames = setsFor(prefix).map((s) => s.name);
  const grouped = new Map<string, StageCheckTask[]>();
  for (const t of tasks) {
    const set = eventSetFor(t, prefix);
    if (!grouped.has(set)) grouped.set(set, []);
    grouped.get(set)!.push(t);
  }
  const out: StageCheckTask[] = [];
  for (const set of setNames) {
    const list = grouped.get(set);
    if (!list) continue;
    // Tasks with a fixed place (ranked) keep it; unranked ones are shuffled among themselves. Sets
    // where order is free (Maneuvers after slow flight, Emergency, Ground Reference, En Route) get a
    // light shuffle of neighbours too.
    const ranked = list
      .map((t) => ({ t, rank: rankInSet(t, prefix, set), jitter: rng() }))
      .sort((a, b) => a.rank - b.rank || a.jitter - b.jitter)
      .map((x) => x.t);
    const free = ["Maneuvers", "Emergency Procedures", "Ground Reference", "Climb to Cruise / En Route", "En Route"].includes(set);
    if (free && ranked.length > 2) {
      const swaps = looser ? 2 : 1;
      for (let s = 0; s < swaps; s++) {
        const i = 1 + Math.floor(rng() * (ranked.length - 2));
        if (rng() < 0.6) [ranked[i], ranked[i + 1]] = [ranked[i + 1], ranked[i]];
      }
    }
    out.push(...ranked);
  }
  return out;
}

function sameSequence(a: string[], b: string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function matchesAnyDpeFlight(flight: StageCheckTask[], poas: DpePoa[]): boolean {
  const codes = flight.map((t) => t.code);
  return poas.some((p) => p.flightTaskCodes.length && sameSequence(codes, p.flightTaskCodes));
}

/** Last resort: swap the two neighbouring Tasks in the largest free set. */
function forceDifferentFlight(flight: StageCheckTask[], prefix: string): StageCheckTask[] {
  const out = [...flight];
  for (let i = out.length - 2; i >= 1; i--) {
    if (eventSetFor(out[i], prefix) === eventSetFor(out[i + 1], prefix)) {
      [out[i], out[i + 1]] = [out[i + 1], out[i]];
      return out;
    }
  }
  return out;
}

export function oralMatchesAnyDpe(questions: StageCheckQuestion[], poas: DpePoa[]): boolean {
  const ids = questions.map((q) => q.question_library_id);
  const idSet = new Set(ids);
  return poas.some(
    (p) => p.questionIds.length === ids.length && (sameSequence(ids, p.questionIds) || p.questionIds.every((id) => idSet.has(id))),
  );
}
