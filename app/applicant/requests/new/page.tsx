"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AircraftTypeSelector, {
  type AircraftTypeSelection,
} from "@/components/practical-test/aircraft-type-selector";
import AirportSelector, {
  type AirportSelection,
} from "@/components/practical-test/airport-selector";
import PracticalTestTypeSelector, {
  type PracticalTestTypeSelection,
} from "@/components/practical-test/practical-test-type-selector";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "dpe-emt-practical-test-request-draft";

const steps = [
  "Applicant",
  "Test Requested",
  "Location & Aircraft",
  "Instructor",
  "Availability",
  "Fee Information",
  "Review & Submit",
];

type FormData = {
  applicantName: string;
  ftnNumber: string;
  applicantPhone: string;
  applicantEmail: string;

  practicalTestTypeId: string;
  certificateType: string;
  certificateSought: string;
  issuanceType: string;
  categorySought: string;
  classSought: string;
  ratingSought: string;

  flightSchool: string;
  otherFlightSchool: string;
  oralTestLocation: string;
  flightAirportId: string;
  flightAirport: string;
  flightAirportIcao: string;
  flightAirportName: string;
  otherFlightAirport: string;
  aircraftTypeId: string;
  aircraftTypeDesignator: string;
  aircraftMake: string;
  aircraftModel: string;
  aircraftRegistration: string;
  aircraftNotes: string;

  instructorName: string;
  instructorPhone: string;
  instructorEmail: string;
  instructorCertificateNumber: string;
  instructorAssociatedWithSchool: string;

  firstAvailable: boolean;
  preferredDate1: string;
  preferredDate2: string;
  preferredDate3: string;
  preferredTime: string;
  specificTime: string;
  schedulingNotes: string;

  isRetest: string;
  part141Graduate: string;
  previousTestDate: string;
  previousExaminer: string;
  retestAreas: string;

  feeAcknowledged: boolean;
  eligibilityAcknowledged: boolean;
  aircraftAcknowledged: boolean;
  requestAcknowledged: boolean;
};

const initialFormData: FormData = {
  applicantName: "",
  ftnNumber: "",
  applicantPhone: "",
  applicantEmail: "",

  practicalTestTypeId: "",
  certificateType: "",
  certificateSought: "",
  issuanceType: "",
  categorySought: "",
  classSought: "",
  ratingSought: "",

  flightSchool: "",
  otherFlightSchool: "",
  oralTestLocation: "",
  flightAirportId: "",
  flightAirport: "",
  flightAirportIcao: "",
  flightAirportName: "",
  otherFlightAirport: "",
  aircraftTypeId: "",
  aircraftTypeDesignator: "",
  aircraftMake: "",
  aircraftModel: "",
  aircraftRegistration: "",
  aircraftNotes: "",

  instructorName: "",
  instructorPhone: "",
  instructorEmail: "",
  instructorCertificateNumber: "",
  instructorAssociatedWithSchool: "",

  firstAvailable: false,
  preferredDate1: "",
  preferredDate2: "",
  preferredDate3: "",
  preferredTime: "",
  specificTime: "",
  schedulingNotes: "",

  isRetest: "",
  part141Graduate: "",
  previousTestDate: "",
  previousExaminer: "",
  retestAreas: "",

  feeAcknowledged: false,
  eligibilityAcknowledged: false,
  aircraftAcknowledged: false,
  requestAcknowledged: false,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-800">
      {children}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
    >
      {children}
    </select>
  );
}

type FlightSchoolOption = {
  id: string;
  name: string;
  default_oral_test_location: string | null;
  default_airport_code: string | null;
  sort_order: number;
};

type ApplicantFeeInformation = {
  fee_amount: number;
  fee_label: string | null;
  applicant_note: string | null;
};

