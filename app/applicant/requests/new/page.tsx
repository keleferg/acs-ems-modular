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

  examinerProfileId: string;

  practicalTestTypeId: string;
  certificateType: string;
  certificateSought: string;
  issuanceType: string;
  categorySought: string;
  classSought: string;
  ratingSought: string;
  ppcTypeRatingAircraftId: string;
  ppcTypeRatingDesignation: string;
  ppcAircraftTypeCertificateHolder: string;
  ppcAircraftCivilModelDesignation: string;

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

  examinerProfileId: "",

  practicalTestTypeId: "",
  certificateType: "",
  certificateSought: "",
  issuanceType: "",
  categorySought: "",
  classSought: "",
  ratingSought: "",

  ppcTypeRatingAircraftId: "",

  ppcTypeRatingDesignation: "",

  ppcAircraftTypeCertificateHolder: "",

  ppcAircraftCivilModelDesignation: "",

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

type ExaminerOption = {
  examiner_profile_id: string;
  examiner_name: string;
  designation_number: string | null;
};

type AvailabilitySlot = {
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  slot_start_at: string;
  slot_end_at: string;
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

  const [examiners, setExaminers] = useState<ExaminerOption[]>([]);
  const [examinersLoading, setExaminersLoading] = useState(true);

  const [showAvailabilityCalendar, setShowAvailabilityCalendar] =
    useState(false);

  const [availabilitySlots, setAvailabilitySlots] =
    useState<AvailabilitySlot[]>([]);

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [availabilityMonth, setAvailabilityMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadExaminers() {
      setExaminersLoading(true);

      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "applicant_list_available_examiners",
      );

      if (cancelled) return;

      if (error) {
        console.error("Unable to load examiners:", error);
        setExaminers([]);
        setExaminersLoading(false);
        return;
      }

      const rows = (data ?? []) as ExaminerOption[];

      setExaminers(rows);

      if (rows.length === 1) {
        setFormData((current) => ({
          ...current,
          examinerProfileId:
            current.examinerProfileId ||
            rows[0].examiner_profile_id,
        }));
      }

      setExaminersLoading(false);
    }

    void loadExaminers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeeInformation() {
      const practicalTestTypeId = formData.practicalTestTypeId;
      const examinerProfileId = formData.examinerProfileId;

      if (
        !practicalTestTypeId ||
        !examinerProfileId ||
        examinerProfileId === "__ANY__"
      ) {
        setFeeInformation(null);
        setFeeInformationError("");
        setFeeInformationLoading(false);
        return;
      }

      setFeeInformationLoading(true);
      setFeeInformationError("");

      const supabase = createClient();

      const { data, error } = await supabase
        .rpc("applicant_get_examiner_test_fee", {
          p_examiner_profile_id: examinerProfileId,
          p_practical_test_type_id: practicalTestTypeId,
        })
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

      const feeRow =
        data as ApplicantFeeInformation | null;

      setFeeInformation(
        feeRow
          ? {
              fee_amount: Number(feeRow.fee_amount),
              fee_label: feeRow.fee_label ?? null,
              applicant_note: feeRow.applicant_note ?? null,
            }
          : null,
      );

      setFeeInformationLoading(false);
    }

    void loadFeeInformation();

    return () => {
      cancelled = true;
    };
  }, [
    formData.examinerProfileId,
    formData.practicalTestTypeId,
  ]);

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

  const isPpcRequest =
    formData.certificateSought === "Pilot Proficiency Check (61.58)" ||
    formData.certificateSought === "Flight Engineer Proficiency Check (91.529)";

  const allAcknowledgmentsComplete =
    (formData.examinerProfileId === "__ANY__" ||
      formData.feeAcknowledged) &&
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
        formData.examinerProfileId &&
        formData.practicalTestTypeId &&
        formData.certificateSought &&
        (isPpcRequest || formData.issuanceType) &&
        (!isPpcRequest || formData.ppcTypeRatingAircraftId) &&
        formData.isRetest &&
        (isPpcRequest || formData.part141Graduate) &&
        priorFailureComplete,
      );
    }

    if (currentStep === 2) {
      return Boolean(
        formData.flightSchool &&
        formData.flightAirportId &&
        formData.flightAirport &&
        (!isPpcRequest || formData.ppcTypeRatingAircraftId) &&
        (isPpcRequest || formData.aircraftTypeId) &&
        formData.aircraftMake.trim() &&
        formData.aircraftModel.trim() &&
        (!selectedSchoolRequiresLocation || formData.oralTestLocation.trim()) &&
        (formData.flightSchool !== "Other" ||
          formData.otherFlightSchool.trim()),
      );
    }

    if (currentStep === 3) {
      if (
        isPpcRequest &&
        formData.isRetest === "No"
      ) {
        return true;
      }

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
      if (formData.examinerProfileId === "__ANY__") {
        return true;
      }

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

    setCurrentStep((current) => {
      if (
        isPpcRequest &&
        formData.isRetest === "No" &&
        current === 2
      ) {
        return 4;
      }

      return Math.min(current + 1, steps.length - 1);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setSubmitMessage("");
    setCurrentStep((current) => {
      if (
        isPpcRequest &&
        formData.isRetest === "No" &&
        current === 4
      ) {
        return 2;
      }

      return Math.max(current - 1, 0);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setFormData(initialFormData);
    setCurrentStep(0);
    setSubmitMessage("");
  }

  async function submitRequest(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

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

      let issuanceType = isPpcRequest
        ? "proficiency_check"
        : "other";

      if (
        !isPpcRequest &&
        (
          issuanceText.includes("original") ||
          issuanceText.includes("initial")
        )
      ) {
        issuanceType = "original";
      } else if (
        !isPpcRequest &&
        issuanceText.includes("additional")
      ) {
        issuanceType = "additional_rating";
      } else if (
        !isPpcRequest &&
        (
          issuanceText.includes("reissuance") ||
          issuanceText.includes("reinstatement")
        )
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

          assigned_examiner_profile_id:
            formData.examinerProfileId === "__ANY__"
              ? null
              : formData.examinerProfileId || null,

          practical_test_type_id: formData.practicalTestTypeId || null,
          certificate_sought: formData.certificateSought.trim(),
          category_sought: formData.categorySought.trim() || null,
          class_sought: formData.classSought.trim() || null,
          rating_sought: ratingSought,
          issuance_type: issuanceType,

          ppc_type_rating_aircraft_id:
            formData.ppcTypeRatingAircraftId || null,
          ppc_type_rating_designation:
            formData.ppcTypeRatingDesignation.trim() || null,
          ppc_aircraft_type_certificate_holder:
            formData.ppcAircraftTypeCertificateHolder.trim() || null,
          ppc_aircraft_civil_model_designation:
            formData.ppcAircraftCivilModelDesignation.trim() || null,

          is_retest: formData.isRetest === "Yes",
          part_141_graduate:
            isPpcRequest
              ? false
              : formData.part141Graduate === "Yes",
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

          aircraft_type_id:
            isPpcRequest ? null : formData.aircraftTypeId || null,
          aircraft_type_designator:
            isPpcRequest
              ? null
              : formData.aircraftTypeDesignator.trim() || null,
          aircraft_description: aircraftDescription || null,
          aircraft_make: formData.aircraftMake.trim() || null,
          aircraft_model: formData.aircraftModel.trim() || null,
          aircraft_registration:
            formData.aircraftRegistration.trim().toUpperCase() || null,
          aircraft_notes: formData.aircraftNotes.trim() || null,

          instructor_name:
            isPpcRequest && formData.isRetest === "No"
              ? null
              : formData.instructorName.trim() || null,
          instructor_phone:
            isPpcRequest && formData.isRetest === "No"
              ? null
              : formData.instructorPhone.trim() || null,
          instructor_email:
            isPpcRequest && formData.isRetest === "No"
              ? null
              : formData.instructorEmail.trim().toLowerCase() || null,
          instructor_certificate_number:
            isPpcRequest && formData.isRetest === "No"
              ? null
              : formData.instructorCertificateNumber.trim() || null,
          instructor_associated_with_school:
            isPpcRequest && formData.isRetest === "No"
              ? false
              : formData.instructorAssociatedWithSchool === "Yes",

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

          fee_acknowledged:
            formData.examinerProfileId === "__ANY__"
              ? false
              : formData.feeAcknowledged,
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

  async function loadAvailabilityCalendar() {
    if (
      !formData.examinerProfileId ||
      formData.examinerProfileId === "__ANY__"
    ) {
      setAvailabilityError(
        "Availability Calendar is available when you select a specific examiner.",
      );
      return;
    }

    if (!formData.practicalTestTypeId) {
      setAvailabilityError("Select the practical test first.");
      return;
    }

    setShowAvailabilityCalendar(true);
    setAvailabilityLoading(true);
    setAvailabilityError("");

    const [yearText, monthText] =
      availabilityMonth.split("-");

    const year = Number(yearText);
    const month = Number(monthText);

    const firstDate =
      `${yearText}-${monthText}-01`;

    const lastDay =
      new Date(year, month, 0).getDate();

    const lastDate =
      `${yearText}-${monthText}-${String(lastDay).padStart(
        2,
        "0",
      )}`;

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "applicant_get_examiner_open_slots",
      {
        p_examiner_profile_id:
          formData.examinerProfileId,

        p_practical_test_type_id:
          formData.practicalTestTypeId,

        p_start_date:
          firstDate,

        p_end_date:
          lastDate,
      },
    );

    if (error) {
      setAvailabilitySlots([]);
      setAvailabilityError(error.message);
      setAvailabilityLoading(false);
      return;
    }

    setAvailabilitySlots(
      (data ?? []) as AvailabilitySlot[],
    );

    setAvailabilityLoading(false);
  }


  function chooseAvailabilitySlot(
    slot: AvailabilitySlot,
  ) {
    setFormData((current) => ({
      ...current,

      firstAvailable: false,

      preferredDate1:
        slot.slot_date,

      preferredTime:
        "Specific time",

      specificTime:
        slot.slot_start_time.slice(0, 5),
    }));

    setShowAvailabilityCalendar(false);
    setAvailabilityError("");
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

      <form onSubmit={submitRequest} noValidate>
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
                Select a specific examiner if you only want to test with that
                examiner, or select Any Examiner if you would like the first
                available examiner. When Any Examiner is selected, the full
                active practical test catalog is available.
              </p>

              <div className="mt-7">
                <div className="mb-6">
                  <FieldLabel required>Examiner</FieldLabel>

                  <SelectInput
                    value={formData.examinerProfileId}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        examinerProfileId: value,
                        practicalTestTypeId: "",
                        certificateType: "",
                        certificateSought: "",
                        issuanceType: "",
                        categorySought: "",
                        classSought: "",
                        ratingSought: "",

                        ppcTypeRatingAircraftId: "",

                        ppcTypeRatingDesignation: "",

                        ppcAircraftTypeCertificateHolder: "",

                        ppcAircraftCivilModelDesignation: "",
                      }))
                    }
                  >
                    <option value="">
                      {examinersLoading
                        ? "Loading examiners..."
                        : "Select an examiner"}
                    </option>

                  <option value="__ANY__">
                    Any Examiner — First Available
                  </option>

                    {examiners.map((examiner) => (
                      <option
                        key={examiner.examiner_profile_id}
                        value={examiner.examiner_profile_id}
                      >
                        {examiner.examiner_name}
                        {examiner.designation_number
                          ? ` — DPE #${examiner.designation_number}`
                          : ""}
                      </option>
                    ))}
                  </SelectInput>
                </div>

                <PracticalTestTypeSelector
                  examinerProfileId={formData.examinerProfileId}
                selection={{
                    practicalTestTypeId: formData.practicalTestTypeId,
                    certificateType: formData.certificateType,
                    certificateSought: formData.certificateSought,
                    issuanceType: formData.issuanceType,
                    categorySought: formData.categorySought,
                    classSought: formData.classSought,
                    ratingSought: formData.ratingSought,
                    ppcTypeRatingAircraftId: formData.ppcTypeRatingAircraftId,
                    ppcTypeRatingDesignation: formData.ppcTypeRatingDesignation,
                    ppcAircraftTypeCertificateHolder: formData.ppcAircraftTypeCertificateHolder,
                    ppcAircraftCivilModelDesignation: formData.ppcAircraftCivilModelDesignation,
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
                      {isPpcRequest
                        ? "Is this a retest for a previously failed proficiency check?"
                        : "Have you previously failed a test for this certificate or rating?"}
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

                  {!isPpcRequest ? (
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
                  ) : null}
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
                Tell us when you are available. If you would like to see if there
                are specific slots available, click on &quot;View Availability Calendar&quot;.
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => void loadAvailabilityCalendar()}
                  disabled={
                    !formData.examinerProfileId ||
                    formData.examinerProfileId === "__ANY__" ||
                    !formData.practicalTestTypeId
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View Availability Calendar
                </button>
              </div>

              {showAvailabilityCalendar ? (
                <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/40 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Availability Calendar
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        Times shown are current openings. Selecting a
                        time adds it as your preferred appointment time
                        but does not reserve the appointment.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <label>
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Month
                        </span>

                        <input
                          type="month"
                          value={availabilityMonth}
                          onChange={(event) =>
                            setAvailabilityMonth(
                              event.target.value,
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          void loadAvailabilityCalendar()
                        }
                        className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
                      >
                        Refresh
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShowAvailabilityCalendar(false)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {availabilityError ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      {availabilityError}
                    </div>
                  ) : null}

                  {availabilityLoading ? (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                      Loading available appointment slots...
                    </div>
                  ) : null}

                  {!availabilityLoading &&
                  availabilitySlots.length === 0 &&
                  !availabilityError ? (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                      No open appointment slots are currently
                      available for this month.
                    </div>
                  ) : null}

                  {!availabilityLoading &&
                  availabilitySlots.length > 0 ? (
                    <div className="mt-5 space-y-5">
                      {Object.entries(
                        availabilitySlots.reduce<
                          Record<string, AvailabilitySlot[]>
                        >((groups, slot) => {
                          (groups[slot.slot_date] ??= []).push(
                            slot,
                          );

                          return groups;
                        }, {}),
                      ).map(([date, slots]) => (
                        <div
                          key={date}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <p className="font-bold text-slate-900">
                            {new Intl.DateTimeFormat("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            }).format(
                              new Date(
                                `${date}T12:00:00Z`,
                              ),
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot.slot_start_at}
                                type="button"
                                onClick={() =>
                                  chooseAvailabilitySlot(slot)
                                }
                                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                              >
                                {new Intl.DateTimeFormat(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    timeZone:
                                      "Pacific/Honolulu",
                                  },
                                ).format(
                                  new Date(
                                    slot.slot_start_at,
                                  ),
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

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

              {formData.examinerProfileId === "__ANY__" ? (
                <div className="mt-7 rounded-xl border border-sky-200 bg-sky-50 p-5">
                  <p className="font-semibold text-sky-900">
                    Fee acknowledgment is not required yet.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-sky-800">
                    You selected Any Examiner — First Available. An examiner
                    will provide the proposed appointment and applicable fee.
                    You will be able to review and acknowledge the fee before
                    accepting that examiner&apos;s proposal.
                  </p>
                </div>
              ) : (
                <>
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
                        I acknowledge that I have reviewed the fee schedule for the type of
                      test that I am requesting, and agree to pay the published fees for
                      testing, any agreed upon travel fees, and any fees resulting
                      cancellation on the day of the test when the applicant is at fault.
                      Weather and Mechanical cancellations are not the fault of the
                      applicant. Travel fees are not returnable if the DPE has traveled
                      to the site location. The link to the Fee Schedule is provided
                      below.
                      </span>
                    </span>
                  </label>

                  {!formData.feeAcknowledged ? (
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      Fee acknowledgment is required before continuing.
                    </p>
                  ) : null}
                </>
              )}
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
                    text: "I acknowledge that I meet the requirements for the certificate and rating sought in Part 61 or will meet the requirements prior to final confirmation of a test date and time. Failure to meet the requirements at the appointment time may result in up to a $500 cancellation fee.",
                  },
                  {
                    field: "aircraftAcknowledged" as const,
                    title: "Aircraft acknowledgment",
                    text: "I acknowledge that I will provide an airworthy aircraft for the practical test that is capable of conducting all areas of operation required for the certificate and rating sought. The logbooks will need to be provided to the DPE for review at the appointment date / time and location.",
                  },
                  {
                    field: "requestAcknowledged" as const,
                    title: "Request acknowledgment",
                    text: "I understand that this test request is just a request - it is not a confirmation of a test date or time. We will review the request list daily and when there is an opening, you will be contacted to confirm the schedule. Should you be able to confirm a test with another DPE, we ask that you cancel your request so we can move on to the next applicant. You will also receive confirmation emails when you scheduled appointment in confirmed.",
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
              type="button"
              disabled={
                !allAcknowledgmentsComplete ||
                isSubmitting
              }
              onClick={() => {
                void submitRequest();
              }}
              className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting
                ? "Submitting…"
                : "Submit Practical Test Request"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
