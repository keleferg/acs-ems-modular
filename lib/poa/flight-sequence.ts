/*
 * Flight portion order (Kele, Nov 12 2026): the flight tasks come out in a real flight flow, grouped in
 * flight event sets like the oral, so the examiner rarely has to rearrange them. Not the ACS order.
 *
 * VFR (every Private, Commercial, CFI, Sport, Recreational, rotorcraft, powered-lift … test):
 *   Ground topics (CFI) → Preflight → First takeoff → Climb to cruise / en route (navigation, diversion,
 *   lost procedures, attitude instrument flying) → Maneuvers (slow flight first, then stalls, steep
 *   turns, performance maneuvers, VMC demo) → Emergency procedures → Ground reference maneuvers →
 *   Takeoffs and landings (pattern work; the normal landing last) → After landing and postflight.
 * Instrument (IR, IH, IP, PI, CFII): Preflight → Clearance and departure → En route → Holding →
 *   Approaches (precision, missed, non-precision, partial panel, engine out, circling, landing) → Postflight.
 * ATP (AA, AP): Preflight → Takeoff and departure (rejected takeoff, engine failure) → Air work →
 *   Emergency procedures → Holding → Approaches → Landings → Postflight.
 *
 * Tasks are matched by name, so one rule covers every test standard. Within an event set, tasks follow
 * the order of the rules below. The examiner can still drag any task anywhere; the event set shown for
 * a task always comes from its name.
 */

export type FlightFamily = "vfr" | "ifr" | "atp";
export type FlightEventSet = { code: string; name: string };

type Rule = { set: string; match: RegExp };

const VFR_SETS: FlightEventSet[] = [
  { code: "ground", name: "Ground Topics (before the flight)" },
  { code: "preflight", name: "Preflight" },
  { code: "takeoff", name: "First Takeoff and Departure" },
  { code: "enroute", name: "Climb to Cruise / En Route" },
  { code: "maneuvers", name: "Maneuvers" },
  { code: "emergency", name: "Emergency Procedures" },
  { code: "ground_reference", name: "Ground Reference Maneuvers" },
  { code: "pattern", name: "Takeoffs and Landings" },
  { code: "postflight", name: "After Landing and Postflight" },
];

const IFR_SETS: FlightEventSet[] = [
  { code: "ground", name: "Ground Topics (before the flight)" },
  { code: "preflight", name: "Preflight" },
  { code: "departure", name: "Clearance and Departure" },
  { code: "enroute", name: "En Route" },
  { code: "holding", name: "Holding" },
  { code: "approaches", name: "Approaches" },
  { code: "postflight", name: "After Landing and Postflight" },
];

const ATP_SETS: FlightEventSet[] = [
  { code: "preflight", name: "Preflight" },
  { code: "takeoff", name: "Takeoff and Departure" },
  { code: "airwork", name: "Air Work" },
  { code: "emergency", name: "Emergency Procedures" },
  { code: "holding", name: "Holding" },
  { code: "approaches", name: "Approaches" },
  { code: "landings", name: "Landings" },
  { code: "postflight", name: "After Landing and Postflight" },
];

const r = (set: string, ...patterns: string[]): Rule[] => patterns.map((pattern) => ({ set, match: new RegExp(pattern, "i") }));

// Shared ground topics (CFI and CFII knowledge Tasks that carry an S element).
const GROUND_TOPICS = r(
  "ground",
  "^fundamentals|^human factors|^pilot qualifications|^airworthiness|^weather information|^cross-country flight planning",
  "^navigation and cross-country|^national airspace|^performance and limitations|^principles of flight|^operation of systems|^aircraft flight controls|^flight controls",
  "^night operations|^high altitude|^14 cfr|^regulations and publications|^endorsements|^runway incursion|^visual scanning|^maneuver lesson",
  "^aircraft systems related to|^aircraft flight instruments|^helicopter flight instruments|^water and seaplane characteristics",
);