export default function NewRequestPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loaded, setLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flightSchools, setFlightSchools] = useState<FlightSchoolOption[]>([]);
  const [flightSchoolsLoading, setFlightSchoolsLoading] = useState(true);
  const [feeInformation, setFeeInformation] =
    useState<ApplicantFeeInformation | null>(null);
  const [feeInformationLoading, setFeeInformationLoading] = useState(false);
  const [feeInformationError, setFeeInformationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFeeInformation() {
      const practicalTestTypeId = formData.practicalTestTypeId;

      if (!practicalTestTypeId) {
        setFeeInformation(null);
        setFeeInformationError("");
        setFeeInformationLoading(false);
        return;
      }

      setFeeInformationLoading(true);
      setFeeInformationError("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("practical_test_fees")
        .select(
          `
          fee_amount,
          fee_label,
          applicant_note
        `,
        )
        .eq("practical_test_type_id", practicalTestTypeId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Unable to load practical-test fee:", error);
        setFeeInformation(null);
        setFeeInformationError(
          "The published fee information could not be loaded. Please try again.",
        );
        setFeeInformationLoading(false);
        return;
      }

      setFeeInformation(
        data
          ? {
              fee_amount: Number(data.fee_amount),
              fee_label: data.fee_label ?? null,
              applicant_note: data.applicant_note ?? null,
            }
          : null,
      );

      setFeeInformationLoading(false);
    }

    void loadFeeInformation();

    return () => {
      cancelled = true;
    };
  }, [formData.practicalTestTypeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadFlightSchools() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("flight_schools")
        .select(
          `
          id,
          name,
          default_oral_test_location,
          default_airport_code,
          sort_order
        `,
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Unable to load flight schools:", error);
        setFlightSchools([]);
      } else {
        setFlightSchools((data ?? []) as FlightSchoolOption[]);
      }

      setFlightSchoolsLoading(false);
    }

    void loadFlightSchools();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadApplicantDefaults() {
      const supabase = createClient();

      let profileDefaults: Partial<FormData> = {};

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (user) {
          const [profileResult, applicantResult] = await Promise.all([
            supabase
              .from("profiles")
              .select(
                `
                first_name,
                last_name,
                phone,
                email
              `,
              )
              .eq("id", user.id)
              .maybeSingle(),

            supabase
              .from("applicant_profiles")
              .select(
                `
                full_legal_name,
                ftn_number,
                flight_school_id,
                flight_school_name_other
              `,
              )
              .eq("profile_id", user.id)
              .maybeSingle(),
          ]);

          if (profileResult.error) {
            throw profileResult.error;
          }

          if (applicantResult.error) {
            throw applicantResult.error;
          }

          const profile = profileResult.data;
          const applicant = applicantResult.data;

          const profileName = [profile?.first_name, profile?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();

          let savedFlightSchool = "";

          if (applicant?.flight_school_id) {
            const { data: school, error: schoolError } = await supabase
              .from("flight_schools")
              .select("name")
              .eq("id", applicant.flight_school_id)
              .maybeSingle();

            if (schoolError) {
              console.error(
                "Unable to load the applicant's saved flight school:",
                schoolError,
              );
            } else {
              savedFlightSchool = school?.name ?? "";
            }
          }

          profileDefaults = {
            applicantName:
              applicant?.full_legal_name?.trim() || profileName || "",
            ftnNumber: applicant?.ftn_number?.trim().toUpperCase() || "",
            applicantPhone: profile?.phone?.trim() || "",
            applicantEmail:
              profile?.email?.trim().toLowerCase() ||
              user.email?.trim().toLowerCase() ||
              "",
            flightSchool:
              savedFlightSchool ||
              (applicant?.flight_school_name_other ? "Other" : ""),
            otherFlightSchool:
              applicant?.flight_school_name_other?.trim() || "",
          };
        }
      } catch (error) {
        console.error(
          "Unable to prefill the new request from the applicant profile:",
          error,
        );
      }

      if (cancelled) return;

      let savedFormData: Partial<FormData> = {};
      let savedCurrentStep = 0;

      const savedDraft = window.localStorage.getItem(STORAGE_KEY);

      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft) as {
            formData?: Partial<FormData>;
            currentStep?: number;
          };

          savedFormData = parsedDraft.formData ?? {};

          if (
            typeof parsedDraft.currentStep === "number" &&
            parsedDraft.currentStep >= 0 &&
            parsedDraft.currentStep < steps.length
          ) {
            savedCurrentStep = parsedDraft.currentStep;
          }
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      /*
       * Profile information supplies the initial defaults.
       *
       * Preserve meaningful values from an existing draft, but do not
       * allow blank draft fields to erase saved applicant-profile data.
       */
      const mergedFormData: FormData = {
        ...initialFormData,
        ...profileDefaults,
        ...savedFormData,
      };

      const profileBackedFields: Array<keyof FormData> = [
        "applicantName",
        "ftnNumber",
        "applicantPhone",
        "applicantEmail",
        "flightSchool",
        "otherFlightSchool",
      ];

      for (const field of profileBackedFields) {
        const savedValue = savedFormData[field];
        const profileValue = profileDefaults[field];

        if (
          typeof savedValue === "string" &&
          savedValue.trim() === "" &&
          typeof profileValue === "string" &&
          profileValue.trim() !== ""
        ) {
          mergedFormData[field] = profileValue as never;
        }
      }

      setFormData(mergedFormData);
      setCurrentStep(savedCurrentStep);
      setLoaded(true);
    }

    void loadApplicantDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        formData,
        currentStep,
        savedAt: new Date().toISOString(),
      }),
    );

    setSaveMessage("Draft saved");

    const timeout = window.setTimeout(() => {
      setSaveMessage("");
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [formData, currentStep, loaded]);

  const selectedSchoolRequiresLocation =
    formData.flightSchool === "Self / Independent" ||
    formData.flightSchool === "Other";

  const allAcknowledgmentsComplete =
    formData.feeAcknowledged &&
    formData.eligibilityAcknowledged &&
    formData.aircraftAcknowledged &&
    formData.requestAcknowledged;

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateCurrentStep() {
    if (currentStep === 0) {
      return Boolean(
        formData.applicantName.trim() &&
        formData.ftnNumber.trim() &&
        formData.applicantPhone.trim() &&
        formData.applicantEmail.trim(),
      );
    }

    if (currentStep === 1) {
      const priorFailureComplete =
        formData.isRetest === "No" ||
        (formData.isRetest === "Yes" && Boolean(formData.previousTestDate));

      return Boolean(
        formData.practicalTestTypeId &&
        formData.certificateSought &&
        formData.issuanceType &&
        formData.isRetest &&
        formData.part141Graduate &&
        priorFailureComplete,
      );
    }

    if (currentStep === 2) {
      return Boolean(
        formData.flightSchool &&
        formData.flightAirportId &&
        formData.flightAirport &&
        formData.aircraftTypeId &&
        formData.aircraftMake.trim() &&
        formData.aircraftModel.trim() &&
        (!selectedSchoolRequiresLocation || formData.oralTestLocation.trim()) &&
        (formData.flightSchool !== "Other" ||
          formData.otherFlightSchool.trim()),
      );
    }

    if (currentStep === 3) {
      return Boolean(
        formData.instructorName.trim() &&
        formData.instructorPhone.trim() &&
        formData.instructorEmail.trim() &&
        formData.instructorAssociatedWithSchool,
      );
    }

    if (currentStep === 4) {
      const hasDatePreference =
        formData.firstAvailable || formData.preferredDate1;

      return Boolean(
        hasDatePreference &&
        formData.preferredTime &&
        (formData.preferredTime !== "Specific time" || formData.specificTime),
      );
    }

    if (currentStep === 5) {
      return formData.feeAcknowledged;
    }

    if (currentStep === 6) {
      return allAcknowledgmentsComplete;
    }

    return true;
  }

  function nextStep() {
    setSubmitMessage("");

    if (!validateCurrentStep()) {
      setSubmitMessage(
        "Please complete all required fields before continuing.",
      );
      return;
    }

    setCurrentStep((current) => Math.min(current + 1, steps.length - 1));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setSubmitMessage("");
    setCurrentStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setFormData(initialFormData);
    setCurrentStep(0);
    setSubmitMessage("");
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCurrentStep()) {
      setSubmitMessage(
        "All acknowledgments must be accepted before submission.",
      );
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitMessage("Submitting practical test request…");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your login session could not be verified. Please sign in again.",
        );
      }

      const { data: applicantProfile, error: applicantError } = await supabase
        .from("applicant_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (applicantError) {
        throw applicantError;
      }

      if (!applicantProfile) {
        throw new Error(
          "An applicant profile has not been created for this account.",
        );
      }

      const selectedSchool = flightSchools.find(
        (school) => school.name === formData.flightSchool,
      );

      const flightSchoolName =
        formData.flightSchool === "Other"
          ? formData.otherFlightSchool.trim()
          : formData.flightSchool.trim();

      const airportCode = formData.flightAirport.trim().toUpperCase();

      const issuanceText = formData.issuanceType.trim().toLowerCase();

      let issuanceType = "other";

      if (
        issuanceText.includes("original") ||
        issuanceText.includes("initial")
      ) {
        issuanceType = "original";
      } else if (issuanceText.includes("additional")) {
        issuanceType = "additional_rating";
      } else if (
        issuanceText.includes("reissuance") ||
        issuanceText.includes("reinstatement")
      ) {
        issuanceType = "reissuance";
      }

      const ratingSought =
        formData.ratingSought.trim() ||
        [formData.categorySought, formData.classSought]
          .filter(Boolean)
          .join(" — ") ||
        formData.certificateSought.trim();

      const requestedDates = [
        formData.preferredDate1,
        formData.preferredDate2,
        formData.preferredDate3,
      ].filter(Boolean);

      const requestedDatesText = formData.firstAvailable
        ? "First available appointment"
        : requestedDates.join(", ");

      const aircraftDescription = [
        formData.aircraftMake,
        formData.aircraftModel,
        formData.aircraftRegistration,
      ]
        .filter(Boolean)
        .join(" ");

      const submittedAt = new Date().toISOString();

      const { data: insertedRequest, error: insertError } = await supabase
        .from("practical_test_requests")
        .insert({
          applicant_profile_id: applicantProfile.id,
          status: "under_review",

          applicant_name_snapshot: formData.applicantName.trim(),
          applicant_email_snapshot: formData.applicantEmail
            .trim()
            .toLowerCase(),
          applicant_phone_snapshot: formData.applicantPhone.trim() || null,
          ftn_number_snapshot: formData.ftnNumber.trim().toUpperCase() || null,

          practical_test_type_id: formData.practicalTestTypeId || null,
          certificate_sought: formData.certificateSought.trim(),
          category_sought: formData.categorySought.trim() || null,
          class_sought: formData.classSought.trim() || null,
          rating_sought: ratingSought,
          issuance_type: issuanceType,

          is_retest: formData.isRetest === "Yes",
          part_141_graduate: formData.part141Graduate === "Yes",
          previous_test_date:
            formData.isRetest === "Yes"
              ? formData.previousTestDate || null
              : null,
          previous_examiner:
            formData.isRetest === "Yes"
              ? formData.previousExaminer.trim() || null
              : null,
          retest_areas:
            formData.isRetest === "Yes"
              ? formData.retestAreas.trim() || null
              : null,

          flight_school_id: selectedSchool?.id ?? null,
          flight_school_name_snapshot: flightSchoolName || null,
          oral_test_location: formData.oralTestLocation.trim() || null,
          flight_airport_id: formData.flightAirportId || null,
          flight_airport_code: airportCode || null,
          flight_airport_icao: formData.flightAirportIcao.trim() || null,
          flight_airport_name: formData.flightAirportName.trim() || null,

          aircraft_type_id: formData.aircraftTypeId || null,
          aircraft_type_designator:
            formData.aircraftTypeDesignator.trim() || null,
          aircraft_description: aircraftDescription || null,
          aircraft_make: formData.aircraftMake.trim() || null,
          aircraft_model: formData.aircraftModel.trim() || null,
          aircraft_registration:
            formData.aircraftRegistration.trim().toUpperCase() || null,
          aircraft_notes: formData.aircraftNotes.trim() || null,

          instructor_name: formData.instructorName.trim() || null,
          instructor_phone: formData.instructorPhone.trim() || null,
          instructor_email:
            formData.instructorEmail.trim().toLowerCase() || null,
          instructor_certificate_number:
            formData.instructorCertificateNumber.trim() || null,
          instructor_associated_with_school:
            formData.instructorAssociatedWithSchool === "Yes",

          first_available: formData.firstAvailable,
          requested_dates_text: requestedDatesText || null,
          requested_date_1: formData.preferredDate1 || null,
          requested_date_2: formData.preferredDate2 || null,
          requested_date_3: formData.preferredDate3 || null,
          preferred_time: formData.preferredTime || null,
          specific_time:
            formData.preferredTime === "Specific time"
              ? formData.specificTime || null
              : null,
          scheduling_notes: formData.schedulingNotes.trim() || null,
          applicant_comments: formData.schedulingNotes.trim() || null,

          fee_acknowledged: formData.feeAcknowledged,
          eligibility_acknowledged: formData.eligibilityAcknowledged,
          aircraft_acknowledged: formData.aircraftAcknowledged,
          request_acknowledged: formData.requestAcknowledged,
          acknowledgments_accepted_at: submittedAt,

          submitted_at: submittedAt,
          source_system: "web_app",
        })
        .select("id, request_number")
        .single();

      if (insertError) {
        throw insertError;
      }

      try {
        const emailResponse = await fetch("/api/email/practical-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "request_submitted_applicant",
            requestId: insertedRequest.id,
          }),
        });

        if (!emailResponse.ok) {
          const emailResult = await emailResponse.json().catch(() => null);

          console.warn(
            "Practical-test request was submitted, but the confirmation email was not sent:",
            emailResult,
          );
        }
      } catch (emailError) {
        console.warn(
          "Practical-test request was submitted, but the confirmation email request failed:",
          emailError,
        );
      }

      window.localStorage.removeItem(STORAGE_KEY);

      setSubmitMessage(
        `Request ${insertedRequest.request_number} submitted successfully.`,
      );

      router.push(
        `/applicant/requests?submitted=${encodeURIComponent(
          insertedRequest.request_number,
        )}`,
      );
    } catch (error) {
      console.error("Practical test submission failed:", error);

      setSubmitMessage(
        error instanceof Error
          ? `Submission failed: ${error.message}`
          : "The practical test request could not be submitted.",
      );

      setIsSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-slate-600">Loading request wizard…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/applicant/requests"
            className="text-sm font-semibold text-sky-700 hover:text-sky-900"
          >
            ← Back to My Requests
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            New Practical Test Request
          </h1>

          <p className="mt-2 text-slate-600">
            Complete each section to submit your checkride request.
          </p>
        </div>

        <div className="text-right text-sm text-slate-500">
          <p>
            Step {currentStep + 1} of {steps.length}
          </p>
          <p className="mt-1 h-5 text-emerald-700">{saveMessage}</p>
        </div>
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-[760px] items-center">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => {
                  if (index <= currentStep) {
                    setCurrentStep(index);
                    setSubmitMessage("");
                  }
                }}
                className="flex items-center gap-3 text-left"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === currentStep
                      ? "bg-sky-700 text-white"
                      : index < currentStep
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {index < currentStep ? "✓" : index + 1}
                </span>

                <span
                  className={`text-sm font-semibold ${
                    index === currentStep ? "text-sky-800" : "text-slate-600"
                  }`}
                >
                  {step}
                </span>
              </button>

              {index < steps.length - 1 ? (
                <div className="mx-3 h-px flex-1 bg-slate-300" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submitRequest}>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {currentStep === 0 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Applicant Information
              </h2>

              <p className="mt-2 text-slate-600">
                Enter your legal name and contact information.
              </p>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Full legal name</FieldLabel>
                  <TextInput
                    value={formData.applicantName}
                    onChange={(value) => updateField("applicantName", value)}
                    placeholder="First, middle, and last name"
                  />
                </div>

                <div>
                  <FieldLabel required>FTN number</FieldLabel>
                  <TextInput
                    value={formData.ftnNumber}
                    onChange={(value) =>
                      updateField("ftnNumber", value.toUpperCase())
                    }
                    placeholder="FAA Tracking Number"
                  />
                </div>

                <div>
                  <FieldLabel required>Phone number</FieldLabel>
                  <TextInput
                    value={formData.applicantPhone}
                    onChange={(value) => updateField("applicantPhone", value)}
                    placeholder="808-555-1234"
                    type="tel"
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel required>Email address</FieldLabel>
                  <TextInput
                    value={formData.applicantEmail}
                    onChange={(value) => updateField("applicantEmail", value)}
                    placeholder="applicant@example.com"
                    type="email"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Practical Test Requested
              </h2>

              <p className="mt-2 text-slate-600">
                Select the practical test you are requesting. Only test types
                currently offered by the examiner are shown.
              </p>

              <div className="mt-7">
                <PracticalTestTypeSelector
                  selection={{
                    practicalTestTypeId: formData.practicalTestTypeId,
                    certificateType: formData.certificateType,
                    certificateSought: formData.certificateSought,
                    issuanceType: formData.issuanceType,
                    categorySought: formData.categorySought,
                    classSought: formData.classSought,
                    ratingSought: formData.ratingSought,
                  }}
                  onChange={(selection: PracticalTestTypeSelection) => {
                    setFormData((current) => ({
                      ...current,
                      ...selection,
                    }));
                  }}
                />
              </div>

              {formData.practicalTestTypeId ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <FieldLabel required>
                      Have you previously failed a test for this certificate or
                      rating?
                    </FieldLabel>

                    <div className="mt-3 flex gap-6">
                      {["No", "Yes"].map((answer) => (
                        <label
                          key={answer}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            name="isRetest"
                            value={answer}
                            checked={formData.isRetest === answer}
                            onChange={() => {
                              updateField("isRetest", answer);

                              if (answer === "No") {
                                updateField("previousTestDate", "");
                              }
                            }}
                            className="h-4 w-4"
                          />

                          <span className="text-slate-800">{answer}</span>
                        </label>
                      ))}
                    </div>

                    {formData.isRetest === "Yes" ? (
                      <div className="mt-5">
                        <FieldLabel required>Previous test date</FieldLabel>

                        <TextInput
                          value={formData.previousTestDate}
                          onChange={(value) =>
                            updateField("previousTestDate", value)
                          }
                          type="date"
                          required
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <FieldLabel required>
                      Are you or will you be a graduate of a Part 141 approved
                      course?
                    </FieldLabel>

                    <div className="mt-3 flex gap-6">
                      {["No", "Yes"].map((answer) => (
                        <label
                          key={answer}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            name="part141Graduate"
                            value={answer}
                            checked={formData.part141Graduate === answer}
                            onChange={() =>
                              updateField("part141Graduate", answer)
                            }
                            className="h-4 w-4"
                          />

                          <span className="text-slate-800">{answer}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Location and Aircraft
              </h2>

              <p className="mt-2 text-slate-600">
                Provide the training location, test airport, and aircraft
                information.
              </p>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Flight training location</FieldLabel>

                  <SelectInput
                    value={formData.flightSchool}
                    onChange={(value) => {
                      const selectedSchool = flightSchools.find(
                        (school) => school.name === value,
                      );

                      setFormData((current) => ({
                        ...current,
                        flightSchool: value,
                        otherFlightSchool:
                          value === "Other" ? current.otherFlightSchool : "",
                        oralTestLocation:
                          selectedSchool?.default_oral_test_location ?? "",
                        flightAirport:
                          selectedSchool?.default_airport_code ?? "",
                        otherFlightAirport: "",
                      }));
                    }}
                  >
                    <option value="">
                      {flightSchoolsLoading
                        ? "Loading flight schools…"
                        : "Select a school or option"}
                    </option>

                    {flightSchools.map((school) => (
                      <option key={school.id} value={school.name}>
                        {school.name}
                      </option>
                    ))}

                    <option value="Self / Independent">
                      Self / Independent
                    </option>

                    <option value="Other">Other</option>
                  </SelectInput>
                </div>

                {formData.flightSchool === "Other" ? (
                  <div className="sm:col-span-2">
                    <FieldLabel required>
                      Other flight school or training provider
                    </FieldLabel>

                    <TextInput
                      value={formData.otherFlightSchool}
                      onChange={(value) =>
                        updateField("otherFlightSchool", value)
                      }
                    />
                  </div>
                ) : null}

                {selectedSchoolRequiresLocation ? (
                  <div className="sm:col-span-2">
                    <FieldLabel required>Oral-test meeting location</FieldLabel>

                    <textarea
                      value={formData.oralTestLocation}
                      onChange={(event) =>
                        updateField("oralTestLocation", event.target.value)
                      }
                      rows={3}
                      placeholder="Provide the address and room information. The room must be quiet and free from distractions."
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                ) : null}

                <div className="sm:col-span-2">
                  <FieldLabel required>Airport for the flight test</FieldLabel>

                  <AirportSelector
                    selectedLabel={
                      formData.flightAirportId
                        ? `${
                            formData.flightAirportIcao || formData.flightAirport
                          } — ${formData.flightAirportName}`
                        : ""
                    }
                    onSelect={(airport: AirportSelection) => {
                      setFormData((current) => ({
                        ...current,
                        flightAirportId: airport.id,
                        flightAirport: airport.faa_identifier,
                        flightAirportIcao: airport.icao_identifier || "",
                        flightAirportName: airport.airport_name,
                        otherFlightAirport: "",
                      }));
                    }}
                    onClear={() => {
                      setFormData((current) => ({
                        ...current,
                        flightAirportId: "",
                        flightAirport: "",
                        flightAirportIcao: "",
                        flightAirportName: "",
                        otherFlightAirport: "",
                      }));
                    }}
                  />

                  <p className="mt-2 text-sm text-slate-500">
                    Search by FAA identifier, ICAO identifier, airport name, or
                    city.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel required>
                    Aircraft manufacturer and model
                  </FieldLabel>

                  <AircraftTypeSelector
                    selectedLabel={
                      formData.aircraftTypeId
                        ? `${formData.aircraftMake}, ${formData.aircraftModel}`
                        : ""
                    }
                    selectedTypeDesignator={formData.aircraftTypeDesignator}
                    onSelect={(aircraft: AircraftTypeSelection) => {
                      setFormData((current) => ({
                        ...current,
                        aircraftTypeId: aircraft.id,
                        aircraftTypeDesignator: aircraft.type_designator,
                        aircraftMake: aircraft.manufacturer,
                        aircraftModel: aircraft.model,
                      }));
                    }}
                    onClear={() => {
                      setFormData((current) => ({
                        ...current,
                        aircraftTypeId: "",
                        aircraftTypeDesignator: "",
                        aircraftMake: "",
                        aircraftModel: "",
                      }));
                    }}
                  />

                  <p className="mt-2 text-sm text-slate-500">
                    Search and select an aircraft from the FAA JO 7360.1K list.
                  </p>
                </div>

                <div>
                  <FieldLabel>Aircraft registration</FieldLabel>
                  <TextInput
                    value={formData.aircraftRegistration}
                    onChange={(value) =>
                      updateField("aircraftRegistration", value.toUpperCase())
                    }
                    placeholder="N12345"
                  />
                </div>

                <div>
                  <FieldLabel>Additional aircraft information</FieldLabel>
                  <TextInput
                    value={formData.aircraftNotes}
                    onChange={(value) => updateField("aircraftNotes", value)}
                    placeholder="Complex, TAA, multiengine, limitations, etc."
                  />
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Recommending Instructor
              </h2>

              <p className="mt-2 text-slate-600">
                Enter the instructor who will recommend you for this practical
                test.
              </p>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Instructor&apos;s full name</FieldLabel>

                  <TextInput
                    value={formData.instructorName}
                    onChange={(value) => updateField("instructorName", value)}
                  />
                </div>

                <div>
                  <FieldLabel required>
                    Instructor&apos;s phone number
                  </FieldLabel>

                  <TextInput
                    value={formData.instructorPhone}
                    onChange={(value) => updateField("instructorPhone", value)}
                    type="tel"
                  />
                </div>

                <div>
                  <FieldLabel required>
                    Instructor&apos;s email address
                  </FieldLabel>

                  <TextInput
                    value={formData.instructorEmail}
                    onChange={(value) => updateField("instructorEmail", value)}
                    type="email"
                  />
                </div>

                <div>
                  <FieldLabel>Instructor certificate number</FieldLabel>

                  <TextInput
                    value={formData.instructorCertificateNumber}
                    onChange={(value) =>
                      updateField("instructorCertificateNumber", value)
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>
                    Is this instructor associated with the selected flight
                    school?
                  </FieldLabel>

                  <SelectInput
                    value={formData.instructorAssociatedWithSchool}
                    onChange={(value) =>
                      updateField("instructorAssociatedWithSchool", value)
                    }
                  >
                    <option value="">Select an answer</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not applicable">Not applicable</option>
                  </SelectInput>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Scheduling Preferences
              </h2>

              <p className="mt-2 text-slate-600">
                Tell us when you are available and whether this is a retest.
              </p>

              <div className="mt-7 space-y-7">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={formData.firstAvailable}
                    onChange={(event) =>
                      updateField("firstAvailable", event.target.checked)
                    }
                    className="mt-1 h-5 w-5 rounded border-slate-300"
                  />

                  <span>
                    <span className="block font-semibold text-slate-900">
                      First available appointment
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      Select this if you would like the earliest opening
                      available.
                    </span>
                  </span>
                </label>

                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <FieldLabel required={!formData.firstAvailable}>
                      First preferred date
                    </FieldLabel>

                    <TextInput
                      value={formData.preferredDate1}
                      onChange={(value) => updateField("preferredDate1", value)}
                      type="date"
                    />
                  </div>

                  <div>
                    <FieldLabel>Second preferred date</FieldLabel>
                    <TextInput
                      value={formData.preferredDate2}
                      onChange={(value) => updateField("preferredDate2", value)}
                      type="date"
                    />
                  </div>

                  <div>
                    <FieldLabel>Third preferred date</FieldLabel>
                    <TextInput
                      value={formData.preferredDate3}
                      onChange={(value) => updateField("preferredDate3", value)}
                      type="date"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Preferred time of day</FieldLabel>

                    <SelectInput
                      value={formData.preferredTime}
                      onChange={(value) => updateField("preferredTime", value)}
                    >
                      <option value="">Select a preference</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Either">Either</option>
                      <option value="Specific time">Specific time</option>
                    </SelectInput>
                  </div>

                  {formData.preferredTime === "Specific time" ? (
                    <div>
                      <FieldLabel required>Preferred time</FieldLabel>
                      <TextInput
                        value={formData.specificTime}
                        onChange={(value) => updateField("specificTime", value)}
                        type="time"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <FieldLabel>Additional scheduling notes</FieldLabel>

                  <textarea
                    value={formData.schedulingNotes}
                    onChange={(event) =>
                      updateField("schedulingNotes", event.target.value)
                    }
                    rows={4}
                    placeholder="Examples: weekdays only, unavailable dates, travel restrictions, or other scheduling considerations."
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Fee Information
              </h2>

              <p className="mt-2 text-slate-600">
                Review the published fee information for the practical test you
                are requesting.
              </p>

              <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Practical Test
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {[
                      formData.certificateSought,
                      formData.issuanceType,
                      formData.categorySought,
                      formData.classSought,
                      formData.ratingSought,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="p-6">
                  {feeInformationLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                      Loading published fee information…
                    </div>
                  ) : feeInformationError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
                      {feeInformationError}
                    </div>
                  ) : feeInformation ? (
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {feeInformation.fee_label ||
                          "Published Practical Test Fee"}
                      </p>

                      <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(feeInformation.fee_amount)}
                      </p>

                      {feeInformation.applicant_note ? (
                        <div className="mt-5 rounded-xl bg-sky-50 p-5">
                          <p className="text-sm leading-6 text-sky-950">
                            {feeInformation.applicant_note}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                      <p className="font-semibold text-amber-900">
                        Published fee information is not currently available for
                        this practical test.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        The examiner will confirm any applicable testing,
                        travel, cancellation, or additional testing fees before
                        the appointment is finalized.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <label className="mt-7 flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 p-5">
                <input
                  type="checkbox"
                  checked={formData.feeAcknowledged}
                  onChange={(event) =>
                    updateField("feeAcknowledged", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-bold text-slate-900">
                    Fee acknowledgment
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    I acknowledge that I have reviewed the fee information for
                    the practical test requested and agree to pay the published
                    testing fee, any agreed travel fees, and any applicable
                    cancellation or additional testing fees.
                  </span>
                </span>
              </label>

              {!formData.feeAcknowledged ? (
                <p className="mt-3 text-sm font-medium text-slate-600">
                  Fee acknowledgment is required before continuing.
                </p>
              ) : null}
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Review and Submit
              </h2>

              <p className="mt-2 text-slate-600">
                Review your request and accept the remaining acknowledgments
                before submitting.
              </p>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">Applicant</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Name</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.applicantName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">FTN</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.ftnNumber}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">Practical Test</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Certificate</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.certificateSought}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Issuance type</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.issuanceType}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Category</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.categorySought}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Class</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.classSought}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">
                    Location and Aircraft
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Flight school</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.flightSchool === "Other"
                          ? formData.otherFlightSchool
                          : formData.flightSchool}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Airport</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.flightAirportIcao || formData.flightAirport}
                        {formData.flightAirportName
                          ? ` — ${formData.flightAirportName}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Aircraft</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.aircraftMake} {formData.aircraftModel}
                        {formData.aircraftTypeDesignator
                          ? ` · FAA type ${formData.aircraftTypeDesignator}`
                          : ""}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">
                    Instructor and Availability
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Instructor</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.instructorName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">First preferred date</dt>
                      <dd className="font-medium text-slate-900">
                        {formData.firstAvailable
                          ? "First available"
                          : formData.preferredDate1}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {[
                  {
                    field: "eligibilityAcknowledged" as const,
                    title: "Eligibility acknowledgment",
                    text: "I acknowledge that I meet the requirements of 14 CFR Part 61 for the certificate, category, and class sought, or will meet them before final confirmation of the practical test appointment.",
                  },
                  {
                    field: "aircraftAcknowledged" as const,
                    title: "Aircraft acknowledgment",
                    text: "I acknowledge that I will provide an airworthy aircraft capable of completing all required areas of operation. The aircraft records and required documents will be available for inspection.",
                  },
                  {
                    field: "requestAcknowledged" as const,
                    title: "Request acknowledgment",
                    text: "I understand that submitting this request does not confirm an appointment. The request will be reviewed, and I will be contacted when an appointment can be offered.",
                  },
                ].map((acknowledgment) => (
                  <label
                    key={acknowledgment.field}
                    className="flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 p-5"
                  >
                    <input
                      type="checkbox"
                      checked={formData[acknowledgment.field]}
                      onChange={(event) =>
                        updateField(acknowledgment.field, event.target.checked)
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />

                    <span>
                      <span className="block font-bold text-slate-900">
                        {acknowledgment.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {acknowledgment.text}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {submitMessage ? (
          <div
            className={`mt-5 rounded-lg border p-4 text-sm ${
              submitMessage.startsWith("The request is complete")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {submitMessage}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse justify-between gap-4 sm:flex-row">
          <div className="flex gap-3">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={previousStep}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Back
              </button>
            ) : null}

            <button
              type="button"
              onClick={clearDraft}
              className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-500 hover:text-red-700"
            >
              Clear draft
            </button>
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-lg bg-sky-700 px-6 py-3 font-semibold text-white hover:bg-sky-800"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={!allAcknowledgmentsComplete}
              className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Submit Practical Test Request
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
