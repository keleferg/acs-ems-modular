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
};

type Props = {
  selection: PracticalTestTypeSelection;
  onChange: (selection: PracticalTestTypeSelection) => void;
};

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
  if (
    pilotCertificateOrder.includes(item.certificate_name)
  ) {
    return "Pilot";
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

  return (
    labels[item.rating_code] ??
    item.class_name ??
    item.rating_name
  );
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

export default function PracticalTestTypeSelector({
  selection,
  onChange,
}: Props) {
  const [testTypes, setTestTypes] = useState<PracticalTestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTestTypes() {
      setLoading(true);
      setLoadError("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("practical_test_types")
        .select(`
          id,
          certificate_code,
          issuance_code,
          category_code,
          class_code,
          rating_code,
          certificate_name,
          issuance_name,
          category_name,
          class_name,
          rating_name,
          display_name,
          default_fee,
          default_duration_minutes,
          sort_order
        `)
        .eq("is_active", true)
        .eq("is_offered", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error(
          "Unable to load practical test types:",
          error,
        );

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
  }, []);

  const certificateTypes = useMemo(
    () =>
      orderedValues(
        testTypes.map(getCertificateType),
        certificateTypeOrder,
      ),
    [testTypes],
  );

  const certificateTypeOptions = useMemo(
    () =>
      testTypes.filter(
        (item) =>
          getCertificateType(item) === selection.certificateType,
      ),
    [selection.certificateType, testTypes],
  );

  const pilotCertificates = useMemo(
    () =>
      orderedValues(
        certificateTypeOptions.map(
          (item) => item.certificate_name,
        ),
        pilotCertificateOrder,
      ),
    [certificateTypeOptions],
  );

  const selectedCertificateOptions = useMemo(() => {
    if (!selection.certificateType) return [];

    if (selection.certificateType === "Pilot") {
      return certificateTypeOptions.filter(
        (item) =>
          item.certificate_name === selection.certificateSought,
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
        selectedCertificateOptions.map(
          (item) => item.issuance_name,
        ),
        [
          "Original Issuance",
          "Additional Rating",
          "Renewal",
          "Reinstatement",
        ],
      ),
    [selectedCertificateOptions],
  );

  const issuanceOptions = useMemo(
    () =>
      selectedCertificateOptions.filter(
        (item) =>
          item.issuance_name === selection.issuanceType,
      ),
    [selectedCertificateOptions, selection.issuanceType],
  );

  const isSportPilot =
    selection.certificateType === "Pilot" &&
    selection.certificateSought === "Sport Pilot";

  const isInstrumentRating =
    selection.certificateType === "Pilot" &&
    selection.certificateSought === "Instrument Rating";

  const isFlightInstructor =
    selection.certificateType === "Flight Instructor";

  const usesRating =
    isInstrumentRating ||
    selection.certificateType === "Flight Engineer" ||
    selection.certificateType === "Mechanic" ||
    selection.certificateType === "Ground Instructor";

  const usesCategory =
    isSportPilot ||
    isFlightInstructor ||
    (
      selection.certificateType === "Pilot" &&
      Boolean(selection.certificateSought) &&
      !isInstrumentRating
    );

  const categories = useMemo(
    () =>
      uniqueStrings(
        issuanceOptions
          .map((item) => item.category_name)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    [issuanceOptions],
  );

  const categoryOptions = useMemo(() => {
    if (!selection.categorySought) return [];

    return issuanceOptions.filter(
      (item) =>
        item.category_name === selection.categorySought,
    );
  }, [issuanceOptions, selection.categorySought]);

  const standardClasses = useMemo(
    () =>
      uniqueStrings(
        categoryOptions
          .map((item) => item.class_name)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    [categoryOptions],
  );

  const selectedTestType = testTypes.find(
    (item) => item.id === selection.practicalTestTypeId,
  );

  function resetSelection(
    changes: Partial<PracticalTestTypeSelection>,
  ) {
    onChange({
      practicalTestTypeId: "",
      certificateType: selection.certificateType,
      certificateSought: selection.certificateSought,
      issuanceType: "",
      categorySought: "",
      classSought: "",
      ratingSought: "",
      ...changes,
    });
  }

  function selectCertificateType(value: string) {
    resetSelection({
      certificateType: value,
      certificateSought:
        value && value !== "Pilot" ? value : "",
    });
  }

  function selectPilotCertificate(value: string) {
    resetSelection({
      certificateType: "Pilot",
      certificateSought: value,
    });
  }

  function selectIssuance(value: string) {
    const matching = selectedCertificateOptions.filter(
      (item) => item.issuance_name === value,
    );

    const canResolveImmediately =
      matching.length === 1 &&
      !usesRating &&
      !usesCategory;

    onChange({
      ...selection,
      practicalTestTypeId: canResolveImmediately
        ? matching[0].id
        : "",
      issuanceType: value,
      categorySought: "",
      classSought: "",
      ratingSought: "",
    });
  }

  function selectRating(testTypeId: string) {
    const option = testTypes.find(
      (item) => item.id === testTypeId,
    );

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
      const matchingClasses = matching.filter(
        (item) => Boolean(item.class_name),
      );

      if (
        matching.length === 1 &&
        matchingClasses.length === 0
      ) {
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
    const option = categoryOptions.find(
      (item) => item.class_name === value,
    );

    onChange({
      ...selection,
      practicalTestTypeId: option?.id ?? "",
      classSought: value,
      ratingSought: "",
    });
  }

  function selectInstructorClass(testTypeId: string) {
    const option = testTypes.find(
      (item) => item.id === testTypeId,
    );

    if (!option) return;

    onChange({
      ...selection,
      practicalTestTypeId: option.id,
      classSought: flightInstructorClassLabel(option),
      ratingSought: "",
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
            <option
              key={certificateType}
              value={certificateType}
            >
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

      <SelectField
        label="Issuance Type"
        value={selection.issuanceType}
        onChange={selectIssuance}
        disabled={
          !selection.certificateType ||
          (
            selection.certificateType === "Pilot" &&
            !selection.certificateSought
          )
        }
      >
        <option value="">Select issuance type</option>

        {issuances.map((issuance) => (
          <option key={issuance} value={issuance}>
            {issuance}
          </option>
        ))}
      </SelectField>

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

      {isFlightInstructor &&
      selection.categorySought ? (
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

      {selectedTestType ? (
        <div className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
            Selected practical test
          </p>

          <p className="mt-2 text-lg font-bold text-slate-900">
            {selectedTestType.display_name}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
            {selectedTestType.default_fee !== null ? (
              <span>
                Published fee:{" "}
                <strong>
                  ${Number(
                    selectedTestType.default_fee,
                  ).toFixed(2)}
                </strong>
              </span>
            ) : (
              <span>
                Fee will be confirmed during review.
              </span>
            )}

            {selectedTestType.default_duration_minutes !==
            null ? (
              <span>
                Estimated duration:{" "}
                <strong>
                  {Math.round(
                    selectedTestType.default_duration_minutes /
                      60,
                  )}{" "}
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
