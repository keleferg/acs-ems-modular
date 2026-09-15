"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import faaAcsComplianceCatalog from "@/data/faa-acs-compliance-catalog.json";
import {
  deriveAllFlightTasksFromAcsCatalog,
  type FlightTaskDraft,
} from "@/lib/poa/flight-tasks";

type PracticalTestType = {
  id: string;
  certificate_name: string;
  certificate_code: string | null;
  rating_name: string;
  rating_code: string | null;
  category_name: string | null;
  category_code: string | null;
  class_name: string | null;
  class_code: string | null;
  display_name: string;
};

type AcsJoin = {
  acs_reference: string | null;
};

type QuestionMappingRow = {
  poa_question_acs_applicability?: AcsJoin[] | null;
};

type CatalogEntry = {
  code?: string;
  task_name?: string;
  source_title?: string;
};

type AreaGroup = {
  key: string;
  areaRoman: string;
  areaName: string;
  tasks: FlightTaskDraft[];
};

function acsPrefix(reference: string | null | undefined) {
  const match = String(reference ?? "")
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{1,5})\./);

  return match?.[1] ?? "";
}

function areaRomanForTask(taskCode: string) {
  return (
    taskCode
      .trim()
      .toUpperCase()
      .match(/^[A-Z]{1,5}\.([IVX]+)\./)?.[1] ?? ""
  );
}

