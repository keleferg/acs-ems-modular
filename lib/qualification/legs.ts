// Cross-country legs on qualification route cards (Kele, Oct 31 2026).
// A card stores its legs as a JSON list under answer_value.legs:
//   [{ date, departure, destination, distance_nm }]
// The page fills distance_nm from the FAA airport list; the database recomputes it on save
// (qualification_private.evaluate_route_answer) and checks the regulatory distances.

export type Leg = { date?: string; departure?: string; destination?: string; distance_nm?: string };
export type Airport = { code: string; name: string; latitude: number; longitude: number; state: string | null };

export const MAX_LEGS = 6;
export const LEG_NAMES = ["First Leg", "Second Leg", "Third Leg", "Fourth Leg", "Fifth Leg", "Sixth Leg"];

export function parseLegs(value: unknown): Leg[] {
  try {
    const rows = typeof value === "string" ? (value.trim() ? JSON.parse(value) : []) : value;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && typeof row === "object" && !Array.isArray(row))
      .map((row) => ({
        date: row.date == null ? "" : String(row.date),
        departure: row.departure == null ? "" : String(row.departure),
        destination: row.destination == null ? "" : String(row.destination),
        distance_nm: row.distance_nm == null ? "" : String(row.distance_nm),
      }));
  } catch {
    return [];
  }
}

export function airportCode(value: string | undefined) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Great-circle distance in nautical miles, one decimal. */
export function distanceNm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h))) * 10) / 10;
}

/** Every leg has a date, both airports and a distance. */
export function legsComplete(value: unknown) {
  const legs = parseLegs(value);
  return (
    legs.length > 0 &&
    legs.every(
      (leg) =>
        /^\d{4}-\d{2}-\d{2}$/.test(leg.date ?? "") &&
        airportCode(leg.departure).length >= 2 &&
        airportCode(leg.destination).length >= 2 &&
        Number.isFinite(Number(leg.distance_nm)) &&
        String(leg.distance_nm ?? "").trim() !== "",
    )
  );
}

/** "HNL → OGG → KOA · 3 legs, 221.4 NM" for summaries. */
export function legsSummary(value: unknown) {
  const legs = parseLegs(value);
  if (!legs.length) return "";
  const points = [airportCode(legs[0].departure), ...legs.map((leg) => airportCode(leg.destination))].filter(Boolean);
  const total = legs.reduce((sum, leg) => sum + (Number(leg.distance_nm) || 0), 0);
  return `${points.join(" → ")} · ${legs.length} leg${legs.length === 1 ? "" : "s"}, ${Math.round(total * 10) / 10} NM`;
}
