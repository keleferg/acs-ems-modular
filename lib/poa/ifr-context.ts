// Realistic IFR details for a POA (Kele, Nov 11 2026). Every flight-specific number or fix the
// examiner reads out comes from FAA data for this POA's airports, and they agree with each other:
//   - the clearance (SID and transition, or "as filed"), initial and cruise altitude, departure
//     frequency and squawk;
//   - the void-time trigger only where a part-time tower actually closes (published tower hours);
//   - approach fixes, altitudes, holds and DME arcs from the destination's and alternate's
//     published approaches (FAA CIFP).
// Pure functions: the Generate page loads the rows and calls buildIfrContext. A fill this module
// can't supply is left out, and template items that need it (requires_fills) are skipped.

import { distanceNm, prettyAirportName } from "@/lib/poa/locations";

export type IfrAirport = {
  ident: string; // ICAO if it has one
  faa_identifier: string;
  airport_name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  elevation_feet: number | null;
};

export type AtcFacility = {
  faa_identifier: string;
  facility_type: string;
  tower_call: string | null;
  tower_hours: string | null;
  is_towered: boolean;
  is_part_time_tower: boolean;
  approach_call: string | null;
  departure_call: string | null;
};

export type FrequencyRow = { faa_identifier: string; frequency_mhz: number; frequency_use: string; sectorization: string | null };

export type DepartureProcedure = {
  computer_code: string;
  procedure_name: string;
  is_rnav: boolean;
  first_fix: { fix: string; lat: number; lon: number } | null;
  transitions: { code: string; name: string; fixes: string[]; end: { fix: string; lat: number; lon: number } | null }[] | null;
  top_altitude_ft: number | null;
};

type Transition = NonNullable<DepartureProcedure["transitions"]>[number];

export type IafRow = {
  transition: string; fix: string; alt_desc: string | null; alt: number | null; is_iaf?: boolean;
  next_fix?: string | null; next_alt_desc?: string | null; next_alt?: number | null; has_arc: boolean;
};

export type ApproachRow = {
  airport_icao: string;
  procedure_ident: string;
  approach_kind: string;
  runway: string | null;
  iafs: IafRow[];
  if_fix: string | null;
  faf_fix: string | null;
  faf_alt: number | null;
  map_fix: string | null;
  missed_hold: { fix: string; course: number | null; turn: string | null; alt1: number | null } | null;
  dme_arc: { transition: string; navaid: string; radius_nm: number | null; alt: number | null } | null;
};

export type IlsRow = { faa_identifier: string; runway_end: string; ident: string; localizer_mhz: number | null; approach_course_mag: number | null };
export type NavaidRow = { ident: string; nav_type: string; name: string | null; frequency_mhz: number | null; latitude: number; longitude: number };
export type NearbyAirport = IfrAirport & { atc: AtcFacility | null; distance_nm: number };

export type AlternateCandidate = NearbyAirport & {
  approaches: string[]; // published approaches (procedure names)
  alternate_minimums: { procedure_name: string; status: "na" | "nonstandard" }[];
  alternate_note: string | null; // the airport's entry in the IFR Alternate Airport Minimums pages
};

export type IfrInputs = {
  departure: IfrAirport;
  destination: IfrAirport;
  alternate: IfrAirport | null;
  magVarEast: Record<string, number>; // by FAA identifier
  atc: Record<string, AtcFacility>; // by FAA identifier
  frequencies: FrequencyRow[]; // for the departure (and void airport)
  sids: DepartureProcedure[]; // SIDs at the departure
  approaches: ApproachRow[]; // destination and alternate
  ils: IlsRow[]; // destination and alternate
  navaids: NavaidRow[]; // VORs near the route
  nearbyForVoid: NearbyAirport[]; // airports near the departure (for the void-time trigger)
  alternateCandidates?: AlternateCandidate[]; // airports near the destination (alternate-selection discussion)
  equipment: "taa" | "six_pack" | null;
  cruiseKt?: number;
  random?: () => number;
};

export type IfrContext = { fills: Record<string, string>; snapshot: Record<string, unknown>; warnings: string[] };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const norm = (d: number) => ((d % 360) + 360) % 360;

