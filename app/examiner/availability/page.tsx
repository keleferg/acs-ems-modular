"use client";

import { CalendarOff, Clock3, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WeeklyAvailability = {
  id: string | null;
  examiner_profile_id: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  notes: string;
};

type BlockedPeriod = {
  id: string;
  examiner_profile_id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  reason: string | null;
  internal_notes: string | null;
};

const HAWAII_TIME_ZONE = "Pacific/Honolulu";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function defaultWeek(profileId: string) {
  return dayNames.map((_, dayOfWeek): WeeklyAvailability => {
    const weekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    return {
      id: null,
      examiner_profile_id: profileId,
      day_of_week: dayOfWeek,
      is_available: weekday,
      start_time: weekday ? "08:00" : "",
      end_time: weekday ? "17:00" : "",
      notes: "",
    };
  });
}

function normalizeTime(value: string | null) {
  return value?.slice(0, 5) ?? "";
}

function hawaiiLocalToIso(value: string) {
  if (!value) return null;

  return new Date(`${value}:00-10:00`).toISOString();
}

function fullDayRange(date: string) {
  if (!date) return null;

  const start = new Date(`${date}T00:00:00-10:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toHawaiiDateTimeLocal(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HAWAII_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get(
    "hour",
  )}:${get("minute")}`;
}

function formatBlockedPeriod(period: BlockedPeriod) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: HAWAII_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: period.all_day ? undefined : "numeric",
    minute: period.all_day ? undefined : "2-digit",
  });

  if (period.all_day) {
    return formatter.format(new Date(period.starts_at));
  }

  return `${formatter.format(new Date(period.starts_at))} – ${formatter.format(
    new Date(period.ends_at),
  )}`;
}

