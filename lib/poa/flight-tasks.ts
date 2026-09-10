import faaAcsComplianceCatalog from "@/data/faa-acs-compliance-catalog.json";

type CatalogEntry = Record<string, unknown>;

export type FlightSkillElementSnapshot = {
  code: string;
  label: string;
};

export type FlightTaskDraft = {
  acs_task_code_snapshot: string;
  area_name_snapshot: string;
  task_name_snapshot: string;
  skill_elements_snapshot: FlightSkillElementSnapshot[];
  examiner_notes: string;
  is_required: boolean;
  sort_order: number;
};

type MappedQuestion = {
  task_name?: string | null;
  poa_question_acs_applicability?: Array<{
    certificate_name?: string | null;
    acs_reference?: string | null;
  }>;
};

type SnapshotQuestionLike = {
  acs_reference_snapshot?: string | null;
  task_name_snapshot?: string | null;
};

function splitReferences(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function taskParent(reference: string) {
  const match = reference
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{1,5}\.[IVX]+\.[A-Z0-9/]+)/);

  return match?.[1] ?? null;
}

function acsPrefix(reference: string) {
  const match = reference
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{1,5})\./);

  return match?.[1] ?? null;
}

function textValue(entry: CatalogEntry, keys: string[]) {
  for (const key of keys) {
    const value = entry[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function catalogEntries() {
  const catalog =
    faaAcsComplianceCatalog as unknown as {
      entries?: CatalogEntry[];
    };

  return Array.isArray(catalog.entries)
    ? catalog.entries
    : [];
}

function skillElementsForTask(
  parent: string,
  taskEntry: CatalogEntry,
  allEntries: CatalogEntry[],
) {
  const result: FlightSkillElementSnapshot[] = [];
  const seen = new Set<string>();

  const add = (code: string, label: string) => {
    const cleanCode = code.trim();
    const cleanLabel = label.trim();

    if (!cleanCode || seen.has(cleanCode)) {
      return;
    }

    seen.add(cleanCode);

    result.push({
      code: cleanCode,
      label: cleanLabel || cleanCode,
    });
  };

  const embeddedCandidates = [
    taskEntry.elements,
    taskEntry.skill_elements,
    taskEntry.skills,
    taskEntry.children,
  ];

  for (const candidate of embeddedCandidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const item of candidate) {
      if (typeof item === "string") {
        add(item, item);
        continue;
      }

      if (item && typeof item === "object") {
        const record =
          item as Record<string, unknown>;

        const code = String(
          record.code ??
            record.acs_reference ??
            record.reference ??
            "",
        );

        const label = String(
          record.label ??
            record.name ??
            record.title ??
            record.description ??
            "",
        );

        add(code, label);
      }
    }
  }

  for (const raw of allEntries) {
    const code = textValue(
      raw,
      ["code", "acs_reference", "reference"],
    ).toUpperCase();

    if (
      !code ||
      code === `${parent}.S` ||
      !code.startsWith(`${parent}.S`)
    ) {
      continue;
    }

    const label = textValue(
      raw,
      [
        "element_name",
        "elementName",
        "name",
        "title",
        "description",
        "label",
      ],
    );

    add(code, label);
  }

  return result.sort((a, b) =>
    a.code.localeCompare(
      b.code,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );
}

function buildTasks(
  parents: Map<string, string>,
  allowedPrefixes?: string[],
) {
  const entries = catalogEntries();

  const allowed =
    allowedPrefixes &&
    allowedPrefixes.length > 0
      ? new Set(
          allowedPrefixes.map((value) =>
            value.trim().toUpperCase(),
          ),
        )
      : null;

  const result: FlightTaskDraft[] = [];

  for (const [parent, mappedTaskName] of parents.entries()) {
    const prefix = acsPrefix(parent);

    if (
      allowed &&
      (!prefix || !allowed.has(prefix))
    ) {
      continue;
    }

    const skillEntry = entries.find(
      (raw) =>
        textValue(
          raw,
          ["code", "acs_reference", "reference"],
        ).toUpperCase() === `${parent}.S`,
    );

    if (!skillEntry) {
      continue;
    }

    const taskName =
      textValue(skillEntry, [
        "task_name",
        "taskName",
        "task",
        "name",
        "title",
        "label",
      ]) ||
      mappedTaskName ||
      "ACS Task";

    const areaName = textValue(
      skillEntry,
      [
        "area_name",
        "areaName",
        "area",
        "area_title",
        "areaTitle",
      ],
    );

    result.push({
      acs_task_code_snapshot: parent,
      area_name_snapshot: areaName,
      task_name_snapshot: taskName,
      skill_elements_snapshot:
        skillElementsForTask(
          parent,
          skillEntry,
          entries,
        ),
      examiner_notes: "",
      is_required: true,
      sort_order: 0,
    });
  }

  result.sort((a, b) =>
    a.acs_task_code_snapshot.localeCompare(
      b.acs_task_code_snapshot,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );

  return result.map((task, index) => ({
    ...task,
    sort_order: (index + 1) * 10,
  }));
}

export function deriveAllFlightTasksFromAcsCatalog(
  allowedPrefixes: string[],
) {
  const entries = catalogEntries();

  const prefixSet = new Set(
    allowedPrefixes.map((value) =>
      value.trim().toUpperCase(),
    ),
  );

  const parents = new Map<string, string>();

  for (const raw of entries) {
    const code = textValue(
      raw,
      ["code", "acs_reference", "reference"],
    ).toUpperCase();

    if (!code.endsWith(".S")) {
      continue;
    }

    const parent = code.slice(0, -2);
    const prefix = acsPrefix(parent);

    if (
      !prefix ||
      !prefixSet.has(prefix)
    ) {
      continue;
    }

    const taskName =
      textValue(raw, [
        "task_name",
        "taskName",
        "task",
        "name",
        "title",
        "label",
      ]) || "ACS Task";

    if (!parents.has(parent)) {
      parents.set(parent, taskName);
    }
  }

  return buildTasks(
    parents,
    allowedPrefixes,
  );
}

export function filterFlightTasksByParentCodes(
  tasks: FlightTaskDraft[],
  allowedParents: string[],
) {
  const allowed = new Set(
    allowedParents.map((value) =>
      value.trim().toUpperCase(),
    ),
  );

  return tasks
    .filter((task) =>
      allowed.has(
        task.acs_task_code_snapshot
          .trim()
          .toUpperCase(),
      ),
    )
    .map((task, index) => ({
      ...task,
      sort_order: (index + 1) * 10,
    }));
}

export function normalizeAdditionalMapCodes(
  values: unknown,
  acsPrefixValue: string,
) {
  if (!Array.isArray(values)) {
    return [];
  }

  const prefix =
    acsPrefixValue.trim().toUpperCase();

  const result = new Set<string>();

  for (const raw of values) {
    if (typeof raw !== "string") {
      continue;
    }

    const cleaned = raw
      .trim()
      .toUpperCase()
      .replaceAll("_", ".");

    const match = cleaned.match(
      /^([IVX]+)\.([A-Z0-9/]+)$/,
    );

    if (!match) {
      continue;
    }

    result.add(
      `${prefix}.${match[1]}.${match[2]}`,
    );
  }

  return [...result].sort((a, b) =>
    a.localeCompare(
      b,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );
}

export function deriveFlightTasksFromQuestionMappings(
  questions: MappedQuestion[],
  certificateName: string,
  allowedPrefixes?: string[],
) {
  const parents = new Map<string, string>();

  for (const question of questions) {
    for (const applicability of
      question.poa_question_acs_applicability ??
      []) {
      if (
        applicability.certificate_name !==
        certificateName
      ) {
        continue;
      }

      for (const reference of splitReferences(
        applicability.acs_reference,
      )) {
        const parent = taskParent(reference);

        if (!parent) {
          continue;
        }

        if (!parents.has(parent)) {
          parents.set(
            parent,
            String(
              question.task_name ?? "",
            ).trim(),
          );
        }
      }
    }
  }

  return buildTasks(
    parents,
    allowedPrefixes,
  );
}

export function deriveFlightTasksFromSnapshotQuestions(
  questions: SnapshotQuestionLike[],
) {
  const parents = new Map<string, string>();

  for (const question of questions) {
    for (const reference of splitReferences(
      question.acs_reference_snapshot,
    )) {
      const parent = taskParent(reference);

      if (!parent) {
        continue;
      }

      if (!parents.has(parent)) {
        parents.set(
          parent,
          String(
            question.task_name_snapshot ?? "",
          ).trim(),
        );
      }
    }
  }

  return buildTasks(parents);
}
