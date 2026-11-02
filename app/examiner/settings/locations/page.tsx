"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AirportSelector, { type AirportSelection } from "@/components/practical-test/airport-selector";
import { createClient } from "@/lib/supabase/client";

// Settings → Locations (Kele, Nov 2 2026): the airports, states and FAA regions this examiner
// wants open assignments from. Open Assignments shows only matching requests (with a "show all"
// switch) and an email goes out when a new matching open assignment appears. Flight schools,
// oral-test locations and default airports are managed in Admin → Schools.

type Area = {
  id: string;
  kind: "airport" | "state" | "region";
  airport_id: string | null;
  radius_nm: number;
  state_code: string | null;
  region_code: string | null;
  faa_airports: {
    faa_identifier: string;
    icao_identifier: string | null;
    airport_name: string;
    city: string | null;
    state_code: string | null;
  } | null;
};

type Preferences = {
  filter_open_assignments: boolean;
  email_alerts: boolean;
};

const FAA_REGIONS: { code: string; name: string; states: string[] }[] = [
  { code: "AAL", name: "Alaskan", states: ["AK"] },
  { code: "ACE", name: "Central", states: ["IA", "KS", "MO", "NE"] },
  { code: "AEA", name: "Eastern", states: ["DC", "DE", "MD", "NJ", "NY", "PA", "VA", "WV"] },
  { code: "AGL", name: "Great Lakes", states: ["IL", "IN", "MI", "MN", "ND", "OH", "SD", "WI"] },
  { code: "ANE", name: "New England", states: ["CT", "MA", "ME", "NH", "RI", "VT"] },
  { code: "ANM", name: "Northwest Mountain", states: ["CO", "ID", "MT", "OR", "UT", "WA", "WY"] },
  { code: "ASO", name: "Southern", states: ["AL", "FL", "GA", "KY", "MS", "NC", "SC", "TN", "PR", "VI"] },
  { code: "ASW", name: "Southwest", states: ["AR", "LA", "NM", "OK", "TX"] },
  { code: "AWP", name: "Western-Pacific", states: ["AZ", "CA", "HI", "NV", "GU", "AS", "MP"] },
];

const STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["PR", "Puerto Rico"], ["VI", "U.S. Virgin Islands"], ["GU", "Guam"], ["AS", "American Samoa"],
  ["MP", "Northern Mariana Islands"],
];

const RADII = [0, 25, 50, 100, 150, 250];

const DEFAULT_PREFERENCES: Preferences = { filter_open_assignments: true, email_alerts: true };

function areaLabel(area: Area) {
  if (area.kind === "airport") {
    const airport = area.faa_airports;
    const code = airport ? airport.icao_identifier || airport.faa_identifier : "Airport";
    const place = airport ? ` — ${airport.airport_name}${airport.city ? `, ${airport.city}` : ""}${airport.state_code ? `, ${airport.state_code}` : ""}` : "";
    return area.radius_nm > 0 ? `Within ${area.radius_nm} NM of ${code}${place}` : `${code}${place}`;
  }
  if (area.kind === "state") {
    return STATES.find(([code]) => code === area.state_code)?.[1] ?? area.state_code ?? "State";
  }
  const region = FAA_REGIONS.find((item) => item.code === area.region_code);
  return region ? `${region.name} Region (${region.states.join(", ")})` : area.region_code ?? "Region";
}

