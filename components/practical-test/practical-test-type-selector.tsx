"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type PracticalTestType = {
  id: string;
  certificate_code: string;
  issuance_code: string;
  category_code: string;
  class_code: string;
  rating_code: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string;
  default_fee: number | null;
  default_duration_minutes: number | null;
  sort_order: number;
};

export type PracticalTestTypeSelection = {
  practicalTestTypeId: string;
  certificateType: string;
  certificateSought: string;
  issuanceType: string;
  categorySought: string;
  classSought: string;
  ratingSought: string;

  ppcTypeRatingAircraftId?: string;
  ppcTypeRatingDesignation?: string;
  ppcAircraftTypeCertificateHolder?: string;
  ppcAircraftCivilModelDesignation?: string;
};

type PpcAircraftOption = {
  id: string;
  type_rating_designation_id: string;
  type_rating_designation: string;
  type_certificate_holder: string | null;
  civil_model_designation: string | null;
  prior_model_designation: string | null;
  equivalent_military_designation: string | null;
  sort_order: number;
};

type Props = {
  examinerProfileId?: string;
  selection: PracticalTestTypeSelection;
  onChange: (selection: PracticalTestTypeSelection) => void;
};

const PILOT_PPC = "Pilot Proficiency Check (61.58)";
const FE_PPC = "Flight Engineer Proficiency Check (91.529)";

const certificateTypeOrder = [
  "Pilot",
  "Flight Instructor",
  "Flight Engineer",
  "Mechanic",
  "Ground Instructor",
];

const pilotCertificateOrder = [
  "Sport Pilot",
  "Private Pilot",
  "Instrument Rating",
  "Commercial Pilot",
  "Airline Transport Pilot",
  PILOT_PPC,
];

function uniqueStrings(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function orderedValues(values: string[], preferredOrder: string[]) {
  const unique = [...new Set(values)];

  return unique.sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);

    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }

    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
}

function getCertificateType(item: PracticalTestType) {
  if (pilotCertificateOrder.includes(item.certificate_name)) {
    return "Pilot";
  }

  if (
    item.certificate_name === "Flight Engineer" ||
    item.certificate_name === FE_PPC
  ) {
    return "Flight Engineer";
  }

  return item.certificate_name;
}

function flightInstructorClassLabel(item: PracticalTestType) {
  const labels: Record<string, string> = {
    CFI_ASEL: "Airplane Single-Engine",
    CFI_AMEL: "Airplane Multiengine",
    MEI: "Airplane Multiengine",
    CFII: "Instrument Airplane",
    CFI_HELICOPTER: "Helicopter",
    CFII_HELICOPTER: "Instrument Helicopter",
    CFI_GLIDER: "Glider",
  };

  return labels[item.rating_code] ?? item.class_name ?? item.rating_name;
}

function SelectField({
  label,
  value,
  onChange,
  disabled = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
        <span className="ml-1 text-red-600">*</span>
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {children}
      </select>
    </div>
  );
}

function ppcAircraftLabel(option: PpcAircraftOption) {
  const aircraft = [
    option.type_certificate_holder,
    option.civil_model_designation,
  ]
    .filter(Boolean)
    .join(" — ");

  return aircraft
    ? `${option.type_rating_designation} — ${aircraft}`
    : option.type_rating_designation;
}

