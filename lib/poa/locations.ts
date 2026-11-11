// POA locations (Kele, Nov 11 2026): every generated POA uses real airports near the
// applicant's test airport.
//   - Departure: any airport within 200 NM of the test airport (not fixed to the test airport).
//   - Destination: within 500 NM of the departure, sized to the scenario's leg length.
//   - Farther airports only from the examiner's pre-approved exception list for that test airport.
//   - Seaplane scenarios land at seaplane bases; instrument POAs need approaches where the
//     approach data is loaded.
// Pure functions: the Generate page loads the candidates (examiner_poa_airports_near) and calls
// pickPoaLocations; the result is written into the template text and saved on the POA.

export const DEPARTURE_RADIUS_NM = 200;
export const LEG_RADIUS_NM = 500;

export type PoaAirport = {
  id: string;
  ident: string; // ICAO if it has one, else the FAA identifier
  airport_name: string;
  city: string | null;
  state_code: string | null;
  facility_type_code: string; // A airport, C seaplane base
  facility_use_code: string | null; // PU public, PR private
  latitude: number;
  longitude: number;
  elevation_feet: number | null;
  longest_hard_runway_ft: number | null;
  has_turf_runway: boolean | null;
  approach_kinds: string[] | null; // ILS, LOC, RNAV, LPV, VOR, NDB, ... (null = no approach data loaded)
  is_exception?: boolean;
};

export type LocationKind = "airport" | "seaplane" | "either";

export type LocationNeeds = {
  /** Target leg length from the scenario ("about 80 NM away"). */
  legNm: number | null;
  destinationKind: LocationKind;
  /** Instrument POAs: an approach at the destination, a different approach at the alternate. */
  instrument: boolean;
  /** Whether faa_airport_approaches has been loaded (otherwise approaches can't be checked). */
  approachDataLoaded: boolean;
  /** Whether faa_airport_runways has been loaded (land destinations then need a hard runway). */
  runwayDataLoaded?: boolean;
};

/** Shortest hard-surface runway a land destination or pattern airport needs, once runway data is loaded. */
export const MIN_HARD_RUNWAY_FT = 2500;

export type PickedPlace = PoaAirport & { distance_nm: number; from: string };

export type PoaLocations = {
  test_airport: PoaAirport;
  departure: PickedPlace;
  destination: PickedPlace | null;
  alternate: PickedPlace | null;
  practice_area: PickedPlace | null;
  pattern_airport: PickedPlace | null;
  warnings: string[];
};

const R_NM = 3440.065;
export function distanceNm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const SMALL_WORDS = new Set(["AT", "OF", "THE", "AND", "ON"]);
const KEEP_UPPER = new Set(["AAF", "AFB", "NAS", "MCAS", "ANG", "ARB", "AHP", "II", "III", "USCG", "LLC"]);
const EXPAND: Record<string, string> = {
  INTL: "International", RGNL: "Regional", MUNI: "Municipal", FLD: "Field", SPB: "Seaplane Base",
  ARPT: "Airport", MEML: "Memorial", CNTY: "County", MTN: "Mountain", HBR: "Harbor",
};

/** "KALAELOA (JOHN RODGERS FLD)" -> "Kalaeloa (John Rodgers Field)". */
export function prettyAirportName(name: string) {
  return name
    .split(/(\s+|[()/-])/)
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (index > 0 && SMALL_WORDS.has(upper)) return upper.toLowerCase();
      if (!/[A-Z]/i.test(word)) return word;
      if (EXPAND[upper]) return EXPAND[upper];
      if (KEEP_UPPER.has(upper)) return upper;
      if (/^[A-Z]$/.test(upper)) return upper; // initials: "DANIEL K INOUYE"
      return upper.charAt(0) + upper.slice(1).toLowerCase();
    })
    .join("");
}

/** How a place reads in the POA: "Kalaeloa (John Rodgers Field) (PHJR)". */
export function placeLabel(airport: Pick<PoaAirport, "airport_name" | "ident">) {
  return `${prettyAirportName(airport.airport_name)} (${airport.ident})`;
}

export function parseLegNm(text: string | null | undefined): number | null {
  const match = (text ?? "").match(/about\s+(\d{2,4})\s*NM/i);
  return match ? Number(match[1]) : null;
}

const isSeaplane = (a: PoaAirport) => a.facility_type_code === "C";
const isLand = (a: PoaAirport) => a.facility_type_code === "A";
const isPublic = (a: PoaAirport) => a.facility_use_code === "PU";
const hasPrecisionish = (a: PoaAirport) => (a.approach_kinds ?? []).some((k) => ["ILS", "LPV", "GLS"].includes(k));
const hasNonPrecision = (a: PoaAirport) => (a.approach_kinds ?? []).some((k) => ["RNAV", "LNAV", "VOR", "LOC", "NDB", "LDA", "SDF", "TACAN"].includes(k));
const hasAnyApproach = (a: PoaAirport) => (a.approach_kinds ?? []).length > 0;
const runwayOk = (a: PoaAirport, needs: LocationNeeds) =>
  !needs.runwayDataLoaded || !isLand(a) || (a.longest_hard_runway_ft ?? 0) >= MIN_HARD_RUNWAY_FT;

