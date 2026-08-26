"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type AircraftTypeSelection = {
  id: string;
  manufacturer_model: string;
  manufacturer: string;
  model: string;
  type_designator: string;
  aircraft_class: string | null;
  engine_type: string | null;
  weight_class: string | null;
};

type Props = {
  selectedLabel: string;
  selectedTypeDesignator: string;
  onSelect: (aircraft: AircraftTypeSelection) => void;
  onClear: () => void;
};

export default function AircraftTypeSelector({
  selectedLabel,
  selectedTypeDesignator,
  onSelect,
  onClear,
}: Props) {
  const [query, setQuery] = useState(selectedLabel);
  const [results, setResults] = useState<
    AircraftTypeSelection[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  useEffect(() => {
    const search = query.trim();

    if (selectedLabel && search === selectedLabel) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (search.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      setLoading(true);

      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "search_faa_aircraft_types",
        {
          p_search: search,
          p_limit: 30,
        },
      );

      if (cancelled) return;

      if (error) {
        console.error(
          "Unable to search FAA aircraft types:",
          error,
        );
        setResults([]);
      } else {
        setResults(
          (data ?? []) as AircraftTypeSelection[],
        );
      }

      setLoading(false);
      setOpen(true);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, selectedLabel]);

  function updateQuery(value: string) {
    setQuery(value);
    setOpen(true);

    if (selectedLabel && value !== selectedLabel) {
      onClear();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) =>
          updateQuery(event.target.value)
        }
        onFocus={() => {
          if (query.trim().length >= 2) {
            setOpen(true);
          }
        }}
        placeholder="Search Cessna 172, PA-28-181, SR22, BE58…"
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
      />

      {selectedLabel ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
            Aircraft selected
          </span>

          {selectedTypeDesignator ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              FAA type {selectedTypeDesignator}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              onClear();
            }}
            className="font-semibold text-sky-700 hover:text-sky-900"
          >
            Change
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-600">
              Searching aircraft…
            </p>
          ) : null}

          {!loading &&
          query.trim().length >= 2 &&
          results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-600">
              No matching FAA aircraft found. Try another
              manufacturer, model, or type designator.
            </p>
          ) : null}

          {!loading
            ? results.map((aircraft) => (
                <button
                  key={aircraft.id}
                  type="button"
                  onClick={() => {
                    setQuery(
                      aircraft.manufacturer_model,
                    );
                    setResults([]);
                    setOpen(false);
                    onSelect(aircraft);
                  }}
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-sky-50"
                >
                  <span className="block font-semibold text-slate-900">
                    {aircraft.manufacturer_model}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    FAA type {aircraft.type_designator}
                    {aircraft.aircraft_class
                      ? ` · ${aircraft.aircraft_class}`
                      : ""}
                    {aircraft.engine_type
                      ? ` · ${aircraft.engine_type}`
                      : ""}
                  </span>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