const VFR_RULES: Rule[] = [
  ...GROUND_TOPICS,
  ...r(
    "preflight",
    "^preflight assessment",
    "^flight deck management",
    "^engine starting|^powerplant start",
    "^taxiing|^ground taxiing|^hover taxi|^air taxi|^taxiing with wheel",
    "^runway/taxiway",
    "^before takeoff",
  ),
  ...r("takeoff", "^normal takeoff and climb", "^communications, light signals"),
  ...r(
    "enroute",
    "^pilotage and dead reckoning",
    "^navigation systems and radar",
    "^radio communications, navigation",
    "^diversion",
    "^lost procedures",
    "^straight-and-level flight",
    "^constant airspeed climbs",
    "^constant airspeed descents",
    "^straight climbs",
    "^straight descents",
    "^turns to headings",
    "^recovery from unusual",
    "^flight solely by reference",
    "^one engine inoperative \\(simulated\\) \\(solely by reference",
    "^supplemental oxygen",
    "^pressurization",
    "^inflight conversion",
  ),
  ...r(
    "maneuvers",
    "^maneuvering during slow flight",
    "^power-off stall",
    "^power-on stall",
    "^accelerated stall",
    "^cross-controlled stall",
    "^elevator trim stall",
    "^secondary stall",
    "^spin awareness",
    "^demonstration of flight characteristics",
    "^steep turns",
    "^level turns",
    "^chandelles",
    "^lazy eights",
    "^maneuvering with one engine",
    "^one engine inoperative \\(oei\\) performance",
    "^demonstration of effects of various airspeeds",
    "^vmc demonstration",
    "^rapid deceleration",
    "^vortex ring",
    "^low rotor",
    "^low gravity",
    "^dynamic rollover",
    "^ground resonance",
  ),
  ...r(
    "emergency",
    "^emergency descent",
    "^emergency approach and landing",
    "^powerplant failure at altitude",
    "^straight-in autorotation",
    "^autorotation with turns",
    "^powerplant failure in a hover",
    "^antitorque system failure",
    "^inflight powerplant",
    "^instrument approach and landing with an inoperative engine",
    "^systems and equipment malfunctions",
    "^emergency equipment and survival gear",
  ),
  ...r("ground_reference", "^ground reference maneuvers", "^eights on pylons", "^steep spiral"),
  ...r(
    "pattern",
    "^traffic patterns",
    "^short-field takeoff",
    "^short-field approach",
    "^soft-field takeoff",
    "^soft-field approach",
    "^confined area takeoff",
    "^confined area approach",
    "^confined area operations",
    "^glassy water takeoff",
    "^glassy water approach",
    "^rough water takeoff",
    "^rough water approach",
    "^maximum performance takeoff",
    "^rolling takeoff",
    "^normal takeoff and climb from a hover",
    "^vertical takeoff",
    "^steep approach",
    "^shallow approach|^running/roll-on",
    "^normal approach to a hover",
    "^pinnacle",
    "^slope operations",
    "^forward slip|^slip to a landing",
    "^power-off 180",
    "^engine failure during takeoff before vmc|^powerplant\\(s\\) failure \\(simulated\\) during takeoff",
    "^engine failure after liftoff",
    "^approach and landing with",
    "^go-around",
    "^normal and crosswind approach",
    "^normal approach and landing",
  ),
  ...r("postflight", "^after landing", "^seaplane post-landing"),
];

const IFR_RULES: Rule[] = [
  ...r(
    "ground",
    "^human factors|^weather information|^cross-country flight planning|^regulations and publications|^endorsements|^maneuver lesson",
  ),
  ...r(
    "preflight",
    "^aircraft systems related to",
    "^aircraft flight instruments|^helicopter flight instruments",
    "^instrument flight deck check",
    "^checking instruments",
  ),
  ...r(
    "departure",
    "^compliance with air traffic control clearances|^air traffic control clearances",
    "^compliance with departure",
    "^departure, en route, and arrival operations",
  ),
  ...r(
    "enroute",
    "^instrument flight$",
    "^straight-and-level flight",
    "^change of airspeed",
    "^constant airspeed climbs",
    "^constant rate climbs",
    "^timed turns",
    "^turns$",
    "^steep turns",
    "^recovery from unusual",
    "^intercepting and tracking",
    "^loss of communications",
    "^one engine inoperative|^powerplant\\(s\\) inoperative",
  ),
  ...r("holding", "^holding"),
  ...r(
    "approaches",
    "^precision approach|^precision instrument approach",
    "^missed approach",
    "^non-?precision",
    "^approach with loss of primary",
    "^instrument approach and landing with",
    "^circling approach",
    "^landing from",
  ),
  ...r("postflight", "^after landing"),
];