export default function PracticalTestTypeSelector({
  examinerProfileId,
  selection,
  onChange,
}: Props) {
  const [testTypes, setTestTypes] = useState<PracticalTestType[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [ppcAircraft, setPpcAircraft] = useState<PpcAircraftOption[]>([]);

  const [ppcAircraftLoading, setPpcAircraftLoading] = useState(false);

  const [ppcAircraftError, setPpcAircraftError] = useState("");

  const [ppcSearch, setPpcSearch] = useState("");

  const selectedPracticalTestType =
    testTypes.find((item) => item.id === selection.practicalTestTypeId) ?? null;

  const isPpc =
    selection.certificateSought === PILOT_PPC ||
    selection.certificateSought === FE_PPC ||
    selectedPracticalTestType?.certificate_code === "PILOT_PPC_6158" ||
    selectedPracticalTestType?.certificate_code ===
      "FLIGHT_ENGINEER_PPC_91529" ||
    selectedPracticalTestType?.issuance_code === "PPC";

  useEffect(() => {
    let cancelled = false;

    async function loadTestTypes() {
      setLoading(true);
      setLoadError("");

      const supabase = createClient();

      if (!examinerProfileId) {
        setTestTypes([]);
        setLoading(false);
        return;
      }

      const { data, error } =
        examinerProfileId === "__ANY__"
          ? await supabase.rpc("applicant_get_any_examiner_test_types")
          : await supabase.rpc("applicant_get_examiner_test_types", {
              p_examiner_profile_id: examinerProfileId,
            });

      if (cancelled) return;

      if (error) {
        console.error("Unable to load practical test types:", error);

        setLoadError(
          "The available practical test types could not be loaded. Please refresh the page.",
        );

        setTestTypes([]);
      } else {
        setTestTypes((data ?? []) as PracticalTestType[]);
      }

      setLoading(false);
    }

    void loadTestTypes();

    return () => {
      cancelled = true;
    };
  }, [examinerProfileId]);

  useEffect(() => {
    let cancelled = false;

    if (!isPpc) {
      setPpcAircraft([]);
      setPpcAircraftLoading(false);
      setPpcAircraftError("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setPpcAircraftLoading(true);
      setPpcAircraftError("");

      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "applicant_search_ppc_aircraft_types",
        {
          p_query: ppcSearch.trim() || null,
          p_limit: 250,
          p_examiner_profile_id:
            examinerProfileId && examinerProfileId !== "__ANY__"
              ? examinerProfileId
              : null,
          p_certificate_code:
            selectedPracticalTestType?.certificate_code ??
            (selection.certificateSought === PILOT_PPC
              ? "PILOT_PPC_6158"
              : selection.certificateSought === FE_PPC
                ? "FLIGHT_ENGINEER_PPC_91529"
                : null),
        },
      );

      if (cancelled) return;

      if (error) {
        console.error("Unable to load PPC aircraft types:", error);

        setPpcAircraft([]);
        setPpcAircraftError("Aircraft types could not be loaded.");
      } else {
        setPpcAircraft((data ?? []) as PpcAircraftOption[]);
      }

      setPpcAircraftLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    isPpc,
    ppcSearch,
    examinerProfileId,
    selectedPracticalTestType?.certificate_code,
    selection.certificateSought,
  ]);

  const certificateTypes = useMemo(
    () =>
      orderedValues(testTypes.map(getCertificateType), certificateTypeOrder),
    [testTypes],
  );

  const certificateTypeOptions = useMemo(
    () =>
      testTypes.filter(
        (item) => getCertificateType(item) === selection.certificateType,
      ),
    [selection.certificateType, testTypes],
  );

  const pilotCertificates = useMemo(
    () =>
      orderedValues(
        certificateTypeOptions.map((item) => item.certificate_name),
        pilotCertificateOrder,
      ),
    [certificateTypeOptions],
  );

  const flightEngineerCertificates = useMemo(
    () =>
      orderedValues(
        certificateTypeOptions.map((item) => item.certificate_name),
        ["Flight Engineer", FE_PPC],
      ),
    [certificateTypeOptions],
  );

  const selectedCertificateOptions = useMemo(() => {
    if (!selection.certificateType) return [];

    if (
      selection.certificateType === "Pilot" ||
      selection.certificateType === "Flight Engineer"
    ) {
      return certificateTypeOptions.filter(
        (item) => item.certificate_name === selection.certificateSought,
      );
    }

    return certificateTypeOptions;
  }, [
    certificateTypeOptions,
    selection.certificateSought,
    selection.certificateType,
  ]);

  const issuances = useMemo(
    () =>
      orderedValues(
        selectedCertificateOptions.map((item) => item.issuance_name),
        ["Original Issuance", "Additional Rating", "Renewal", "Reinstatement"],
      ),
    [selectedCertificateOptions],
  );

  const issuanceOptions = useMemo(
    () =>
      selectedCertificateOptions.filter(
        (item) => item.issuance_name === selection.issuanceType,
      ),
    [selectedCertificateOptions, selection.issuanceType],
  );

  const isSportPilot =
    selection.certificateType === "Pilot" &&
    selection.certificateSought === "Sport Pilot";

  const isInstrumentRating =
    selection.certificateType === "Pilot" &&
    selection.certificateSought === "Instrument Rating";

  const isFlightInstructor = selection.certificateType === "Flight Instructor";

  const usesRating =
    !isPpc &&
    (isInstrumentRating ||
      selection.certificateType === "Flight Engineer" ||
      selection.certificateType === "Mechanic" ||
      selection.certificateType === "Ground Instructor");

  const usesCategory =
    !isPpc &&
    (isSportPilot ||
      isFlightInstructor ||
      (selection.certificateType === "Pilot" &&
        Boolean(selection.certificateSought) &&
        !isInstrumentRating));

  const categories = useMemo(
    () =>
      uniqueStrings(
        issuanceOptions
          .map((item) => item.category_name)
          .filter((value): value is string => Boolean(value)),
      ),
    [issuanceOptions],
  );

  const categoryOptions = useMemo(() => {
    if (!selection.categorySought) return [];

    return issuanceOptions.filter(
      (item) => item.category_name === selection.categorySought,
    );
  }, [issuanceOptions, selection.categorySought]);

  const standardClasses = useMemo(
    () =>
      uniqueStrings(
        categoryOptions
          .map((item) => item.class_name)
          .filter((value): value is string => Boolean(value)),
      ),
    [categoryOptions],
  );

  const selectedTestType = testTypes.find(
    (item) => item.id === selection.practicalTestTypeId,
  );

  function resetSelection(changes: Partial<PracticalTestTypeSelection>) {
    onChange({
      practicalTestTypeId: "",
      certificateType: selection.certificateType,
      certificateSought: selection.certificateSought,
      issuanceType: "",
      categorySought: "",
      classSought: "",
      ratingSought: "",

      ppcTypeRatingAircraftId: "",
      ppcTypeRatingDesignation: "",
      ppcAircraftTypeCertificateHolder: "",
      ppcAircraftCivilModelDesignation: "",

      ...changes,
    });

    setPpcSearch("");
  }

  function selectCertificateType(value: string) {
    resetSelection({
      certificateType: value,
      certificateSought:
        value && value !== "Pilot" && value !== "Flight Engineer" ? value : "",
    });
  }

  function resolveCertificateSelection(
    certificateType: string,
    certificateName: string,
  ) {
    const ppc = certificateName === PILOT_PPC || certificateName === FE_PPC;

    const ppcTestType = ppc
      ? testTypes.find((item) => item.certificate_name === certificateName)
      : undefined;

    resetSelection({
      certificateType,
      certificateSought: certificateName,
      practicalTestTypeId: ppcTestType?.id ?? "",
      issuanceType: ppcTestType ? "Proficiency Check" : "",
    });
  }

  function selectPilotCertificate(value: string) {
    resolveCertificateSelection("Pilot", value);
  }

  function selectFlightEngineerCertificate(value: string) {
    resolveCertificateSelection("Flight Engineer", value);
  }

  function selectIssuance(value: string) {
    const matching = selectedCertificateOptions.filter(
      (item) => item.issuance_name === value,
    );

    const canResolveImmediately =
      matching.length === 1 && !usesRating && !usesCategory;

    onChange({
      ...selection,
      practicalTestTypeId: canResolveImmediately ? matching[0].id : "",
      issuanceType: value,
      categorySought: "",
      classSought: "",
      ratingSought: "",

      ppcTypeRatingAircraftId: "",
      ppcTypeRatingDesignation: "",
      ppcAircraftTypeCertificateHolder: "",
      ppcAircraftCivilModelDesignation: "",
    });
  }

  function selectRating(testTypeId: string) {
    const option = testTypes.find((item) => item.id === testTypeId);

    if (!option) return;

    onChange({
      ...selection,
      practicalTestTypeId: option.id,
      categorySought: "",
      classSought: "",
      ratingSought: option.rating_name,
    });
  }

  function selectCategory(value: string) {
    const matching = issuanceOptions.filter(
      (item) => item.category_name === value,
    );

    if (isSportPilot) {
      const option = matching[0];

      onChange({
        ...selection,
        practicalTestTypeId: option?.id ?? "",
        categorySought: value,
        classSought: "",
        ratingSought: "",
      });

      return;
    }

    if (!isFlightInstructor) {
      const matchingClasses = matching.filter((item) =>
        Boolean(item.class_name),
      );

      if (matching.length === 1 && matchingClasses.length === 0) {
        onChange({
          ...selection,
          practicalTestTypeId: matching[0].id,
          categorySought: value,
          classSought: "",
          ratingSought: "",
        });

        return;
      }
    }

    onChange({
      ...selection,
      practicalTestTypeId: "",
      categorySought: value,
      classSought: "",
      ratingSought: "",
    });
  }

  function selectStandardClass(value: string) {
    const option = categoryOptions.find((item) => item.class_name === value);

    onChange({
      ...selection,
      practicalTestTypeId: option?.id ?? "",
      classSought: value,
      ratingSought: "",
    });
  }

  function selectInstructorClass(testTypeId: string) {
    const option = testTypes.find((item) => item.id === testTypeId);

    if (!option) return;

    onChange({
      ...selection,
      practicalTestTypeId: option.id,
      classSought: flightInstructorClassLabel(option),
      ratingSought: "",
    });
  }

  function selectPpcAircraft(id: string) {
    const option = ppcAircraft.find((item) => item.id === id);

    if (!option) {
      onChange({
        ...selection,
        ppcTypeRatingAircraftId: "",
        ppcTypeRatingDesignation: "",
        ppcAircraftTypeCertificateHolder: "",
        ppcAircraftCivilModelDesignation: "",
      });

      return;
    }

    onChange({
      ...selection,
      ppcTypeRatingAircraftId: option.id,
      ppcTypeRatingDesignation: option.type_rating_designation,
      ppcAircraftTypeCertificateHolder: option.type_certificate_holder ?? "",
      ppcAircraftCivilModelDesignation: option.civil_model_designation ?? "",
    });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
        Loading available practical tests…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        {loadError}
      </div>
    );
  }

  if (testTypes.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        No practical test types are currently marked as offered.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <SelectField
          label="Certificate Type"
          value={selection.certificateType}
          onChange={selectCertificateType}
        >
          <option value="">Select certificate type</option>

          {certificateTypes.map((certificateType) => (
            <option key={certificateType} value={certificateType}>
              {certificateType}
            </option>
          ))}
        </SelectField>
      </div>

      {selection.certificateType === "Pilot" ? (
        <div>
          <SelectField
            label="Pilot Certificate"
            value={selection.certificateSought}
            onChange={selectPilotCertificate}
          >
            <option value="">Select pilot certificate</option>

            {pilotCertificates.map((certificate) => (
              <option key={certificate} value={certificate}>
                {certificate}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      {selection.certificateType === "Flight Engineer" ? (
        <div>
          <SelectField
            label="Flight Engineer Certificate"
            value={selection.certificateSought}
            onChange={selectFlightEngineerCertificate}
          >
            <option value="">Select flight engineer certificate</option>

            {flightEngineerCertificates.map((certificate) => (
              <option key={certificate} value={certificate}>
                {certificate}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      {!isPpc ? (
        <SelectField
          label="Issuance Type"
          value={selection.issuanceType}
          onChange={selectIssuance}
          disabled={
            !selection.certificateType ||
            ((selection.certificateType === "Pilot" ||
              selection.certificateType === "Flight Engineer") &&
              !selection.certificateSought)
          }
        >
          <option value="">Select issuance type</option>

          {issuances.map((issuance) => (
            <option key={issuance} value={issuance}>
              {issuance}
            </option>
          ))}
        </SelectField>
      ) : null}

      {usesRating ? (
        <SelectField
          label="Rating"
          value={selection.practicalTestTypeId}
          onChange={selectRating}
          disabled={!selection.issuanceType}
        >
          <option value="">Select rating</option>

          {issuanceOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.rating_name}
            </option>
          ))}
        </SelectField>
      ) : null}

      {usesCategory ? (
        <SelectField
          label="Category"
          value={selection.categorySought}
          onChange={selectCategory}
          disabled={!selection.issuanceType}
        >
          <option value="">Select category</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectField>
      ) : null}

      {isFlightInstructor && selection.categorySought ? (
        <SelectField
          label="Class"
          value={selection.practicalTestTypeId}
          onChange={selectInstructorClass}
        >
          <option value="">Select class</option>

          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {flightInstructorClassLabel(option)}
            </option>
          ))}
        </SelectField>
      ) : null}

      {!isFlightInstructor &&
      !isSportPilot &&
      usesCategory &&
      standardClasses.length > 0 ? (
        <SelectField
          label="Class"
          value={selection.classSought}
          onChange={selectStandardClass}
        >
          <option value="">Select class</option>

          {standardClasses.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </SelectField>
      ) : null}

      {isPpc ? (
        <div className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50/50 p-5">
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Aircraft Type
            <span className="ml-1 text-red-600">*</span>
          </label>

          <p className="mb-4 text-sm text-slate-600">
            Select the FAA type-rated aircraft/model for this proficiency check.
          </p>

          <input
            type="search"
            value={ppcSearch}
            onChange={(event) => setPpcSearch(event.target.value)}
            placeholder="Search type rating, manufacturer, or model"
            className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />

          <select
            value={selection.ppcTypeRatingAircraftId}
            onChange={(event) => selectPpcAircraft(event.target.value)}
            disabled={ppcAircraftLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
          >
            <option value="">
              {ppcAircraftLoading
                ? "Loading aircraft types..."
                : "Select aircraft type"}
            </option>

            {ppcAircraft.map((option) => (
              <option key={option.id} value={option.id}>
                {ppcAircraftLabel(option)}
              </option>
            ))}
          </select>

          {ppcAircraftError ? (
            <p className="mt-3 text-sm text-red-700">{ppcAircraftError}</p>
          ) : null}

          {!ppcAircraftLoading &&
          !ppcAircraftError &&
          ppcAircraft.length === 0 ? (
            <p className="mt-3 text-sm text-amber-800">
              No matching FAA aircraft types were found.
            </p>
          ) : null}

          {selection.ppcTypeRatingAircraftId ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <strong>FAA type rating:</strong>{" "}
              {selection.ppcTypeRatingDesignation}
              {selection.ppcAircraftCivilModelDesignation ? (
                <> · {selection.ppcAircraftCivilModelDesignation}</>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedTestType ? (
        <div className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
            Selected flight check
          </p>

          <p className="mt-2 text-lg font-bold text-slate-900">
            {selectedTestType.display_name}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
            {selectedTestType.default_fee !== null ? (
              <span>
                Published fee:{" "}
                <strong>
                  ${Number(selectedTestType.default_fee).toFixed(2)}
                </strong>
              </span>
            ) : (
              <span>Fee will be confirmed during review.</span>
            )}

            {selectedTestType.default_duration_minutes !== null ? (
              <span>
                Estimated duration:{" "}
                <strong>
                  {Math.round(selectedTestType.default_duration_minutes / 60)}{" "}
                  hours
                </strong>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
