// Place conditions for template items (Kele, Nov 19 2026).
//
// A template item lists in requires_fills the real-world conditions it needs at this POA's
// airports. Items whose conditions don't hold are skipped with their follow-ups, and rotation
// slots pick another variant (template-build.ts satisfied / pickTemplateVariants). This keeps a
// −10°C cold start out of Hawaii and a control-tower light gun out of a non-towered field.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PoaAirport, PoaLocations } from "./locations";

export const PLACE_CONDITION_KEYS = [
  "freezing weather",
  "towered departure",
  "towered destination",
  "nontowered destination",
  "lahso destination",
] as const;

/** States and territories whose low-lying airports never see freezing temperatures. */
const TROPICAL_STATES = new Set(["HI", "PR", "VI", "GU", "MP", "AS"]);

/**
 * Whether surface temperatures at an airport can get below freezing, from its climate:
 * - tropical states and territories: only at high elevation (6,000 ft and up, e.g. Hawaii's summits);
 * - Florida: north of 28°N (frost reaches central Florida, not the south);
 * - anywhere else below 23°N: no;
 * - the rest of the U.S. (including the Gulf coast, desert Southwest and coastal California): yes.
 */
export function freezingPlausible(airport: Pick<PoaAirport, "state_code" | "latitude" | "elevation_feet">) {
  const state = (airport.state_code ?? "").trim().toUpperCase();
  const elevation = airport.elevation_feet ?? 0;
  if (TROPICAL_STATES.has(state)) return elevation >= 6000;
  if (state === "FL") return airport.latitude >= 28;
  if (airport.latitude < 23) return elevation >= 6000;
  return true;
}

export type AirportFacts = {
  /** Has an airport traffic control tower (FAA ATC facilities). */
  towered: boolean;
  /** Directions of its hard-surface land runways (tens of degrees; parallels count once). LAHSO needs two. */
  runwayDirections: number;
};

/** Which place conditions hold for a POA's departure and destination. */
export function placeConditions(
  locations: Pick<PoaLocations, "departure" | "destination"> | null | undefined,
  facts: Map<string, AirportFacts> | null,
): Set<string> {
  const available = new Set<string>();
  const departure = locations?.departure ?? null;
  const destination = locations?.destination ?? null;
  if (departure && freezingPlausible(departure)) available.add("freezing weather");
  if (!facts) return available; // No tower data: tower-specific events are left out.
  const dep = departure ? facts.get(departure.id) : undefined;
  const dest = destination ? facts.get(destination.id) : undefined;
  if (dep?.towered) available.add("towered departure");
  if (destination && dest) {
    if (dest.towered) available.add("towered destination");
    else available.add("nontowered destination");
    if (dest.towered && dest.runwayDirections >= 2) available.add("lahso destination");
  }
  return available;
}

/** Tower and runway facts for the departure and destination, from the FAA tables. */
export async function loadAirportFacts(
  supabase: SupabaseClient,
  locations: Pick<PoaLocations, "departure" | "destination"> | null | undefined,
): Promise<Map<string, AirportFacts> | null> {
  const picked = [locations?.departure, locations?.destination].filter(Boolean) as PoaAirport[];
  if (!picked.length) return new Map();
  const { data: rows, error } = await supabase
    .from("faa_airports")
    .select("id, faa_identifier, site_number")
    .in("id", picked.map((a) => a.id));
  if (error) return null;
  const airports = (rows ?? []) as { id: string; faa_identifier: string | null; site_number: string | null }[];
  const faaIds = airports.map((a) => a.faa_identifier).filter(Boolean) as string[];
  const sites = airports.map((a) => a.site_number).filter(Boolean) as string[];
  const [atc, runways] = await Promise.all([
    faaIds.length
      ? supabase.from("faa_atc_facilities").select("faa_identifier, is_towered").in("faa_identifier", faaIds)
      : Promise.resolve({ data: [], error: null }),
    sites.length
      ? supabase.from("faa_airport_runways").select("site_number, runway_id, is_hard, is_water").in("site_number", sites)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (atc.error || runways.error) return null;
  const towered = new Set(
    ((atc.data ?? []) as { faa_identifier: string; is_towered: boolean | null }[])
      .filter((row) => row.is_towered)
      .map((row) => row.faa_identifier),
  );
  // Runway directions per airport: "04L/22R" and "04R/22L" are one direction; helipads don't count.
  const directionsBySite = new Map<string, Set<number>>();
  for (const row of (runways.data ?? []) as { site_number: string; runway_id: string | null; is_hard: boolean | null; is_water: boolean | null }[]) {
    if (!row.is_hard || row.is_water) continue;
    const number = /^(\d{1,2})/.exec((row.runway_id ?? "").trim())?.[1];
    if (!number) continue;
    const heading = Number(number) % 18; // 04 and 22 are the same runway line
    const set = directionsBySite.get(row.site_number) ?? new Set<number>();
    // Within 20° counts as the same direction.
    if (![...set].some((h) => Math.min(Math.abs(h - heading), 18 - Math.abs(h - heading)) <= 2)) set.add(heading);
    directionsBySite.set(row.site_number, set);
  }
  const facts = new Map<string, AirportFacts>();
  for (const airport of airports) {
    facts.set(airport.id, {
      towered: Boolean(airport.faa_identifier && towered.has(airport.faa_identifier)),
      runwayDirections: (airport.site_number && directionsBySite.get(airport.site_number)?.size) || 0,
    });
  }
  return facts;
}
