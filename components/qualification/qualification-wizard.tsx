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
import { graduationDateFlag, supportsQualificationEvidence, evidenceInstruction, EVIDENCE_RETENTION_DAYS, instrumentRequirements, instrumentResult, fieldsComplete, INSTRUMENT_RULE_SET_ID, PREVIEW_KEY, type QualificationField } from "@/lib/qualification/instrument";
import { localEvidence } from "@/lib/qualification/local-evidence";
import { EvidencePanel } from "./evidence-panel";
import { EntryFields } from "./entry-fields";
import { LegFields } from "./leg-fields";
import { legsComplete } from "@/lib/qualification/legs";

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
  // Recommending instructor from the practical-test request (offered on endorsement cards).
  instructor_name?: string | null;
  instructor_certificate_number?: string | null;
  // Instructor certification (Kele, Oct 31 2026).
  instructor_change_notes?: string | null;
  instructor_waived_at?: string | null;
  instructor_waived_reason?: string | null;
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

type DisplayField = QualificationField;

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
    required_text?: string;
  };
  sort_order: number;
};

type QualificationAnswer = {
  id: string;
  revision_id: string;
  requirement_id: string;
  answer_value: Record<string, unknown>;
  applicant_notes: string | null;
  instructor_notes?: string | null;
  examiner_notes?: string | null;
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
  medical: "Medical Certificate",
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

  // The card's shown fields — its own list, or the built-in fields for its answer type
  // (cards with an empty field list used to count as incomplete forever; Kele, Oct 31 2026).
  const fields = requirement.rule_config.instrument_rule ? requirement.display_config.fields ?? [] : getDefaultFields(requirement);
  if (requirement.rule_config.instrument_rule) return fieldsComplete(fields, draft.values);

  if (fields.length > 0) {
    return fields.every((field) =>
      field.optional
        ? true
        : field.type === "checkbox"
        ? draft.values[field.key] === true
        : field.type === "instructor"
        ? hasMeaningfulValue(draft.values.instructor_name) && hasMeaningfulValue(draft.values.instructor_certificate_number)
        : field.type === "legs"
          ? legsComplete(draft.values[field.key])
          : hasMeaningfulValue(draft.values[field.key]) && matchesPattern(field, draft.values[field.key]),
    );
  }

  return hasMeaningfulValue(draft.values.value);
}

// A text field with a pattern (e.g. the 7–8 digit IACRA Application ID) must match it entirely.
function matchesPattern(field: DisplayField, value: unknown) {
  if (!field.pattern) return true;
  try {
    return new RegExp(`^(?:${field.pattern})$`).test(String(value ?? "").trim());
  } catch {
    return true;
  }
}