export default function ExaminerAvailabilityPage() {
  const [profileId, setProfileId] = useState("");
  const [weekly, setWeekly] = useState<WeeklyAvailability[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockNotes, setBlockNotes] = useState("");

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "Your login session could not be verified. Please sign in again.",
      );
      setLoading(false);
      return;
    }

    setProfileId(user.id);

    const [weeklyResult, blockedResult] = await Promise.all([
      supabase
        .from("examiner_weekly_availability")
        .select(
          `
          id,
          examiner_profile_id,
          day_of_week,
          is_available,
          start_time,
          end_time,
          notes
        `,
        )
        .eq("examiner_profile_id", user.id)
        .order("day_of_week", { ascending: true }),

      supabase
        .from("examiner_blocked_periods")
        .select(
          `
          id,
          examiner_profile_id,
          starts_at,
          ends_at,
          all_day,
          reason,
          internal_notes
        `,
        )
        .eq("examiner_profile_id", user.id)
        .order("starts_at", { ascending: true }),
    ]);

    if (weeklyResult.error) {
      setErrorMessage(
        `Weekly availability could not be loaded: ${weeklyResult.error.message}`,
      );
      setWeekly(defaultWeek(user.id));
    } else {
      const defaults = defaultWeek(user.id);

      for (const row of weeklyResult.data ?? []) {
        defaults[row.day_of_week] = {
          id: row.id,
          examiner_profile_id: row.examiner_profile_id,
          day_of_week: row.day_of_week,
          is_available: row.is_available,
          start_time: normalizeTime(row.start_time),
          end_time: normalizeTime(row.end_time),
          notes: row.notes ?? "",
        };
      }

      setWeekly(defaults);
    }

    if (blockedResult.error) {
      setErrorMessage((current) =>
        [
          current,
          `Blocked periods could not be loaded: ${blockedResult.error.message}`,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setBlockedPeriods([]);
    } else {
      setBlockedPeriods((blockedResult.data ?? []) as BlockedPeriod[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  function updateWeekly(
    dayOfWeek: number,
    changes: Partial<WeeklyAvailability>,
  ) {
    setWeekly((current) =>
      current.map((day) =>
        day.day_of_week === dayOfWeek
          ? {
              ...day,
              ...changes,
            }
          : day,
      ),
    );

    setMessage("");
    setErrorMessage("");
  }

  async function saveWeeklyAvailability() {
    if (!profileId || savingWeek) return;

    for (const day of weekly) {
      if (
        day.is_available &&
        (!day.start_time || !day.end_time || day.end_time <= day.start_time)
      ) {
        setErrorMessage(
          `${dayNames[day.day_of_week]} must have a valid start and end time.`,
        );
        return;
      }
    }

    setSavingWeek(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const payload = weekly.map((day) => ({
      examiner_profile_id: profileId,
      day_of_week: day.day_of_week,
      is_available: day.is_available,
      start_time: day.is_available ? day.start_time : null,
      end_time: day.is_available ? day.end_time : null,
      notes: day.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("examiner_weekly_availability")
      .upsert(payload, {
        onConflict: "examiner_profile_id,day_of_week",
      })
      .select(
        `
        id,
        examiner_profile_id,
        day_of_week,
        is_available,
        start_time,
        end_time,
        notes
      `,
      )
      .order("day_of_week", { ascending: true });

    if (error) {
      setErrorMessage(
        `Weekly availability could not be saved: ${error.message}`,
      );
      setSavingWeek(false);
      return;
    }

    setWeekly(
      (data ?? []).map((row) => ({
        id: row.id,
        examiner_profile_id: row.examiner_profile_id,
        day_of_week: row.day_of_week,
        is_available: row.is_available,
        start_time: normalizeTime(row.start_time),
        end_time: normalizeTime(row.end_time),
        notes: row.notes ?? "",
      })),
    );

    setMessage("Weekly availability saved.");
    setSavingWeek(false);
  }

  async function addBlockedPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileId || savingBlock) return;

    let startsAt: string | null = null;
    let endsAt: string | null = null;

    if (blockAllDay) {
      const range = fullDayRange(blockDate);

      startsAt = range?.start ?? null;
      endsAt = range?.end ?? null;
    } else {
      startsAt = hawaiiLocalToIso(blockStart);
      endsAt = hawaiiLocalToIso(blockEnd);
    }

    if (!startsAt || !endsAt) {
      setErrorMessage(
        blockAllDay
          ? "Select the date to block."
          : "Enter the blocked start and end times.",
      );
      return;
    }

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setErrorMessage("The blocked end time must be after the start time.");
      return;
    }

    setSavingBlock(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("examiner_blocked_periods")
      .insert({
        examiner_profile_id: profileId,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: blockAllDay,
        reason: blockReason.trim() || null,
        internal_notes: blockNotes.trim() || null,
      })
      .select(
        `
        id,
        examiner_profile_id,
        starts_at,
        ends_at,
        all_day,
        reason,
        internal_notes
      `,
      )
      .single();

    if (error) {
      setErrorMessage(
        `The blocked period could not be added: ${error.message}`,
      );
      setSavingBlock(false);
      return;
    }

    setBlockedPeriods((current) =>
      [...current, data as BlockedPeriod].sort(
        (first, second) =>
          new Date(first.starts_at).getTime() -
          new Date(second.starts_at).getTime(),
      ),
    );

    setBlockDate("");
    setBlockStart("");
    setBlockEnd("");
    setBlockReason("");
    setBlockNotes("");
    setMessage("Blocked period added.");
    setSavingBlock(false);
  }

  async function deleteBlockedPeriod(periodId: string) {
    if (deletingBlockId) return;

    setDeletingBlockId(periodId);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("examiner_blocked_periods")
      .delete()
      .eq("id", periodId);

    if (error) {
      setErrorMessage(
        `The blocked period could not be deleted: ${error.message}`,
      );
      setDeletingBlockId("");
      return;
    }

    setBlockedPeriods((current) =>
      current.filter((period) => period.id !== periodId),
    );

    setMessage("Blocked period removed.");
    setDeletingBlockId("");
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Examiner Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Availability
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Set your recurring weekly working hours and block dates or times
            when practical tests cannot be scheduled.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void saveWeeklyAvailability()}
          disabled={loading || savingWeek}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <Save aria-hidden className="h-4 w-4" />
          {savingWeek ? "Saving…" : "Save Weekly Hours"}
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading availability…
        </div>
      ) : (
        <>
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <Clock3 aria-hidden className="h-5 w-5 text-amber-700" />

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Weekly Availability
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    All times are Hawaii Standard Time.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {weekly.map((day) => (
                <div
                  key={day.day_of_week}
                  className="grid gap-4 px-6 py-5 md:grid-cols-[160px_150px_1fr_1fr_1.5fr] md:items-center"
                >
                  <p className="font-bold text-slate-900">
                    {dayNames[day.day_of_week]}
                  </p>

                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={day.is_available}
                      onChange={(event) =>
                        updateWeekly(day.day_of_week, {
                          is_available: event.target.checked,
                          start_time: event.target.checked
                            ? day.start_time || "08:00"
                            : "",
                          end_time: event.target.checked
                            ? day.end_time || "17:00"
                            : "",
                        })
                      }
                      className="h-4 w-4"
                    />
                    Available
                  </label>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start
                    </label>

                    <input
                      type="time"
                      disabled={!day.is_available}
                      value={day.start_time}
                      onChange={(event) =>
                        updateWeekly(day.day_of_week, {
                          start_time: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      End
                    </label>

                    <input
                      type="time"
                      disabled={!day.is_available}
                      value={day.end_time}
                      onChange={(event) =>
                        updateWeekly(day.day_of_week, {
                          end_time: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </label>

                    <input
                      value={day.notes}
                      onChange={(event) =>
                        updateWeekly(day.day_of_week, {
                          notes: event.target.value,
                        })
                      }
                      placeholder="Optional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form
              onSubmit={addBlockedPeriod}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <CalendarOff aria-hidden className="h-5 w-5 text-amber-700" />

                <h2 className="text-xl font-bold text-slate-900">
                  Add Blocked Time
                </h2>
              </div>

              <label className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={blockAllDay}
                  onChange={(event) => setBlockAllDay(event.target.checked)}
                  className="h-4 w-4"
                />
                Block the full day
              </label>

              {blockAllDay ? (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Date
                  </label>

                  <input
                    type="date"
                    value={blockDate}
                    onChange={(event) => setBlockDate(event.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                  />
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Starts
                    </label>

                    <input
                      type="datetime-local"
                      value={blockStart}
                      onChange={(event) => setBlockStart(event.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Ends
                    </label>

                    <input
                      type="datetime-local"
                      value={blockEnd}
                      onChange={(event) => setBlockEnd(event.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Reason
                </label>

                <input
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  placeholder="Vacation, training, unavailable…"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Internal notes
                </label>

                <textarea
                  value={blockNotes}
                  onChange={(event) => setBlockNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              <button
                type="submit"
                disabled={savingBlock}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                <Plus aria-hidden className="h-4 w-4" />
                {savingBlock ? "Adding…" : "Add Blocked Time"}
              </button>
            </form>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Blocked Periods
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Existing blocked dates and unavailable periods.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                  {blockedPeriods.length}
                </span>
              </div>

              {blockedPeriods.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  No blocked periods have been added.
                </div>
              ) : (
                <div className="mt-6 divide-y divide-slate-200">
                  {blockedPeriods.map((period) => (
                    <div
                      key={period.id}
                      className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {period.reason?.trim() || "Unavailable"}
                          </p>

                          {period.all_day ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Full day
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm text-slate-700">
                          {formatBlockedPeriod(period)}
                        </p>

                        {period.internal_notes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">
                            {period.internal_notes}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => void deleteBlockedPeriod(period.id)}
                        disabled={Boolean(deletingBlockId)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                        {deletingBlockId === period.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
