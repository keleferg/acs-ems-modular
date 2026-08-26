"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type FlightSchool = {
  id: string;
  name: string;
  default_oral_test_location: string | null;
  default_airport_code: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export default function LocationsSettingsPage() {
  const [flightSchools, setFlightSchools] = useState<
    FlightSchool[]
  >([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolLocation, setNewSchoolLocation] =
    useState("");
  const [newSchoolAirport, setNewSchoolAirport] =
    useState("HNL");
  const [newSchoolNotes, setNewSchoolNotes] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("flight_schools")
      .select(`
        id,
        name,
        default_oral_test_location,
        default_airport_code,
        notes,
        is_active,
        sort_order
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error(error);

      setErrorMessage(
        "Location settings could not be loaded. Examiner access may be required.",
      );
    } else {
      setFlightSchools((data ?? []) as FlightSchool[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  async function addFlightSchool(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = newSchoolName.trim();

    if (!name) {
      setErrorMessage(
        "Enter a flight-school or location name.",
      );
      return;
    }

    setSavingId("new-location");
    setMessage("");
    setErrorMessage("");

    const nextSortOrder =
      flightSchools.length > 0
        ? Math.max(
            ...flightSchools.map(
              (item) => item.sort_order,
            ),
          ) + 10
        : 100;

    const supabase = createClient();

    const { data, error } = await supabase
      .from("flight_schools")
      .insert({
        name,
        default_oral_test_location:
          newSchoolLocation.trim() || null,
        default_airport_code:
          newSchoolAirport.trim().toUpperCase() ||
          null,
        notes: newSchoolNotes.trim() || null,
        is_active: true,
        sort_order: nextSortOrder,
      })
      .select(`
        id,
        name,
        default_oral_test_location,
        default_airport_code,
        notes,
        is_active,
        sort_order
      `)
      .single();

    if (error) {
      console.error(error);

      setErrorMessage(
        error.code === "23505"
          ? "A location with that name already exists."
          : `The location could not be added: ${error.message}`,
      );
    } else {
      setFlightSchools((current) => [
        ...current,
        data as FlightSchool,
      ]);

      setNewSchoolName("");
      setNewSchoolLocation("");
      setNewSchoolAirport("HNL");
      setNewSchoolNotes("");
      setMessage("Location added.");
    }

    setSavingId("");
  }

  function updateLocalLocation(
    locationId: string,
    changes: Partial<FlightSchool>,
  ) {
    setFlightSchools((current) =>
      current.map((location) =>
        location.id === locationId
          ? {
              ...location,
              ...changes,
            }
          : location,
      ),
    );

    setMessage("");
    setErrorMessage("");
  }

  async function saveLocation(
    location: FlightSchool,
  ) {
    if (!location.name.trim()) {
      setErrorMessage(
        "The location name cannot be blank.",
      );
      return;
    }

    setSavingId(location.id);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("flight_schools")
      .update({
        name: location.name.trim(),
        default_oral_test_location:
          location.default_oral_test_location?.trim() ||
          null,
        default_airport_code:
          location.default_airport_code
            ?.trim()
            .toUpperCase() || null,
        notes: location.notes?.trim() || null,
        is_active: location.is_active,
        sort_order: location.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", location.id)
      .select(`
        id,
        name,
        default_oral_test_location,
        default_airport_code,
        notes,
        is_active,
        sort_order
      `)
      .maybeSingle();

    if (error) {
      console.error(error);

      setErrorMessage(
        `The location could not be updated: ${error.message}`,
      );
    } else if (!data) {
      setErrorMessage(
        "No database row was updated. Examiner permission is required.",
      );
    } else {
      setFlightSchools((current) =>
        current.map((item) =>
          item.id === location.id
            ? (data as FlightSchool)
            : item,
        ),
      );

      setMessage(`${data.name} was updated.`);
    }

    setSavingId("");
  }

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Settings
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Locations
        </h2>

        <p className="mt-2 text-slate-600">
          Manage flight schools, oral-test locations, and
          default airports shown in the applicant request
          process.
        </p>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-bold text-slate-900">
            Add Location
          </h3>
        </div>

        <form
          onSubmit={addFlightSchool}
          className="grid gap-5 bg-slate-50 p-6 md:grid-cols-2"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Flight school or location name
            </label>

            <input
              value={newSchoolName}
              onChange={(event) =>
                setNewSchoolName(event.target.value)
              }
              required
              placeholder="Example: Pacific Flight Academy"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Default airport
            </label>

            <input
              value={newSchoolAirport}
              onChange={(event) =>
                setNewSchoolAirport(
                  event.target.value.toUpperCase(),
                )
              }
              maxLength={4}
              placeholder="HNL"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 uppercase outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Default oral-test location
            </label>

            <input
              value={newSchoolLocation}
              onChange={(event) =>
                setNewSchoolLocation(
                  event.target.value,
                )
              }
              placeholder="Address, building, room, or meeting location"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Notes
            </label>

            <textarea
              value={newSchoolNotes}
              onChange={(event) =>
                setNewSchoolNotes(event.target.value)
              }
              rows={3}
              placeholder="Optional internal location notes"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={
                savingId === "new-location"
              }
              className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingId === "new-location"
                ? "Adding Location…"
                : "Add Location"}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading locations…
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {flightSchools.map((location) => (
            <section
              key={location.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Name
                  </label>

                  <input
                    value={location.name}
                    onChange={(event) =>
                      updateLocalLocation(
                        location.id,
                        {
                          name: event.target.value,
                        },
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Default airport
                  </label>

                  <input
                    value={
                      location.default_airport_code ??
                      ""
                    }
                    onChange={(event) =>
                      updateLocalLocation(
                        location.id,
                        {
                          default_airport_code:
                            event.target.value.toUpperCase(),
                        },
                      )
                    }
                    maxLength={4}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Default oral-test location
                  </label>

                  <input
                    value={
                      location.default_oral_test_location ??
                      ""
                    }
                    onChange={(event) =>
                      updateLocalLocation(
                        location.id,
                        {
                          default_oral_test_location:
                            event.target.value,
                        },
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Notes
                  </label>

                  <textarea
                    value={location.notes ?? ""}
                    onChange={(event) =>
                      updateLocalLocation(
                        location.id,
                        {
                          notes: event.target.value,
                        },
                      )
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={location.is_active}
                    onChange={(event) =>
                      updateLocalLocation(
                        location.id,
                        {
                          is_active:
                            event.target.checked,
                        },
                      )
                    }
                    className="h-4 w-4"
                  />

                  Active and available to applicants
                </label>

                <button
                  type="button"
                  disabled={savingId === location.id}
                  onClick={() =>
                    void saveLocation(location)
                  }
                  className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingId === location.id
                    ? "Saving Changes…"
                    : "Save Changes"}
                </button>
              </div>
            </section>
          ))}

          {flightSchools.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              No locations have been configured.
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
