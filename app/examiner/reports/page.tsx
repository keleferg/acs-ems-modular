"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Download,
  Printer,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type DatePreset =
  | "month"
  | "ytd"
  | "12m"
  | "24m"
  | "custom";

type PracticalTestRequest = {
  id: string;
  request_number: string | null;
  status: string | null;

  applicant_name_snapshot: string | null;

  certificate_sought: string | null;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string | null;

  flight_school_name_snapshot: string | null;

  instructor_name: string | null;

  aircraft_type_designator: string | null;
  aircraft_make: string | null;
  aircraft_model: string | null;
  aircraft_description: string | null;

  scheduled_start_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;

  source_system: string | null;
  legacy_status: string | null;
  legacy_finalized_datetime_text: string | null;
};

type PracticalTest = {
  id: string;
  practical_test_request_id: string;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  aircraft_used: string | null;
  evaluation_state: unknown;
};

type RequestInstructor = {
  practical_test_request_id: string;
  relationship_type: string | null;
  instructor_name_snapshot: string | null;
};

type ActivityRow = {
  requestId: string;
  date: Date | null;
  applicantName: string;
  rating: string;
  flightSchool: string;
  recommendingInstructor: string;
  aircraftType: string;
  groundDuration: string;
  flightDuration: string;
  outcome: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function display(
  value: unknown,
  fallback = "—",
) {
  return clean(value) || fallback;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function parseDateInput(value: string) {
  if (!value) return null;

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
  now: Date,
) {
  let start: Date;
  let end = endOfDay(now);

  if (preset === "month") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
  } else if (preset === "ytd") {
    start = new Date(
      now.getFullYear(),
      0,
      1,
    );
  } else if (preset === "12m") {
    start = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1,
    );
  } else if (preset === "24m") {
    start = new Date(
      now.getFullYear(),
      now.getMonth() - 23,
      1,
    );
  } else {
    const parsedStart =
      parseDateInput(customStart);

    const parsedEnd =
      parseDateInput(customEnd);

    start = parsedStart
      ? startOfDay(parsedStart)
      : new Date(
          now.getFullYear(),
          0,
          1,
        );

    end = parsedEnd
      ? endOfDay(parsedEnd)
      : endOfDay(now);
  }

  return {
    start,
    end,
  };
}

function inRange(
  date: Date | null,
  start: Date,
  end: Date,
) {
  if (!date) return false;

  const time = date.getTime();

  return (
    time >= start.getTime() &&
    time <= end.getTime()
  );
}

function parseLegacyFinalizedDate(
  value: string | null,
) {
  const text = clean(value);

  if (!text) return null;

  const direct = new Date(text);

  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?/i,
  );

  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  let hour = Number(match[4] || 0);
  const minute = Number(
    match[5] || 0,
  );

  const amPm = clean(
    match[6],
  ).toUpperCase();

  if (
    amPm === "PM" &&
    hour < 12
  ) {
    hour += 12;
  }

  if (
    amPm === "AM" &&
    hour === 12
  ) {
    hour = 0;
  }

  const parsed = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
  );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed;
}

function getActivityDate(
  request: PracticalTestRequest,
  test: PracticalTest | undefined,
) {
  const candidates = [
    test?.started_at,
    test?.completed_at,
    test?.submitted_at,
    request.scheduled_start_at,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const parsed = new Date(
      candidate,
    );

    if (
      !Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return parsed;
    }
  }

  const legacy =
    parseLegacyFinalizedDate(
      request
        .legacy_finalized_datetime_text,
    );

  if (legacy) {
    return legacy;
  }

  if (request.completed_at) {
    const parsed = new Date(
      request.completed_at,
    );

    if (
      !Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return parsed;
    }
  }

  return null;
}

function formatDate(
  date: Date | null,
) {
  if (!date) return "—";

  return date.toLocaleDateString(
    undefined,
    {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    },
  );
}

function formatOutcome(
  value: string | null,
) {
  switch (clean(value)) {
    case "pass":
      return "Pass";

    case "fail":
      return "Disapproved";

    case "discontinued":
    case "letter_of_discontinuance":
      return "Discontinued";

    case "no_show":
      return "No Show";

    default:
      return value
        ? clean(value)
            .replaceAll("_", " ")
            .replace(
              /\b\w/g,
              (letter) =>
                letter.toUpperCase(),
            )
        : "Outcome Unavailable";
  }
}

