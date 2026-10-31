"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { QualificationField } from "@/lib/qualification/instrument";
import { airportCode, distanceNm, LEG_NAMES, MAX_LEGS, parseLegs, type Airport, type Leg } from "@/lib/qualification/legs";

// Cross-country legs (Kele, Oct 31 2026): each leg on one line — date, departure, destination, distance.
// The distance fills in from the FAA airport list; it can be typed only when an airport isn't in the list
// (a seaplane base or private strip), and the examiner then checks it.

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

export function LegFields({
  field,
  value,
  disabled,
  id,
  onChange,
}: {
  field: QualificationField & { maxLegs?: number };
  value: unknown;
  disabled: boolean;
  id: string;
  onChange: (value: string) => void;
}) {
  const stored = parseLegs(value);
  const legs: Leg[] = stored.length ? stored : [{ date: "", departure: "", destination: "", distance_nm: "" }];
  const maxLegs = Math.min(MAX_LEGS, field.maxLegs ?? MAX_LEGS);
  // code -> airport, or null when the FAA list doesn't have it.
  const [airports, setAirports] = useState<Record<string, Airport | null>>({});
  const pending = useRef(new Set<string>());

  const codesKey = Array.from(new Set(legs.flatMap((leg) => [airportCode(leg.departure), airportCode(leg.destination)]).filter((code) => code.length >= 3))).join(",");
  const codes = useMemo(() => (codesKey ? codesKey.split(",") : []), [codesKey]);

  // Look up airports that haven't been looked up yet (after typing pauses).
  useEffect(() => {
    const missing = codes.filter((code) => !(code in airports) && !pending.current.has(code));
    if (!missing.length) return;
    const timer = window.setTimeout(async () => {
      missing.forEach((code) => pending.current.add(code));
      const faaCodes = Array.from(new Set(missing.flatMap((code) => (code.length === 4 && code.startsWith("K") ? [code, code.slice(1)] : [code]))));
      const { data } = await createClient()
        .from("faa_airports")
        .select("faa_identifier, icao_identifier, airport_name, latitude, longitude, state_code")
        .or(`faa_identifier.in.(${faaCodes.join(",")}),icao_identifier.in.(${missing.join(",")})`)
        .limit(50);
      const rows = (data ?? []) as Array<{ faa_identifier: string; icao_identifier: string | null; airport_name: string; latitude: number; longitude: number; state_code: string | null }>;
      const found: Record<string, Airport | null> = {};
      for (const code of missing) {
        const row =
          rows.find((item) => item.icao_identifier?.toUpperCase() === code) ??
          rows.find((item) => item.faa_identifier?.toUpperCase() === code) ??
          (code.length === 4 && code.startsWith("K") ? rows.find((item) => item.faa_identifier?.toUpperCase() === code.slice(1)) : undefined);
        found[code] = row ? { code, name: row.airport_name, latitude: row.latitude, longitude: row.longitude, state: row.state_code } : null;
        pending.current.delete(code);
      }
      setAirports((current) => ({ ...current, ...found }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [codes, airports]);

  const computed = legs.map((leg) => {
    const from = airports[airportCode(leg.departure)];
    const to = airports[airportCode(leg.destination)];
    return from && to ? String(distanceNm(from, to)) : null;
  });

  // Fill in the computed distances.
  useEffect(() => {
    if (disabled) return;
    if (computed.some((distance, index) => distance !== null && distance !== legs[index].distance_nm)) {
      onChange(JSON.stringify(legs.map((leg, index) => (computed[index] !== null ? { ...leg, distance_nm: computed[index] } : leg))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed.join("|"), disabled]);

  const save = (next: Leg[]) => onChange(JSON.stringify(next));
  const update = (index: number, key: keyof Leg, next: string) =>
    save(legs.map((leg, i) => (i === index ? { ...leg, [key]: key === "departure" || key === "destination" ? next.toUpperCase() : next } : leg)));
  const addLeg = () => {
    const last = legs[legs.length - 1];
    save([...legs, { date: last?.date ?? "", departure: last?.destination ?? "", destination: "", distance_nm: "" }]);
  };

  const total = Math.round(legs.reduce((sum, leg) => sum + (Number(leg.distance_nm) || 0), 0) * 10) / 10;
  const longest = Math.max(0, ...legs.map((leg) => Number(leg.distance_nm) || 0));

  const airportNote = (code: string) => {
    if (code.length < 3) return null;
    if (!(code in airports)) return <span className="text-slate-400">Looking up…</span>;
    const airport = airports[code];
    return airport ? <span className="text-slate-500">{airport.name}</span> : <span className="text-amber-700">Not in the FAA airport list</span>;
  };

  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="mb-1 text-sm font-semibold text-slate-800">{field.label ?? "Flight legs"}</legend>
      <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
        Enter your cross-country flight information for each leg. For example, if you flew HNL-LNY-OGG-HNL, enter the first leg as
        HNL-LNY, the second leg as LNY-OGG, and so on. The distance between the two points will be automatically calculated.
      </p>
      {legs.map((leg, index) => {
        const manual = computed[index] === null && airportCode(leg.departure).length >= 3 && airportCode(leg.destination).length >= 3 &&
          (airports[airportCode(leg.departure)] === null || airports[airportCode(leg.destination)] === null);
        return (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">{LEG_NAMES[index] ?? `Leg ${index + 1}`}</span>
              {index > 0 ? (
                <button type="button" disabled={disabled} onClick={() => save(legs.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-700 disabled:opacity-50">
                  Remove leg
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <label className="block text-xs font-semibold text-slate-700" style={{ width: "9rem" }}>
                Flight date
                <input id={`${id}-${index}-date`} type="date" value={leg.date ?? ""} disabled={disabled} onChange={(event) => update(index, "date", event.target.value)} className={`mt-1 ${input}`} />
              </label>
              <label className="block text-xs font-semibold text-slate-700" style={{ width: "10rem" }}>
                Departure point
                <input id={`${id}-${index}-departure`} value={leg.departure ?? ""} disabled={disabled} maxLength={5} placeholder="e.g. PHNL" onChange={(event) => update(index, "departure", event.target.value)} className={`mt-1 uppercase ${input}`} />
                <span className="mt-1 block truncate text-[11px] font-normal">{airportNote(airportCode(leg.departure))}</span>
              </label>
              <label className="block text-xs font-semibold text-slate-700" style={{ width: "10rem" }}>
                Destination
                <input id={`${id}-${index}-destination`} value={leg.destination ?? ""} disabled={disabled} maxLength={5} placeholder="e.g. PHOG" onChange={(event) => update(index, "destination", event.target.value)} className={`mt-1 uppercase ${input}`} />
                <span className="mt-1 block truncate text-[11px] font-normal">{airportNote(airportCode(leg.destination))}</span>
              </label>
              <label className="block text-xs font-semibold text-slate-700" style={{ width: "8rem" }}>
                Distance (NM)
                <input
                  id={`${id}-${index}-distance`}
                  type="number"
                  min={0}
                  step="0.1"
                  value={leg.distance_nm ?? ""}
                  disabled={disabled}
                  readOnly={!manual}
                  placeholder={manual ? "Enter NM" : "Auto"}
                  onChange={(event) => update(index, "distance_nm", event.target.value)}
                  className={`mt-1 ${input} ${manual ? "" : "bg-slate-50 text-slate-700"}`}
                />
                <span className="mt-1 block text-[11px] font-normal text-slate-500">{manual ? "Enter the distance; the examiner checks it." : computed[index] !== null ? "Straight-line distance" : ""}</span>
              </label>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {legs.length < maxLegs ? (
          <button type="button" disabled={disabled} onClick={addLeg} className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:opacity-50">
            + Add another leg
          </button>
        ) : (
          <span className="text-xs text-slate-500">Up to {maxLegs} legs.</span>
        )}
        <p className="text-sm text-slate-700">
          <strong>Total distance:</strong> {total} NM{legs.length > 1 ? <> · <strong>Longest leg:</strong> {longest} NM</> : null}
        </p>
      </div>
    </fieldset>
  );
}