function getDefaultFields(
  requirement: QualificationRequirement,
): DisplayField[] {
  const configuredFields =
    requirement.display_config.fields ?? [];

  if (requirement.requirement_code === "IR_PATHWAY" && !configuredFields.some((field) => field.key === "graduation_date")) {
    return [...configuredFields, {key: "graduation_date", label: "Date of Graduation", type: "date", optional: true}];
  }

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
      // One line (Kele, Oct 31): date 1/4, takeoffs and landings 1/8, logbook 1/3 of the old half-width fields.
      return [
        {
          key: "completion_date",
          label: "Completion date",
          type: "date",
          width: "8.5rem",
        },
        {
          key: "takeoffs",
          label: "Takeoffs",
          type: "number",
          width: "4.5rem",
        },
        {
          key: "landings",
          label: "Landings",
          type: "number",
          width: "4.5rem",
        },
        {
          key: "logbook_reference",
          label: "Logbook page / reference",
          type: "text",
          width: "11rem",
        },
      ];

    case "route":
      // Cross-country legs (Kele, Oct 31): up to six legs, distances filled in from the FAA airport list.
      return [
        {
          key: "legs",
          label: "Flight legs",
          type: "legs",
        },
        {
          key: "logbook_reference",
          label: "Logbook page or electronic reference",
          type: "text",
        },
      ];

    case "endorsement":
      // One line (Kele, Oct 31): date, then the recommending instructor from the request or another one.
      return [
        {
          key: "endorsement_date",
          label: "Endorsement date",
          type: "date",
          width: "8.5rem",
        },
        {
          key: "instructor_source",
          label: "Endorsing instructor",
          type: "instructor",
          width: "auto",
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

  if (Array.isArray(value)) return JSON.stringify(value);
  return "";
}

export function QualificationWizard({ preview = false }: { preview?: boolean }) {
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({});
  const handleEvidenceCount = useCallback((id: string, count: number) => setEvidenceCounts((current) => current[id] === count ? current : { ...current, [id]: count }), []);
  const [previewAppointment, setPreviewAppointment] = useState("2026-10-20");
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

      if (preview) {
        try {
          const saved = JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "{}");
          setWizard({ id: "local-instrument-wizard", practical_test_request_id: requestId, applicant_profile_id: null, examiner_profile_id: "local-reviewer", rule_set_id: INSTRUMENT_RULE_SET_ID, status: saved.submitted ? "awaiting_instructor" : "applicant_in_progress", available_at: "2020-01-01T00:00:00Z", opened_at: null, current_revision_number: 1 });
          setRuleSet({ id: INSTRUMENT_RULE_SET_ID, code: "INSTRUMENT_AIRPLANE_PART61", version: 1, display_name: "Instrument Airplane Rating — Initial — Part 61", applicant_instructions: "Complete each requirement and attach legible endorsement and logbook pictures. Uploaded evidence still requires instructor and examiner review." });
          setRevision({ id: "local-instrument-revision", wizard_id: "local-instrument-wizard", revision_number: 1, revision_status: saved.submitted ? "applicant_submitted" : "draft", is_locked: Boolean(saved.submitted) });
          setRequirements(instrumentRequirements as QualificationRequirement[]);
          setDrafts(saved.drafts ?? {}); setAnswers(saved.answers ?? []);
          const evidence = await localEvidence.list();
          setEvidenceCounts(Object.fromEntries(instrumentRequirements.map((row) => [row.id, evidence.filter((item) => item.requirement_id === row.id).length])));
        } catch { setPageError("Local preview data could not be loaded. Check browser storage permissions."); }
        setLoadingWizard(false); return;
      }
      setEvidenceCounts({});
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
            instructor_notes,
            examiner_notes,
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
    [preview],
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setPageError("");

    if (preview) {
      const request: ApplicantRequest = { id: "local-instrument-request", request_number: "LOCAL PREVIEW", status: "confirmed", certificate_sought: "Instrument Rating", category_sought: "Airplane", class_sought: null, rating_sought: "Instrument Airplane", issuance_type: "original", practical_test_type_id: null, scheduled_start_at: `${previewAppointment}T20:00:00Z`, scheduled_end_at: null, scheduled_location: "Local qualification preview" };
      setRequests([request]); setSelectedRequestId(request.id);
      await loadQualification(request.id); setLoading(false); return;
    }
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

    const linkedRequestId = new URLSearchParams(window.location.search).get("request");
    const nextRequest =
      loadedRequests.find((request) => request.id === linkedRequestId) ??
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
  }, [loadQualification, preview, previewAppointment]);

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

  const visibleRequirements = useMemo(() => requirements.filter((requirement) => {
    if (requirement.rule_config.conditional === "device_hours") {
      const total = requirements.find((row) => row.requirement_code === "IR_INSTRUMENT_TOTAL");
      return Number(total ? drafts[total.id]?.values.device_hours : 0) > 0;
    }
    return true;
  }).map((row) => row.rule_config.conditional === "device_hours" ? { ...row, required: true } : row), [requirements, drafts]);
  // Every card with an upload panel needs at least one picture or PDF before submitting.
  const needsEvidence = (requirement: QualificationRequirement) => supportsQualificationEvidence(requirement, drafts[requirement.id]?.values);
  const completeWithEvidence = (requirement: QualificationRequirement) => isAnswerComplete(requirement, drafts[requirement.id]) && (!needsEvidence(requirement) || (evidenceCounts[requirement.id] ?? 0) > 0);
  const groupedRequirements = useMemo(() => {
    const groups = new Map<
      string,
      QualificationRequirement[]
    >();

    for (const requirement of visibleRequirements) {
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
  }, [visibleRequirements]);

  const applicantRequired = visibleRequirements.filter((row) => row.required && !["computed", "instructor_certification"].includes(String(row.rule_config.answer_type)));
  const completedRequiredCount = applicantRequired.filter(completeWithEvidence).length;
  const requiredCount = applicantRequired.length;

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

  // Picture reading (examiner setting): fill the card's empty fields from what was read on the
  // uploaded picture, and point out any value the applicant already typed that differs.
  function applyScannedValues(requirementId: string, values: Record<string, string>) {
    const requirement = requirements.find((row) => row.id === requirementId);
    if (!requirement) return;
    const fields = getDefaultFields(requirement);
    const current = drafts[requirementId]?.values ?? {};
    const filled: string[] = [];
    const differs: string[] = [];
    for (const [key, value] of Object.entries(values)) {
      const field = fields.find((item) => item.key === key);
      if (!field) continue;
      if (!hasMeaningfulValue(current[key])) {
        updateDraftValue(requirementId, key, value);
        filled.push(field.label ?? key);
      } else if (String(current[key]) !== value) {
        differs.push(`${field.label ?? key}: you entered ${String(current[key])}, the picture shows ${value}`);
      }
    }
    setMessage(
      [
        filled.length ? `${requirement.title}: filled in ${filled.join(", ")} from the picture. Check the values, then save this item.` : "",
        differs.length ? `Please check — ${differs.join("; ")}.` : "",
      ].filter(Boolean).join(" "),
    );
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

    if (preview) {
      const all = Object.fromEntries(requirements.map((row) => [row.requirement_code, drafts[row.id]?.values ?? {}]));
      const result = instrumentResult(requirement.requirement_code, draft.values, selectedRequest?.scheduled_start_at ?? null, all);
      const next: QualificationAnswer = { id: requirement.id, revision_id: "local-instrument-revision", requirement_id: requirement.id, answer_value: draft.values, applicant_notes: draft.notes || null, ...result, updated_at: new Date().toISOString() };
      const updated = [...answers.filter((row) => row.requirement_id !== requirement.id), next];
      try { localStorage.setItem(PREVIEW_KEY, JSON.stringify({ drafts, answers: updated, submitted: false })); setAnswers(updated); setMessage(`${requirement.title} saved locally.`); }
      catch { setPageError("Browser storage is full or unavailable. Your answer was not saved."); }
      setSavingRequirementId(null); return;
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
      visibleRequirements.filter(
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
          !completeWithEvidence(requirement),
      );

    if (incompleteRequired.length) {
      setPageError(
        `Complete all required items before submitting. First incomplete item: ${incompleteRequired[0].title}`,
      );
      return;
    }

    if (preview) {
      const all = Object.fromEntries(requirements.map((row) => [row.requirement_code, drafts[row.id]?.values ?? {}]));
      const nextAnswers = applicantRequirements.map((row) => ({ id: row.id, revision_id: "local-instrument-revision", requirement_id: row.id, answer_value: drafts[row.id]?.values ?? {}, applicant_notes: drafts[row.id]?.notes || null, ...instrumentResult(row.requirement_code, drafts[row.id]?.values ?? {}, selectedRequest.scheduled_start_at, all), updated_at: new Date().toISOString() }));
      const failed = nextAnswers.find((row) => row.automated_result === "does_not_meet");
      if (failed) { setAnswers(nextAnswers); setPageError(failed.automated_result_message ?? "Resolve validation failures."); return; }
      try { localStorage.setItem(PREVIEW_KEY, JSON.stringify({ drafts, answers: nextAnswers, submitted: true })); await loadQualification(selectedRequest.id); setMessage("Local submission simulated. This preview is locked; no instructor was notified."); }
      catch { setPageError("Local submission could not be saved."); }
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

      // Email the recommending instructor a private link to certify the package (lists without an
      // instructor step answer "not waiting for the instructor", which is fine).
      let submittedMessage = "Qualification package submitted successfully.";
      try {
        const invite = await fetch("/api/qualification/instructor-invite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wizardId: wizard.id }),
        });
        const inviteResult = (await invite.json()) as { ok: boolean; sentTo?: string; error?: string };
        if (inviteResult.ok) {
          submittedMessage = `Qualification package submitted. Your instructor was emailed at ${inviteResult.sentTo} to review and certify it.`;
        } else if (inviteResult.error && !/not waiting/i.test(inviteResult.error)) {
          submittedMessage = `Qualification package submitted, but your instructor could not be emailed (${inviteResult.error}). Please let your examiner know.`;
        }
      } catch {
        submittedMessage = "Qualification package submitted, but your instructor could not be emailed. Please let your examiner know.";
      }

      await loadQualification(
        selectedRequest.id,
      );

      setMessage(submittedMessage);
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

  // ID vs. pilot-certificate names (Kele, Oct 31 2026): compared as typed, ignoring capitals and extra spaces.
  function compareNames(requirement: QualificationRequirement) {
    const isInstrument = requirement.requirement_code === "IR_NAME_COMPARISON";
    const leftCode = String(requirement.rule_config.left_requirement ?? (isInstrument ? "IR_ID" : "IDENTITY_ID_NAME"));
    const rightCode = String(requirement.rule_config.right_requirement ?? (isInstrument ? "IR_CERTIFICATE" : "IDENTITY_PILOT_CERTIFICATE_NAME"));
    const nameOf = (code: string) => {
      const row = requirements.find((item) => item.requirement_code === code);
      const values = row ? drafts[row.id]?.values ?? {} : {};
      return String(values.name_exact ?? values.legal_name ?? "").trim().replace(/\s+/g, " ");
    };
    const left = nameOf(leftCode);
    const right = nameOf(rightCode);
    if (!left || !right) {
      return { match: false, left, right, message: "Enter the exact name on your ID and on your pilot certificate; they are compared here automatically." };
    }
    return left.toLowerCase() === right.toLowerCase()
      ? { match: true, left, right, message: "The names match." }
      : { match: false, left, right, message: "The names are different. The examiner will review this before the test." };
  }

  function renderField(
    requirement: QualificationRequirement,
    field: DisplayField,
  ) {
    const draft = drafts[requirement.id];
    if (field.key === "graduation_date" && draft?.values.training_basis !== "Part 141 Graduate") return null;
    const value = draft?.values[field.key];
    const inputId = `${requirement.id}-${field.key}`;
    const disabled = !isEditable;

    if (field.type === "instructor") {
      // The recommending instructor from the request, or another instructor typed in.
      const name = String(draft?.values.instructor_name ?? "");
      const certificate = String(draft?.values.instructor_certificate_number ?? "");
      const recommendingName = wizard?.instructor_name?.trim() ?? "";
      const recommendingCertificate = wizard?.instructor_certificate_number?.trim() ?? "";
      const source =
        typeof value === "string" && value
          ? value
          : name
            ? name === recommendingName && certificate === recommendingCertificate ? "recommending" : "other"
            : "";
      const choose = (next: string) => {
        updateDraftValue(requirement.id, "instructor_source", next);
        if (next === "recommending") {
          updateDraftValue(requirement.id, "instructor_name", recommendingName);
          updateDraftValue(requirement.id, "instructor_certificate_number", recommendingCertificate);
        } else if (source === "recommending") {
          updateDraftValue(requirement.id, "instructor_name", "");
          updateDraftValue(requirement.id, "instructor_certificate_number", "");
        }
      };
      const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";
      return (
        <div key={field.key} className="flex flex-wrap items-end gap-4">
          <div style={{ width: "17rem" }} className="max-w-full">
            <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-slate-800">{field.label}</label>
            <select id={inputId} value={source} disabled={disabled} onChange={(event) => choose(event.target.value)} className={input}>
              <option value="">Select the instructor</option>
              {recommendingName ? (
                <option value="recommending">{recommendingName}{recommendingCertificate ? ` (${recommendingCertificate})` : ""} — recommending instructor</option>
              ) : null}
              <option value="other">Another instructor</option>
            </select>
          </div>
          {source === "other" ? (
            <>
              <div style={{ width: "12rem" }} className="max-w-full">
                <label htmlFor={`${inputId}-name`} className="mb-2 block text-sm font-semibold text-slate-800">Instructor name</label>
                <input id={`${inputId}-name`} value={name} disabled={disabled} onChange={(event) => updateDraftValue(requirement.id, "instructor_name", event.target.value)} className={input} />
              </div>
              <div style={{ width: "9.5rem" }} className="max-w-full">
                <label htmlFor={`${inputId}-cert`} className="mb-2 block text-sm font-semibold text-slate-800">Certificate number</label>
                <input id={`${inputId}-cert`} value={certificate} disabled={disabled} onChange={(event) => updateDraftValue(requirement.id, "instructor_certificate_number", event.target.value)} className={input} />
              </div>
            </>
          ) : null}
        </div>
      );
    }

    if (field.type === "legs") return <LegFields key={field.key} field={field} value={value} disabled={disabled} id={inputId} onChange={(next) => updateDraftValue(requirement.id, field.key, next)} />;
    if (field.type === "entries") return <EntryFields key={field.key} field={field} value={value} disabled={disabled} id={inputId} onChange={(next) => updateDraftValue(requirement.id, field.key, next)} />;
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
          {requirement.requirement_code === "IR_PATHWAY" && field.key === "concurrent_private" && value === true ? (
            <p role="note" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This is not a common occurance. Please only select yes if you DO NOT currently hold a Private Pilot Certificate AND you are going to test for BOTH the Private Pilot and Instrument Airplane ratings at the same time
            </p>
          ) : null}
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
          inputMode={field.inputMode}
          maxLength={field.maxLength}
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
              field.inputMode === "numeric" ? event.target.value.replace(/\D/g, "") : event.target.value,
            )
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
        />
        {field.pattern && hasMeaningfulValue(value) && !matchesPattern(field, value) ? (
          <p className="mt-1 text-xs text-red-700">{field.patternHint ?? "Check the format of this value."}</p>
        ) : null}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {preview ? <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
        <h2 className="font-bold text-sky-950">Instrument Airplane · Local preview</h2>
        <p className="mt-1 text-sm text-sky-900">Answers and pictures save only in this browser. Review the same requirement-card layout used in the applicant portal.</p>
        <div className="mt-3 flex flex-wrap items-end gap-4"><label className="text-sm font-semibold">Test date for validation<input type="date" value={previewAppointment} onChange={(event) => { if (event.target.value) setPreviewAppointment(event.target.value); }} className="mt-1 block rounded-lg border border-sky-300 bg-white px-3 py-2" /></label>
        <button type="button" onClick={async () => { const saved = JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "{}"); localStorage.setItem(PREVIEW_KEY, JSON.stringify({ ...saved, submitted: false })); await loadQualification(selectedRequestId); }} className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold">Reopen preview for editing</button>
        <button type="button" onClick={async () => { localStorage.removeItem(PREVIEW_KEY); await localEvidence.clear(); window.location.reload(); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Clear local preview</button></div>
      </div> : null}
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
                        Opens 4 days before your test
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

              {wizard.status === "instructor_changes_required" && wizard.instructor_change_notes ? (
                <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
                  <h2 className="font-bold">Your instructor asked for changes</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{wizard.instructor_change_notes}</p>
                  <p className="mt-3 text-xs text-amber-900">Make the changes below, then submit again. Your instructor will be emailed to review it again.</p>
                </section>
              ) : null}

              {wizard.instructor_waived_at ? (
                <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950">
                  <h2 className="font-bold">Instructor certification skipped by your examiner</h2>
                  {wizard.instructor_waived_reason ? <p className="mt-2 text-sm">{wizard.instructor_waived_reason}</p> : null}
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
                                  completeWithEvidence(requirement),
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
                              const nameCheck = isComputed ? compareNames(requirement) : null;

                              // Row colour (Kele, Oct 31 2026): red = fails a rule; green = passes and complete;
                              // yellow = needs examiner review (green check when everything is entered,
                              // "!" when something is still missing); white = not started.
                              const rowResult = nameCheck ? (nameCheck.match ? "meets" : nameCheck.left && nameCheck.right ? "manual_review" : "") : answer?.automated_result ?? "";
                              const rowComplete = nameCheck ? Boolean(nameCheck.left && nameCheck.right) : completeWithEvidence(requirement);
                              const rowTone: "red" | "green" | "yellow" | "none" = isInstructorOnly
                                ? "none"
                                : rowResult === "does_not_meet"
                                  ? "red"
                                  : !answer && !(nameCheck && rowComplete)
                                    ? "none"
                                    : rowResult === "meets" && rowComplete
                                      ? "green"
                                      : "yellow";
                              const rowClasses = {
                                red: "border-l-4 border-l-red-500 bg-red-50",
                                green: "border-l-4 border-l-emerald-500 bg-emerald-50",
                                yellow: "border-l-4 border-l-amber-400 bg-amber-50",
                                none: "border-l-4 border-l-transparent bg-white",
                              }[rowTone];

                              return (
                                <details
                                  key={requirement.id}
                                  className={`group ${rowClasses}`}
                                >
                                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 hover:brightness-[0.98] [&::-webkit-details-marker]:hidden">
                                    <div className="flex min-w-0 gap-3">
                                      {rowTone === "red" ? (
                                        <span
                                          aria-label="Does not meet qualification requirement"
                                          title="Does not meet qualification requirement"
                                          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black leading-none text-white"
                                        >
                                          ×
                                        </span>
                                      ) : rowTone === "green" || (rowTone === "yellow" && rowComplete) ? (
                                        <CheckCircle2
                                          aria-label={rowTone === "green" ? "Meets qualification requirement" : "Complete — waiting for examiner review"}
                                          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                                        />
                                      ) : (
                                        <AlertTriangle aria-label="Information missing" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
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
                                    {requirement.display_config.required_text ? (
                                      <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4">
                                        <p className="font-semibold text-slate-900">Required Text:</p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{requirement.display_config.required_text}</p>
                                      </div>
                                    ) : null}
                                    {isInstructorOnly ? (
                                      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                                        This section will be
                                        completed by your
                                        instructor after you
                                        submit the applicant
                                        portion.
                                      </div>
                                    ) : isComputed && nameCheck ? (
                                      <div className={`rounded-xl border p-5 text-sm ${nameCheck.match ? "border-emerald-200 bg-emerald-50 text-emerald-900" : nameCheck.left && nameCheck.right ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
                                        <p className="font-semibold">{nameCheck.message}</p>
                                        {nameCheck.left || nameCheck.right ? (
                                          <dl className="mt-3 grid gap-1 sm:grid-cols-[12rem_1fr]">
                                            <dt className="text-slate-600">Name on ID</dt><dd className="font-mono">{nameCheck.left || "—"}</dd>
                                            <dt className="text-slate-600">Name on pilot certificate</dt><dd className="font-mono">{nameCheck.right || "—"}</dd>
                                          </dl>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <>
                                        {fields.some((field) => field.width) ? (
                                          // Fields with a set width sit on one line (wrapping on a phone).
                                          <div className="flex flex-wrap items-end gap-4">
                                            {fields.map((field) => (
                                              <div key={field.key} className="max-w-full" style={{ width: field.width ?? "100%" }}>
                                                {renderField(requirement, field)}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="grid gap-4 sm:grid-cols-2">
                                            {fields.map((field) =>
                                              renderField(
                                                requirement,
                                                field,
                                              ),
                                            )}
                                          </div>
                                        )}

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

                                        {answer?.automated_result === "manual_review" && answer.automated_result_message ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{answer.automated_result_message}</p> : null}
                                        {answer?.instructor_notes || answer?.examiner_notes ? <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{answer.instructor_notes ? <p><strong>Instructor:</strong> {answer.instructor_notes}</p> : null}{answer.examiner_notes ? <p><strong>Examiner:</strong> {answer.examiner_notes}</p> : null}</div> : null}
                                        {requirement.requirement_code === "IR_INSTRUMENT_TOTAL" ? <p className="mt-3 text-sm font-semibold text-sky-900">Entered instrument total: {["actual_hours", "simulated_hours", "device_hours"].reduce((sum, key) => sum + Number(drafts[requirement.id]?.values[key] || 0), 0).toFixed(1)} hours · Device credit requires review.</p> : null}
                                        {requirement.requirement_code === "IR_ENDORSEMENT_PREREQUISITES" && requirements.some((row) => row.requirement_code === "IR_KNOWLEDGE_TEST") ? <p className="mt-3 text-sm text-slate-700">Knowledge-test deficiency codes: {String(answers.find((row) => row.requirement_id === requirements.find((item) => item.requirement_code === "IR_KNOWLEDGE_TEST")?.id)?.answer_value.deficiency_codes ?? "Save the knowledge-test report first.")}</p> : null}
                                        {requirement.requirement_code === "IR_PATHWAY" && graduationDateFlag(drafts[requirement.id]?.values ?? {}) ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{graduationDateFlag(drafts[requirement.id]?.values ?? {})}</p> : null}
                                        {revision && supportsQualificationEvidence(requirement, drafts[requirement.id]?.values) ? <EvidencePanel revisionId={revision.id} requirementId={requirement.id} editable={isEditable} preview={preview} required={needsEvidence(requirement)} instruction={evidenceInstruction(requirement)} retentionDays={EVIDENCE_RETENTION_DAYS} scanFields={getDefaultFields(requirement).filter((field) => field.type !== "legs" && field.type !== "instructor").map(({ key, label, type, options }) => ({ key, label, type, options }))} onScanned={applyScannedValues} onCount={handleEvidenceCount} /> : null}
                                        {requirement.rule_config.hide_notes === true ? null : <div className="mt-5">
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
                                        </div>}

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
