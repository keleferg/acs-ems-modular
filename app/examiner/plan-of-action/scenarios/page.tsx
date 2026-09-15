"use client";

import Link from "next/link";

import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plane,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";


type PracticalTestType = {
  id: string;
  certificate_name: string;
  certificate_code: string;
  rating_name: string;
  rating_code: string;
  category_name: string | null;
  class_name: string | null;
  display_name: string;
};


type TriggerCategory =
  | "event"
  | "passenger"
  | "pilot_aircraft"
  | "weather";


type TriggerRecord = {
  id: string;
  category: TriggerCategory;
  trigger_text: string;
};


type ScenarioTestTypeJoin = {
  practical_test_type_id: string;
  practical_test_types:
    | PracticalTestType
    | PracticalTestType[]
    | null;
};


type ScenarioTriggerJoin = {
  trigger_id: string;
  sort_order: number;
  poa_triggers:
    | TriggerRecord
    | TriggerRecord[]
    | null;
};


type ScenarioRecord = {
  id: string;

  scenario_name: string;
  scenario_brief: string | null;

  departure: string | null;
  destination: string | null;
  aircraft: string | null;

  initial_conditions: string | null;
  examiner_notes: string | null;

  is_active: boolean;

  created_at: string;
  updated_at: string;

  poa_scenario_practical_test_types:
    ScenarioTestTypeJoin[];

  poa_scenario_triggers:
    ScenarioTriggerJoin[];
};


type ScenarioEditor = {
  id: string | null;

  scenarioName: string;
  scenarioBrief: string;

  departure: string;
  destination: string;
  aircraft: string;

  initialConditions: string;
  examinerNotes: string;

  practicalTestTypeIds: string[];
  triggerIds: string[];
};


const EMPTY_EDITOR: ScenarioEditor = {
  id: null,

  scenarioName: "",
  scenarioBrief: "",

  departure: "",
  destination: "",
  aircraft: "",

  initialConditions: "",
  examinerNotes: "",

  practicalTestTypeIds: [],
  triggerIds: [],
};


const TRIGGER_CATEGORIES: {
  value: TriggerCategory;
  label: string;
}[] = [
  {
    value: "event",
    label: "Event",
  },
  {
    value: "passenger",
    label: "Passenger",
  },
  {
    value: "pilot_aircraft",
    label: "Pilot/Aircraft",
  },
  {
    value: "weather",
    label: "Weather",
  },
];


function normalizeTestType(
  value:
    | PracticalTestType
    | PracticalTestType[]
    | null,
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}


function normalizeTrigger(
  value:
    | TriggerRecord
    | TriggerRecord[]
    | null,
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}


