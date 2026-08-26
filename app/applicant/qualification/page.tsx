"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Loader2,
  Save,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type ApplicantRequest = {
  id: string;
  request_number: string;
  status: string;
  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  issuance_type: string | null;
  practical_test_type_id: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
};

type QualificationWizard = {
  id: string;
  practical_test_request_id: string;
  applicant_profile_id: string | null;
  examiner_profile_id: string;
  rule_set_id: string;
  status: string;
  available_at: string;
  opened_at: string | null;
  current_revision_number: number;
};

type QualificationRuleSet = {
  id: string;
  code: string;
  version: number;
  display_name: string;
  applicant_instructions: string | null;
};

type QualificationRevision = {
  id: string;
  wizard_id: string;
  revision_number: number;
  revision_status: string;
  is_locked: boolean;
};

type DisplayField = {
  key: string;
  label?: string;
  type?: string;
  options?: string[];
  placeholder?: string;
};

type QualificationRequirement = {
  id: string;
  rule_set_id: string;
  section_code: string;
  requirement_code: string;
  requirement_type: string;
  title: string;
  description: string | null;
  regulation_citation: string | null;
  advisory_circular_citation: string | null;
  required: boolean;
  allows_not_applicable: boolean;
  requires_document: boolean;
  rule_config: Record<string, unknown>;
  display_config: {
    fields?: DisplayField[];
  };
  sort_order: number;
};

type QualificationAnswer = {
  id: string;
  revision_id: string;
  requirement_id: string;
  answer_value: Record<string, unknown>;
  applicant_notes: string | null;
  automated_result: string;
  automated_result_message: string | null;
  updated_at: string;
};

type AnswerDraft = {
  values: Record<string, string | boolean>;
  notes: string;
};

const sectionNames: Record<string, string> = {
  identity: "Identity Verification",
  eligibility: "General Eligibility",
  knowledge_test: "Knowledge Test",
  application: "Application Documents",
  medical: "Medical Qualification",
  experience: "Aeronautical Experience",
  cross_country: "Cross-Country Flights",
  endorsements: "Required Endorsements",
  certification: "Certifications",
};

const sectionOrder = [
  "identity",
  "eligibility",
  "knowledge_test",
  "application",
  "medical",
  "experience",
  "cross_country",
  "endorsements",
  "certification",
];

function formatStatus(value: string) {
  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatIssuanceType(value: string | null) {
  return value ? formatStatus(value) : "Not specified";
}

function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMilliseconds(value: string | null) {
  if (!value) return 0;

  const milliseconds = new Date(value).getTime();
  return Number.isNaN(milliseconds) ? 0 : milliseconds;
}

function getTimeRemaining(
  availableAt: string,
  nowMilliseconds: number,
) {
  const remaining =
    getMilliseconds(availableAt) - nowMilliseconds;

  if (remaining <= 0) {
    return "Available now";
  }

  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor(
    (totalMinutes % 1_440) / 60,
  );
  const minutes = totalMinutes % 60;

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "boolean") return true;

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }

  return false;
}

function isAnswerComplete(
  requirement: QualificationRequirement,
  draft: AnswerDraft | undefined,
) {
  if (!draft) return false;

  if (requirement.rule_config.answer_type === "computed") {
    return true;
  }

  const fields = requirement.display_config.fields ?? [];

  if (fields.length > 0) {
    return fields.every((field) =>
      hasMeaningfulValue(draft.values[field.key]),
    );
  }

  return hasMeaningfulValue(draft.values.value);
}

