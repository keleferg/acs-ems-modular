// Loads the FAA rows buildIfrContext needs for a POA's airports (Kele, Nov 11 2026).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PoaLocations, PoaAirport } from "./locations";
import { distanceNm } from "./locations";
import type {
  AlternateCandidate, AtcFacility, ApproachRow, DepartureProcedure, FrequencyRow, IfrAirport, IfrInputs, IlsRow, NavaidRow, NearbyAirport,
} from "./ifr-context";

const VOID_RADIUS_NM = 60;
const ALTERNATE_RADIUS_NM = 120;

export async function loadIfrInputs(
  supabase: SupabaseClient,
  locations: PoaLocations,
  equipment: "taa" | "six_pack" | null,
): Promise<IfrInputs | null> {
  const dep = locations.departure;
  const dest = locations.destination;
  if (!dep || !dest) return null;
  const alt = locations.alternate;
  const picked = [dep, dest, alt].filter(Boolean) as PoaAirport[];

  const { data: ids } = await supabase
    .from("faa_airports")
    .select("id, faa_identifier, icao_identifier, airport_name, city, latitude, longitude, elevation_feet")
    .in("id", picked.map((a) => a.id));
  const byId = new Map((ids ?? []).map((row) => [row.id as string, row]));
  const toIfr = (a: PoaAirport | null): IfrAirport | null => {
    if (!a) return null;
    const row = byId.get(a.id);
    return {
      ident: (row?.icao_identifier as string) || a.ident,
      faa_identifier: (row?.faa_identifier as string) || a.ident,
      airport_name: a.airport_name,
      city: a.city,
      latitude: a.latitude,
      longitude: a.longitude,
      elevation_feet: a.elevation_feet,
    };
  };
  const departure = toIfr(dep)!;
  const destination = toIfr(dest)!;
  const alternate = toIfr(alt);

  // Airports near the departure, for the void-time trigger (part-time towers only).
  const { data: near } = await supabase.rpc("examiner_poa_airports_near", {
    p_center_id: dep.id, p_radius_nm: VOID_RADIUS_NM, p_test_airport_id: locations.test_airport.id,
  });
  const nearRows = ((near ?? []) as PoaAirport[]).filter((a) => a.facility_type_code === "A" && a.facility_use_code === "PU");
  const { data: nearIds } = nearRows.length
    ? await supabase.from("faa_airports").select("id, faa_identifier").in("id", nearRows.map((a) => a.id))
    : { data: [] as { id: string; faa_identifier: string }[] };
  const faaOf = new Map((nearIds ?? []).map((r) => [r.id as string, r.faa_identifier as string]));

  const faaIds = [...new Set([departure, destination, alternate].filter(Boolean).map((a) => a!.faa_identifier).concat([...faaOf.values()]))];
  const icaos = [destination.ident, alternate?.ident].filter(Boolean) as string[];
  const box = {
    minLat: Math.min(departure.latitude, destination.latitude) - 1, maxLat: Math.max(departure.latitude, destination.latitude) + 1,
    minLon: Math.min(departure.longitude, destination.longitude) - 1, maxLon: Math.max(departure.longitude, destination.longitude) + 1,
  };

  const [atc, mag, freqs, sids, approaches, ils, navaids] = await Promise.all([
    supabase.from("faa_atc_facilities").select("faa_identifier, facility_type, tower_call, tower_hours, is_towered, is_part_time_tower, approach_call, departure_call").in("faa_identifier", faaIds),
    supabase.from("faa_airport_magvar").select("faa_identifier, mag_var_east_deg").in("faa_identifier", faaIds),
    supabase.from("faa_frequencies").select("faa_identifier, frequency_mhz, frequency_use, sectorization").eq("faa_identifier", departure.faa_identifier),
    supabase.from("faa_departure_procedures").select("computer_code, procedure_name, is_rnav, first_fix, transitions, top_altitude_ft").contains("airports", [departure.faa_identifier]),
    supabase.from("faa_cifp_approaches").select("airport_icao, procedure_ident, approach_kind, runway, iafs, if_fix, faf_fix, faf_alt, map_fix, missed_hold, dme_arc").in("airport_icao", icaos),
    supabase.from("faa_ils").select("faa_identifier, runway_end, ident, localizer_mhz, approach_course_mag").in("faa_identifier", faaIds),
    supabase.from("faa_navaids").select("ident, nav_type, name, frequency_mhz, latitude, longitude")
      .gte("latitude", box.minLat).lte("latitude", box.maxLat).gte("longitude", box.minLon).lte("longitude", box.maxLon),
  ]);

  const atcBy = Object.fromEntries(((atc.data ?? []) as AtcFacility[]).map((r) => [r.faa_identifier, r]));
  const nearbyForVoid: NearbyAirport[] = nearRows
    .filter((a) => a.id !== dep.id && faaOf.get(a.id))
    .map((a) => ({
      ident: a.ident, faa_identifier: faaOf.get(a.id)!, airport_name: a.airport_name, city: a.city, latitude: a.latitude,
      longitude: a.longitude, elevation_feet: a.elevation_feet, atc: atcBy[faaOf.get(a.id)!] ?? null, distance_nm: distanceNm(dep, a),
    }));

  // Airports near the destination for the alternate-selection discussion.
  const { data: nearDest } = await supabase.rpc("examiner_poa_airports_near", {
    p_center_id: dest.id, p_radius_nm: ALTERNATE_RADIUS_NM, p_test_airport_id: locations.test_airport.id,
  });
  const destRows = ((nearDest ?? []) as PoaAirport[]).filter((a) => a.facility_type_code === "A" && a.facility_use_code === "PU" && (a.approach_kinds ?? []).length);
  const { data: destIds } = destRows.length
    ? await supabase.from("faa_airports").select("id, faa_identifier").in("id", destRows.map((a) => a.id))
    : { data: [] as { id: string; faa_identifier: string }[] };
  const faaNear = new Map((destIds ?? []).map((r) => [r.id as string, r.faa_identifier as string]));
  const candIds = [...new Set([...faaNear.values()])];
  const [altMins, altNotes, candAtc, candAppr] = candIds.length
    ? await Promise.all([
        supabase.from("faa_alternate_minimums").select("faa_identifier, procedure_name, status").in("faa_identifier", candIds),
        supabase.from("faa_alternate_notes").select("faa_identifier, note_text").in("faa_identifier", candIds),
        supabase.from("faa_atc_facilities").select("faa_identifier, facility_type, tower_call, tower_hours, is_towered, is_part_time_tower, approach_call, departure_call").in("faa_identifier", candIds),
        supabase.from("faa_airport_approaches").select("faa_identifier, procedure_name").in("faa_identifier", candIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const alternateCandidates: AlternateCandidate[] = destRows
    .filter((a) => faaNear.get(a.id))
    .map((a) => {
      const faa = faaNear.get(a.id)!;
      return {
        ident: a.ident, faa_identifier: faa, airport_name: a.airport_name, city: a.city, latitude: a.latitude, longitude: a.longitude,
        elevation_feet: a.elevation_feet, distance_nm: distanceNm(dest, a),
        atc: ((candAtc.data ?? []) as AtcFacility[]).find((r) => r.faa_identifier === faa) ?? null,
        approaches: ((candAppr.data ?? []) as { faa_identifier: string; procedure_name: string }[]).filter((r) => r.faa_identifier === faa).map((r) => r.procedure_name),
        alternate_minimums: ((altMins.data ?? []) as { faa_identifier: string; procedure_name: string; status: "na" | "nonstandard" }[])
          .filter((r) => r.faa_identifier === faa).map(({ procedure_name, status }) => ({ procedure_name, status })),
        alternate_note: ((altNotes.data ?? []) as { faa_identifier: string; note_text: string }[]).find((r) => r.faa_identifier === faa)?.note_text ?? null,
      };
    });

  return {
    departure, destination, alternate, alternateCandidates,
    magVarEast: Object.fromEntries((mag.data ?? []).map((r) => [r.faa_identifier as string, Number(r.mag_var_east_deg)])),
    atc: atcBy,
    frequencies: ((freqs.data ?? []) as FrequencyRow[]).map((r) => ({ ...r, frequency_mhz: Number(r.frequency_mhz) })),
    sids: (sids.data ?? []) as DepartureProcedure[],
    approaches: (approaches.data ?? []) as ApproachRow[],
    ils: ((ils.data ?? []) as IlsRow[]).map((r) => ({ ...r, approach_course_mag: r.approach_course_mag === null ? null : Number(r.approach_course_mag) })),
    navaids: (navaids.data ?? []) as NavaidRow[],
    nearbyForVoid,
    equipment,
  };
}