export default function ScenarioLibraryPage() {
  const [scenarios, setScenarios] =
    useState<ScenarioRecord[]>([]);

  const [practicalTestTypes, setPracticalTestTypes] =
    useState<PracticalTestType[]>([]);

  const [triggers, setTriggers] =
    useState<TriggerRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [certificateFilter, setCertificateFilter] =
    useState("");

  const [ratingFilter, setRatingFilter] =
    useState("");

  const [expandedScenarioId, setExpandedScenarioId] =
    useState<string | null>(null);

  const [showEditor, setShowEditor] =
    useState(false);

  const [editor, setEditor] =
    useState<ScenarioEditor>(EMPTY_EDITOR);

  const [triggerSearch, setTriggerSearch] =
    useState("");

  const [triggerCategoryFilter, setTriggerCategoryFilter] =
    useState<TriggerCategory | "all">("all");


  const loadPage = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const supabase = createClient();

    const [
      scenarioResult,
      testTypeResult,
      triggerResult,
    ] = await Promise.all([
      supabase
        .from("poa_scenarios")
        .select(`
          id,
          scenario_name,
          scenario_brief,
          departure,
          destination,
          aircraft,
          initial_conditions,
          examiner_notes,
          is_active,
          created_at,
          updated_at,

          poa_scenario_practical_test_types (
            practical_test_type_id,
            practical_test_types (
              id,
              certificate_name,
              certificate_code,
              rating_name,
              rating_code,
              category_name,
              class_name,
              display_name
            )
          ),

          poa_scenario_triggers (
            trigger_id,
            sort_order,
            poa_triggers (
              id,
              category,
              trigger_text
            )
          )
        `)
        .eq("is_active", true)
        .order("scenario_name", {
          ascending: true,
        }),

      supabase
        .from("practical_test_types")
        .select(`
          id,
          certificate_name,
          certificate_code,
          rating_name,
          rating_code,
          category_name,
          class_name,
          display_name
        `)
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("poa_triggers")
        .select(`
          id,
          category,
          trigger_text
        `)
        .eq("is_active", true)
        .order("category", {
          ascending: true,
        })
        .order("trigger_text", {
          ascending: true,
        }),
    ]);


    if (scenarioResult.error) {
      setPageError(
        scenarioResult.error.message,
      );
      setLoading(false);
      return;
    }

    if (testTypeResult.error) {
      setPageError(
        testTypeResult.error.message,
      );
      setLoading(false);
      return;
    }

    if (triggerResult.error) {
      setPageError(
        triggerResult.error.message,
      );
      setLoading(false);
      return;
    }


    setScenarios(
      (scenarioResult.data ?? []) as unknown as ScenarioRecord[],
    );

    setPracticalTestTypes(
      (testTypeResult.data ?? []) as PracticalTestType[],
    );

    setTriggers(
      (triggerResult.data ?? []) as TriggerRecord[],
    );

    setLoading(false);
  }, []);


  useEffect(() => {
    void loadPage();
  }, [loadPage]);


  const certificates = useMemo(() => {
    return [
      ...new Set(
        practicalTestTypes
          .map(
            (item) =>
              item.certificate_name,
          )
          .filter(Boolean),
      ),
    ].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [practicalTestTypes]);


  const ratingOptions = useMemo(() => {
    if (!certificateFilter) {
      return [];
    }

    const map = new Map<
      string,
      string
    >();

    practicalTestTypes
      .filter(
        (item) =>
          item.certificate_name ===
          certificateFilter,
      )
      .forEach((item) => {
        const key =
          item.rating_code ||
          item.rating_name;

        const label =
          item.rating_name ||
          item.rating_code;

        if (key && label) {
          map.set(key, label);
        }
      });

    return [
      ...map.entries(),
    ]
      .map(([value, label]) => ({
        value,
        label,
      }))
      .sort((a, b) =>
        a.label.localeCompare(
          b.label,
        ),
      );
  }, [
    certificateFilter,
    practicalTestTypes,
  ]);


  useEffect(() => {
    setRatingFilter("");
  }, [certificateFilter]);


  const filteredScenarios =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      return scenarios.filter(
        (scenario) => {
          const testTypes =
            scenario
              .poa_scenario_practical_test_types
              .map((join) =>
                normalizeTestType(
                  join.practical_test_types,
                ),
              )
              .filter(
                (
                  value,
                ): value is PracticalTestType =>
                  Boolean(value),
              );

          if (
            certificateFilter &&
            !testTypes.some(
              (testType) =>
                testType.certificate_name ===
                certificateFilter,
            )
          ) {
            return false;
          }

          if (
            ratingFilter &&
            !testTypes.some(
              (testType) =>
                (
                  testType.rating_code ||
                  testType.rating_name
                ) === ratingFilter,
            )
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          const values = [
            scenario.scenario_name,
            scenario.scenario_brief,
            scenario.departure,
            scenario.destination,
            scenario.aircraft,
            scenario.initial_conditions,
            scenario.examiner_notes,
            ...testTypes.map(
              (item) =>
                item.display_name,
            ),
          ];

          return values.some(
            (value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(search),
          );
        },
      );
    }, [
      certificateFilter,
      ratingFilter,
      scenarios,
      searchText,
    ]);


  const filteredEditorTriggers =
    useMemo(() => {
      const search =
        triggerSearch
          .trim()
          .toLowerCase();

      return triggers.filter(
        (trigger) => {
          if (
            triggerCategoryFilter !==
              "all" &&
            trigger.category !==
              triggerCategoryFilter
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return trigger.trigger_text
            .toLowerCase()
            .includes(search);
        },
      );
    }, [
      triggerCategoryFilter,
      triggerSearch,
      triggers,
    ]);


  function openNewScenario() {
    setEditor(
      EMPTY_EDITOR,
    );

    setTriggerSearch("");
    setTriggerCategoryFilter(
      "all",
    );

    setPageError("");
    setMessage("");

    setShowEditor(true);
  }


  function openEditScenario(
    scenario: ScenarioRecord,
  ) {
    setEditor({
      id: scenario.id,

      scenarioName:
        scenario.scenario_name,

      scenarioBrief:
        scenario.scenario_brief ??
        "",

      departure:
        scenario.departure ??
        "",

      destination:
        scenario.destination ??
        "",

      aircraft:
        scenario.aircraft ??
        "",

      initialConditions:
        scenario.initial_conditions ??
        "",

      examinerNotes:
        scenario.examiner_notes ??
        "",

      practicalTestTypeIds:
        scenario
          .poa_scenario_practical_test_types
          .map(
            (join) =>
              join.practical_test_type_id,
          ),

      triggerIds:
        scenario
          .poa_scenario_triggers
          .sort(
            (a, b) =>
              a.sort_order -
              b.sort_order,
          )
          .map(
            (join) =>
              join.trigger_id,
          ),
    });

    setTriggerSearch("");
    setTriggerCategoryFilter(
      "all",
    );

    setPageError("");
    setMessage("");

    setShowEditor(true);
  }


  function closeEditor() {
    if (saving) {
      return;
    }

    setShowEditor(false);
    setEditor(
      EMPTY_EDITOR,
    );
  }


  function toggleTestType(
    id: string,
  ) {
    setEditor(
      (current) => ({
        ...current,

        practicalTestTypeIds:
          current
            .practicalTestTypeIds
            .includes(id)
            ? current
                .practicalTestTypeIds
                .filter(
                  (value) =>
                    value !== id,
                )
            : [
                ...current
                  .practicalTestTypeIds,
                id,
              ],
      }),
    );
  }


  function toggleTrigger(
    id: string,
  ) {
    setEditor(
      (current) => ({
        ...current,

        triggerIds:
          current.triggerIds.includes(
            id,
          )
            ? current.triggerIds.filter(
                (value) =>
                  value !== id,
              )
            : [
                ...current.triggerIds,
                id,
              ],
      }),
    );
  }


  async function saveScenario() {
    const scenarioName =
      editor.scenarioName.trim();

    if (!scenarioName) {
      setPageError(
        "Scenario name is required.",
      );
      return;
    }

    if (
      editor.practicalTestTypeIds
        .length === 0
    ) {
      setPageError(
        "Select at least one applicable practical test.",
      );
      return;
    }

    setSaving(true);
    setPageError("");
    setMessage("");

    const supabase =
      createClient();

    try {
      let scenarioId =
        editor.id;

      if (scenarioId) {
        const {
          error: updateError,
        } = await supabase
          .from("poa_scenarios")
          .update({
            scenario_name:
              scenarioName,

            scenario_brief:
              editor.scenarioBrief
                .trim() ||
              null,

            departure:
              editor.departure
                .trim() ||
              null,

            destination:
              editor.destination
                .trim() ||
              null,

            aircraft:
              editor.aircraft
                .trim() ||
              null,

            initial_conditions:
              editor
                .initialConditions
                .trim() ||
              null,

            examiner_notes:
              editor.examinerNotes
                .trim() ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            scenarioId,
          );

        if (updateError) {
          throw updateError;
        }

        const {
          error:
            deleteTypesError,
        } = await supabase
          .from(
            "poa_scenario_practical_test_types",
          )
          .delete()
          .eq(
            "scenario_id",
            scenarioId,
          );

        if (
          deleteTypesError
        ) {
          throw deleteTypesError;
        }

        const {
          error:
            deleteTriggersError,
        } = await supabase
          .from(
            "poa_scenario_triggers",
          )
          .delete()
          .eq(
            "scenario_id",
            scenarioId,
          );

        if (
          deleteTriggersError
        ) {
          throw deleteTriggersError;
        }
      } else {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        const {
          data,
          error:
            insertError,
        } = await supabase
          .from("poa_scenarios")
          .insert({
            scenario_name:
              scenarioName,

            scenario_brief:
              editor.scenarioBrief
                .trim() ||
              null,

            departure:
              editor.departure
                .trim() ||
              null,

            destination:
              editor.destination
                .trim() ||
              null,

            aircraft:
              editor.aircraft
                .trim() ||
              null,

            initial_conditions:
              editor
                .initialConditions
                .trim() ||
              null,

            examiner_notes:
              editor.examinerNotes
                .trim() ||
              null,

            created_by:
              user?.id ??
              null,
          })
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        scenarioId =
          data.id;
      }


      const {
        error:
          testTypeInsertError,
      } = await supabase
        .from(
          "poa_scenario_practical_test_types",
        )
        .insert(
          editor
            .practicalTestTypeIds
            .map(
              (
                practicalTestTypeId,
              ) => ({
                scenario_id:
                  scenarioId,

                practical_test_type_id:
                  practicalTestTypeId,
              }),
            ),
        );

      if (
        testTypeInsertError
      ) {
        throw testTypeInsertError;
      }


      if (
        editor.triggerIds
          .length > 0
      ) {
        const {
          error:
            triggerInsertError,
        } = await supabase
          .from(
            "poa_scenario_triggers",
          )
          .insert(
            editor.triggerIds.map(
              (
                triggerId,
                index,
              ) => ({
                scenario_id:
                  scenarioId,

                trigger_id:
                  triggerId,

                sort_order:
                  index,
              }),
            ),
          );

        if (
          triggerInsertError
        ) {
          throw triggerInsertError;
        }
      }


      setShowEditor(false);

      setEditor(
        EMPTY_EDITOR,
      );

      setMessage(
        editor.id
          ? "Scenario updated."
          : "Scenario added.",
      );

      await loadPage();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The scenario could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }


  async function deleteScenario(
    scenario: ScenarioRecord,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${scenario.scenario_name}"?\n\nThis will remove the scenario from the active Scenario Library.`,
      );

    if (!confirmed) {
      return;
    }

    setPageError("");
    setMessage("");

    const supabase =
      createClient();

    const { error } =
      await supabase
        .from("poa_scenarios")
        .update({
          is_active: false,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          scenario.id,
        );

    if (error) {
      setPageError(
        error.message,
      );
      return;
    }

    setMessage(
      "Scenario deleted.",
    );

    await loadPage();
  }


  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Plan of Action
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Question Library
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Build and manage reusable flight scenarios for practical tests.
          </p>
        </div>

        <Link
          href="/examiner/plan-of-action"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Plan of Action
        </Link>

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
              aria-hidden
              className="text-2xl leading-none"
            >
              ?
            </span>

            <span>
              Questions
            </span>
          </Link>


          <Link
            href="/examiner/plan-of-action/scenarios"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-300 bg-white px-6 py-4 text-base font-bold text-amber-800 shadow-sm transition"
          >
            <span
              aria-hidden
              className="text-2xl leading-none"
            >
              ✈
            </span>

            <span>
              Scenarios
            </span>

            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-amber-700" />
          </Link>


          <Link
            href="/examiner/plan-of-action/triggers"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-6 py-4 text-base font-bold text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
          >
            <span
              aria-hidden
              className="text-2xl leading-none"
            >
              ⚡
            </span>

            <span>
              Triggers
            </span>
          </Link>

                  <Link
            href="/examiner/plan-of-action/flight-tasks"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-6 py-4 text-base font-bold text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ☑
            </span>
            <span>Flight Tasks</span>
          </Link>
</nav>

      </div>


      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}


      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}


      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_260px_auto] lg:items-end">

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Search scenarios
            </label>

            <div className="relative">

              <Search
                aria-hidden
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value,
                  )
                }
                placeholder="Scenario, airport, aircraft, mission…"
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              />

            </div>
          </div>


          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Certificate
            </label>

            <select
              value={
                certificateFilter
              }
              onChange={(event) =>
                setCertificateFilter(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
            >

              <option value="">
                All Certificates
              </option>

              {certificates.map(
                (certificate) => (
                  <option
                    key={
                      certificate
                    }
                    value={
                      certificate
                    }
                  >
                    {certificate}
                  </option>
                ),
              )}

            </select>
          </div>


          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Rating
            </label>

            <select
              value={
                ratingFilter
              }
              disabled={
                !certificateFilter
              }
              onChange={(event) =>
                setRatingFilter(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
            >

              <option value="">
                All Ratings
              </option>

              {ratingOptions.map(
                (rating) => (
                  <option
                    key={
                      rating.value
                    }
                    value={
                      rating.value
                    }
                  >
                    {rating.label}
                  </option>
                ),
              )}

            </select>
          </div>


          <button
            type="button"
            onClick={
              openNewScenario
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-amber-700"
          >
            <Plus
              aria-hidden
              className="h-5 w-5"
            />

            Add Scenario
          </button>

        </div>


        <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
          {loading
            ? "Loading scenarios…"
            : `${filteredScenarios.length} scenario${
                filteredScenarios.length === 1
                  ? ""
                  : "s"
              } shown`}
        </div>

      </section>


      {loading ? (

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          Loading Scenario Library…
        </section>

      ) : filteredScenarios.length === 0 ? (

        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

          <Plane
            aria-hidden
            className="mx-auto h-10 w-10 text-slate-400"
          />

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No Scenarios
          </h2>

          <p className="mt-2 text-slate-600">
            Add a reusable flight scenario to begin building the Scenario Library.
          </p>

        </section>

      ) : (

        <section className="mt-6 space-y-4">

          {filteredScenarios.map(
            (scenario) => {

              const expanded =
                expandedScenarioId ===
                scenario.id;

              const testTypes =
                scenario
                  .poa_scenario_practical_test_types
                  .map((join) =>
                    normalizeTestType(
                      join.practical_test_types,
                    ),
                  )
                  .filter(
                    (
                      value,
                    ): value is PracticalTestType =>
                      Boolean(value),
                  );

              const scenarioTriggers =
                scenario
                  .poa_scenario_triggers
                  .slice()
                  .sort(
                    (a, b) =>
                      a.sort_order -
                      b.sort_order,
                  )
                  .map((join) =>
                    normalizeTrigger(
                      join.poa_triggers,
                    ),
                  )
                  .filter(
                    (
                      value,
                    ): value is TriggerRecord =>
                      Boolean(value),
                  );


              return (
                <article
                  key={
                    scenario.id
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >

                  <div className="flex items-start gap-4 p-5">

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedScenarioId(
                          expanded
                            ? null
                            : scenario.id,
                        )
                      }
                      className="mt-1 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                      {expanded ? (
                        <ChevronDown
                          aria-hidden
                          className="h-5 w-5"
                        />
                      ) : (
                        <ChevronRight
                          aria-hidden
                          className="h-5 w-5"
                        />
                      )}
                    </button>


                    <div className="min-w-0 flex-1">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <h2 className="text-lg font-bold text-slate-900">
                            {scenario.scenario_name}
                          </h2>

                          {scenario.scenario_brief ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                              {scenario.scenario_brief}
                            </p>
                          ) : null}

                        </div>


                        <div className="flex shrink-0 gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              openEditScenario(
                                scenario,
                              )
                            }
                            title="Edit scenario"
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-700"
                          >
                            <Pencil
                              aria-hidden
                              className="h-4 w-4"
                            />
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              void deleteScenario(
                                scenario,
                              )
                            }
                            title="Delete scenario"
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-700"
                          >
                            <Trash2
                              aria-hidden
                              className="h-4 w-4"
                            />
                          </button>

                        </div>

                      </div>


                      <div className="mt-4 flex flex-wrap gap-2">

                        {testTypes.map(
                          (testType) => (
                            <span
                              key={
                                testType.id
                              }
                              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                            >
                              {
                                testType.display_name
                              }
                            </span>
                          ),
                        )}

                        {scenarioTriggers.length >
                        0 ? (
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                            {
                              scenarioTriggers.length
                            }{" "}
                            Trigger
                            {scenarioTriggers.length ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        ) : null}

                      </div>

                    </div>

                  </div>


                  {expanded ? (

                    <div className="border-t border-slate-200 bg-slate-50 p-6">

                      <div className="grid gap-6 lg:grid-cols-2">

                        <div className="rounded-xl border border-slate-200 bg-white p-5">

                          <h3 className="font-bold text-slate-900">
                            Flight Setup
                          </h3>

                          <dl className="mt-4 space-y-3 text-sm">

                            <div>
                              <dt className="text-slate-500">
                                Departure
                              </dt>

                              <dd className="font-medium text-slate-900">
                                {scenario.departure ||
                                  "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-slate-500">
                                Destination
                              </dt>

                              <dd className="font-medium text-slate-900">
                                {scenario.destination ||
                                  "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-slate-500">
                                Aircraft
                              </dt>

                              <dd className="font-medium text-slate-900">
                                {scenario.aircraft ||
                                  "—"}
                              </dd>
                            </div>

                          </dl>

                        </div>


                        <div className="rounded-xl border border-slate-200 bg-white p-5">

                          <h3 className="font-bold text-slate-900">
                            Initial Conditions
                          </h3>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {scenario.initial_conditions ||
                              "No initial conditions entered."}
                          </p>

                        </div>

                      </div>


                      {scenario.examiner_notes ? (

                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">

                          <h3 className="font-bold text-slate-900">
                            Examiner Notes
                          </h3>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {scenario.examiner_notes}
                          </p>

                        </div>

                      ) : null}


                      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">

                        <div className="flex items-center gap-2">

                          <Zap
                            aria-hidden
                            className="h-5 w-5 text-amber-600"
                          />

                          <h3 className="font-bold text-slate-900">
                            Scenario Triggers
                          </h3>

                        </div>


                        {scenarioTriggers.length ===
                        0 ? (

                          <p className="mt-3 text-sm text-slate-500">
                            No triggers attached.
                          </p>

                        ) : (

                          <div className="mt-4 space-y-2">

                            {scenarioTriggers.map(
                              (
                                trigger,
                                index,
                              ) => (

                                <div
                                  key={
                                    trigger.id
                                  }
                                  className="flex gap-3 rounded-lg bg-slate-50 px-4 py-3"
                                >

                                  <span className="font-bold text-amber-700">
                                    {index +
                                      1}.
                                  </span>

                                  <div>

                                    <p className="text-sm font-medium text-slate-800">
                                      {
                                        trigger.trigger_text
                                      }
                                    </p>

                                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                      {
                                        TRIGGER_CATEGORIES.find(
                                          (
                                            category,
                                          ) =>
                                            category.value ===
                                            trigger.category,
                                        )
                                          ?.label
                                      }
                                    </p>

                                  </div>

                                </div>

                              ),
                            )}

                          </div>

                        )}

                      </div>

                    </div>

                  ) : null}

                </article>
              );
            },
          )}

        </section>

      )}


      {showEditor ? (

        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4">

          <div className="mx-auto my-6 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Scenario Library
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {editor.id
                    ? "Edit Scenario"
                    : "Add Scenario"}
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  closeEditor
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X
                  aria-hidden
                  className="h-5 w-5"
                />
              </button>

            </div>


            <div className="space-y-8 px-6 py-6">

              <section>

                <h3 className="text-lg font-bold text-slate-900">
                  Scenario
                </h3>

                <div className="mt-4 space-y-5">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Scenario Name *
                    </label>

                    <input
                      value={
                        editor.scenarioName
                      }
                      onChange={(event) =>
                        setEditor(
                          (
                            current,
                          ) => ({
                            ...current,
                            scenarioName:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="Example: Family Trip to Maui"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Scenario Brief / Mission
                    </label>

                    <textarea
                      rows={5}
                      value={
                        editor.scenarioBrief
                      }
                      onChange={(event) =>
                        setEditor(
                          (
                            current,
                          ) => ({
                            ...current,
                            scenarioBrief:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="Describe the overall flight mission presented to the applicant…"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 leading-6"
                    />

                  </div>

                </div>

              </section>


              <section className="border-t border-slate-200 pt-7">

                <h3 className="text-lg font-bold text-slate-900">
                  Flight Setup
                </h3>

                <div className="mt-4 grid gap-5 md:grid-cols-3">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Departure
                    </label>

                    <input
                      value={
                        editor.departure
                      }
                      onChange={(event) =>
                        setEditor(
                          (
                            current,
                          ) => ({
                            ...current,
                            departure:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="PHTO"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Destination
                    </label>

                    <input
                      value={
                        editor.destination
                      }
                      onChange={(event) =>
                        setEditor(
                          (
                            current,
                          ) => ({
                            ...current,
                            destination:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="PHOG"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Aircraft
                    </label>

                    <input
                      value={
                        editor.aircraft
                      }
                      onChange={(event) =>
                        setEditor(
                          (
                            current,
                          ) => ({
                            ...current,
                            aircraft:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="Cessna 172"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />

                  </div>

                </div>


                <div className="mt-5">

                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Initial Conditions / Setup
                  </label>

                  <textarea
                    rows={4}
                    value={
                      editor.initialConditions
                    }
                    onChange={(event) =>
                      setEditor(
                        (
                          current,
                        ) => ({
                          ...current,
                          initialConditions:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Weather, passengers, fuel, loading, operational conditions, or other starting information…"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 leading-6"
                  />

                </div>

              </section>


              <section className="border-t border-slate-200 pt-7">

                <h3 className="text-lg font-bold text-slate-900">
                  Applicable Practical Tests *
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select every certificate and rating for which this scenario may be used.
                </p>

                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200">

                  {practicalTestTypes.map(
                    (
                      testType,
                    ) => (

                      <label
                        key={
                          testType.id
                        }
                        className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                      >

                        <input
                          type="checkbox"
                          checked={editor.practicalTestTypeIds.includes(
                            testType.id,
                          )}
                          onChange={() =>
                            toggleTestType(
                              testType.id,
                            )
                          }
                          className="mt-1 h-4 w-4"
                        />

                        <div>

                          <p className="text-sm font-semibold text-slate-800">
                            {
                              testType.display_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              testType.certificate_name
                            }{" "}
                            ·{" "}
                            {
                              testType.rating_name
                            }
                          </p>

                        </div>

                      </label>

                    ),
                  )}

                </div>

              </section>


              <section className="border-t border-slate-200 pt-7">

                <div className="flex items-center gap-2">

                  <Zap
                    aria-hidden
                    className="h-5 w-5 text-amber-600"
                  />

                  <h3 className="text-lg font-bold text-slate-900">
                    Triggers
                  </h3>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Select the events or conditions that can be introduced during this scenario.
                </p>


                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">

                  <input
                    type="search"
                    value={
                      triggerSearch
                    }
                    onChange={(event) =>
                      setTriggerSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search triggers…"
                    className="rounded-lg border border-slate-300 px-4 py-3"
                  />


                  <select
                    value={
                      triggerCategoryFilter
                    }
                    onChange={(event) =>
                      setTriggerCategoryFilter(
                        event.target
                          .value as
                          | TriggerCategory
                          | "all",
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3"
                  >

                    <option value="all">
                      All Categories
                    </option>

                    {TRIGGER_CATEGORIES.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category.value
                          }
                          value={
                            category.value
                          }
                        >
                          {
                            category.label
                          }
                        </option>
                      ),
                    )}

                  </select>

                </div>


                <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-slate-200">

                  {filteredEditorTriggers.map(
                    (
                      trigger,
                    ) => (

                      <label
                        key={
                          trigger.id
                        }
                        className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                      >

                        <input
                          type="checkbox"
                          checked={editor.triggerIds.includes(
                            trigger.id,
                          )}
                          onChange={() =>
                            toggleTrigger(
                              trigger.id,
                            )
                          }
                          className="mt-1 h-4 w-4"
                        />


                        <div className="min-w-0">

                          <p className="text-sm font-medium text-slate-800">
                            {
                              trigger.trigger_text
                            }
                          </p>

                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {
                              TRIGGER_CATEGORIES.find(
                                (
                                  category,
                                ) =>
                                  category.value ===
                                  trigger.category,
                              )?.label
                            }
                          </p>

                        </div>

                      </label>

                    ),
                  )}

                </div>


                <p className="mt-3 text-sm font-medium text-slate-600">
                  {
                    editor
                      .triggerIds
                      .length
                  }{" "}
                  trigger
                  {editor.triggerIds
                    .length ===
                  1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>

              </section>


              <section className="border-t border-slate-200 pt-7">

                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Examiner Notes
                </label>

                <textarea
                  rows={4}
                  value={
                    editor.examinerNotes
                  }
                  onChange={(event) =>
                    setEditor(
                      (
                        current,
                      ) => ({
                        ...current,
                        examinerNotes:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Private examiner instructions, sequencing notes, or expected scenario flow…"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 leading-6"
                />

              </section>

            </div>


            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">

              <button
                type="button"
                onClick={
                  closeEditor
                }
                disabled={
                  saving
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={() =>
                  void saveScenario()
                }
                disabled={
                  saving ||
                  !editor.scenarioName.trim()
                }
                className="rounded-lg bg-amber-600 px-5 py-2.5 font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving
                  ? "Saving…"
                  : editor.id
                    ? "Save Changes"
                    : "Add Scenario"}
              </button>

            </div>

          </div>

        </div>

      ) : null}

    </main>
  );
}