function getDefaultFields(
  requirement: QualificationRequirement,
): DisplayField[] {
  const configuredFields =
    requirement.display_config.fields ?? [];

  if (configuredFields.length > 0) {
    return configuredFields;
  }

  const answerType = String(
    requirement.rule_config.answer_type ?? "text",
  );

  switch (answerType) {
    case "yes_no":
      return [
        {
          key: "value",
          label: requirement.title,
          type: "yes_no",
        },
      ];

    case "date":
      return [
        {
          key: "value",
          label: "Date",
          type: "date",
        },
      ];

    case "flight_hours":
    case "dated_flight_hours":
      return [
        {
          key: "completion_date",
          label: "Completion or most recent qualifying date",
          type: "date",
        },
        {
          key: "hours",
          label: "Qualifying hours",
          type: "number",
        },
        {
          key: "logbook_reference",
          label: "Logbook page or electronic reference",
          type: "text",
        },
      ];

    case "count":
      return [
        {
          key: "completion_date",
          label: "Completion date",
          type: "date",
        },
        {
          key: "takeoffs",
          label: "Qualifying takeoffs",
          type: "number",
        },
        {
          key: "landings",
          label: "Qualifying landings",
          type: "number",
        },
        {
          key: "logbook_reference",
          label: "Logbook page or electronic reference",
          type: "text",
        },
      ];

    case "route":
      return [
        {
          key: "flight_date",
          label: "Flight date",
          type: "date",
        },
        {
          key: "departure",
          label: "Departure point",
          type: "text",
        },
        {
          key: "route",
          label: "Intermediate points and route",
          type: "textarea",
        },
        {
          key: "destination",
          label: "Destination or final point",
          type: "text",
        },
        {
          key: "logged_distance_nm",
          label: "Logged distance in nautical miles",
          type: "number",
        },
        {
          key: "logbook_reference",
          label: "Logbook page or electronic reference",
          type: "text",
        },
      ];

    case "endorsement":
      return [
        {
          key: "endorsement_date",
          label: "Endorsement date",
          type: "date",
        },
        {
          key: "instructor_name",
          label: "Instructor name",
          type: "text",
        },
        {
          key: "instructor_certificate_number",
          label: "Instructor certificate number",
          type: "text",
        },
        {
          key: "endorsement_text",
          label: "Endorsement text",
          type: "textarea",
        },
      ];

    case "typed_signature":
      return [
        {
          key: "certified_name",
          label: "Type your full legal name",
          type: "text",
        },
        {
          key: "certified",
          label:
            "I certify that the information entered is true and complete.",
          type: "checkbox",
        },
      ];

    case "instructor_certification":
    case "computed":
      return [];

    default:
      return [
        {
          key: "value",
          label: requirement.title,
          type: "text",
        },
      ];
  }
}

function fieldValueToString(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return "";
}

