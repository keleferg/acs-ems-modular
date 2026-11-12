// Changing a saved POA's airports (Kele, Nov 12 2026): the question and trigger
// wording was filled in with the old places when the POA was built, so a new
// departure or destination swaps the old wording for the new.

import { fillTemplateText } from "./template-build";

/** generated_plan_of_actions.location_snapshot as saved (see locationSnapshot). */
export type SavedPlace = {
  id: string;
  ident: string;
  name: string;
  distance_nm?: number;
  from?: string;
  approved_exception?: boolean;
  fuel?: string | null;
};
export type SavedLocations = {
  test_airport: SavedPlace | null;
  departure: SavedPlace | null;
  destination: SavedPlace | null;
  alternate: SavedPlace | null;
  practice_area: SavedPlace | null;
  pattern_airport: SavedPlace | null;
  stops?: SavedPlace[];
  warnings?: string[];
  /** The fill-ins the wording was built with (saved from Nov 12 2026 on). */
  fills?: Record<string, string | null>;
};

export const savedPlaceLabel = (place: SavedPlace) => `${place.name} (${place.ident})`;

/**
 * The location fill-ins a saved POA was built with. Newer POAs store them;
 * older ones are rebuilt from the saved places (ferry stops can't be, so a
 * stop list in older wording stays as it is).
 */
export function savedLocationFills(
  saved: SavedLocations | null,
  fallback: { departure?: string | null; destination?: string | null } = {},
): Record<string, string | null> {
  if (saved?.fills) {
    // Where no place was found, the wording used the scenario's own text.
    const departure = saved.fills.departure ?? fallback.departure ?? null;
    return {
      ...saved.fills,
      departure,
      "home airport": saved.fills["home airport"] ?? departure,
      destination: saved.fills.destination ?? fallback.destination ?? null,
    };
  }
  if (!saved?.departure) {
    return {
      departure: fallback.departure ?? null,
      "home airport": fallback.departure ?? null,
      destination: fallback.destination ?? null,
    };
  }
  const departure = savedPlaceLabel(saved.departure);
  const out: Record<string, string | null> = {
    departure,
    "home airport": departure,
    destination: saved.destination ? savedPlaceLabel(saved.destination) : fallback.destination ?? null,
    alternate: saved.alternate ? savedPlaceLabel(saved.alternate) : null,
    "practice area": `practice area near ${(saved.practice_area ?? saved.departure).name}`,
    "pattern airport": saved.pattern_airport ? savedPlaceLabel(saved.pattern_airport) : departure,
  };
  const stops = saved.stops ?? [];
  const withFuel = stops.find((stop) => (stop.fuel ?? "").trim());
  const without = stops.find((stop) => !(stop.fuel ?? "").trim());
  if (withFuel) out["fuel stop"] = savedPlaceLabel(withFuel);
  if (without) out["no fuel stop"] = savedPlaceLabel(without);
  return out;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pairs of old → new wording, longest first so "Hilo (PHTO)" goes before "Hilo". */
export function fillChanges(
  oldFills: Record<string, string | null | undefined>,
  newFills: Record<string, string | null | undefined>,
) {
  const pairs = new Map<string, string>();
  for (const [key, before] of Object.entries(oldFills)) {
    const after = newFills[key];
    // Short values (a squawk digit, "2") would match unrelated text.
    if (!before || !after || before === after || before.trim().length < 4) continue;
    if (!pairs.has(before)) pairs.set(before, after);
  }
  return [...pairs.entries()].sort((a, b) => b[0].length - a[0].length);
}

/** The old wording swapped for the new, then any [fill-in] left over filled. */
export function rewriteForNewPlaces(
  text: string,
  changes: Array<[string, string]>,
  newFills: Record<string, string | null | undefined>,
) {
  if (!text) return text;
  let out = text;
  // Two steps through markers, so a new value that equals another old value isn't swapped again.
  changes.forEach(([before], index) => {
    const lower = before.charAt(0).toLowerCase() + before.slice(1);
    const upper = before.charAt(0).toUpperCase() + before.slice(1);
    for (const [form, marker] of [[upper, `\u0000U${index}\u0000`], [lower, `\u0000L${index}\u0000`]] as const) {
      out = out.replace(new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(form)}(?![A-Za-z0-9])`, "g"), marker);
    }
  });
  changes.forEach(([, after], index) => {
    out = out
      .replaceAll(`\u0000U${index}\u0000`, after.charAt(0).toUpperCase() + after.slice(1))
      .replaceAll(`\u0000L${index}\u0000`, after);
  });
  return fillTemplateText(out, newFills);
}

/** Wording the new places can't supply: the old value stays in the text and needs a look. */
export function staleValues(
  oldFills: Record<string, string | null | undefined>,
  newFills: Record<string, string | null | undefined>,
) {
  return Object.entries(oldFills)
    .filter(([key, before]) => before && before.trim().length >= 4 && !newFills[key])
    .map(([key, before]) => ({ key, value: before as string }));
}
