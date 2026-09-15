"use client";

import Link from "next/link";
import {
  CloudSun,
  Pencil,
  Plane,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type TriggerCategory =
  | "event"
  | "passenger"
  | "pilot_aircraft"
  | "weather";

type TriggerRecord = {
  id: string;
  category: TriggerCategory;
  trigger_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type EditorState = {
  id: string | null;
  category: TriggerCategory;
  triggerText: string;
};

const EMPTY_EDITOR: EditorState = {
  id: null,
  category: "event",
  triggerText: "",
};

const CATEGORY_OPTIONS: {
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

function categoryLabel(category: TriggerCategory) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

function CategoryIcon({
  category,
  className = "h-5 w-5",
}: {
  category: TriggerCategory;
  className?: string;
}) {
  if (category === "passenger") {
    return <UsersRound aria-hidden className={className} />;
  }

  if (category === "pilot_aircraft") {
    return <Plane aria-hidden className={className} />;
  }

  if (category === "weather") {
    return <CloudSun aria-hidden className={className} />;
  }

  return <UserRound aria-hidden className={className} />;
}

export default function TriggerLibraryPage() {
  const [triggers, setTriggers] = useState<TriggerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<TriggerCategory | "all">("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const loadTriggers = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("poa_triggers")
      .select(
        `
          id,
          category,
          trigger_text,
          is_active,
          created_at,
          updated_at
        `,
      )
      .eq("is_active", true)
      .order("category", {
        ascending: true,
      })
      .order("trigger_text", {
        ascending: true,
      });

    if (error) {
      setPageError(error.message);
      setLoading(false);
      return;
    }

    setTriggers((data ?? []) as TriggerRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTriggers();
  }, [loadTriggers]);

  const filteredTriggers = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return triggers.filter((trigger) => {
      if (
        categoryFilter !== "all" &&
        trigger.category !== categoryFilter
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        trigger.trigger_text.toLowerCase().includes(search) ||
        categoryLabel(trigger.category)
          .toLowerCase()
          .includes(search)
      );
    });
  }, [categoryFilter, searchText, triggers]);

  const groupedTriggers = useMemo(() => {
    return CATEGORY_OPTIONS.map((category) => ({
      ...category,
      triggers: filteredTriggers.filter(
        (trigger) => trigger.category === category.value,
      ),
    })).filter(
      (group) =>
        categoryFilter === "all" ||
        group.value === categoryFilter,
    );
  }, [categoryFilter, filteredTriggers]);

  function openNewTrigger(category: TriggerCategory = "event") {
    setEditor({
      id: null,
      category,
      triggerText: "",
    });
    setMessage("");
    setPageError("");
    setShowEditor(true);
  }

  function openEditTrigger(trigger: TriggerRecord) {
    setEditor({
      id: trigger.id,
      category: trigger.category,
      triggerText: trigger.trigger_text,
    });
    setMessage("");
    setPageError("");
    setShowEditor(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setShowEditor(false);
    setEditor(EMPTY_EDITOR);
  }

  async function saveTrigger() {
    const triggerText = editor.triggerText.trim();

    if (!triggerText) {
      setPageError("Trigger text is required.");
      return;
    }

    setSaving(true);
    setPageError("");
    setMessage("");

    const supabase = createClient();

    try {
      if (editor.id) {
        const { error } = await supabase
          .from("poa_triggers")
          .update({
            category: editor.category,
            trigger_text: triggerText,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editor.id);

        if (error) {
          throw error;
        }

        setMessage("Trigger updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await supabase
          .from("poa_triggers")
          .insert({
            category: editor.category,
            trigger_text: triggerText,
            created_by: user?.id ?? null,
          });

        if (error) {
          throw error;
        }

        setMessage("Trigger added.");
      }

      setShowEditor(false);
      setEditor(EMPTY_EDITOR);

      await loadTriggers();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The trigger could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrigger(trigger: TriggerRecord) {
    const confirmed = window.confirm(
      `Delete "${trigger.trigger_text}"?\n\nThis will remove it from the active Trigger Library.`,
    );

    if (!confirmed) {
      return;
    }

    setPageError("");
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("poa_triggers")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", trigger.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    setMessage("Trigger deleted.");
    await loadTriggers();
  }

  const triggerCount = triggers.length;

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
            Build and manage reusable scenario triggers that can be inserted
            into practical-test flight scenarios.
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
            <span aria-hidden className="text-2xl leading-none">
              ?
            </span>
            <span>Questions</span>
          </Link>

          <Link
            href="/examiner/plan-of-action/scenarios"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-6 py-4 text-base font-bold text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
          >
            <span aria-hidden className="text-2xl leading-none">
              ✈
            </span>
            <span>Scenarios</span>
          </Link>

          <Link
            href="/examiner/plan-of-action/triggers"
            className="relative inline-flex min-h-[76px] items-center gap-3 rounded-t-xl border border-b-0 border-slate-300 bg-white px-6 py-4 text-base font-bold text-amber-800 shadow-sm transition"
          >
            <span aria-hidden className="text-2xl leading-none">
              ⚡
            </span>
            <span>Triggers</span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-amber-700" />
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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label
                htmlFor="trigger-search"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Search triggers
              </label>

              <div className="relative">
                <Search
                  aria-hidden
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="trigger-search"
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search trigger text…"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="trigger-category"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Category
              </label>

              <select
                id="trigger-category"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value as TriggerCategory | "all",
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              >
                <option value="all">All Categories</option>

                {CATEGORY_OPTIONS.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              openNewTrigger(
                categoryFilter === "all"
                  ? "event"
                  : categoryFilter,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-amber-700"
          >
            <Plus aria-hidden className="h-5 w-5" />
            Add Trigger
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span>
            {loading
              ? "Loading triggers…"
              : `${filteredTriggers.length} trigger${
                  filteredTriggers.length === 1 ? "" : "s"
                } shown`}
          </span>

          {!loading ? (
            <span>{triggerCount} total active</span>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          Loading Trigger Library…
        </section>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {groupedTriggers.map((group) => (
            <section
              key={group.value}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <CategoryIcon category={group.value} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      {group.label}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {group.triggers.length} trigger
                      {group.triggers.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openNewTrigger(group.value)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  Add
                </button>
              </div>

              {group.triggers.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No triggers in this category match the current search.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {group.triggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      className="group flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50"
                    >
                      <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-slate-800">
                        {trigger.trigger_text}
                      </p>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditTrigger(trigger)}
                          title="Edit trigger"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-amber-700"
                        >
                          <Pencil
                            aria-hidden
                            className="h-4 w-4"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteTrigger(trigger)}
                          title="Delete trigger"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-700"
                        >
                          <Trash2
                            aria-hidden
                            className="h-4 w-4"
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {showEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Trigger Library
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {editor.id ? "Edit Trigger" : "Add Trigger"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label
                  htmlFor="editor-category"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Category
                </label>

                <select
                  id="editor-category"
                  value={editor.category}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      category:
                        event.target.value as TriggerCategory,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="editor-trigger"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Trigger
                </label>

                <textarea
                  id="editor-trigger"
                  rows={4}
                  value={editor.triggerText}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      triggerText: event.target.value,
                    }))
                  }
                  placeholder="Describe the event or condition presented to the applicant…"
                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 leading-6 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveTrigger()}
                disabled={saving || !editor.triggerText.trim()}
                className="rounded-lg bg-amber-600 px-5 py-2.5 font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving
                  ? "Saving…"
                  : editor.id
                    ? "Save Changes"
                    : "Add Trigger"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