export default function ApplicantQualificationPage() {
  const [requests, setRequests] = useState<
    ApplicantRequest[]
  >([]);

  const [selectedRequestId, setSelectedRequestId] =
    useState("");

  const [wizard, setWizard] =
    useState<QualificationWizard | null>(null);

  const [ruleSet, setRuleSet] =
    useState<QualificationRuleSet | null>(null);

  const [revision, setRevision] =
    useState<QualificationRevision | null>(null);

  const [requirements, setRequirements] = useState<
    QualificationRequirement[]
  >([]);

  const [answers, setAnswers] = useState<
    QualificationAnswer[]
  >([]);

  const [drafts, setDrafts] = useState<
    Record<string, AnswerDraft>
  >({});

  const [savingRequirementId, setSavingRequirementId] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingWizard, setLoadingWizard] =
    useState(false);

  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const loadQualification = useCallback(
    async (requestId: string) => {
      if (!requestId) {
        setWizard(null);
        setRuleSet(null);
        setRevision(null);
        setRequirements([]);
        setAnswers([]);
        setDrafts({});
        return;
      }

      setLoadingWizard(true);
      setPageError("");
      setMessage("");

      const supabase = createClient();

      const { data: wizardData, error: wizardError } =
        await supabase.rpc(
          "applicant_open_pretest_qualification",
          {
            p_request_id: requestId,
          },
        );

      if (wizardError) {
        setPageError(
          `The qualification wizard could not be opened: ${wizardError.message}`,
        );
        setLoadingWizard(false);
        return;
      }

      const loadedWizard = (
        Array.isArray(wizardData)
          ? wizardData[0]
          : wizardData
      ) as QualificationWizard | null;

      if (!loadedWizard) {
        setPageError(
          "The qualification wizard did not return a record.",
        );
        setLoadingWizard(false);
        return;
      }

      setWizard(loadedWizard);

      const [
        ruleSetResult,
        revisionResult,
        requirementResult,
      ] = await Promise.all([
        supabase
          .from("qualification_rule_sets")
          .select(
            `
            id,
            code,
            version,
            display_name,
            applicant_instructions
            `,
          )
          .eq("id", loadedWizard.rule_set_id)
          .single(),

        supabase
          .from("qualification_wizard_revisions")
          .select(
            `
            id,
            wizard_id,
            revision_number,
            revision_status,
            is_locked
            `,
          )
          .eq("wizard_id", loadedWizard.id)
          .eq(
            "revision_number",
            loadedWizard.current_revision_number,
          )
          .single(),

        supabase
          .from("qualification_requirements")
          .select(
            `
            id,
            rule_set_id,
            section_code,
            requirement_code,
            requirement_type,
            title,
            description,
            regulation_citation,
            advisory_circular_citation,
            required,
            allows_not_applicable,
            requires_document,
            rule_config,
            display_config,
            sort_order
            `,
          )
          .eq("rule_set_id", loadedWizard.rule_set_id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (ruleSetResult.error) {
        setPageError(
          `The rules package could not be loaded: ${ruleSetResult.error.message}`,
        );
        setLoadingWizard(false);
        return;
      }

      if (revisionResult.error) {
        setPageError(
          `The qualification revision could not be loaded: ${revisionResult.error.message}`,
        );
        setLoadingWizard(false);
        return;
      }

      if (requirementResult.error) {
        setPageError(
          `The qualification requirements could not be loaded: ${requirementResult.error.message}`,
        );
        setLoadingWizard(false);
        return;
      }

      const loadedRevision =
        revisionResult.data as QualificationRevision;

      const loadedRequirements =
        (requirementResult.data ??
          []) as QualificationRequirement[];

      setRuleSet(
        ruleSetResult.data as QualificationRuleSet,
      );

      setRevision(loadedRevision);
      setRequirements(loadedRequirements);

      const { data: answerRows, error: answerError } =
        await supabase
          .from("qualification_answers")
          .select(
            `
            id,
            revision_id,
            requirement_id,
            answer_value,
            applicant_notes,
            automated_result,
            automated_result_message,
            updated_at
            `,
          )
          .eq("revision_id", loadedRevision.id);

      if (answerError) {
        setPageError(
          `Saved qualification answers could not be loaded: ${answerError.message}`,
        );
        setLoadingWizard(false);
        return;
      }

      const loadedAnswers =
        (answerRows ?? []) as QualificationAnswer[];

      setAnswers(loadedAnswers);

      const nextDrafts: Record<string, AnswerDraft> = {};

      for (const requirement of loadedRequirements) {
        const answer = loadedAnswers.find(
          (item) =>
            item.requirement_id === requirement.id,
        );

        const values: Record<
          string,
          string | boolean
        > = {};

        for (const [key, value] of Object.entries(
          answer?.answer_value ?? {},
        )) {
          values[key] =
            typeof value === "boolean"
              ? value
              : fieldValueToString(value);
        }

        nextDrafts[requirement.id] = {
          values,
          notes: answer?.applicant_notes ?? "",
        };
      }

      setDrafts(nextDrafts);
      setLoadingWizard(false);
    },
    [],
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPageError(
        "Your login session could not be verified. Please sign in again.",
      );
      setLoading(false);
      return;
    }

    const {
      data: applicantProfile,
      error: profileError,
    } = await supabase
      .from("applicant_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (profileError) {
      setPageError(
        `Your applicant profile could not be loaded: ${profileError.message}`,
      );
      setLoading(false);
      return;
    }

    if (!applicantProfile) {
      setPageError(
        "Your applicant profile could not be found.",
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("practical_test_requests")
      .select(
        `
        id,
        request_number,
        status,
        certificate_sought,
        category_sought,
        class_sought,
        rating_sought,
        issuance_type,
        practical_test_type_id,
        scheduled_start_at,
        scheduled_end_at,
        scheduled_location
        `,
      )
      .eq("applicant_profile_id", applicantProfile.id)
      .eq("status", "confirmed")
      .not("scheduled_start_at", "is", null)
      .order("scheduled_start_at", {
        ascending: true,
      });

    if (error) {
      setPageError(
        `Confirmed appointments could not be loaded: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    const loadedRequests =
      (data ?? []) as ApplicantRequest[];

    setRequests(loadedRequests);

    const nextRequest =
      loadedRequests.find(
        (request) =>
          getMilliseconds(request.scheduled_start_at) >=
          Date.now() - 24 * 60 * 60 * 1000,
      ) ?? loadedRequests[0];

    if (nextRequest) {
      setSelectedRequestId(nextRequest.id);
      await loadQualification(nextRequest.id);
    }

    setLoading(false);
  }, [loadQualification]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const selectedRequest = useMemo(
    () =>
      requests.find(
        (request) => request.id === selectedRequestId,
      ) ?? null,
    [requests, selectedRequestId],
  );

  const groupedRequirements = useMemo(() => {
    const groups = new Map<
      string,
      QualificationRequirement[]
    >();

    for (const requirement of requirements) {
      const current =
        groups.get(requirement.section_code) ?? [];

      current.push(requirement);
      groups.set(requirement.section_code, current);
    }

    return Array.from(groups.entries()).sort(
      ([left], [right]) => {
        const leftIndex = sectionOrder.indexOf(left);
        const rightIndex = sectionOrder.indexOf(right);

        return (
          (leftIndex === -1 ? 999 : leftIndex) -
          (rightIndex === -1 ? 999 : rightIndex)
        );
      },
    );
  }, [requirements]);

  const completedRequiredCount = useMemo(
    () =>
      requirements.filter(
        (requirement) =>
          requirement.required &&
          isAnswerComplete(
            requirement,
            drafts[requirement.id],
          ),
      ).length,
    [requirements, drafts],
  );

  const requiredCount = useMemo(
    () =>
      requirements.filter(
        (requirement) =>
          requirement.required &&
          requirement.rule_config.answer_type !==
            "instructor_certification",
      ).length,
    [requirements],
  );

  const progressPercent =
    requiredCount > 0
      ? Math.round(
          (completedRequiredCount / requiredCount) * 100,
        )
      : 0;

  const isAvailable =
    wizard !== null &&
    clock >= getMilliseconds(wizard.available_at);

  const isEditable =
    isAvailable &&
    revision !== null &&
    !revision.is_locked &&
    wizard !== null &&
    ![
      "awaiting_instructor",
      "instructor_certified",
      "examiner_review",
      "deficiencies_found",
      "accepted",
      "closed",
    ].includes(wizard.status);

  function updateDraftValue(
    requirementId: string,
    fieldKey: string,
    value: string | boolean,
  ) {
    setDrafts((current) => ({
      ...current,
      [requirementId]: {
        values: {
          ...(current[requirementId]?.values ?? {}),
          [fieldKey]: value,
        },
        notes: current[requirementId]?.notes ?? "",
      },
    }));
  }

  function updateDraftNotes(
    requirementId: string,
    notes: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [requirementId]: {
        values:
          current[requirementId]?.values ?? {},
        notes,
      },
    }));
  }

  async function saveRequirement(
    requirement: QualificationRequirement,
  ) {
    if (!wizard || !isEditable) return;

    setSavingRequirementId(requirement.id);
    setPageError("");
    setMessage("");

    const draft = drafts[requirement.id] ?? {
      values: {},
      notes: "",
    };

    const answerValue: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      draft.values,
    )) {
      answerValue[key] = value;
    }

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "applicant_save_qualification_answer",
      {
        p_wizard_id: wizard.id,
        p_requirement_id: requirement.id,
        p_answer_value: answerValue,
        p_applicant_notes: draft.notes || null,
      },
    );

    if (error) {
      setPageError(
        `${requirement.title} could not be saved: ${error.message}`,
      );
      setSavingRequirementId(null);
      return;
    }

    const savedAnswer = (
      Array.isArray(data) ? data[0] : data
    ) as QualificationAnswer;

    setAnswers((current) => [
      ...current.filter(
        (answer) =>
          answer.requirement_id !== requirement.id,
      ),
      savedAnswer,
    ]);

    setMessage(`${requirement.title} saved.`);
    setSavingRequirementId(null);
  }

  async function submitQualification() {
    if (
      !wizard ||
      !selectedRequest ||
      !isEditable
    ) {
      return;
    }

    setPageError("");
    setMessage("");

    const applicantRequirements =
      requirements.filter(
        (requirement) => {
          const answerType = String(
            requirement.rule_config
              .answer_type ?? "text",
          );

          return (
            answerType !== "computed" &&
            answerType !==
              "instructor_certification"
          );
        },
      );

    const incompleteRequired =
      applicantRequirements.filter(
        (requirement) =>
          requirement.required &&
          !isAnswerComplete(
            requirement,
            drafts[requirement.id],
          ),
      );

    if (incompleteRequired.length) {
      setPageError(
        `Complete all required items before submitting. First incomplete item: ${incompleteRequired[0].title}`,
      );
      return;
    }

    setSubmitting(true);

    const supabase = createClient();

    try {
      // Save every applicant-editable requirement first so
      // the database submission contains the latest entries.
      for (const requirement of applicantRequirements) {
        const draft =
          drafts[requirement.id] ?? {
            values: {},
            notes: "",
          };

        const { error } =
          await supabase.rpc(
            "applicant_save_qualification_answer",
            {
              p_wizard_id:
                wizard.id,
              p_requirement_id:
                requirement.id,
              p_answer_value:
                draft.values,
              p_applicant_notes:
                draft.notes || null,
            },
          );

        if (error) {
          throw new Error(
            `${requirement.title} could not be saved: ${error.message}`,
          );
        }
      }

      const {
        error: submitError,
      } = await supabase.rpc(
        "applicant_submit_pretest_qualification",
        {
          p_wizard_id:
            wizard.id,
        },
      );

      if (submitError) {
        throw new Error(
          submitError.message,
        );
      }

      await loadQualification(
        selectedRequest.id,
      );

      setMessage(
        "Qualification package submitted successfully.",
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The qualification package could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(
    requirement: QualificationRequirement,
    field: DisplayField,
  ) {
    const draft = drafts[requirement.id];
    const value = draft?.values[field.key];
    const inputId = `${requirement.id}-${field.key}`;
    const disabled = !isEditable;

    if (field.type === "checkbox") {
      return (
        <label
          key={field.key}
          htmlFor={inputId}
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input
            id={inputId}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(event) =>
              updateDraftValue(
                requirement.id,
                field.key,
                event.target.checked,
              )
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />

          <span className="text-sm text-slate-800">
            {field.label}
          </span>
        </label>
      );
    }

    if (field.type === "yes_no") {
      return (
        <div key={field.key}>
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            {field.label}
          </label>

          <select
            id={inputId}
            value={
              value === true
                ? "yes"
                : value === false
                  ? "no"
                  : ""
            }
            disabled={disabled}
            onChange={(event) => {
              const nextValue = event.target.value;

              updateDraftValue(
                requirement.id,
                field.key,
                nextValue === ""
                  ? ""
                  : nextValue === "yes",
              );
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
          >
            <option value="">Select an answer</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            {field.label}
          </label>

          <select
            id={inputId}
            value={fieldValueToString(value)}
            disabled={disabled}
            onChange={(event) =>
              updateDraftValue(
                requirement.id,
                field.key,
                event.target.value,
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
          >
            <option value="">Select an option</option>

            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div
          key={field.key}
          className="sm:col-span-2"
        >
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            {field.label}
          </label>

          <textarea
            id={inputId}
            value={fieldValueToString(value)}
            disabled={disabled}
            rows={4}
            placeholder={field.placeholder}
            onChange={(event) =>
              updateDraftValue(
                requirement.id,
                field.key,
                event.target.value,
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          {field.label}
        </label>

        <input
          id={inputId}
          type={
            field.type === "date"
              ? "date"
              : field.type === "number"
                ? "number"
                : "text"
          }
          step={
            field.type === "number" ? "0.1" : undefined
          }
          min={
            field.type === "number" ? "0" : undefined
          }
          value={fieldValueToString(value)}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(event) =>
            updateDraftValue(
              requirement.id,
              field.key,
              event.target.value,
            )
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Applicant Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Pretest Qualification
        </h1>

        <p className="mt-2 max-w-4xl text-slate-600">
          Complete the required eligibility,
          aeronautical-experience, medical,
          endorsement, and identity checks before your
          practical test.
        </p>
      </div>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading confirmed appointments…
        </div>
      ) : null}

      {!loading && requests.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-400" />

          <h2 className="mt-4 text-xl font-bold text-slate-950">
            No confirmed practical test
          </h2>

          <p className="mt-2 text-slate-600">
            Your qualification wizard will appear after
            your practical-test appointment is confirmed.
          </p>
        </section>
      ) : null}

      {!loading && requests.length > 0 ? (
        <>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label
              htmlFor="qualification-request"
              className="text-sm font-bold text-slate-900"
            >
              Practical-test appointment
            </label>

            <select
              id="qualification-request"
              value={selectedRequestId}
              onChange={(event) => {
                const requestId = event.target.value;
                setSelectedRequestId(requestId);
                void loadQualification(requestId);
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            >
              {requests.map((request) => (
                <option
                  key={request.id}
                  value={request.id}
                >
                  {request.request_number} —{" "}
                  {request.certificate_sought} —{" "}
                  {request.rating_sought} —{" "}
                  {formatDateTime(
                    request.scheduled_start_at,
                  )}
                </option>
              ))}
            </select>
          </section>

          {loadingWizard ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading qualification wizard…
            </div>
          ) : null}

          {!loadingWizard &&
          wizard &&
          selectedRequest ? (
            <>
              <section className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Practical Test
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    {selectedRequest.certificate_sought} —{" "}
                    {selectedRequest.rating_sought}
                  </h2>

                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Issuance
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {formatIssuanceType(
                          selectedRequest.issuance_type,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Appointment
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {formatDateTime(
                          selectedRequest.scheduled_start_at,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Location
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {selectedRequest.scheduled_location ||
                          "Not specified"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Wizard status
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {formatStatus(wizard.status)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Progress
                  </p>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-bold text-slate-950">
                      {progressPercent}%
                    </p>

                    <p className="text-sm text-slate-600">
                      {completedRequiredCount} of{" "}
                      {requiredCount}
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-700 transition-all"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Progress is based on required applicant
                    entries. Saved requirements are automatically
                    validated when applicable.
                  </p>
                </div>
              </section>

              {!isAvailable ? (
                <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-7">
                  <div className="flex gap-4">
                    <CalendarClock className="mt-1 h-7 w-7 shrink-0 text-amber-700" />

                    <div>
                      <h2 className="text-xl font-bold text-amber-950">
                        Opens 48 hours before your test
                      </h2>

                      <p className="mt-2 text-amber-900">
                        This wizard becomes available on{" "}
                        <strong>
                          {formatDateTime(
                            wizard.available_at,
                          )}
                        </strong>
                        .
                      </p>

                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <Clock3 className="h-4 w-4" />
                        {getTimeRemaining(
                          wizard.available_at,
                          clock,
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {ruleSet?.applicant_instructions ? (
                <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
                  {ruleSet.applicant_instructions}
                </section>
              ) : null}

              {isAvailable &&
              !isEditable ? (
                <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />

                    <div>
                      <h2 className="font-bold text-emerald-950">
                        Applicant qualification submitted
                      </h2>

                      <p className="mt-1 text-sm text-emerald-900">
                        Your applicant portion is locked while the qualification package continues through review.
                      </p>

                      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-emerald-800">
                        Current status:{" "}
                        {formatStatus(
                          wizard.status,
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {isAvailable ? (
                <div className="mt-6 space-y-5">
                  {groupedRequirements.map(
                    ([sectionCode, sectionRequirements]) => (
                      <section
                        key={sectionCode}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                          <h2 className="text-lg font-bold text-slate-950">
                            {sectionNames[sectionCode] ??
                              formatStatus(sectionCode)}
                          </h2>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              sectionRequirements.filter(
                                (requirement) =>
                                  isAnswerComplete(
                                    requirement,
                                    drafts[requirement.id],
                                  ),
                              ).length
                            }{" "}
                            of {sectionRequirements.length}{" "}
                            completed
                          </p>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {sectionRequirements.map(
                            (requirement) => {
                              const fields =
                                getDefaultFields(
                                  requirement,
                                );

                              const answerComplete =
                                isAnswerComplete(
                                  requirement,
                                  drafts[requirement.id],
                                );

                              const answer = answers.find(
                                (item) =>
                                  item.requirement_id ===
                                  requirement.id,
                              );

                              const isInstructorOnly =
                                requirement.rule_config
                                  .answer_type ===
                                "instructor_certification";

                              const isComputed =
                                requirement.rule_config
                                  .answer_type === "computed";

                              return (
                                <details
                                  key={requirement.id}
                                  className="group"
                                >
                                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                                    <div className="flex min-w-0 gap-3">
                                      {answer?.automated_result ===
                                      "does_not_meet" ? (
                                        <span
                                          aria-label="Does not meet qualification requirement"
                                          title="Does not meet qualification requirement"
                                          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black leading-none text-white"
                                        >
                                          ×
                                        </span>
                                      ) : answer?.automated_result ===
                                        "meets" ? (
                                        <CheckCircle2
                                          aria-label="Meets qualification requirement"
                                          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                                        />
                                      ) : (
                                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                      )}

                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h3 className="font-bold text-slate-950">
                                            {requirement.title}
                                          </h3>

                                          {requirement.required ? (
                                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                              Required
                                            </span>
                                          ) : null}

                                          {answer ? (
                                            answer.automated_result ===
                                            "does_not_meet" ? (
                                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                                                Validation Failed
                                              </span>
                                            ) : (
                                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                Saved
                                              </span>
                                            )
                                          ) : null}
                                        </div>

                                        {requirement.description ? (
                                          <p className="mt-1 text-sm text-slate-600">
                                            {
                                              requirement.description
                                            }
                                          </p>
                                        ) : null}

                                        {requirement.regulation_citation ? (
                                          <p className="mt-2 text-xs font-semibold text-sky-700">
                                            {
                                              requirement.regulation_citation
                                            }
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>

                                    <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                                  </summary>

                                  <div
                                    className={`border-t px-6 py-5 ${
                                      answer?.automated_result ===
                                      "does_not_meet"
                                        ? "border-red-300 bg-red-50/70 [&_input]:border-red-500 [&_select]:border-red-500 [&_textarea]:border-red-500 [&_input]:bg-red-50 [&_select]:bg-red-50 [&_textarea]:bg-red-50 [&_input:focus]:border-red-600 [&_select:focus]:border-red-600 [&_textarea:focus]:border-red-600"
                                        : "border-slate-200 bg-slate-50/60"
                                    }`}
                                  >
                                    {isInstructorOnly ? (
                                      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                                        This section will be
                                        completed by your
                                        instructor after you
                                        submit the applicant
                                        portion.
                                      </div>
                                    ) : isComputed ? (
                                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-900">
                                        This result will be
                                        calculated automatically
                                        from your related answers.
                                      </div>
                                    ) : (
                                      <>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                          {fields.map((field) =>
                                            renderField(
                                              requirement,
                                              field,
                                            ),
                                          )}
                                        </div>

                                        {answer?.automated_result ===
                                          "does_not_meet" &&
                                        answer.automated_result_message ? (
                                          <div className="mt-4 rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-sm font-semibold text-red-900">
                                            {
                                              answer.automated_result_message
                                            }
                                          </div>
                                        ) : answer?.automated_result ===
                                            "meets" &&
                                          answer.automated_result_message ? (
                                          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                                            {
                                              answer.automated_result_message
                                            }
                                          </div>
                                        ) : null}

                                        <div className="mt-5">
                                          <label
                                            htmlFor={`notes-${requirement.id}`}
                                            className="mb-2 block text-sm font-semibold text-slate-800"
                                          >
                                            Applicant notes
                                            <span className="ml-1 font-normal text-slate-500">
                                              optional
                                            </span>
                                          </label>

                                          <textarea
                                            id={`notes-${requirement.id}`}
                                            value={
                                              drafts[
                                                requirement.id
                                              ]?.notes ?? ""
                                            }
                                            disabled={!isEditable}
                                            rows={3}
                                            onChange={(event) =>
                                              updateDraftNotes(
                                                requirement.id,
                                                event.target
                                                  .value,
                                              )
                                            }
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                                          />
                                        </div>

                                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            {answer?.updated_at ? (
                                              <p className="text-xs text-slate-500">
                                                Last saved{" "}
                                                {formatDateTime(
                                                  answer.updated_at,
                                                )}
                                              </p>
                                            ) : null}
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              void saveRequirement(
                                                requirement,
                                              )
                                            }
                                            disabled={
                                              !isEditable ||
                                              Boolean(
                                                savingRequirementId,
                                              )
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {savingRequirementId ===
                                            requirement.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Save className="h-4 w-4" />
                                            )}

                                            {savingRequirementId ===
                                            requirement.id
                                              ? "Saving…"
                                              : "Save Requirement"}
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </details>
                              );
                            },
                          )}
                        </div>
                      </section>
                    ),
                  )}
                  {isEditable ? (
                    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-sky-950">
                            Submit Qualification Package
                          </h2>

                          <p className="mt-1 max-w-2xl text-sm text-sky-900">
                            When submitted, your current answers will be saved and locked. Your instructor will then review and certify the qualification package before examiner review.
                          </p>

                          <p className="mt-3 text-sm font-semibold text-sky-800">
                            {completedRequiredCount} of{" "}
                            {requiredCount} required applicant items complete
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void submitQualification()
                          }
                          disabled={
                            submitting ||
                            Boolean(
                              savingRequirementId,
                            ) ||
                            progressPercent < 100
                          }
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4" />
                          )}

                          {submitting
                            ? "Saving & Submitting…"
                            : "Save All & Submit Qualification"}
                        </button>
                      </div>

                      {progressPercent < 100 ? (
                        <p className="mt-4 text-xs font-semibold text-amber-700">
                          Complete all required applicant items before submission.
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