const ATP_RULES: Rule[] = [
  ...r("preflight", "^preflight assessment", "^flight deck management", "^powerplant start", "^taxiing", "^before takeoff"),
  ...r(
    "takeoff",
    "^normal takeoff and climb",
    "^instrument takeoff",
    "^glassy water takeoff",
    "^rough water takeoff",
    "^confined area takeoff",
    "^rejected takeoff",
    "^powerplant failure during takeoff",
    "^departure procedures",
  ),
  ...r(
    "airwork",
    "^steep turns",
    "^clean configuration stall",
    "^partial flap configuration stall",
    "^landing configuration stall",
    "^power-off stall prevention",
    "^power-on stall prevention",
    "^recovery from unusual",
    "^specific flight characteristics",
  ),
  ...r("emergency", "^inflight powerplant", "^powerplant failure \\(simulated\\)", "^emergency procedures"),
  ...r("holding", "^holding"),
  ...r(
    "approaches",
    "^arrival procedures",
    "^precision approaches",
    "^precision approach \\(manually flown\\)",
    "^non-?precision approaches",
    "^missed approaches",
    "^circling approach",
  ),
  ...r(
    "landings",
    "^landing from a precision approach",
    "^landing from a circling approach",
    "^landing from a no flap",
    "^approach and landing with a powerplant failure",
    "^glassy water approach",
    "^rough water approach",
    "^confined area approach",
    "^go-around",
    "^normal approach and landing",
  ),
  ...r("postflight", "^after landing", "^seaplane post-landing"),
];

const FAMILY: Record<FlightFamily, { sets: FlightEventSet[]; rules: Rule[]; fallback: string }> = {
  vfr: { sets: VFR_SETS, rules: VFR_RULES, fallback: "maneuvers" },
  ifr: { sets: IFR_SETS, rules: IFR_RULES, fallback: "enroute" },
  atp: { sets: ATP_SETS, rules: ATP_RULES, fallback: "airwork" },
};

/** Which flight flow a test uses, from its ACS prefixes (or a task code like "IR.V.A"). */
export function flightFamilyFor(prefixesOrCode: string[] | string): FlightFamily {
  const prefixes = (Array.isArray(prefixesOrCode) ? prefixesOrCode : [prefixesOrCode.split(".")[0]]).map((p) => p.trim().toUpperCase());
  if (prefixes.some((p) => p === "AA" || p === "AP")) return "atp";
  if (prefixes.some((p) => ["IR", "IH", "IP", "PI", "IF"].includes(p))) return "ifr";
  return "vfr";
}

export function flightEventSets(family: FlightFamily) {
  return FAMILY[family].sets;
}

const clean = (name: string) => name.replace(/\s+/g, " ").trim();

/** The flight event set and the position within it for one task. */
export function flightPlacement(taskName: string, family: FlightFamily) {
  const { sets, rules, fallback } = FAMILY[family];
  const name = clean(taskName);
  const index = rules.findIndex((rule) => rule.match.test(name));
  const set = index >= 0 ? rules[index].set : fallback;
  const setIndex = sets.findIndex((s) => s.code === set);
  return {
    set: sets[setIndex] ?? sets[0],
    // Set first, then the rule's place; unknown tasks go to the end of the fallback set.
    rank: setIndex * 10000 + (index >= 0 ? index : 9999),
  };
}

/** Tasks in flight order (stable for equal ranks: ACS order). */
export function sequenceFlightTasks<T extends { acs_task_code_snapshot: string; task_name_snapshot: string }>(tasks: T[], family?: FlightFamily): T[] {
  const fam = family ?? flightFamilyFor(tasks.map((task) => task.acs_task_code_snapshot.split(".")[0]));
  return tasks
    .map((task, index) => ({ task, index, rank: flightPlacement(task.task_name_snapshot, fam).rank }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.task);
}

/** Splits an ordered task list into runs that share a flight event set (for headers on the page and print). */
export function groupByFlightEventSet<T extends { acs_task_code_snapshot: string; task_name_snapshot: string }>(tasks: T[], family?: FlightFamily) {
  const fam = family ?? flightFamilyFor(tasks.map((task) => task.acs_task_code_snapshot.split(".")[0]));
  const groups: Array<{ set: FlightEventSet; items: Array<{ task: T; index: number }> }> = [];
  tasks.forEach((task, index) => {
    const { set } = flightPlacement(task.task_name_snapshot, fam);
    const last = groups[groups.length - 1];
    if (last && last.set.code === set.code) last.items.push({ task, index });
    else groups.push({ set, items: [{ task, index }] });
  });
  return groups;
}
