"use client";

// Real places for the POA (Kele, Nov 11 2026): departure within 200 NM of the test airport,
// destination within 500 NM of the departure, farther only from approved exceptions.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, RefreshCw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DEPARTURE_RADIUS_NM,
  LEG_RADIUS_NM,
  alternateOptions,
  departureOptions,
  destinationOptions,
  distanceNm,
  hasFuel,
  patternAirportOptions,
  pickPoaLocations,
  pickStops,
  placeLabel,
  practiceAreaOptions,
  type LocationNeeds,
  type PickedPlace,
  type PoaAirport,
  type PoaLocations,
} from "@/lib/poa/locations";
import type { SavedLocations } from "@/lib/poa/location-rewrite";

type DataStatus = { runways: boolean; approaches: boolean; seaplane_bases: boolean };
type ExceptionRow = { id: string; airport_id: string; note: string | null; faa_airports: { icao_identifier: string | null; faa_identifier: string; airport_name: string } | null };

type Props = {
  /** Test airport from the linked request (practical_test_requests.flight_airport_id). */
  requestAirportId: string | null;
  needs: Omit<LocationNeeds, "approachDataLoaded" | "runwayDataLoaded">;
  /** Changes when the scenario changes, so the places are picked again. */
  scenarioKey: string;
  onChange: (locations: PoaLocations | null) => void;
  /** A saved POA's places: shown as they are instead of picking new ones (edit page). */
  initial?: SavedLocations | null;
};

type Slot = "departure" | "destination" | "alternate" | "practice_area" | "pattern_airport";
const SLOT_LABEL: Record<Slot, string> = {
  departure: "Departure",
  destination: "Destination",
  alternate: "Alternate",
  practice_area: "Practice area near",
  pattern_airport: "Pattern work at",
};

const NOT_SET_UP =
  "Real airports aren't set up on the database yet, so this POA uses the scenario's own places. They'll appear here once the airport update is installed.";

async function airportsNear(centerId: string, radius: number, testAirportId: string) {
  const { data, error } = await createClient().rpc("examiner_poa_airports_near", {
    p_center_id: centerId,
    p_radius_nm: radius,
    p_test_airport_id: testAirportId,
  });
  if (error) {
    // The airport function comes with the poa_locations migration; before it's applied, say so plainly.
    if (error.code === "PGRST202" || /schema cache|does not exist/i.test(error.message)) throw new Error(NOT_SET_UP);
    throw new Error(error.message);
  }
  return (data ?? []) as PoaAirport[];
}

