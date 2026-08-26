"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CalendarRequest = {
  id: string;
  request_number: string;
  status: string;
  applicant_name_snapshot: string;
  certificate_sought: string;
  rating_sought: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
  oral_test_location: string | null;
  flight_airport_code: string | null;
  dms_preapproval_number: string | null;
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

const closedStatuses = new Set([
  "completed",
  "declined",
  "cancelled",
  "cancelled_by_applicant",
  "cancelled_by_examiner",
  "no_show",
]);

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "scheduled":
      return "border-sky-200 bg-sky-50 text-sky-800";

    case "accepted":
    case "scheduling":
      return "border-amber-200 bg-amber-50 text-amber-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getHawaiiDateParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HAWAII_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
  };
}

function getHawaiiDateKey(value: string | Date) {
  const parts = getHawaiiDateParts(value);

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function formatAppointmentTime(value: string | null) {
  if (!value) return "Time not entered";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAWAII_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAppointmentDateTime(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAWAII_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMonthTitle(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function getLocation(request: CalendarRequest) {
  return (
    request.scheduled_location?.trim() ||
    request.oral_test_location?.trim() ||
    request.flight_airport_code?.trim() ||
    "Location not entered"
  );
}

function getHoursUntilAppointment(
  request: CalendarRequest,
  nowMilliseconds: number,
) {
  if (!request.scheduled_start_at) return null;

  const appointmentMilliseconds = new Date(
    request.scheduled_start_at,
  ).getTime();

  if (Number.isNaN(appointmentMilliseconds)) {
    return null;
  }

  return (appointmentMilliseconds - nowMilliseconds) / (1000 * 60 * 60);
}

function needsDmsAttention(request: CalendarRequest, nowMilliseconds: number) {
  if (
    !request.scheduled_start_at ||
    closedStatuses.has(request.status) ||
    request.dms_preapproval_number?.trim()
  ) {
    return false;
  }

  const hoursUntilAppointment = getHoursUntilAppointment(
    request,
    nowMilliseconds,
  );

  return (
    hoursUntilAppointment !== null &&
    hoursUntilAppointment >= 0 &&
    hoursUntilAppointment <= 72
  );
}

function formatBlockedTime(period: BlockedPeriod) {
  if (period.all_day) {
    return "All day";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: HAWAII_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(period.starts_at))} – ${formatter.format(
    new Date(period.ends_at),
  )}`;
}

function getBlockedPeriodDateKeys(period: BlockedPeriod) {
  const keys: string[] = [];

  const startParts = getHawaiiDateParts(period.starts_at);
  const endParts = getHawaiiDateParts(
    new Date(new Date(period.ends_at).getTime() - 1),
  );

  const current = new Date(
    Date.UTC(startParts.year, startParts.month - 1, startParts.day),
  );

  const final = new Date(
    Date.UTC(endParts.year, endParts.month - 1, endParts.day),
  );

  while (current.getTime() <= final.getTime()) {
    keys.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return keys;
}

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));

  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));

  const leadingDays = firstDay.getUTCDay();
  const daysInMonth = lastDay.getUTCDate();

  const days: Array<{
    date: Date;
    inCurrentMonth: boolean;
    key: string;
  }> = [];

  for (let offset = leadingDays; offset > 0; offset -= 1) {
    const date = new Date(Date.UTC(year, monthIndex, 1 - offset));

    days.push({
      date,
      inCurrentMonth: false,
      key: date.toISOString().slice(0, 10),
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day));

    days.push({
      date,
      inCurrentMonth: true,
      key: date.toISOString().slice(0, 10),
    });
  }

  while (days.length % 7 !== 0) {
    const previousDate = days[days.length - 1].date;

    const date = new Date(previousDate.getTime() + 24 * 60 * 60 * 1000);

    days.push({
      date,
      inCurrentMonth: false,
      key: date.toISOString().slice(0, 10),
    });
  }

  return days;
}

export default function ExaminerCalendarPage() {
  const [requests, setRequests] = useState<CalendarRequest[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [clock, setClock] = useState(0);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [visibleYear, setVisibleYear] = useState(0);
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);

  const loadCalendar = useCallback(async () => {
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

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", user.id)
      .in("role", ["examiner", "administrator"]);

    if (roleError) {
      setPageError(
        `Your examiner access could not be verified: ${roleError.message}`,
      );
      setLoading(false);
      return;
    }

    if (!roleRows || roleRows.length === 0) {
      setPageError("Examiner or administrator access is required.");
      setLoading(false);
      return;
    }

    const [requestResult, blockedResult] = await Promise.all([
      supabase
        .from("practical_test_requests")
        .select(
          `
            id,
            request_number,
            status,
            applicant_name_snapshot,
            certificate_sought,
            rating_sought,
            scheduled_start_at,
            scheduled_end_at,
            scheduled_location,
            oral_test_location,
            flight_airport_code,
            dms_preapproval_number
          `,
        )
        .not("scheduled_start_at", "is", null)
        .order("scheduled_start_at", {
          ascending: true,
        }),

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
        .order("starts_at", {
          ascending: true,
        }),
    ]);

    if (requestResult.error) {
      setPageError(
        `Calendar appointments could not be loaded: ${requestResult.error.message}`,
      );
      setRequests([]);
    } else {
      const rows = (requestResult.data ?? []) as CalendarRequest[];

      setRequests(
        rows.filter((request) => !closedStatuses.has(request.status)),
      );
    }

    if (blockedResult.error) {
      setPageError((current) =>
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

    setClock(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    const now = new Date();
    const hawaiiParts = getHawaiiDateParts(now);

    setVisibleYear(hawaiiParts.year);
    setVisibleMonthIndex(hawaiiParts.month - 1);
    setSelectedDateKey(getHawaiiDateKey(now));
    setClock(Date.now());

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const todayKey = useMemo(
    () => (clock ? getHawaiiDateKey(new Date(clock)) : ""),
    [clock],
  );

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, CalendarRequest[]> = {};

    for (const request of requests) {
      if (!request.scheduled_start_at) {
        continue;
      }

      const key = getHawaiiDateKey(request.scheduled_start_at);

      grouped[key] ??= [];
      grouped[key].push(request);
    }

    return grouped;
  }, [requests]);

  const blockedPeriodsByDate = useMemo(() => {
    const grouped: Record<string, BlockedPeriod[]> = {};

    for (const period of blockedPeriods) {
      for (const key of getBlockedPeriodDateKeys(period)) {
        grouped[key] ??= [];
        grouped[key].push(period);
      }
    }

    return grouped;
  }, [blockedPeriods]);

  const calendarDays = useMemo(() => {
    if (!visibleYear) return [];

    return getCalendarDays(visibleYear, visibleMonthIndex);
  }, [visibleMonthIndex, visibleYear]);

  const selectedDateAppointments = useMemo(() => {
    if (!selectedDateKey) return [];

    return appointmentsByDate[selectedDateKey] ?? [];
  }, [appointmentsByDate, selectedDateKey]);

  const selectedDateBlockedPeriods = useMemo(() => {
    if (!selectedDateKey) return [];

    return blockedPeriodsByDate[selectedDateKey] ?? [];
  }, [blockedPeriodsByDate, selectedDateKey]);

  const upcomingAppointments = useMemo(() => {
    if (!clock) return [];

    return requests
      .filter((request) => {
        if (!request.scheduled_start_at) {
          return false;
        }

        return new Date(request.scheduled_start_at).getTime() >= clock;
      })
      .slice(0, 8);
  }, [clock, requests]);

  function moveMonth(direction: number) {
    const next = new Date(
      Date.UTC(visibleYear, visibleMonthIndex + direction, 1),
    );

    setVisibleYear(next.getUTCFullYear());
    setVisibleMonthIndex(next.getUTCMonth());
    setSelectedDateKey(null);
  }

  function goToToday() {
    const now = new Date();
    const parts = getHawaiiDateParts(now);

    setVisibleYear(parts.year);
    setVisibleMonthIndex(parts.month - 1);
    setSelectedDateKey(getHawaiiDateKey(now));
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Examiner Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">Calendar</h1>

          <p className="mt-2 text-slate-600">
            Review scheduled and confirmed practical-test appointments.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/examiner/availability"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-800 hover:bg-amber-100"
          >
            <CalendarOff aria-hidden className="h-4 w-4" />
            Manage Availability
          </Link>

          <button
            type="button"
            onClick={() => void loadCalendar()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays aria-hidden className="h-6 w-6 text-amber-700" />

              <h2 className="text-xl font-bold text-slate-900">
                {visibleYear
                  ? formatMonthTitle(visibleYear, visibleMonthIndex)
                  : "Loading calendar…"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft aria-hidden className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              >
                <ChevronRight aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const appointments = appointmentsByDate[day.key] ?? [];
              const dayBlockedPeriods = blockedPeriodsByDate[day.key] ?? [];

              const selected = selectedDateKey === day.key;

              const today = todayKey === day.key;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDateKey(day.key)}
                  className={`min-h-28 border-b border-r border-slate-200 p-2 text-left transition hover:bg-amber-50 ${
                    selected
                      ? "bg-amber-50 ring-2 ring-inset ring-amber-400"
                      : "bg-white"
                  } ${day.inCurrentMonth ? "" : "text-slate-400"}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        today ? "bg-amber-500 text-slate-950" : ""
                      }`}
                    >
                      {day.date.getUTCDate()}
                    </span>

                    <div className="flex items-center gap-1">
                      {dayBlockedPeriods.length > 0 ? (
                        <span
                          title={`${dayBlockedPeriods.length} blocked period${
                            dayBlockedPeriods.length === 1 ? "" : "s"
                          }`}
                          className="rounded-full bg-red-700 px-2 py-0.5 text-xs font-bold text-white"
                        >
                          {dayBlockedPeriods.length}
                        </span>
                      ) : null}

                      {appointments.length > 0 ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                          {appointments.length}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayBlockedPeriods.slice(0, 1).map((period) => (
                      <div
                        key={period.id}
                        className="truncate rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-900"
                      >
                        {period.all_day
                          ? "Unavailable"
                          : formatBlockedTime(period)}
                      </div>
                    ))}
                    {appointments.slice(0, 2).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="truncate rounded bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900"
                      >
                        {formatAppointmentTime(appointment.scheduled_start_at)}{" "}
                        · {appointment.applicant_name_snapshot}
                      </div>
                    ))}

                    {appointments.length > 2 ? (
                      <p className="px-1 text-xs font-semibold text-slate-500">
                        +{appointments.length - 2} more
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {selectedDateKey
                ? new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${selectedDateKey}T12:00:00Z`))
                : "Select a date"}
            </h2>

            {selectedDateKey &&
            selectedDateAppointments.length === 0 &&
            selectedDateBlockedPeriods.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No practical tests or blocked periods are recorded for this
                date.
              </p>
            ) : null}

            {selectedDateBlockedPeriods.length > 0 ? (
              <div className="mt-4 space-y-3">
                {selectedDateBlockedPeriods.map((period) => (
                  <div
                    key={period.id}
                    className="rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold text-red-900">
                        {period.reason?.trim() || "Unavailable"}
                      </p>

                      <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-800">
                        {formatBlockedTime(period)}
                      </span>
                    </div>

                    {period.internal_notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-red-800">
                        {period.internal_notes}
                      </p>
                    ) : null}

                    <Link
                      href="/examiner/availability"
                      className="mt-3 inline-flex text-xs font-bold text-red-800 hover:underline"
                    >
                      Edit availability
                    </Link>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {selectedDateAppointments.map((request) => (
                <Link
                  key={request.id}
                  href={`/examiner/requests?request=${request.id}`}
                  className="block rounded-xl border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {request.applicant_name_snapshot}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {request.certificate_sought} · {request.rating_sought}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                        request.status,
                      )}`}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Clock3 aria-hidden className="h-4 w-4 text-slate-400" />

                      {formatAppointmentTime(request.scheduled_start_at)}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin aria-hidden className="h-4 w-4 text-slate-400" />

                      {getLocation(request)}
                    </p>
                  </div>

                  {needsDmsAttention(request, clock) ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                      <AlertTriangle aria-hidden className="h-4 w-4" />
                      DMS preapproval required
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs text-slate-500">
                    {request.request_number}
                  </p>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Upcoming</h2>

              <span className="text-sm font-semibold text-slate-500">
                {upcomingAppointments.length}
              </span>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-slate-500">
                Loading appointments…
              </p>
            ) : null}

            {!loading && upcomingAppointments.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No upcoming appointments are scheduled.
              </p>
            ) : null}

            <div className="mt-4 divide-y divide-slate-200">
              {upcomingAppointments.map((request) => (
                <Link
                  key={request.id}
                  href={`/examiner/requests?request=${request.id}`}
                  className="block py-4 first:pt-0 last:pb-0"
                >
                  <p className="font-semibold text-slate-900">
                    {request.applicant_name_snapshot}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {formatAppointmentDateTime(request.scheduled_start_at)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {getLocation(request)}
                  </p>

                  {needsDmsAttention(request, clock) ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-700">
                      <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
                      DMS missing
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