export default function LocationsSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [kind, setKind] = useState<Area["kind"]>("airport");
  const [airport, setAirport] = useState<AirportSelection | null>(null);
  const [radius, setRadius] = useState(50);
  const [stateCode, setStateCode] = useState("");
  const [regionCode, setRegionCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setErrorMessage("Your login session could not be verified. Please sign in again.");
      setLoading(false);
      return;
    }
    setUserId(auth.user.id);
    const [prefResult, areaResult] = await Promise.all([
      supabase
        .from("examiner_location_preferences")
        .select("filter_open_assignments, email_alerts")
        .eq("profile_id", auth.user.id)
        .maybeSingle(),
      supabase
        .from("examiner_alert_areas")
        .select(
          "id, kind, airport_id, radius_nm, state_code, region_code, faa_airports ( faa_identifier, icao_identifier, airport_name, city, state_code )",
        )
        .eq("profile_id", auth.user.id)
        .order("created_at", { ascending: true }),
    ]);
    if (prefResult.error || areaResult.error) {
      setErrorMessage(`Your locations could not be loaded: ${(prefResult.error ?? areaResult.error)?.message}`);
    } else {
      setPreferences((prefResult.data as Preferences | null) ?? DEFAULT_PREFERENCES);
      setAreas((areaResult.data ?? []) as unknown as Area[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePreferences(next: Preferences) {
    setPreferences(next);
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase
      .from("examiner_location_preferences")
      .upsert({ profile_id: userId, ...next, updated_at: new Date().toISOString() });
    if (error) setErrorMessage(`Your settings could not be saved: ${error.message}`);
    else setMessage("Saved.");
  }

  async function addArea() {
    if (busy || !userId) return;
    const row =
      kind === "airport"
        ? airport
          ? { kind, airport_id: airport.id, radius_nm: radius }
          : null
        : kind === "state"
          ? stateCode
            ? { kind, state_code: stateCode }
            : null
          : regionCode
            ? { kind, region_code: regionCode }
            : null;
    if (!row) {
      setErrorMessage(kind === "airport" ? "Search for an airport first." : `Choose a ${kind}.`);
      return;
    }
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    // The first area also turns the preferences on (filter + email), unless changed later.
    if (areas.length === 0) {
      await supabase
        .from("examiner_location_preferences")
        .upsert({ profile_id: userId, ...preferences, updated_at: new Date().toISOString() });
    }
    const { error } = await supabase.from("examiner_alert_areas").insert({ profile_id: userId, ...row });
    setBusy(false);
    if (error) {
      setErrorMessage(error.code === "23505" ? "That area is already on your list." : `The area could not be added: ${error.message}`);
      return;
    }
    setAirport(null);
    setStateCode("");
    setRegionCode("");
    setMessage("Area added.");
    void load();
  }

  async function removeArea(area: Area) {
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.from("examiner_alert_areas").delete().eq("id", area.id);
    if (error) {
      setErrorMessage(`The area could not be removed: ${error.message}`);
      return;
    }
    setAreas((current) => current.filter((item) => item.id !== area.id));
    setMessage("Area removed.");
  }

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Settings</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Locations</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Choose the airports, states or FAA regions you want open assignments from. Open Assignments then
          shows only requests whose flight-test airport is in one of your areas, and you get an email when a
          new one appears. Requests without a flight airport are always shown.
        </p>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}
      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{errorMessage}</div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Your areas</h3>

        {loading ? <p className="mt-3 text-sm text-slate-600">Loading…</p> : null}

        {!loading && areas.length === 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No areas yet, so you see every open assignment and get no emails. Add an airport, state or region below.
          </p>
        ) : null}

        {areas.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {areas.map((area) => (
              <li key={area.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                    {area.kind === "airport" ? "Airport" : area.kind === "state" ? "State" : "FAA region"}
                  </span>
                  <span className="text-slate-900">{areaLabel(area)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void removeArea(area)}
                  className="shrink-0 font-semibold text-red-700 hover:text-red-900"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Add an area</p>
          <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button type="button" className={tabClass(kind === "airport")} onClick={() => setKind("airport")}>
              Airport
            </button>
            <button type="button" className={tabClass(kind === "state")} onClick={() => setKind("state")}>
              State
            </button>
            <button type="button" className={tabClass(kind === "region")} onClick={() => setKind("region")}>
              FAA region
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            {kind === "airport" ? (
              <>
                <div className="min-w-[18rem] flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Airport</label>
                  <AirportSelector
                    compact
                    placeholder="Search ITO, PHTO, Hilo…"
                    selectedLabel={airport ? `${airport.icao_identifier || airport.faa_identifier} — ${airport.airport_name}` : ""}
                    onSelect={setAirport}
                    onClear={() => setAirport(null)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Include</label>
                  <select
                    value={radius}
                    onChange={(event) => setRadius(Number(event.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {RADII.map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? "This airport only" : `Airports within ${value} NM`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : kind === "state" ? (
              <div className="min-w-[18rem] flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">State</label>
                <select
                  value={stateCode}
                  onChange={(event) => setStateCode(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Choose a state or territory</option>
                  {STATES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="min-w-[18rem] flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">FAA region</label>
                <select
                  value={regionCode}
                  onChange={(event) => setRegionCode(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Choose a region</option>
                  {FAA_REGIONS.map((region) => (
                    <option key={region.code} value={region.code}>
                      {region.name} — {region.states.join(", ")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => void addArea()}
              disabled={busy}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add area"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Open assignments</h3>
        <div className="mt-3 space-y-3 text-sm text-slate-800">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.filter_open_assignments}
              disabled={loading || !userId}
              onChange={(event) => void savePreferences({ ...preferences, filter_open_assignments: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Only show open assignments in my areas
              <span className="block text-xs text-slate-500">
                You can still switch to “Show all” on the Open Assignments list at any time.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.email_alerts}
              disabled={loading || !userId}
              onChange={(event) => void savePreferences({ ...preferences, email_alerts: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Email me when a new open assignment appears in my areas
              <span className="block text-xs text-slate-500">
                Sent to the email in Settings → Designee, checked every 10 minutes.
              </span>
            </span>
          </label>
        </div>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        Flight schools, oral-test locations and default airports are now managed in Admin → Schools.
      </p>
    </main>
  );
}
