"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PracticalTestTypeSelector, {
  type PracticalTestTypeSelection,
} from "@/components/practical-test/practical-test-type-selector";
import AircraftTypeSelector, {
  type AircraftTypeSelection,
} from "@/components/practical-test/aircraft-type-selector";
import AirportSelector, {
  type AirportSelection,
} from "@/components/practical-test/airport-selector";
import { createClient } from "@/lib/supabase/client";

type ApplicantOption = {
  applicant_profile_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  ftn_number: string | null;
};

type FlightSchoolOption = {
  id: string;
  name: string;
  default_oral_test_location: string | null;
};

const emptyTest: PracticalTestTypeSelection = {
  practicalTestTypeId: "",
  certificateType: "",
  certificateSought: "",
  issuanceType: "",
  categorySought: "",
  classSought: "",
  ratingSought: "",
};

export default function ExaminerCreateRequestPage() {
  const router = useRouter();
  const [applicants, setApplicants] = useState<ApplicantOption[]>([]);
  const [applicantId, setApplicantId] = useState("");
  const [search, setSearch] = useState("");
  const [test, setTest] = useState(emptyTest);
  const [flightSchools, setFlightSchools] = useState<FlightSchoolOption[]>([]);
  const [flightSchoolId, setFlightSchoolId] = useState("");
  const [otherFlightSchool, setOtherFlightSchool] = useState("");
  const [oralTestLocation, setOralTestLocation] = useState("");
  const [airport, setAirport] = useState<AirportSelection | null>(null);
  const [aircraft, setAircraft] = useState<AircraftTypeSelection | null>(null);
  const [aircraftRegistration, setAircraftRegistration] = useState("");
  const [aircraftNotes, setAircraftNotes] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorPhone, setInstructorPhone] = useState("");
  const [instructorEmail, setInstructorEmail] = useState("");
  const [instructorCertificateNumber, setInstructorCertificateNumber] = useState("");
  const [instructorAssociatedWithSchool, setInstructorAssociatedWithSchool] = useState("");
  const [firstAvailable, setFirstAvailable] = useState(false);
  const [dates, setDates] = useState(["", "", ""]);
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadApplicants() {
      const supabase = createClient();
      const [applicantResult, schoolResult] = await Promise.all([
        supabase.rpc("examiner_list_request_applicants"),
        supabase
          .from("flight_schools")
          .select("id, name, default_oral_test_location")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;
      if (applicantResult.error) setError(applicantResult.error.message);
      else setApplicants((applicantResult.data ?? []) as ApplicantOption[]);
      if (!schoolResult.error) {
        setFlightSchools((schoolResult.data ?? []) as FlightSchoolOption[]);
      }
      setLoading(false);
    }

    void loadApplicants();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleApplicants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return applicants;
    return applicants.filter((applicant) =>
      [
        applicant.applicant_name,
        applicant.applicant_email,
        applicant.applicant_phone,
        applicant.ftn_number,
      ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [applicants, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!applicantId || !test.practicalTestTypeId) {
      setError("Select an applicant and practical test.");
      return;
    }

    if (!flightSchoolId || (flightSchoolId === "other" && !otherFlightSchool.trim())) {
      setError("Select the applicant's flight training location.");
      return;
    }

    if (!oralTestLocation.trim() || !airport || !aircraft) {
      setError("Enter the oral-test location, airport, and aircraft type.");
      return;
    }

    if (
      !instructorName.trim() ||
      !instructorPhone.trim() ||
      !instructorEmail.trim() ||
      !instructorAssociatedWithSchool
    ) {
      setError("Complete the recommending instructor information.");
      return;
    }

    if (!firstAvailable && !dates.some(Boolean)) {
      setError("Choose First available or enter at least one requested date.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: createError } = await supabase.rpc(
      "examiner_create_practical_test_request",
      {
        p_applicant_profile_id: applicantId,
        p_practical_test_type_id: test.practicalTestTypeId,
        p_first_available: firstAvailable,
        p_requested_date_1: firstAvailable || !dates[0] ? null : dates[0],
        p_requested_date_2: firstAvailable || !dates[1] ? null : dates[1],
        p_requested_date_3: firstAvailable || !dates[2] ? null : dates[2],
        p_preferred_time: preferredTime || null,
        p_scheduling_notes: notes.trim() || null,
        p_flight_school_id:
          flightSchoolId === "other" || flightSchoolId === "independent"
            ? null
            : flightSchoolId,
        p_flight_school_name:
          flightSchoolId === "other"
            ? otherFlightSchool.trim()
            : flightSchoolId === "independent"
              ? "Self / Independent"
              : flightSchools.find((school) => school.id === flightSchoolId)?.name ?? null,
        p_oral_test_location: oralTestLocation.trim(),
        p_flight_airport_id: airport.id,
        p_flight_airport_code: airport.faa_identifier,
        p_flight_airport_icao: airport.icao_identifier,
        p_flight_airport_name: airport.airport_name,
        p_aircraft_type_id: aircraft.id,
        p_aircraft_type_designator: aircraft.type_designator,
        p_aircraft_make: aircraft.manufacturer,
        p_aircraft_model: aircraft.model,
        p_aircraft_registration: aircraftRegistration.trim().toUpperCase() || null,
        p_aircraft_notes: aircraftNotes.trim() || null,
        p_instructor_name: instructorName.trim(),
        p_instructor_phone: instructorPhone.trim(),
        p_instructor_email: instructorEmail.trim().toLowerCase(),
        p_instructor_certificate_number: instructorCertificateNumber.trim() || null,
        p_instructor_associated_with_school:
          instructorAssociatedWithSchool === "yes",
      },
    );

    if (createError) {
      setError(createError.message);
      setSubmitting(false);
      return;
    }

    const created = Array.isArray(data) ? data[0] : data;
    router.push(
      `/examiner/requests?created=${encodeURIComponent(created?.request_number ?? "request")}`,
    );
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Examiner Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Create Test Request
          </h1>
          <p className="mt-2 text-slate-600">
            Create a request on behalf of an applicant. It will move directly
            to Scheduling and be assigned to you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/examiner/requests")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Applicant</h2>
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Search applicants
          </label>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, phone, or FTN"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
          />
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Applicant <span className="text-red-600">*</span>
          </label>
          <select
            required
            disabled={loading}
            value={applicantId}
            onChange={(event) => setApplicantId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">{loading ? "Loading applicants…" : "Select applicant"}</option>
            {visibleApplicants.map((applicant) => (
              <option key={applicant.applicant_profile_id} value={applicant.applicant_profile_id}>
                {applicant.applicant_name} — {applicant.applicant_email}
                {applicant.ftn_number ? ` — FTN ${applicant.ftn_number}` : ""}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Practical Test</h2>
          <PracticalTestTypeSelector selection={test} onChange={setTest} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Location and Aircraft</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter the training location, oral-test location, flight-test airport,
            and aircraft information.
          </p>

          <label className="mt-5 block text-sm font-semibold text-slate-800">
            Flight training location <span className="text-red-600">*</span>
            <select
              required
              value={flightSchoolId}
              onChange={(event) => {
                const value = event.target.value;
                const school = flightSchools.find((item) => item.id === value);
                setFlightSchoolId(value);
                setOralTestLocation(school?.default_oral_test_location ?? "");
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">Select a school or option</option>
              {flightSchools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
              <option value="independent">Self / Independent</option>
              <option value="other">Other</option>
            </select>
          </label>

          {flightSchoolId === "other" ? (
            <label className="mt-4 block text-sm font-semibold text-slate-800">
              Other flight school or training provider <span className="text-red-600">*</span>
              <input
                required
                value={otherFlightSchool}
                onChange={(event) => setOtherFlightSchool(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
          ) : null}

          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Oral-test meeting location <span className="text-red-600">*</span>
            <textarea
              required
              value={oralTestLocation}
              onChange={(event) => setOralTestLocation(event.target.value)}
              rows={3}
              placeholder="Address and room information"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </label>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Airport for the flight test <span className="text-red-600">*</span>
            </label>
            <AirportSelector
              selectedLabel={
                airport
                  ? `${airport.icao_identifier || airport.faa_identifier} — ${airport.airport_name}`
                  : ""
              }
              onSelect={setAirport}
              onClear={() => setAirport(null)}
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Aircraft manufacturer and model <span className="text-red-600">*</span>
            </label>
            <AircraftTypeSelector
              selectedLabel={aircraft?.manufacturer_model ?? ""}
              selectedTypeDesignator={aircraft?.type_designator ?? ""}
              onSelect={setAircraft}
              onClear={() => setAircraft(null)}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-800">
              Aircraft registration
              <input
                value={aircraftRegistration}
                onChange={(event) => setAircraftRegistration(event.target.value.toUpperCase())}
                placeholder="N12345"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Additional aircraft information
              <input
                value={aircraftNotes}
                onChange={(event) => setAircraftNotes(event.target.value)}
                placeholder="Complex, TAA, multiengine, limitations, etc."
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Recommending Instructor</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter the instructor recommending the applicant for this practical test.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-semibold text-slate-800">
              Instructor&apos;s full name <span className="text-red-600">*</span>
              <input
                required
                value={instructorName}
                onChange={(event) => setInstructorName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Instructor&apos;s phone number <span className="text-red-600">*</span>
              <input
                required
                type="tel"
                value={instructorPhone}
                onChange={(event) => setInstructorPhone(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Instructor&apos;s email address <span className="text-red-600">*</span>
              <input
                required
                type="email"
                value={instructorEmail}
                onChange={(event) => setInstructorEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Instructor certificate number
              <input
                value={instructorCertificateNumber}
                onChange={(event) => setInstructorCertificateNumber(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Associated with selected flight school? <span className="text-red-600">*</span>
              <select
                required
                value={instructorAssociatedWithSchool}
                onChange={(event) => setInstructorAssociatedWithSchool(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Select an answer</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Scheduling Preferences</h2>
          <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={firstAvailable}
              onChange={(event) => setFirstAvailable(event.target.checked)}
              className="h-4 w-4"
            />
            First available appointment
          </label>
          {!firstAvailable ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {dates.map((date, index) => (
                <label key={index} className="text-sm font-semibold text-slate-800">
                  Preferred date {index + 1}
                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDates((current) => current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              ))}
            </div>
          ) : null}
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Preferred time
            <input
              type="text"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              placeholder="Morning, afternoon, or a specific time"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Scheduling notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </label>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
          >
            {submitting ? "Creating request…" : "Create & Move to Scheduling"}
          </button>
        </div>
      </form>
    </main>
  );
}
