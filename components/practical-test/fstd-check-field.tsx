"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// FSTD picker + check (Kele, Nov 1 2026). When a test has FTD / FFS time, the examiner picks the
// simulator from the FAA National Simulator Program list and the system checks it: on the list,
// matches the aircraft on the request, and a suitable level. Problems that can't be accepted
// block saving; the rest must be confirmed.

export type FstdDevice = {
  faa_id: number;
  company_name: string;
  make_model_series: string;
  status: string | null;
  city: string | null;
  level: string | null;
  qualification_standard: string | null;
  device_class: "FFS" | "FTD" | string;
  aircraft_category: string | null;
};

export type FstdCheckState = "" | "checking" | "ok" | "warn" | "block";

type CheckResult = {
  found: boolean;
  device?: FstdDevice;
  blocking: string[];
  warnings: string[];
};

type Props = {
  requestId: string;
  flightHours: string;
  faaId: string;
  label: string;
  confirmed: boolean;
  disabled?: boolean;
  onChange: (faaId: string, label: string) => void;
  onConfirmedChange: (confirmed: boolean) => void;
  onStateChange: (state: FstdCheckState) => void;
};

export function fstdLabel(device: FstdDevice) {
  return `FAA ID ${device.faa_id} — ${device.make_model_series} ${device.device_class} Level ${device.level ?? "?"} · ${device.company_name}${device.city ? `, ${device.city}` : ""}`;
}

export default function FstdCheckField({
  requestId,
  flightHours,
  faaId,
  label,
  confirmed,
  disabled,
  onChange,
  onConfirmedChange,
  onStateChange,
}: Props) {
  const [query, setQuery] = useState(label);
  const [results, setResults] = useState<FstdDevice[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(onStateChange);
  stateRef.current = onStateChange;

  useEffect(() => setQuery(label), [label]);

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  // Search the FAA list.
  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2 || (label && term === label)) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await createClient().rpc("search_faa_fstds", { p_search: term, p_limit: 25 });
      if (cancelled) return;
      if (error) console.error("Unable to search FSTDs:", error);
      setResults(error ? [] : ((data ?? []) as FstdDevice[]));
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, open, label]);

  // Check the chosen device against the request.
  useEffect(() => {
    if (!faaId) {
      setCheck(null);
      stateRef.current("");
      return;
    }
    let cancelled = false;
    stateRef.current("checking");
    const timeout = window.setTimeout(async () => {
      const hours = flightHours.trim() === "" ? null : Number(flightHours);
      const { data, error } = await createClient().rpc("check_fstd_for_request", {
        p_faa_id: Number(faaId),
        p_request_id: requestId,
        p_flight_hours: Number.isFinite(hours) ? hours : null,
      });
      if (cancelled) return;
      const result: CheckResult = error
        ? { found: false, blocking: [`The simulator could not be checked: ${error.message}`], warnings: [] }
        : (data as CheckResult);
      setCheck(result);
      stateRef.current(result.blocking.length ? "block" : result.warnings.length ? "warn" : "ok");
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [faaId, flightHours, requestId]);

  function choose(device: FstdDevice) {
    const next = fstdLabel(device);
    setQuery(next);
    setOpen(false);
    onConfirmedChange(false);
    onChange(String(device.faa_id), next);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (faaId) {
            onConfirmedChange(false);
            onChange("", "");
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search FAA ID, operator, type (e.g. 737, CE-172), or city"
        autoComplete="off"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-amber-600 disabled:opacity-60"
      />

      {open && !disabled && query.trim().length >= 2 && !(label && query.trim() === label) ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white font-normal shadow-xl">
          {loading ? <p className="px-4 py-3 text-sm text-slate-600">Searching the FAA simulator list…</p> : null}
          {!loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">No qualified FSTD on the FAA list matches “{query.trim()}”.</p>
          ) : null}
          {!loading
            ? results.map((device) => (
                <button
                  key={device.faa_id}
                  type="button"
                  onClick={() => choose(device)}
                  className="block w-full border-b border-slate-100 px-4 py-2 text-left last:border-b-0 hover:bg-amber-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {device.make_model_series} · {device.device_class} Level {device.level ?? "?"}
                  </span>
                  <span className="block text-xs text-slate-500">
                    FAA ID {device.faa_id} · {device.company_name}
                    {device.city ? `, ${device.city}` : ""}
                    {device.status && device.status !== "A" ? ` · status ${device.status}` : ""}
                  </span>
                </button>
              ))
            : null}
        </div>
      ) : null}

      {faaId && check ? (
        <div
          className={`mt-2 rounded-lg border px-3 py-2 text-sm font-normal ${
            check.blocking.length
              ? "border-red-200 bg-red-50 text-red-800"
              : check.warnings.length
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {check.blocking.length ? (
            <ul className="list-disc pl-5">
              {check.blocking.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : check.warnings.length ? (
            <>
              <ul className="list-disc pl-5">
                {check.warnings.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <label className="mt-2 flex items-start gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={disabled}
                  onChange={(event) => onConfirmedChange(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-700"
                />
                I checked this and the device was approved for the test.
              </label>
            </>
          ) : (
            <p>
              On the FAA list (status A) and matches the aircraft on the request.
              {check.device?.qualification_standard ? ` Qualified under ${check.device.qualification_standard}.` : ""}
            </p>
          )}
        </div>
      ) : faaId ? (
        <p className="mt-2 text-xs font-normal text-slate-500">Checking the simulator…</p>
      ) : null}
    </div>
  );
}