function romanValue(value: string) {
  const values: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
  };

  let total = 0;
  let previous = 0;

  for (const char of value.split("").reverse()) {
    const current = values[char] ?? 0;

    if (current < previous) {
      total -= current;
    } else {
      total += current;
      previous = current;
    }
  }

  return total;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function fallbackPrefixesForTestType(
  testType: PracticalTestType,
  availablePrefixes: Set<string>,
) {
  const cert = [
    testType.certificate_code,
    testType.certificate_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const rating = [
    testType.rating_code,
    testType.rating_name,
    testType.category_code,
    testType.category_name,
    testType.class_code,
    testType.class_name,
    testType.display_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const candidates: string[] = [];

  /*
   * These are fallbacks only.
   *
   * Normal operation derives the ACS family directly from
   * Question Library mappings for the selected practical
   * test type so the Flight Tasks library stays synchronized
   * with the existing POA configuration.
   */

  if (cert.includes("PRIVATE")) {
    if (rating.includes("HELICOPTER")) candidates.push("PH");
    else if (rating.includes("GLIDER")) candidates.push("PG");
    else if (rating.includes("GYRO")) candidates.push("PY");
    else if (
      rating.includes("BALLOON") ||
      rating.includes("AIRSHIP") ||
      rating.includes("LIGHTER")
    ) candidates.push("PL");
    else if (rating.includes("AIRPLANE")) candidates.push("PA");
  }

  if (cert.includes("COMMERCIAL")) {
    if (rating.includes("HELICOPTER")) candidates.push("CH");
    else if (rating.includes("GLIDER")) candidates.push("CG");
    else if (rating.includes("GYRO")) candidates.push("CY");
    else if (
      rating.includes("BALLOON") ||
      rating.includes("AIRSHIP") ||
      rating.includes("LIGHTER")
    ) candidates.push("CL");
    else if (rating.includes("AIRPLANE")) candidates.push("CA");
  }

  if (cert.includes("INSTRUMENT")) {
    if (rating.includes("HELICOPTER")) candidates.push("IH");
    else if (rating.includes("GLIDER")) candidates.push("IG");
    else if (rating.includes("GYRO")) candidates.push("IY");
    else if (
      rating.includes("BALLOON") ||
      rating.includes("AIRSHIP") ||
      rating.includes("LIGHTER")
    ) candidates.push("IL");
    else candidates.push("IR");
  }

  if (
    cert.includes("ATP") ||
    cert.includes("AIRLINE TRANSPORT")
  ) {
    /*
     * Prefer the ACS family already represented in the
     * local FAA catalog.
     */
    for (const value of ["AA", "AP", "HP"]) {
      if (
        availablePrefixes.has(value) &&
        (
          (value === "HP" && rating.includes("HELICOPTER")) ||
          (value !== "HP" && rating.includes("AIRPLANE"))
        )
      ) {
        candidates.push(value);
      }
    }
  }

  if (cert.includes("FLIGHT INSTRUCTOR")) {
    if (rating.includes("HELICOPTER")) {
      candidates.push("HI");
    } else {
      candidates.push("FI", "AI");
    }
  }

  if (
    cert.includes("MECHANIC") ||
    cert.includes("AVIATION MECHANIC")
  ) {
    candidates.push("AM");
  }

  if (
    cert.includes("REMOTE") ||
    cert.includes("UAS")
  ) {
    candidates.push("UA");
  }

  if (cert.includes("MILITARY")) {
    candidates.push("MC");
  }

  return unique(
    candidates.filter((value) =>
      availablePrefixes.has(value),
    ),
  );
}

export default function FlightTasksLibraryPage() {
  const [practicalTestTypes, setPracticalTestTypes] =
    useState<PracticalTestType[]>([]);

  const [certificateFilter, setCertificateFilter] =
    useState("");

  const [ratingFilter, setRatingFilter] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [flightTasks, setFlightTasks] =
    useState<FlightTaskDraft[]>([]);

  const [acsPrefixes, setAcsPrefixes] =
    useState<string[]>([]);

  const [expandedAreas, setExpandedAreas] =
    useState<Set<string>>(() => new Set());

  const [loading, setLoading] =
    useState(true);

  const [loadingTasks, setLoadingTasks] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const catalogEntries =
    (faaAcsComplianceCatalog.entries ??
      []) as CatalogEntry[];

  const availablePrefixes = useMemo(() => {
    return new Set(
      catalogEntries
        .map((entry) => acsPrefix(entry.code))
        .filter(Boolean),
    );
  }, [catalogEntries]);

  const loadPracticalTestTypes =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("practical_test_types")
        .select(`
          id,
          certificate_name,
          certificate_code,
          rating_name,
          rating_code,
          category_name,
          category_code,
          class_name,
          class_code,
          display_name
        `)
        .eq("is_active", true)
        .order("certificate_name", {
          ascending: true,
        })
        .order("display_name", {
          ascending: true,
        });

      if (error) {
        setErrorMessage(
          `Practical test types could not be loaded: ${error.message}`,
        );
        setLoading(false);
        return;
      }

      setPracticalTestTypes(
        (data ?? []) as PracticalTestType[],
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadPracticalTestTypes();
  }, [loadPracticalTestTypes]);

  const certificates = useMemo(() => {
    return unique(
      practicalTestTypes
        .map((item) => item.certificate_name)
        .filter(Boolean),
    ).sort((a, b) => a.localeCompare(b));
  }, [practicalTestTypes]);

  const ratingOptions = useMemo(() => {
    if (!certificateFilter) {
      return [];
    }

    const map = new Map<string, string>();

    for (const testType of practicalTestTypes) {
      if (
        testType.certificate_name !==
        certificateFilter
      ) {
        continue;
      }

      const value =
        testType.rating_code ||
        testType.rating_name ||
        testType.id;

      const label =
        testType.display_name ||
        testType.rating_name ||
        value;

      if (!map.has(value)) {
        map.set(value, label);
      }
    }

    return [...map.entries()]
      .map(([value, label]) => ({
        value,
        label,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label),
      );
  }, [
    certificateFilter,
    practicalTestTypes,
  ]);

  const selectedTestType =
    useMemo(() => {
      if (
        !certificateFilter ||
        !ratingFilter
      ) {
        return null;
      }

      return (
        practicalTestTypes.find(
          (item) =>
            item.certificate_name ===
              certificateFilter &&
            (
              item.rating_code ||
              item.rating_name ||
              item.id
            ) === ratingFilter,
        ) ?? null
      );
    }, [
      certificateFilter,
      ratingFilter,
      practicalTestTypes,
    ]);

  useEffect(() => {
    setRatingFilter("");
    setFlightTasks([]);
    setAcsPrefixes([]);
    setExpandedAreas(new Set());
  }, [certificateFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadFlightTasks() {
      if (!selectedTestType) {
        setFlightTasks([]);
        setAcsPrefixes([]);
        return;
      }

      setLoadingTasks(true);
      setErrorMessage("");

      const supabase = createClient();

      /*
       * Determine the ACS family from the same Question
       * Library applicability used by the POA.
       */
      const { data, error } = await supabase
        .from("poa_questions")
        .select(`
          poa_question_acs_applicability (
            acs_reference
          ),
          poa_question_practical_test_types!inner (
            practical_test_type_id
          )
        `)
        .eq("is_active", true)
        .eq(
          "poa_question_practical_test_types.practical_test_type_id",
          selectedTestType.id,
        )
        .limit(1000);

      if (cancelled) {
        return;
      }

      let prefixes: string[] = [];

      if (!error) {
        const rows =
          (data ?? []) as QuestionMappingRow[];

        prefixes = unique(
          rows.flatMap((row) =>
            (
              row.poa_question_acs_applicability ??
              []
            ).flatMap((mapping) =>
              String(
                mapping.acs_reference ?? "",
              )
                .split(/[,;\n]+/)
                .map((reference) =>
                  acsPrefix(reference),
                )
                .filter(Boolean),
            ),
          ),
        ).filter((prefix) =>
          availablePrefixes.has(prefix),
        );
      }

      if (prefixes.length === 0) {
        prefixes = fallbackPrefixesForTestType(
          selectedTestType,
          availablePrefixes,
        );
      }

      if (cancelled) {
        return;
      }

      setAcsPrefixes(prefixes);

      /*
       * deriveAllFlightTasksFromAcsCatalog()
       * now globally excludes Area of Operation I.
       */
      const derived =
        deriveAllFlightTasksFromAcsCatalog(
          prefixes,
        );

      setFlightTasks(derived);
      setExpandedAreas(new Set());
      setLoadingTasks(false);
    }

    void loadFlightTasks();

    return () => {
      cancelled = true;
    };
  }, [
    selectedTestType,
    availablePrefixes,
  ]);

  const areaGroups = useMemo(() => {
    const search =
      searchText.trim().toLowerCase();

    const filtered = flightTasks.filter(
      (task) => {
        if (!search) {
          return true;
        }

        const haystack = [
          task.acs_task_code_snapshot,
          task.area_name_snapshot,
          task.task_name_snapshot,
          ...task.skill_elements_snapshot.map(
            (element) =>
              `${element.code} ${element.label}`,
          ),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      },
    );

    const groups =
      new Map<string, AreaGroup>();

    for (const task of filtered) {
      const roman =
        areaRomanForTask(
          task.acs_task_code_snapshot,
        );

      /*
       * Defensive protection:
       * Even if a future caller bypasses the shared helper,
       * AOA I will never render in this Flight Tasks view.
       */
      if (roman === "I") {
        continue;
      }

      const prefix =
        acsPrefix(
          task.acs_task_code_snapshot,
        );

      const key = `${prefix}.${roman}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          areaRoman: roman,
          areaName:
            task.area_name_snapshot || "",
          tasks: [],
        });
      }

      groups.get(key)!.tasks.push(task);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        tasks: [...group.tasks].sort(
          (a, b) =>
            a.acs_task_code_snapshot.localeCompare(
              b.acs_task_code_snapshot,
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              },
            ),
        ),
      }))
      .sort((a, b) => {
        const prefixCompare =
          a.key
            .split(".")[0]
            .localeCompare(
              b.key.split(".")[0],
            );

        if (prefixCompare !== 0) {
          return prefixCompare;
        }

        return (
          romanValue(a.areaRoman) -
          romanValue(b.areaRoman)
        );
      });
  }, [flightTasks, searchText]);

  function toggleArea(key: string) {
    setExpandedAreas((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Plan of Action
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Flight Tasks
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Browse the ACS flight tasks applicable
            to each practical test. Area of
            Operation I — Preflight Preparation —
            is intentionally omitted because it is
            completed during the oral portion.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/examiner/plan-of-action/type-rating"
            className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            Type Rating POA
          </Link>

          <Link
            href="/examiner/plan-of-action"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Plan of Action
          </Link>
        </div>
      </div>

      <div className="mt-8 border-b border-slate-200">
        <nav
          className="flex flex-wrap items-end gap-1"
          aria-label="Plan of Action Library Views"
        >
          <Link
            href="/examiner/plan-of-action/questions"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-6 py-4 text-base font-bold text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
          >
            <span
              aria-hidden="true"
              className="text-2xl leading-none"
            >
              ?
            </span>
            <span>Questions</span>
          </Link>

          <Link
            href="/examiner/plan-of-action/scenarios"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-6 py-4 text-base font-bold text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
          >
            <span
              aria-hidden="true"
              className="text-2xl leading-none"
            >
              ✈
            </span>
            <span>Scenarios</span>
          </Link>

          <Link
            href="/examiner/plan-of-action/triggers"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-6 py-4 text-base font-bold text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
          >
            <span
              aria-hidden="true"
              className="text-2xl leading-none"
            >
              ⚡
            </span>
            <span>Triggers</span>
          </Link>

          <Link
            href="/examiner/plan-of-action/flight-tasks"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-300 bg-white px-6 py-4 text-base font-bold text-amber-800 shadow-sm transition"
          >
            <span
              aria-hidden="true"
              className="text-2xl leading-none"
            >
              ☑
            </span>
            <span>Flight Tasks</span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-amber-700" />
          </Link>
        </nav>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Flight Tasks
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {selectedTestType
              ? flightTasks.length
              : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Areas of Operation
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {selectedTestType
              ? areaGroups.length
              : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            ACS Family
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {selectedTestType
              ? acsPrefixes.join(", ") || "—"
              : "—"}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px_360px]">
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Search
            </span>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value,
                  )
                }
                placeholder="Flight task, ACS code, skill element..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
              />
            </div>
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Certificate
            </span>

            <select
              value={certificateFilter}
              onChange={(event) =>
                setCertificateFilter(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="">
                Select Certificate
              </option>

              {certificates.map(
                (certificate) => (
                  <option
                    key={certificate}
                    value={certificate}
                  >
                    {certificate}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Rating Type
            </span>

            <select
              value={ratingFilter}
              disabled={!certificateFilter}
              onChange={(event) =>
                setRatingFilter(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {certificateFilter
                  ? "Select Rating Type"
                  : "Select Certificate First"}
              </option>

              {ratingOptions.map(
                (rating) => (
                  <option
                    key={rating.value}
                    value={rating.value}
                  >
                    {rating.label}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6">
        {loading || loadingTasks ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            Loading flight tasks…
          </div>
        ) : null}

        {!loading &&
        !loadingTasks &&
        !selectedTestType ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />

            <p className="mt-4 text-lg font-semibold text-slate-800">
              Select a Certificate and Rating Type
            </p>

            <p className="mt-2 text-sm text-slate-500">
              The applicable ACS Flight Tasks
              will appear below.
            </p>
          </div>
        ) : null}

        {!loading &&
        !loadingTasks &&
        selectedTestType &&
        flightTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />

            <p className="mt-4 font-semibold text-slate-800">
              No Flight Tasks Found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No ACS Skill tasks were found for
              this practical test type.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {areaGroups.map((group) => {
            const expanded =
              expandedAreas.has(group.key);

            return (
              <section
                key={group.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleArea(group.key)
                  }
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    {expanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Area of Operation{" "}
                      {group.areaRoman}
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {group.areaName ||
                        group.key}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {group.tasks.length}{" "}
                    {group.tasks.length === 1
                      ? "task"
                      : "tasks"}
                  </span>
                </button>

                {expanded ? (
                  <div className="border-t border-slate-200 bg-slate-50/40 p-3 sm:p-4">
                    <div className="space-y-3">
                      {group.tasks.map(
                        (task) => (
                          <article
                            key={
                              task.acs_task_code_snapshot
                            }
                            className="rounded-xl border border-slate-200 bg-white p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="rounded-lg bg-sky-100 px-2.5 py-1 font-mono text-xs font-bold text-sky-800">
                                    {
                                      task.acs_task_code_snapshot
                                    }
                                  </span>

                                  <span className="font-bold text-slate-900">
                                    {
                                      task.task_name_snapshot
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            {task.skill_elements_snapshot
                              .length > 0 ? (
                              <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  ACS Skill Elements
                                </p>

                                <div className="mt-2 space-y-1.5">
                                  {task.skill_elements_snapshot.map(
                                    (element) => (
                                      <div
                                        key={
                                          element.code
                                        }
                                        className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                      >
                                        <span className="shrink-0 font-mono font-semibold text-sky-800">
                                          {
                                            element.code
                                          }
                                        </span>

                                        {element.label !==
                                        element.code ? (
                                          <span className="text-slate-700">
                                            {
                                              element.label
                                            }
                                          </span>
                                        ) : null}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">
                                No individual Skill
                                elements are listed in
                                the current ACS catalog
                                for this task.
                              </p>
                            )}
                          </article>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