function getRatingLabel(
  request: PracticalTestRequest,
) {
  const pieces = [
    clean(
      request.certificate_sought,
    ),
    clean(
      request.category_sought,
    ),
    clean(
      request.class_sought,
    ),
    clean(
      request.rating_sought,
    ),
  ].filter(Boolean);

  return (
    [...new Set(pieces)].join(
      " — ",
    ) || "—"
  );
}

function getAircraftType(
  request: PracticalTestRequest,
  test: PracticalTest | undefined,
) {
  const finalized =
    clean(test?.aircraft_used);

  if (finalized) {
    return finalized;
  }

  const designator =
    clean(
      request
        .aircraft_type_designator,
    );

  if (designator) {
    return designator;
  }

  const makeModel = [
    clean(request.aircraft_make),
    clean(request.aircraft_model),
  ]
    .filter(Boolean)
    .join(" ");

  if (makeModel) {
    return makeModel;
  }

  return display(
    request.aircraft_description,
  );
}

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function nestedValue(
  root: unknown,
  path: string[],
) {
  let current: unknown = root;

  for (const key of path) {
    const record =
      asRecord(current);

    if (!record) {
      return undefined;
    }

    current = record[key];
  }

  return current;
}

function normalizeDuration(
  value: unknown,
) {
  const text = clean(value);

  if (!text) return "";

  const numeric = Number(
    text.replace(
      /[^0-9.-]/g,
      "",
    ),
  );

  if (
    Number.isFinite(numeric) &&
    numeric >= 0
  ) {
    return `${numeric.toFixed(
      1,
    )} hrs`;
  }

  return text;
}

function getEvaluationDuration(
  evaluationState: unknown,
  type: "ground" | "flight",
) {
  const keys =
    type === "ground"
      ? [
          "appGroundDuration",
          "groundDuration",
          "ground_duration",
        ]
      : [
          "appFlightDuration",
          "flightDuration",
          "flight_duration",
        ];

  const prefixes = [
    [] as string[],
    ["applicant"],
    ["applicantData"],
    ["applicant_data"],
    ["evaluation"],
    ["metadata"],
  ];

  for (
    const prefix of prefixes
  ) {
    for (const key of keys) {
      const value =
        nestedValue(
          evaluationState,
          [...prefix, key],
        );

      const duration =
        normalizeDuration(value);

      if (duration) {
        return duration;
      }
    }
  }

  return "—";
}

function csvEscape(value: unknown) {
  const text = String(
    value ?? "",
  );

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll(
      '"',
      '""',
    )}"`;
  }

  return text;
}

