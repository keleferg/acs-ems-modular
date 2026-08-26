"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FlightSchool = {
  id: string;
  name: string;
};

type SetupForm = {
  fullLegalName: string;
  ftnNumber: string;
  pilotCertificateNumber: string;
  flightSchoolId: string;
  otherFlightSchool: string;
  phone: string;
  email: string;
};

const initialForm: SetupForm = {
  fullLegalName: "",
  ftnNumber: "",
  pilotCertificateNumber: "",
  flightSchoolId: "",
  otherFlightSchool: "",
  phone: "",
  email: "",
};

export default function ApplicantSetupPage() {
  const router = useRouter();

  const [form, setForm] = useState<SetupForm>(initialForm);
  const [flightSchools, setFlightSchools] = useState<FlightSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const [
        profileResult,
        applicantResult,
        schoolsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            first_name,
            last_name,
            phone,
            email
          `)
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("applicant_profiles")
          .select(`
            full_legal_name,
            ftn_number,
            pilot_certificate_number,
            flight_school_id,
            flight_school_name_other,
            setup_completed_at
          `)
          .eq("profile_id", user.id)
          .maybeSingle(),

        supabase
          .from("flight_schools")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;

      if (profileResult.error) {
        setErrorMessage(profileResult.error.message);
        setLoading(false);
        return;
      }

      if (applicantResult.error) {
        setErrorMessage(applicantResult.error.message);
        setLoading(false);
        return;
      }

      if (schoolsResult.error) {
        setErrorMessage(schoolsResult.error.message);
        setLoading(false);
        return;
      }

      const profile = profileResult.data;
      const applicant = applicantResult.data;

      const profileName = [
        profile?.first_name,
        profile?.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      setFlightSchools((schoolsResult.data ?? []) as FlightSchool[]);

      setForm({
        fullLegalName:
          applicant?.full_legal_name ??
          profileName ??
          "",
        ftnNumber: applicant?.ftn_number ?? "",
        pilotCertificateNumber:
          applicant?.pilot_certificate_number ?? "",
        flightSchoolId:
          applicant?.flight_school_id ??
          (applicant?.flight_school_name_other ? "other" : ""),
        otherFlightSchool:
          applicant?.flight_school_name_other ?? "",
        phone: profile?.phone ?? "",
        email:
          profile?.email ??
          user.email ??
          "",
      });

      setLoading(false);
    }

    void loadSetup();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateField<K extends keyof SetupForm>(
    field: K,
    value: SetupForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setErrorMessage("");

    if (
      !form.fullLegalName.trim() ||
      !form.ftnNumber.trim() ||
      !form.pilotCertificateNumber.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if (
      form.flightSchoolId === "other" &&
      !form.otherFlightSchool.trim()
    ) {
      setErrorMessage("Please enter the flight school name.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your login session could not be verified.",
        );
      }

      const nameParts = form.fullLegalName
        .trim()
        .split(/\s+/);

      const lastName =
        nameParts.length > 1
          ? nameParts[nameParts.length - 1]
          : "";

      const firstName =
        nameParts.length > 1
          ? nameParts.slice(0, -1).join(" ")
          : nameParts[0];

      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName || null,
          phone: form.phone.trim(),
          email: user.email ?? form.email.trim().toLowerCase(),
          updated_at: now,
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      const selectedSchoolId =
        form.flightSchoolId &&
        form.flightSchoolId !== "other"
          ? form.flightSchoolId
          : null;

      const otherSchoolName =
        form.flightSchoolId === "other"
          ? form.otherFlightSchool.trim()
          : null;

      const { error: applicantError } = await supabase
        .from("applicant_profiles")
        .upsert(
          {
            profile_id: user.id,
            full_legal_name: form.fullLegalName.trim(),
            ftn_number:
              form.ftnNumber.trim().toUpperCase(),
            pilot_certificate_number:
              form.pilotCertificateNumber
                .trim()
                .toUpperCase(),
            flight_school_id: selectedSchoolId,
            flight_school_name_other: otherSchoolName,
            setup_completed_at: now,
            updated_at: now,
          },
          {
            onConflict: "profile_id",
          },
        );

      if (applicantError) {
        throw applicantError;
      }

      router.replace("/applicant/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Applicant setup failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The account setup could not be saved.",
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-slate-600">
            Loading account setup…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">
            Applicant Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Set Up Your Account
          </h1>

          <p className="mt-3 text-slate-600">
            Complete your applicant profile before requesting a
            practical test.
          </p>
        </div>

        <form onSubmit={saveSetup} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="fullLegalName"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Full legal name
              <span className="ml-1 text-red-600">*</span>
            </label>

            <input
              id="fullLegalName"
              value={form.fullLegalName}
              onChange={(event) =>
                updateField("fullLegalName", event.target.value)
              }
              placeholder="First, middle, and last name"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ftnNumber"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                FTN
                <span className="ml-1 text-red-600">*</span>
              </label>

              <input
                id="ftnNumber"
                value={form.ftnNumber}
                onChange={(event) =>
                  updateField(
                    "ftnNumber",
                    event.target.value.toUpperCase(),
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label
                htmlFor="pilotCertificateNumber"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Pilot certificate number
                <span className="ml-1 text-red-600">*</span>
              </label>

              <input
                id="pilotCertificateNumber"
                value={form.pilotCertificateNumber}
                onChange={(event) =>
                  updateField(
                    "pilotCertificateNumber",
                    event.target.value.toUpperCase(),
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="flightSchool"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Flight school
              <span className="ml-2 font-normal text-slate-500">
                Optional
              </span>
            </label>

            <select
              id="flightSchool"
              value={form.flightSchoolId}
              onChange={(event) => {
                updateField("flightSchoolId", event.target.value);

                if (event.target.value !== "other") {
                  updateField("otherFlightSchool", "");
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">
                No flight school / independent
              </option>

              {flightSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}

              <option value="other">Other</option>
            </select>
          </div>

          {form.flightSchoolId === "other" ? (
            <div>
              <label
                htmlFor="otherFlightSchool"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Flight school name
                <span className="ml-1 text-red-600">*</span>
              </label>

              <input
                id="otherFlightSchool"
                value={form.otherFlightSchool}
                onChange={(event) =>
                  updateField(
                    "otherFlightSchool",
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Phone number
                <span className="ml-1 text-red-600">*</span>
              </label>

              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  updateField("phone", event.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Email address
                <span className="ml-1 text-red-600">*</span>
              </label>

              <input
                id="email"
                type="email"
                value={form.email}
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700"
              />

              <p className="mt-2 text-xs text-slate-500">
                This is the email associated with your login.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving Account…"
              : "Complete Account Setup"}
          </button>
        </form>
      </div>
    </main>
  );
}