export function trueCourse(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const y = Math.sin(rad(b.longitude - a.longitude)) * Math.cos(rad(b.latitude));
  const x = Math.cos(rad(a.latitude)) * Math.sin(rad(b.latitude)) - Math.sin(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.cos(rad(b.longitude - a.longitude));
  return norm(deg(Math.atan2(y, x)));
}

const thousands = (ft: number) => ft.toLocaleString("en-US");
const heading3 = (d: number) => String(Math.round(norm(d) / 10) * 10 || 360).padStart(3, "0");
const radial3 = (d: number) => String(Math.round(norm(d)) || 360).padStart(3, "0");
const freq = (mhz: number) => {
  const text = String(Number(Number(mhz).toFixed(3)));
  return text.includes(".") ? text : `${text}.0`;
};

/** "HILO INTL" -> "Hilo" for clearances ("cleared to the Hilo airport"). */
export function clearanceAirportName(a: IfrAirport) {
  const pretty = prettyAirportName(a.airport_name)
    .replace(/\b(International|Regional|Municipal|Airport|Field|Intl|County)\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return pretty || a.ident;
}

/**
 * IFR cruise altitude: the hemispheric rule (91.179: magnetic course 0-179 odd thousands,
 * 180-359 even), high enough for the terrain at both ends and the leg length, and no higher
 * than an unpressurized trainer flies (12,000).
 */
export function cruiseAltitude(magCourse: number, legNm: number, maxElevation: number) {
  const byLeg = legNm < 50 ? 4000 : legNm < 100 ? 6000 : legNm < 160 ? 7000 : 9000;
  let alt = Math.max(byLeg, Math.ceil((maxElevation + 3000) / 1000) * 1000);
  const odd = norm(magCourse) < 180;
  if ((alt / 1000) % 2 === (odd ? 0 : 1)) alt += 1000;
  while (alt > 12000) alt -= 2000;
  return alt;
}

/** A discrete transponder code: octal, not a reserved or special code. */
export function squawk(random: () => number) {
  for (;;) {
    const digits = [2 + Math.floor(random() * 5), ...[0, 1, 2].map(() => Math.floor(random() * 8))];
    const code = digits.join("");
    if (!/^(7[0-7]{3}|1200|1255|1277|0000|4000|.*00)$/.test(code)) return code;
  }
}

/** "0600-2200" -> { open: 600, close: 2200 } (local); null for "24" or unusual formats. */
export function towerHours(hours: string | null) {
  const m = (hours ?? "").match(/^(\d{4})-(\d{4})/);
  return m ? { open: Number(m[1]), close: Number(m[2]) } : null;
}

const addMinutes = (hhmm: number, minutes: number) => {
  const total = Math.floor(hhmm / 100) * 60 + (hhmm % 100) + minutes;
  const h = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  return String(h * 100 + (((total % 60) + 60) % 60)).padStart(4, "0");
};

function departureFrequency(rows: FrequencyRow[], sid: DepartureProcedure | null, transition: string | null, magCourse: number) {
  const vhf = rows.filter((r) => r.frequency_mhz >= 118 && r.frequency_mhz < 137);
  if (sid) {
    const base = sid.procedure_name.split(" ")[0].toUpperCase();
    const forSid = vhf.filter((r) => r.frequency_use.toUpperCase().includes(`${base} DP`) || r.frequency_use.toUpperCase().includes(`${base} RNAV DP`));
    const byTransition = transition ? forSid.find((r) => (r.sectorization ?? "").toUpperCase().includes(transition.toUpperCase())) : undefined;
    if (byTransition ?? forSid[0]) return (byTransition ?? forSid[0]).frequency_mhz;
  }
  const dep = vhf.filter((r) => /\bDEP\b/.test(r.frequency_use));
  const sector = magCourse < 180 ? /EAST|NORTH/ : /WEST|SOUTH/;
  const pick = dep.find((r) => sector.test((r.sectorization ?? "").toUpperCase())) ?? dep.find((r) => !r.sectorization) ?? dep[0];
  return pick?.frequency_mhz ?? null;
}

/** The first fix on a transition with its own published altitude (the IAF, else the fix after it). */
export function firstFixWithAltitude(p: ApproachRow): { fix: string; alt: number } | null {
  const own = p.iafs.find((t) => t.alt);
  if (own?.alt) return { fix: own.fix, alt: own.alt };
  const next = p.iafs.find((t) => t.next_fix && t.next_alt);
  return next ? { fix: next.next_fix as string, alt: next.next_alt as number } : null;
}

export function buildIfrContext(input: IfrInputs): IfrContext {
  const random = input.random ?? Math.random;
  const { departure, destination, alternate } = input;
  const fills: Record<string, string> = {};
  const snapshot: Record<string, unknown> = {};
  const warnings: string[] = [];
  const magVar = (a: IfrAirport) => input.magVarEast[a.faa_identifier] ?? 0;

  // ------------------------------------------------------------ route, altitudes, clearance
  const tc = trueCourse(departure, destination);
  const mc = norm(tc - magVar(departure));
  const legNm = distanceNm(departure, destination);
  const cruise = cruiseAltitude(mc, legNm, Math.max(departure.elevation_feet ?? 0, destination.elevation_feet ?? 0));

  // SID: one whose transition ends closest to the direction of flight and leads toward the destination.
  const usable = input.sids.filter((s) => s.computer_code.includes(".") && (input.equipment === "taa" || !s.is_rnav));
  let best: { sid: DepartureProcedure; transition: Transition | null; score: number } | null = null;
  for (const sid of usable) {
    const options = (sid.transitions ?? []).filter((t) => t.end);
    for (const t of (options.length ? options : [null]) as (Transition | null)[]) {
      const end = t?.end ?? sid.first_fix;
      if (!end) continue;
      const toEnd = { latitude: end.lat, longitude: end.lon };
      const off = Math.abs(((trueCourse(departure, toEnd) - tc + 540) % 360) - 180);
      const closer = distanceNm(toEnd, destination) < legNm;
      if (off > 45 || !closer) continue;
      const score = off + (sid.is_rnav ? 10 : 0) + (sid.top_altitude_ft ? 0 : 20);
      if (!best || score < best.score) best = { sid, transition: t, score };
    }
  }
  const sid = best?.sid ?? null;
  const transition = best?.transition ?? null;
  const initial = sid?.top_altitude_ft ?? Math.min(cruise, Math.max(3000, Math.ceil(((departure.elevation_feet ?? 0) + 2500) / 1000) * 1000));
  const depFreq = departureFrequency(input.frequencies, sid, transition?.name.replace(/ TRANSITION$/i, "") ?? null, mc);
  const code = squawk(random);
  const to = `${clearanceAirportName(destination)} airport`;
  const sidPhrase = sid
    ? `via the ${sid.procedure_name} departure${transition ? `, ${transition.name.replace(/ TRANSITION$/i, "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} transition` : ""}, then as filed`
    : "as filed";
  const altPhrase = sid?.top_altitude_ft && sid.top_altitude_ft < cruise
    ? `Maintain ${thousands(initial)}.`
    : initial < cruise
      ? `Climb and maintain ${thousands(initial)}, expect ${thousands(cruise)} one zero minutes after departure.`
      : `Climb and maintain ${thousands(cruise)}.`;
  fills["clearance"] = `Cleared to the ${to} ${sidPhrase}. ${altPhrase}${depFreq ? ` Departure frequency ${freq(depFreq)},` : ""} squawk ${code}.`;
  fills["clearance route"] = sid
    ? `the ${sid.procedure_name} departure${transition ? `, ${transition.name.replace(/ TRANSITION$/i, "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} transition` : ""}`
    : "your filed route";
  fills["initial altitude"] = thousands(initial);
  fills["cruise altitude"] = thousands(cruise);
  if (depFreq) fills["departure frequency"] = freq(depFreq);
  fills["squawk"] = code;
  fills["freezing level"] = thousands(Math.max(2000, cruise - 2000));
  fills["cloud tops"] = thousands(cruise + 2000);
  if (sid?.first_fix) {
    const hdg = norm(trueCourse(departure, { latitude: sid.first_fix.lat, longitude: sid.first_fix.lon }) - magVar(departure));
    fills["departure heading"] = heading3(hdg);
  } else {
    fills["departure heading"] = heading3(mc);
  }
  snapshot.route = { sid: sid?.procedure_name ?? null, transition: transition?.code ?? null, initial, cruise, departure_frequency: depFreq, squawk: code, mag_course: Math.round(mc), leg_nm: Math.round(legNm) };

  // ------------------------------------------------------------ en route VOR
  const mid = { latitude: (departure.latitude + destination.latitude) / 2, longitude: (departure.longitude + destination.longitude) / 2 };
  const onRoute = transition?.end ? input.navaids.find((n) => n.ident === transition.end!.fix) : undefined;
  const vor = onRoute ?? [...input.navaids]
    .map((n) => ({ n, d: distanceNm(n, mid) }))
    .filter((x) => x.d <= Math.max(40, legNm / 2))
    .sort((a, b) => a.d - b.d)[0]?.n;
  if (vor) {
    const radial = norm(trueCourse(vor, destination) - magVar(destination));
    fills["route vor"] = `the ${prettyAirportName(vor.name ?? vor.ident)} ${vor.nav_type} (${vor.ident}${vor.frequency_mhz ? `, ${freq(vor.frequency_mhz)}` : ""})`;
    fills["route radial"] = radial3(Math.round(radial / 5) * 5);
  }

  // ------------------------------------------------------------ void time (part-time tower or nontowered)
  const depAtc = input.atc[departure.faa_identifier] ?? null;
  const depHours = depAtc?.is_part_time_tower ? towerHours(depAtc.tower_hours) : null;
  const voidPlace: NearbyAirport | null = depHours || (depAtc && !depAtc.is_towered)
    ? { ...departure, atc: depAtc, distance_nm: 0 }
    : input.nearbyForVoid
        .filter((a) => a.atc?.is_part_time_tower && towerHours(a.atc.tower_hours))
        .sort((a, b) => a.distance_nm - b.distance_nm)[0] ?? null;
  if (voidPlace) {
    const hours = voidPlace.atc?.is_part_time_tower ? towerHours(voidPlace.atc.tower_hours) : null;
    const now = hours ? Number(addMinutes(hours.close, 18)) : 1418;
    const facility = voidPlace.atc?.departure_call ? prettyAirportName(voidPlace.atc.departure_call) : "Center";
    fills["void airport"] = `${prettyAirportName(voidPlace.airport_name)} (${voidPlace.ident})`;
    fills["void tower note"] = hours
      ? `Its tower is open ${voidPlace.atc?.tower_hours} local, so it's closed now`
      : "It has no control tower";
    fills["void facility"] = facility.replace(/^Hcf\b/, "HCF");
    fills["void now"] = String(now).padStart(4, "0");
    fills["void time"] = addMinutes(now, 7);
    fills["void advise time"] = addMinutes(now, 12);
    snapshot.void = { airport: voidPlace.ident, tower_hours: voidPlace.atc?.tower_hours ?? null, now: fills["void now"] };
  }

  // ------------------------------------------------------------ approaches
  const icaoOf = (a: IfrAirport) => a.ident.toUpperCase();
  const at = (a: IfrAirport | null) => (a ? input.approaches.filter((p) => p.airport_icao === icaoOf(a)) : []);
  const destApproaches = at(destination);
  const ils = destApproaches.find((p) => p.approach_kind === "ILS");
  if (ils) {
    const loc = input.ils.find((l) => l.faa_identifier === destination.faa_identifier && l.runway_end === ils.runway);
    const course = loc?.approach_course_mag ?? null;
    fills["ils approach"] = `ILS runway ${ils.runway}`;
    fills["ils runway"] = ils.runway ?? "";
    if (course !== null) {
      // a 30-degree intercept from the side the IF is on, as approach would vector you
      fills["ils vector heading"] = heading3(course + (random() < 0.5 ? 30 : -30));
    }
    const intercept = ils.faf_alt ?? null;
    const ifAlt = ils.iafs.find((t) => t.next_fix === ils.if_fix)?.next_alt ?? null;
    const maintain = ifAlt ?? intercept;
    if (maintain) fills["ils intercept altitude"] = thousands(maintain);
    if (ils.faf_fix) fills["ils faf"] = ils.faf_fix;
    if (loc) fills["localizer"] = `${loc.ident}${loc.localizer_mhz ? `, ${Number(loc.localizer_mhz).toFixed(2)}` : ""}`;
    snapshot.ils = { procedure: ils.procedure_ident, course, maintain, faf: ils.faf_fix };
  }
  const rnavs = destApproaches.filter((p) => p.approach_kind.startsWith("RNAV (GPS)"));
  const rnav = rnavs.find((p) => ils && p.runway === ils.runway) ?? rnavs[0];
  if (rnav) {
    fills["rnav approach"] = `RNAV (GPS) runway ${rnav.runway}`;
    const fix = firstFixWithAltitude(rnav);
    if (fix) {
      fills["rnav iaf"] = fix.fix;
      fills["rnav iaf altitude"] = thousands(fix.alt);
    }
  }
  // crossing restriction for the descent: an IAF with a published altitude, else the IF
  const cross = [ils, rnav, ...destApproaches].map((p) => (p ? firstFixWithAltitude(p) : null)).find(Boolean);
  if (cross) {
    const { fix, alt } = cross;
    if (alt < cruise) {
      fills["crossing fix"] = fix;
      fills["crossing altitude"] = thousands(alt);
      fills["crossing descent ft"] = thousands(cruise - alt);
      fills["crossing descent nm"] = String(Math.round((cruise - alt) / 300));
    }
  }
  const hold = (ils ?? rnav ?? destApproaches[0])?.missed_hold;
  if (hold?.fix) {
    fills["missed hold fix"] = hold.fix;
    if (hold.course !== null) {
      const inbound = norm(hold.course);
      const from = norm(inbound + 180); // you hold on the side you'd come from
      const dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
      fills["hold direction"] = dirs[Math.round(from / 45) % 8];
      fills["hold course"] = radial3(Math.round(from));
      fills["hold inbound"] = radial3(Math.round(inbound));
    }
  }
  // DME arc: only an arc on a published approach at the destination (an en route amendment to it)
  const arcAt = destApproaches.find((p) => p.dme_arc?.radius_nm && p.dme_arc.navaid && p.dme_arc.alt);
  if (arcAt?.dme_arc) {
    const r = arcAt.dme_arc.radius_nm as number;
    fills["arc iaf"] = arcAt.dme_arc.transition;
    fills["arc navaid"] = arcAt.dme_arc.navaid;
    fills["arc radius"] = Number.isInteger(r) ? String(r) : r.toFixed(1);
    fills["arc approach"] = `${arcAt.approach_kind} runway ${arcAt.runway}`;
    fills["arc altitude"] = thousands(arcAt.dme_arc.alt as number);
  }

  // ------------------------------------------------------------ alternate
  const altApproaches = at(alternate);
  // vectored toward the alternate's approach: the highest initial approach altitude (ILS first)
  const altMain = altApproaches.find((p) => p.approach_kind === "ILS") ?? altApproaches[0];
  const altAlts = (altMain?.iafs ?? []).map((t) => t.alt ?? t.next_alt).filter((a): a is number => Boolean(a));
  if (altAlts.length) fills["alternate approach altitude"] = thousands(Math.max(...altAlts));
  const vorAtFaf = altApproaches.find((p) => /^VOR/.test(p.approach_kind) && p.faf_fix && p.faf_fix.length <= 3);
  if (vorAtFaf) fills["alternate vor approach"] = `${vorAtFaf.approach_kind} runway ${vorAtFaf.runway}`;
  const altRnav = altApproaches.find((p) => p.approach_kind.startsWith("RNAV"));
  if (altRnav) fills["alternate rnav approach"] = `RNAV (GPS) runway ${altRnav.runway}`;
  const runways = new Set(altApproaches.map((p) => p.runway).filter(Boolean) as string[]);
  const oneEnd = [...runways].find((r) => {
    const n = Number(r.slice(0, 2));
    const opp = String(((n + 18 - 1) % 36) + 1).padStart(2, "0");
    return ![...runways].some((x) => x.startsWith(opp));
  });
  if (oneEnd) {
    const n = Number(oneEnd.slice(0, 2));
    const oppN = ((n + 18 - 1) % 36) + 1;
    fills["alternate approach runway"] = oneEnd;
    fills["alternate circling runway"] = String(oppN).padStart(2, "0") + ({ L: "R", R: "L", C: "C" }[oneEnd.slice(2)] ?? "");
    fills["alternate circling wind"] = `${String(oppN * 10).padStart(3, "0")} at 12`;
  }

  // ------------------------------------------------------------ alternate selection (Kele, Nov 11 2026)
  // Airports near the destination whose alternate minimums an applicant has to look up: every approach
  // A NA (can't be filed), NA at certain times (tower closed, no local weather), or nonstandard minimums.
  const cands = (input.alternateCandidates ?? []).filter((c) => c.faa_identifier !== destination.faa_identifier).sort((a, b) => a.distance_nm - b.distance_nm);
  const label = (c: AlternateCandidate) => `${prettyAirportName(c.airport_name)} (${c.ident})`;
  const allNa = cands.find((c) => {
    const na = c.alternate_minimums.filter((m) => m.status === "na");
    return na.length > 0 && na.length >= Math.max(1, c.approaches.length) && !c.alternate_minimums.some((m) => m.status === "nonstandard");
  });
  if (allNa) {
    const names = allNa.alternate_minimums.map((m) => m.procedure_name);
    fills["alt na airport"] = label(allNa);
    fills["alt na approaches"] = names.join(", ");
    snapshot.alternate_na = { airport: allNa.ident, approaches: names };
  }
  const clean = (t: string) => t.replace(/\s+/g, " ").replace(/\s([.,;])/g, "$1").trim();
  const conditional = cands.find((c) => c !== allNa && /NA when (control tower closed|local weather (is )?not available)/i.test(c.alternate_note ?? ""));
  if (conditional?.alternate_note) {
    const note = clean(conditional.alternate_note);
    fills["alt conditional airport"] = label(conditional);
    fills["alt conditional note"] = note.length > 400 ? `${note.slice(0, 400)}…` : note;
    const hours = conditional.atc?.is_part_time_tower ? towerHours(conditional.atc.tower_hours) : null;
    if (/control tower closed/i.test(note) && hours) {
      fills["alt conditional context"] = `Its tower is open ${conditional.atc?.tower_hours} local, and your ETA there would be ${addMinutes(hours.close, 30)} local.`;
    } else if (/local weather/i.test(note)) {
      fills["alt conditional context"] = conditional.atc?.is_towered
        ? "Check what weather reporting it has and when it's available."
        : "It has no control tower; check whether its weather reporting (AWOS/ASOS) is working and reported, and NOTAMs.";
    } else {
      fills["alt conditional context"] = "Check the conditions against your ETA.";
    }
    snapshot.alternate_conditional = { airport: conditional.ident };
  }
  // nonstandard minimums that apply to a Category A or B airplane (Cat C/D-only entries don't change a trainer's minimums)
  const forCatAB = (t: string | null) => /Cat A[^.]*?\b\d{3,4}-\d|Cat A, B[^.]*?\b\d{3,4}-\d|Cat B[^.]*?\b\d{3,4}-\d/.test(t ?? "");
  const nonstd = cands.find((c) => c !== allNa && c !== conditional && forCatAB(c.alternate_note))
    ?? cands.find((c) => c !== allNa && forCatAB(c.alternate_note));
  if (nonstd?.alternate_note) {
    const note = clean(nonstd.alternate_note);
    fills["alt nonstandard airport"] = label(nonstd);
    fills["alt nonstandard note"] = note.length > 400 ? `${note.slice(0, 400)}…` : note;
    snapshot.alternate_nonstandard = { airport: nonstd.ident };
  }

  // The filed alternate itself has to be legal: warn if every approach there is A NA.
  const filed = alternate ? (input.alternateCandidates ?? []).find((c) => c.faa_identifier === alternate.faa_identifier) : null;
  if (filed) {
    const na = filed.alternate_minimums.filter((m) => m.status === "na");
    if (na.length && na.length >= Math.max(1, filed.approaches.length)) {
      warnings.push(`The filed alternate ${alternate!.ident} has alternate minimums NA on every approach; pick another alternate.`);
    }
  }
  if (!sid && !depFreq) warnings.push(`No departure frequency on file for ${departure.ident}.`);
  if (!ils && !rnav) warnings.push(`No ILS or RNAV approach data for ${destination.ident}.`);
  return { fills, snapshot, warnings };
}

/** Fill-ins an item needs: every [key] in its text that buildIfrContext can supply. */
export const IFR_FILL_KEYS = [
  "clearance", "clearance route", "initial altitude", "cruise altitude", "departure frequency", "squawk", "departure heading", "freezing level", "cloud tops",
  "route vor", "route radial", "void airport", "void tower note", "void facility", "void now", "void time", "void advise time",
  "ils approach", "ils runway", "ils vector heading", "ils intercept altitude", "ils faf", "localizer", "rnav approach", "rnav iaf",
  "rnav iaf altitude", "crossing fix", "crossing altitude", "crossing descent ft", "crossing descent nm", "missed hold fix", "hold direction",
  "hold course", "hold inbound", "arc iaf", "arc navaid", "arc radius", "arc approach", "arc altitude", "alternate approach altitude", "alternate vor approach",
  "alternate rnav approach", "alternate approach runway", "alternate circling runway", "alternate circling wind",
  "alt na airport", "alt na approaches", "alt conditional airport", "alt conditional note", "alt conditional context",
  "alt nonstandard airport", "alt nonstandard note",
];