export function PoaLocationsPanel({ requestAirportId, needs, scenarioKey, onChange, initial }: Props) {
  // Used once, on the first load of the test airport.
  const restoreRef = useRef<SavedLocations | null>(initial?.departure ? initial : null);
  const startAirportId = requestAirportId ?? initial?.test_airport?.id ?? null;
  const [testAirport, setTestAirport] = useState<PoaAirport | null>(null);
  const [testIdent, setTestIdent] = useState("");
  const [nearTest, setNearTest] = useState<PoaAirport[]>([]);
  const [nearDep, setNearDep] = useState<PoaAirport[]>([]);
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [locations, setLocations] = useState<PoaLocations | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [exceptionIdent, setExceptionIdent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullNeeds: LocationNeeds = useMemo(
    () => ({ ...needs, approachDataLoaded: Boolean(status?.approaches), runwayDataLoaded: Boolean(status?.runways) }),
    [needs, status],
  );

  const update = useCallback(
    (next: PoaLocations | null) => {
      setLocations(next);
      onChange(next);
    },
    [onChange],
  );

  const findAirport = useCallback(async (ident: string) => {
    const code = ident.trim().toUpperCase();
    if (!code) return null;
    const { data } = await createClient()
      .from("faa_airports")
      .select("id")
      .or(`icao_identifier.eq.${code},faa_identifier.eq.${code}`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }, []);

  const loadTest = useCallback(
    async (airportId: string) => {
      setLoading(true);
      setError("");
      try {
        const supabase = createClient();
        const [{ data: statusData }, near, { data: exceptionRows }] = await Promise.all([
          supabase.rpc("poa_location_data_status"),
          // Departure ring plus the destination ring, so a swapped departure still has places.
          airportsNear(airportId, DEPARTURE_RADIUS_NM + LEG_RADIUS_NM, airportId),
          supabase
            .from("poa_location_exceptions")
            .select("id, airport_id, note, faa_airports!poa_location_exceptions_airport_id_fkey(icao_identifier, faa_identifier, airport_name)")
            .eq("test_airport_id", airportId),
        ]);
        const test = near.find((a) => a.id === airportId) ?? null;
        if (!test) throw new Error("That test airport isn't in the FAA airport list.");
        setStatus(statusData as DataStatus);
        setTestAirport(test);
        setTestIdent(test.ident);
        setNearTest(near);
        setExceptions((exceptionRows ?? []) as unknown as ExceptionRow[]);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Airports could not be loaded.");
        update(null);
      } finally {
        setLoading(false);
      }
    },
    [update],
  );

  useEffect(() => {
    if (startAirportId) void loadTest(startAirportId);
  }, [startAirportId, loadTest]);

  /** The saved places, looked up again so they can be changed. False when one can't be found. */
  const restore = useCallback(
    async (saved: SavedLocations) => {
      if (!testAirport) return false;
      const wanted = [saved.departure, saved.destination, saved.alternate, saved.practice_area, saved.pattern_airport, ...(saved.stops ?? [])]
        .filter((place): place is NonNullable<typeof place> => Boolean(place));
      let pool = nearTest;
      const dep = pool.find((a) => a.id === saved.departure?.id);
      if (!dep) return false;
      if (wanted.some((place) => !pool.some((a) => a.id === place.id))) {
        // An alternate or stop can sit past the test airport's ring.
        try {
          const extra = await airportsNear(dep.id, LEG_RADIUS_NM + 200, testAirport.id);
          pool = [...pool, ...extra.filter((a) => !pool.some((b) => b.id === a.id))];
        } catch {
          return false;
        }
      }
      const byId = new Map(pool.map((a) => [a.id, a]));
      const at = (place: { id: string } | null | undefined, from: PoaAirport): PickedPlace | null => {
        const airport = place ? byId.get(place.id) : null;
        return airport ? { ...airport, distance_nm: Math.round(distanceNm(from, airport)), from: from.ident } : null;
      };
      const departure = at(saved.departure, testAirport)!;
      const destination = at(saved.destination, dep);
      let previous: PoaAirport = dep;
      const stops = (saved.stops ?? []).flatMap((stop) => {
        const picked = at(stop, previous);
        if (picked) previous = picked;
        return picked ? [picked] : [];
      });
      setNearDep(pool.filter((a) => a.is_exception || distanceNm(dep, a) <= LEG_RADIUS_NM));
      update({
        test_airport: testAirport,
        departure,
        destination,
        alternate: destination ? at(saved.alternate, destination) : null,
        practice_area: at(saved.practice_area, dep),
        pattern_airport: at(saved.pattern_airport, dep),
        stops,
        warnings: saved.warnings ?? [],
      });
      return true;
    },
    [testAirport, nearTest, update],
  );

  const repick = useCallback(
    async (fixedDepartureId?: string | null) => {
      if (!testAirport || !nearTest.length) return;
      const within = (center: PoaAirport, radius: number) =>
        nearTest.filter((a) => a.is_exception || distanceNm(center, a) <= radius);
      const next = pickPoaLocations(
        testAirport,
        within(testAirport, DEPARTURE_RADIUS_NM),
        (departure) => within(departure, LEG_RADIUS_NM),
        fullNeeds,
        Math.random,
        { departureId: fixedDepartureId },
      );
      setNearDep(within(next.departure, LEG_RADIUS_NM));
      update(next);
    },
    [testAirport, nearTest, fullNeeds, update],
  );

  // New test airport, data or scenario: pick again (a saved POA first shows its own places).
  useEffect(() => {
    if (!testAirport || !nearTest.length) return;
    const saved = restoreRef.current;
    if (saved) {
      restoreRef.current = null;
      void restore(saved).then((ok) => {
        if (!ok) void repick();
      });
      return;
    }
    void repick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testAirport, nearTest, scenarioKey, needs.destinationKind, needs.instrument, (needs.stops ?? []).join(","), needs.preferRiver]);

  const options = useMemo(() => {
    if (!testAirport || !locations) return null;
    const dep = locations.departure;
    return {
      departure: departureOptions(testAirport, nearTest.filter((a) => a.is_exception || distanceNm(testAirport, a) <= DEPARTURE_RADIUS_NM), fullNeeds),
      destination: destinationOptions(dep, nearDep, fullNeeds),
      alternate: locations.destination ? alternateOptions(dep, locations.destination, nearDep, fullNeeds) : [],
      practice_area: practiceAreaOptions(dep, nearDep),
      pattern_airport: patternAirportOptions(dep, nearDep, fullNeeds),
    } satisfies Record<Slot, PoaAirport[]>;
  }, [testAirport, locations, nearTest, nearDep, fullNeeds]);

  function choose(slot: Slot, airportId: string) {
    if (!locations || !options) return;
    if (slot === "departure") {
      void repick(airportId);
      return;
    }
    const airport = options[slot].find((a) => a.id === airportId);
    if (!airport) return;
    const from = slot === "alternate" && locations.destination ? locations.destination : locations.departure;
    const picked: PickedPlace = { ...airport, distance_nm: Math.round(distanceNm(from, airport)), from: from.ident };
    if (slot === "destination" && needs.stops?.length) {
      // A new destination moves the course, so the ferry stops are picked again.
      const warnings: string[] = [];
      const stops = pickStops(locations.departure, airport, nearDep, needs.stops, Boolean(needs.preferRiver), Math.random, warnings);
      update({ ...locations, destination: picked, stops, warnings });
      return;
    }
    update({ ...locations, [slot]: picked });
  }

  async function addException() {
    if (!testAirport) return;
    const airportId = await findAirport(exceptionIdent);
    if (!airportId) {
      setError(`No airport found for "${exceptionIdent}".`);
      return;
    }
    const { error: insertError } = await createClient()
      .from("poa_location_exceptions")
      .insert({ test_airport_id: testAirport.id, airport_id: airportId });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setExceptionIdent("");
    await loadTest(testAirport.id);
  }

  async function removeException(id: string) {
    if (!testAirport) return;
    await createClient().from("poa_location_exceptions").delete().eq("id", id);
    await loadTest(testAirport.id);
  }

  const slots: Slot[] = needs.instrument
    ? ["departure", "destination", "alternate", "practice_area", "pattern_airport"]
    : ["departure", "destination", "practice_area", "pattern_airport"];

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-sky-700" /> Locations
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Real airports: departure within {DEPARTURE_RADIUS_NM} NM of the test airport, destination within{" "}
            {LEG_RADIUS_NM} NM of the departure. Farther airports only from your approved list below.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs font-semibold text-slate-700">
            Test airport
            <input
              value={testIdent}
              onChange={(event) => setTestIdent(event.target.value.toUpperCase())}
              placeholder="PHNL"
              className="mt-1 block w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              const id = await findAirport(testIdent);
              if (id) void loadTest(id);
              else setError(`No airport found for "${testIdent}".`);
            }}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Use
          </button>
          <button
            type="button"
            disabled={!testAirport || loading}
            onClick={() => void repick()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Pick again
          </button>
        </div>
      </div>

      {error ? (
        <p className={`mt-3 text-xs font-semibold ${error === NOT_SET_UP ? "text-slate-600" : "text-red-700"}`}>{error}</p>
      ) : null}
      {!testAirport && !loading && error !== NOT_SET_UP ? (
        <p className="mt-3 text-xs font-semibold text-amber-700">Enter the test airport to pick the POA&apos;s places.</p>
      ) : null}

      {locations && options ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const current = locations[slot];
            return (
              <label key={slot} className="text-xs font-semibold text-slate-700">
                {SLOT_LABEL[slot]}
                <select
                  value={current?.id ?? ""}
                  onChange={(event) => choose(slot, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {!current ? <option value="">None found</option> : null}
                  {options[slot].map((airport) => {
                    const from = slot === "departure" ? testAirport! : slot === "alternate" && locations.destination ? locations.destination : locations.departure;
                    return (
                      <option key={airport.id} value={airport.id}>
                        {placeLabel(airport)} · {Math.round(distanceNm(from, airport))} NM{airport.is_exception ? " · approved" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
            );
          })}
        </div>
      ) : null}

      {locations?.stops?.length ? (
        <div className="mt-3 text-xs text-slate-700">
          <p className="font-semibold">Ferry stops (pick again for others)</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            {locations.stops.map((stop) => (
              <li key={stop.id}>
                {placeLabel(stop)} · {stop.distance_nm} NM from {stop.from} ·{" "}
                <span className={hasFuel(stop) ? "text-emerald-700" : "text-amber-700"}>
                  {hasFuel(stop) ? `fuel: ${stop.fuel_types}` : "no fuel"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {locations?.warnings.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">
          {locations.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {testAirport ? (
        <details className="mt-4 text-xs text-slate-700">
          <summary className="cursor-pointer font-semibold">
            Approved beyond the limits for {testAirport.ident} ({exceptions.length})
          </summary>
          <div className="mt-2 space-y-1">
            {exceptions.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <span>
                  {row.faa_airports
                    ? placeLabel({ airport_name: row.faa_airports.airport_name, ident: row.faa_airports.icao_identifier ?? row.faa_airports.faa_identifier })
                    : row.airport_id}
                </span>
                <button type="button" onClick={() => void removeException(row.id)} className="text-slate-400 hover:text-red-700" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={exceptionIdent}
                onChange={(event) => setExceptionIdent(event.target.value.toUpperCase())}
                placeholder="Airport ID"
                className="w-28 rounded-lg border border-slate-300 px-2 py-1 uppercase"
              />
              <button type="button" onClick={() => void addException()} className="rounded-lg border border-slate-300 px-2 py-1 font-semibold hover:bg-slate-50">
                Approve
              </button>
            </div>
          </div>
        </details>
      ) : null}
    </section>
  );
}