function outcomeClass(
  outcome: string,
) {
  if (outcome === "Pass") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    outcome === "Disapproved"
  ) {
    return "bg-red-100 text-red-800";
  }

  if (
    outcome === "Discontinued"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

export default function ExaminerReportsPage() {
  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [requests, setRequests] =
    useState<
      PracticalTestRequest[]
    >([]);

  const [
    practicalTests,
    setPracticalTests,
  ] = useState<
    PracticalTest[]
  >([]);

  const [
    requestInstructors,
    setRequestInstructors,
  ] = useState<
    RequestInstructor[]
  >([]);

  const [preset, setPreset] =
    useState<DatePreset>("ytd");

  const [today, setToday] =
    useState(
      () => new Date(0),
    );

  const [
    customStart,
    setCustomStart,
  ] = useState("1970-01-01");

  const [
    customEnd,
    setCustomEnd,
  ] = useState("1970-01-01");

  useEffect(() => {
    const now = new Date();

    setToday(now);

    setCustomStart(
      `${now.getFullYear()}-01-01`,
    );

    setCustomEnd(
      toDateInputValue(now),
    );
  }, []);

  const loadReport = useCallback(
    async () => {
      setLoading(true);
      setErrorMessage("");

      const supabase =
        createClient();

      try {
        const [
          requestResult,
          testResult,
          instructorResult,
        ] = await Promise.all([
          supabase
            .from(
              "practical_test_requests",
            )
            .select(
              `
                id,
                request_number,
                status,
                applicant_name_snapshot,
                certificate_sought,
                category_sought,
                class_sought,
                rating_sought,
                flight_school_name_snapshot,
                instructor_name,
                aircraft_type_designator,
                aircraft_make,
                aircraft_model,
                aircraft_description,
                scheduled_start_at,
                completed_at,
                submitted_at,
                source_system,
                legacy_status,
                legacy_finalized_datetime_text
              `,
            )
            .eq(
              "status",
              "completed",
            )
            .limit(10000),

          supabase
            .from(
              "practical_tests",
            )
            .select(
              `
                id,
                practical_test_request_id,
                result,
                started_at,
                completed_at,
                submitted_at,
                aircraft_used,
                evaluation_state
              `,
            )
            .limit(10000),

          supabase
            .from(
              "request_instructors",
            )
            .select(
              `
                practical_test_request_id,
                relationship_type,
                instructor_name_snapshot
              `,
            )
            .limit(10000),
        ]);

        const errors = [
          requestResult.error,
          testResult.error,
          instructorResult.error,
        ].filter(Boolean);

        if (errors.length) {
          throw new Error(
            errors
              .map(
                (error) =>
                  error?.message,
              )
              .filter(Boolean)
              .join(" • "),
          );
        }

        setRequests(
          (requestResult.data ??
            []) as PracticalTestRequest[],
        );

        setPracticalTests(
          (testResult.data ??
            []) as PracticalTest[],
        );

        setRequestInstructors(
          (instructorResult.data ??
            []) as RequestInstructor[],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The Activity Report could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const testByRequest =
    useMemo(
      () =>
        new Map(
          practicalTests.map(
            (test) => [
              test
                .practical_test_request_id,
              test,
            ],
          ),
        ),
      [practicalTests],
    );

  const instructorByRequest =
    useMemo(() => {
      const map = new Map<
        string,
        RequestInstructor
      >();

      requestInstructors.forEach(
        (row) => {
          const existing =
            map.get(
              row
                .practical_test_request_id,
            );

          if (
            !existing ||
            row.relationship_type ===
              "recommending_instructor"
          ) {
            map.set(
              row
                .practical_test_request_id,
              row,
            );
          }
        },
      );

      return map;
    }, [requestInstructors]);

  const allRows =
    useMemo<ActivityRow[]>(
      () =>
        requests.map(
          (request) => {
            const test =
              testByRequest.get(
                request.id,
              );

            const legacyInstructor =
              instructorByRequest.get(
                request.id,
              );

            const instructor =
              clean(
                request
                  .instructor_name,
              ) ||
              clean(
                legacyInstructor
                  ?.instructor_name_snapshot,
              ) ||
              "—";

            return {
              requestId:
                request.id,

              date:
                getActivityDate(
                  request,
                  test,
                ),

              applicantName:
                display(
                  request
                    .applicant_name_snapshot,
                ),

              rating:
                getRatingLabel(
                  request,
                ),

              flightSchool:
                display(
                  request
                    .flight_school_name_snapshot,
                ),

              recommendingInstructor:
                instructor,

              aircraftType:
                getAircraftType(
                  request,
                  test,
                ),

              groundDuration:
                getEvaluationDuration(
                  test
                    ?.evaluation_state,
                  "ground",
                ),

              flightDuration:
                getEvaluationDuration(
                  test
                    ?.evaluation_state,
                  "flight",
                ),

              outcome:
                formatOutcome(
                  test?.result ??
                    null,
                ),
            };
          },
        ),
      [
        requests,
        testByRequest,
        instructorByRequest,
      ],
    );

  const range = useMemo(
    () =>
      getRange(
        preset,
        customStart,
        customEnd,
        today,
      ),
    [
      preset,
      customStart,
      customEnd,
      today,
    ],
  );

  const rows = useMemo(
    () =>
      allRows
        .filter((row) =>
          inRange(
            row.date,
            range.start,
            range.end,
          ),
        )
        .sort((a, b) => {
          const aTime =
            a.date?.getTime() ?? 0;

          const bTime =
            b.date?.getTime() ?? 0;

          return bTime - aTime;
        }),
    [
      allRows,
      range,
    ],
  );

  function exportCsv() {
    const header = [
      "Date",
      "Applicant Name",
      "Rating",
      "Flight School",
      "Recommending Instructor",
      "Aircraft Type",
      "Ground Duration",
      "Flight Duration",
      "Outcome",
    ];

    const body = rows.map(
      (row) => [
        formatDate(row.date),
        row.applicantName,
        row.rating,
        row.flightSchool,
        row.recommendingInstructor,
        row.aircraftType,
        row.groundDuration,
        row.flightDuration,
        row.outcome,
      ],
    );

    const csv = [
      header,
      ...body,
    ]
      .map((line) =>
        line
          .map(csvEscape)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href = url;

    anchor.download =
      `DPE-Activity-Report-${toDateInputValue(
        range.start,
      )}-to-${toDateInputValue(
        range.end,
      )}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-800">
            <BarChart3
              aria-hidden
              className="h-6 w-6"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Reports
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Generate examiner
              activity, practical-test,
              scheduling, and financial
              reports.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadReport()
          }
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 print:hidden">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6 print:border-0 print:px-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-amber-700 print:hidden" />

                <h2 className="text-xl font-bold text-slate-900">
                  Activity Report
                </h2>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Completed practical
                tests from{" "}
                {range.start.toLocaleDateString()}{" "}
                through{" "}
                {range.end.toLocaleDateString()}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={exportCsv}
                disabled={
                  rows.length === 0
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 print:hidden">
            {(
              [
                [
                  "month",
                  "Month",
                ],
                ["ytd", "YTD"],
                [
                  "12m",
                  "Last 12 Months",
                ],
                [
                  "24m",
                  "Last 24 Months",
                ],
                [
                  "custom",
                  "Custom",
                ],
              ] as Array<
                [
                  DatePreset,
                  string,
                ]
              >
            ).map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPreset(
                      value,
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-bold ${
                    preset ===
                    value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {preset ===
          "custom" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 print:hidden">
              <label className="text-sm font-semibold text-slate-700">
                Start Date

                <div className="mt-1 flex w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <input
                    type="date"
                    value={
                      customStart
                    }
                    onChange={(
                      event,
                    ) =>
                      setCustomStart(
                        event
                          .target
                          .value,
                      )
                    }
                    className="block w-full min-w-0 border-0 bg-transparent p-0 text-base"
                  />
                </div>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                End Date

                <div className="mt-1 flex w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <input
                    type="date"
                    value={
                      customEnd
                    }
                    onChange={(
                      event,
                    ) =>
                      setCustomEnd(
                        event
                          .target
                          .value,
                      )
                    }
                    className="block w-full min-w-0 border-0 bg-transparent p-0 text-base"
                  />
                </div>
              </label>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-5 text-sm">
            <div>
              <span className="text-slate-500">
                Total Tests
              </span>

              <span className="ml-2 font-bold text-slate-900">
                {rows.length}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Pass
              </span>

              <span className="ml-2 font-bold text-emerald-700">
                {
                  rows.filter(
                    (row) =>
                      row.outcome ===
                      "Pass",
                  ).length
                }
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Disapproved
              </span>

              <span className="ml-2 font-bold text-red-700">
                {
                  rows.filter(
                    (row) =>
                      row.outcome ===
                      "Disapproved",
                  ).length
                }
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-600">
            Loading Activity
            Report…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Applicant Name
                  </th>

                  <th className="px-4 py-3">
                    Rating
                  </th>

                  <th className="px-4 py-3">
                    Flight School
                  </th>

                  <th className="px-4 py-3">
                    Recommending
                    Instructor
                  </th>

                  <th className="px-4 py-3">
                    Aircraft Type
                  </th>

                  <th className="whitespace-nowrap px-4 py-3">
                    Ground Duration
                  </th>

                  <th className="whitespace-nowrap px-4 py-3">
                    Flight Duration
                  </th>

                  <th className="px-4 py-3">
                    Outcome
                  </th>

                  <th className="px-4 py-3 text-right">
                    Record
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(
                  (row) => (
                    <tr
                      key={
                        row.requestId
                      }
                      className="align-top text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {formatDate(
                          row.date,
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {
                          row.applicantName
                        }
                      </td>

                      <td className="min-w-48 px-4 py-3">
                        {row.rating}
                      </td>

                      <td className="min-w-44 px-4 py-3">
                        {
                          row.flightSchool
                        }
                      </td>

                      <td className="min-w-44 px-4 py-3">
                        {
                          row.recommendingInstructor
                        }
                      </td>

                      <td className="min-w-36 px-4 py-3">
                        {
                          row.aircraftType
                        }
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {
                          row.groundDuration
                        }
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {
                          row.flightDuration
                        }
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${outcomeClass(
                            row.outcome,
                          )}`}
                        >
                          {
                            row.outcome
                          }
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`/examiner/historical-records?request=${row.requestId}`}
                          className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Record
                        </Link>
                      </td>
                    </tr>
                  ),
                )}

                {!rows.length ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      No completed
                      practical tests
                      match the selected
                      date range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          aside,
          nav,
          header {
            display: none !important;
          }

          main {
            max-width: none !important;
            padding: 0 !important;
          }

          table {
            font-size: 9px !important;
          }

          th,
          td {
            padding: 6px !important;
          }

          @page {
            size: landscape;
            margin: 0.4in;
          }
        }
      `}</style>
    </main>
  );
}