export type Rng = () => number;
function pick<T>(items: T[], rng: Rng, weight?: (item: T) => number): T | null {
  if (!items.length) return null;
  if (!weight) return items[Math.floor(rng() * items.length)] ?? null;
  const weights = items.map(weight);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickDeparture(test: PoaAirport, pool: PoaAirport[], rng: Rng) {
  const testInPool = pool.find((a) => a.id === test.id);
  const others = pool.filter((a) => a.id !== test.id);
  if (testInPool && (!others.length || rng() < 0.4)) return testInPool;
  return pick(others, rng, (a) => 1 / (1 + distanceNm(test, a) / 40)) ?? testInPool ?? null;
}

const place = (airport: PoaAirport, from: PoaAirport): PickedPlace => ({
  ...airport,
  distance_nm: Math.round(distanceNm(from, airport)),
  from: from.ident,
});

/** Airports the examiner may use as the departure: within 200 NM of the test airport, or approved. */
export function departureOptions(test: PoaAirport, near: PoaAirport[], needs: LocationNeeds) {
  return near.filter((a) => {
    // Seaplane POAs leave from a seaplane base (or the test location itself).
    const kindOk = needs.destinationKind === "seaplane" ? isSeaplane(a) || a.id === test.id : isLand(a);
    if (!kindOk) return false;
    if (a.id !== test.id && !isPublic(a) && !a.is_exception) return false;
    return a.is_exception || distanceNm(test, a) <= DEPARTURE_RADIUS_NM;
  });
}

/** Destinations: within 500 NM of the departure (or approved), of the scenario's kind. */
export function destinationOptions(departure: PoaAirport, near: PoaAirport[], needs: LocationNeeds) {
  return near.filter((a) => {
    if (a.id === departure.id) return false;
    const d = distanceNm(departure, a);
    if (!a.is_exception && d > LEG_RADIUS_NM) return false;
    if (d < 10) return false;
    if (needs.destinationKind === "seaplane") return isSeaplane(a);
    if (needs.destinationKind === "airport" && !isLand(a)) return false;
    if (!isPublic(a) && !a.is_exception) return false;
    if (!runwayOk(a, needs)) return false;
    if (needs.instrument && needs.approachDataLoaded && !hasAnyApproach(a)) return false;
    return true;
  });
}

export function alternateOptions(departure: PoaAirport, destination: PoaAirport, near: PoaAirport[], needs: LocationNeeds) {
  return near.filter((a) => {
    if (a.id === destination.id || a.id === departure.id || !isLand(a) || !isPublic(a)) return false;
    const d = distanceNm(destination, a);
    if (d < 10 || d > 150) return false;
    if (needs.approachDataLoaded && !hasNonPrecision(a)) return false;
    return true;
  });
}

export function practiceAreaOptions(departure: PoaAirport, near: PoaAirport[]) {
  return near.filter((a) => a.id !== departure.id && isLand(a) && distanceNm(departure, a) >= 4 && distanceNm(departure, a) <= 30);
}

export function patternAirportOptions(departure: PoaAirport, near: PoaAirport[], needs?: LocationNeeds) {
  return near.filter(
    (a) => a.id !== departure.id && isLand(a) && isPublic(a) && (!needs || runwayOk(a, needs)) &&
      distanceNm(departure, a) >= 4 && distanceNm(departure, a) <= 40,
  );
}

/**
 * Pick the places for one POA. `nearTest` = airports near the test airport (≥ 200 NM ring + approved
 * exceptions); `nearDeparture(dep)` = airports within 500 NM of the chosen departure (+ exceptions).
 */
export function pickPoaLocations(
  test: PoaAirport,
  nearTest: PoaAirport[],
  nearDeparture: (departure: PoaAirport) => PoaAirport[],
  needs: LocationNeeds,
  rng: Rng = Math.random,
  fixed: { departureId?: string | null } = {},
): PoaLocations {
  const warnings: string[] = [];
  const depChoices = departureOptions(test, nearTest, needs);
  // Instrument POAs depart from a field with an approach (the arc ends with a second approach home).
  const depPool = needs.instrument && needs.approachDataLoaded ? depChoices.filter(hasAnyApproach) : depChoices;
  const departureAirport =
    (fixed.departureId ? depChoices.find((a) => a.id === fixed.departureId) : null) ??
    // The test airport itself about 40% of the time; otherwise a field within 200 NM, closer ones likelier.
    pickDeparture(test, depPool.length ? depPool : depChoices, rng) ??
    test;
  if (!depChoices.length) warnings.push(`No other public airports within ${DEPARTURE_RADIUS_NM} NM of ${test.ident}; departing from the test airport.`);

  const around = nearDeparture(departureAirport);
  const destChoices = destinationOptions(departureAirport, around, needs);
  let destination: PoaAirport | null = null;
  if (destChoices.length) {
    const leg = needs.legNm ?? 100;
    const inWindow = destChoices.filter((a) => {
      const d = distanceNm(departureAirport, a);
      return d >= leg * 0.6 && d <= leg * 1.4;
    });
    // Closest to the scenario's leg length when nothing falls in the window.
    const pool = inWindow.length
      ? inWindow
      : [...destChoices].sort((a, b) => Math.abs(distanceNm(departureAirport, a) - leg) - Math.abs(distanceNm(departureAirport, b) - leg)).slice(0, 3);
    if (!inWindow.length && needs.legNm) {
      warnings.push(`No ${needs.destinationKind === "seaplane" ? "seaplane base" : "airport"} about ${needs.legNm} NM from ${departureAirport.ident}; using the closest match.`);
    }
    destination = needs.instrument && needs.approachDataLoaded ? pick(pool, rng, (a) => (hasPrecisionish(a) ? 3 : 1)) : pick(pool, rng);
  } else {
    warnings.push(
      needs.destinationKind === "seaplane"
        ? `No seaplane bases within ${LEG_RADIUS_NM} NM of ${departureAirport.ident} (or seaplane bases aren't loaded yet). The scenario's own destination text is used.`
        : `No destination airport within ${LEG_RADIUS_NM} NM of ${departureAirport.ident}.`,
    );
  }
  if (needs.instrument && !needs.approachDataLoaded) {
    warnings.push("Instrument approach data isn't loaded yet: check that the destination and alternate have the approaches the POA calls for.");
  }

  let alternate: PoaAirport | null = null;
  if (destination && needs.instrument) {
    alternate = pick(alternateOptions(departureAirport, destination, around, needs), rng);
    if (!alternate) warnings.push(`No alternate within 150 NM of ${destination.ident}.`);
  }

  const practice = pick(practiceAreaOptions(departureAirport, nearTest.concat(around)), rng);
  const patternAll = patternAirportOptions(departureAirport, around, needs);
  const patternChoices = patternAll.filter((a) => a.id !== practice?.id);
  const pattern = pick(patternChoices.length ? patternChoices : patternAll, rng);

  return {
    test_airport: test,
    departure: place(departureAirport, test),
    destination: destination ? place(destination, departureAirport) : null,
    alternate: alternate && destination ? place(alternate, destination) : null,
    practice_area: practice ? place(practice, departureAirport) : null,
    pattern_airport: pattern ? place(pattern, departureAirport) : null,
    warnings,
  };
}

/** The [fill-ins] the template text uses. */
export function locationFills(
  locations: PoaLocations | null,
  fallback: { destination?: string | null; departure?: string | null },
): Record<string, string | null> {
  const departure = locations ? placeLabel(locations.departure) : fallback.departure ?? null;
  return {
    departure,
    "home airport": departure,
    destination: locations?.destination ? placeLabel(locations.destination) : fallback.destination ?? null,
    alternate: locations?.alternate ? placeLabel(locations.alternate) : null,
    "practice area": locations?.practice_area
      ? `practice area near ${prettyAirportName(locations.practice_area.airport_name)}`
      : locations
        ? `practice area near ${prettyAirportName(locations.departure.airport_name)}`
        : null,
    "pattern airport": locations?.pattern_airport ? placeLabel(locations.pattern_airport) : departure,
  };
}

/** What is stored on generated_plan_of_actions.location_snapshot. */
export function locationSnapshot(locations: PoaLocations) {
  const slim = (a: PickedPlace | PoaAirport | null) =>
    a
      ? {
          id: a.id,
          ident: a.ident,
          name: prettyAirportName(a.airport_name),
          ...("distance_nm" in a ? { distance_nm: a.distance_nm, from: a.from } : {}),
          ...(a.is_exception ? { approved_exception: true } : {}),
        }
      : null;
  return {
    rules: { departure_radius_nm: DEPARTURE_RADIUS_NM, leg_radius_nm: LEG_RADIUS_NM },
    test_airport: slim(locations.test_airport),
    departure: slim(locations.departure),
    destination: slim(locations.destination),
    alternate: slim(locations.alternate),
    practice_area: slim(locations.practice_area),
    pattern_airport: slim(locations.pattern_airport),
    warnings: locations.warnings,
  };
}
