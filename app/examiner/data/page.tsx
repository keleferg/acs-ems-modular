"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Database,
  Filter,
  GraduationCap,
  MapPin,
  RefreshCw,
  School,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
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

type ComparisonMode =
  | "instructor"
  | "school"
  | "state"
  | "rating";

type PracticalTestRequest = {
  id: string;
  request_number: string | null;
  status: string | null;

  certificate_sought: string | null;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string | null;
  issuance_type: string | null;

  flight_school_name_snapshot: string | null;

  instructor_name: string | null;
  instructor_email: string | null;

  assigned_examiner_profile_id: string | null;

  scheduled_start_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;

  flight_airport_id: string | null;
  flight_airport_code: string | null;
  flight_airport_icao: string | null;
  flight_airport_name: string | null;

  preferred_location_id: string | null;
  preferred_location_other: string | null;

  source_system: string | null;
  legacy_status: string | null;
  legacy_location_text: string | null;
  legacy_finalized_datetime_text: string | null;
};

type PracticalTest = {
  id: string;
  practical_test_request_id: string;
  examiner_profile_id: string | null;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type PracticalTestGrade = {
  practical_test_id: string;
  task_code: string;
  grade_component: "K" | "R" | "S";
  grade_value: "NP" | "1" | "2" | "3" | "4";
};

type Airport = {
  id: string;
  faa_identifier: string | null;
  icao_identifier: string | null;
  airport_name: string | null;
  state_code: string | null;
  state_name: string | null;
};

type TestLocation = {
  id: string;
  code: string | null;
  name: string | null;
};

type RequestInstructor = {
  practical_test_request_id: string;
  relationship_type: string | null;
  instructor_name_snapshot: string | null;
  instructor_email_snapshot: string | null;
};

type AnalyticsTest = {
  requestId: string;
  practicalTestId: string | null;
  date: Date | null;

  certificate: string;
  rating: string;
  ratingLabel: string;
  school: string;
  instructor: string;

  stateCode: string;
  stateName: string;

  outcome: string;
  outcomeLabel: string;

  hasEmtEvaluation: boolean;
};

type TaskSummary = {
  taskCode: string;
  evaluations: number;
  average: number | null;
  kAverage: number | null;
  rAverage: number | null;
  sAverage: number | null;
  grade1: number;
  grade2: number;
  grade3: number;
  grade4: number;
  np: number;
  lowGradeRate: number;
};

type ComparisonRow = {
  key: string;
  label: string;
  tests: number;
  averageGrade: number | null;
  passRate: number | null;
  priorAverageGrade: number | null;
  trend: number | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function display(value: unknown, fallback = "Unknown") {
  const text = clean(value);
  return text || fallback;
}

function parseNumericGrade(value: string | null | undefined) {
  const numeric = Number(value);

  if (
    Number.isFinite(numeric) &&
    numeric >= 1 &&
    numeric <= 4
  ) {
    return numeric;
  }

  return null;
}

function average(values: number[]) {
  if (!values.length) return null;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function formatAverage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatSigned(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (Math.abs(value) < 0.005) {
    return "0.00";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
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

  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLegacyFinalizedDate(value: string | null) {
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
  const minute = Number(match[5] || 0);
  const amPm = clean(match[6]).toUpperCase();

  if (amPm === "PM" && hour < 12) hour += 12;
  if (amPm === "AM" && hour === 12) hour = 0;

  const parsed = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
  );

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
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
    start = new Date(now.getFullYear(), 0, 1);
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
      : new Date(now.getFullYear(), 0, 1);

    end = parsedEnd
      ? endOfDay(parsedEnd)
      : endOfDay(now);
  }

  const duration =
    end.getTime() - start.getTime() + 1;

  const priorEnd = new Date(
    start.getTime() - 1,
  );

  const priorStart = new Date(
    priorEnd.getTime() - duration + 1,
  );

  return {
    start,
    end,
    priorStart,
    priorEnd,
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

function getOutcomeLabel(result: string) {
  switch (result) {
    case "pass":
      return "Pass";

    case "fail":
      return "Disapproved";

    case "discontinued":
    case "letter_of_discontinuance":
      return "Discontinued";

    case "no_show":
      return "No Show";

    case "unknown":
      return "Outcome Unavailable";

    default:
      return result
        ? result
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) =>
              letter.toUpperCase(),
            )
        : "Outcome Unavailable";
  }
}

function getRatingLabel(
  request: PracticalTestRequest,
) {
  const pieces = [
    clean(request.certificate_sought),
    clean(request.category_sought),
    clean(request.class_sought),
    clean(request.rating_sought),
  ].filter(Boolean);

  return [...new Set(pieces)].join(" — ") || "Unknown";
}

function getTestDate(
  request: PracticalTestRequest,
  practicalTest: PracticalTest | undefined,
) {
  const candidates = [
    practicalTest?.started_at,
    practicalTest?.completed_at,
    practicalTest?.submitted_at,
    request.scheduled_start_at,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const parsed = new Date(candidate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const legacy =
    parseLegacyFinalizedDate(
      request.legacy_finalized_datetime_text,
    );

  if (legacy) return legacy;

  if (request.completed_at) {
    const parsed = new Date(request.completed_at);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function normalizeAirportToken(value: string | null) {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function resolveAirport(
  request: PracticalTestRequest,
  airportById: Map<string, Airport>,
  airportByCode: Map<string, Airport>,
  locationById: Map<string, TestLocation>,
) {
  if (request.flight_airport_id) {
    const exact = airportById.get(
      request.flight_airport_id,
    );

    if (exact) return exact;
  }

  const directCodes = [
    request.flight_airport_code,
    request.flight_airport_icao,
  ];

  for (const code of directCodes) {
    const normalized =
      normalizeAirportToken(code);

    if (!normalized) continue;

    const found = airportByCode.get(normalized);

    if (found) return found;
  }

  if (request.preferred_location_id) {
    const location = locationById.get(
      request.preferred_location_id,
    );

    const code = normalizeAirportToken(
      location?.code ?? null,
    );

    if (code) {
      const found = airportByCode.get(code);

      if (found) return found;
    }
  }

  const fallbackText = [
    request.legacy_location_text,
    request.preferred_location_other,
    request.flight_airport_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (fallbackText) {
    for (const [code, airport] of airportByCode) {
      if (
        code.length >= 3 &&
        new RegExp(`\\b${code}\\b`).test(
          fallbackText,
        )
      ) {
        return airport;
      }
    }
  }

  return undefined;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString(
    undefined,
    {
      month: "short",
      year: "2-digit",
    },
  );
}

function TrendBadge({
  value,
}: {
  value: number | null;
}) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return (
      <span className="text-xs font-semibold text-slate-400">
        —
      </span>
    );
  }

  if (Math.abs(value) < 0.005) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
        No change
      </span>
    );
  }

  const improving = value > 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        improving
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {improving ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}

      {formatSigned(value)}
    </span>
  );
}

function HorizontalBar({
  label,
  value,
  max,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
}) {
  const width =
    max > 0 ? Math.max(2, (value / max) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-slate-700">
          {label}
        </span>

        <span className="shrink-0 font-bold text-slate-900">
          {detail ?? value}
        </span>
      </div>

      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function ExaminerDataPage() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [requests, setRequests] = useState<
    PracticalTestRequest[]
  >([]);
  const [practicalTests, setPracticalTests] =
    useState<PracticalTest[]>([]);
  const [grades, setGrades] = useState<
    PracticalTestGrade[]
  >([]);
  const [airports, setAirports] = useState<
    Airport[]
  >([]);
  const [locations, setLocations] = useState<
    TestLocation[]
  >([]);
  const [requestInstructors, setRequestInstructors] =
    useState<RequestInstructor[]>([]);

  const [preset, setPreset] =
    useState<DatePreset>("ytd");

  const [today, setToday] = useState(
    () => new Date(0),
  );

  const [customStart, setCustomStart] =
    useState("1970-01-01");

  const [customEnd, setCustomEnd] =
    useState("1970-01-01");

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

  const router = useRouter();

  const [ratingFilter, setRatingFilter] =
    useState("");
  const [instructorFilter, setInstructorFilter] =
    useState("");
  const [schoolFilter, setSchoolFilter] =
    useState("");
  const [stateFilter, setStateFilter] =
    useState("");
  const [outcomeFilter, setOutcomeFilter] =
    useState("");

  const [selectedTask, setSelectedTask] =
    useState("");
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("instructor");

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const supabase = createClient();

    try {
      const [
        requestResult,
        testResult,
        gradeResult,
        airportResult,
        locationResult,
        instructorResult,
      ] = await Promise.all([
        supabase
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
              flight_school_name_snapshot,
              instructor_name,
              instructor_email,
              assigned_examiner_profile_id,
              scheduled_start_at,
              completed_at,
              submitted_at,
              flight_airport_id,
              flight_airport_code,
              flight_airport_icao,
              flight_airport_name,
              preferred_location_id,
              preferred_location_other,
              source_system,
              legacy_status,
              legacy_location_text,
              legacy_finalized_datetime_text
            `,
          )
          .eq("status", "completed")
          .limit(10000),

        supabase
          .from("practical_tests")
          .select(
            `
              id,
              practical_test_request_id,
              examiner_profile_id,
              result,
              started_at,
              completed_at,
              submitted_at,
              created_at
            `,
          )
          .limit(10000),

        supabase
          .from("practical_test_grades")
          .select(
            `
              practical_test_id,
              task_code,
              grade_component,
              grade_value
            `,
          )
          .limit(50000),

        supabase
          .from("faa_airports")
          .select(
            `
              id,
              faa_identifier,
              icao_identifier,
              airport_name,
              state_code,
              state_name
            `,
          )
          .eq("is_active", true)
          .limit(20000),

        supabase
          .from("test_locations")
          .select("id, code, name")
          .limit(1000),

        supabase
          .from("request_instructors")
          .select(
            `
              practical_test_request_id,
              relationship_type,
              instructor_name_snapshot,
              instructor_email_snapshot
            `,
          )
          .limit(10000),
      ]);

      const failures = [
        requestResult.error,
        testResult.error,
        gradeResult.error,
        airportResult.error,
        locationResult.error,
        instructorResult.error,
      ].filter(Boolean);

      if (failures.length) {
        throw new Error(
          failures
            .map((error) => error?.message)
            .filter(Boolean)
            .join(" • "),
        );
      }

      setRequests(
        (requestResult.data ?? []) as PracticalTestRequest[],
      );

      setPracticalTests(
        (testResult.data ?? []) as PracticalTest[],
      );

      setGrades(
        (gradeResult.data ?? []) as PracticalTestGrade[],
      );

      setAirports(
        (airportResult.data ?? []) as Airport[],
      );

      setLocations(
        (locationResult.data ?? []) as TestLocation[],
      );

      setRequestInstructors(
        (instructorResult.data ??
          []) as RequestInstructor[],
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The analytics data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const practicalTestByRequest = useMemo(
    () =>
      new Map(
        practicalTests.map((test) => [
          test.practical_test_request_id,
          test,
        ]),
      ),
    [practicalTests],
  );

  const airportById = useMemo(
    () =>
      new Map(
        airports.map((airport) => [
          airport.id,
          airport,
        ]),
      ),
    [airports],
  );

  const airportByCode = useMemo(() => {
    const map = new Map<string, Airport>();

    airports.forEach((airport) => {
      [
        airport.faa_identifier,
        airport.icao_identifier,
      ].forEach((raw) => {
        const code =
          normalizeAirportToken(raw);

        if (code) {
          map.set(code, airport);
        }
      });
    });

    return map;
  }, [airports]);

  const locationById = useMemo(
    () =>
      new Map(
        locations.map((location) => [
          location.id,
          location,
        ]),
      ),
    [locations],
  );

  const instructorByRequest = useMemo(() => {
    const map = new Map<
      string,
      RequestInstructor
    >();

    requestInstructors.forEach((row) => {
      const existing = map.get(
        row.practical_test_request_id,
      );

      if (
        !existing ||
        row.relationship_type ===
          "recommending_instructor"
      ) {
        map.set(
          row.practical_test_request_id,
          row,
        );
      }
    });

    return map;
  }, [requestInstructors]);

  const analyticsTests = useMemo<AnalyticsTest[]>(
    () =>
      requests.map((request) => {
        const practicalTest =
          practicalTestByRequest.get(request.id);

        const airport = resolveAirport(
          request,
          airportById,
          airportByCode,
          locationById,
        );

        const legacyInstructor =
          instructorByRequest.get(request.id);

        const instructor =
          clean(request.instructor_name) ||
          clean(
            legacyInstructor?.instructor_name_snapshot,
          ) ||
          "Unknown";

        const result =
          clean(practicalTest?.result) ||
          "unknown";

        return {
          requestId: request.id,
          practicalTestId:
            practicalTest?.id ?? null,
          date: getTestDate(
            request,
            practicalTest,
          ),

          certificate: display(
            request.certificate_sought,
          ),

          rating: display(
            request.rating_sought,
          ),

          ratingLabel:
            getRatingLabel(request),

          school: display(
            request.flight_school_name_snapshot,
          ),

          instructor,

          stateCode: display(
            airport?.state_code,
          ),

          stateName: display(
            airport?.state_name,
          ),

          outcome: result,

          outcomeLabel:
            getOutcomeLabel(result),

          hasEmtEvaluation: Boolean(
            practicalTest?.id,
          ),
        };
      }),
    [
      requests,
      practicalTestByRequest,
      airportById,
      airportByCode,
      locationById,
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
    [preset, customStart, customEnd, today],
  );

  const filterWithoutDate = useCallback(
    (test: AnalyticsTest) => {
      if (
        ratingFilter &&
        test.ratingLabel !== ratingFilter
      ) {
        return false;
      }

      if (
        instructorFilter &&
        test.instructor !== instructorFilter
      ) {
        return false;
      }

      if (
        schoolFilter &&
        test.school !== schoolFilter
      ) {
        return false;
      }

      if (
        stateFilter &&
        test.stateName !== stateFilter
      ) {
        return false;
      }

      if (
        outcomeFilter &&
        test.outcome !== outcomeFilter
      ) {
        return false;
      }

      return true;
    },
    [
      ratingFilter,
      instructorFilter,
      schoolFilter,
      stateFilter,
      outcomeFilter,
    ],
  );

  const currentTests = useMemo(
    () =>
      analyticsTests.filter(
        (test) =>
          filterWithoutDate(test) &&
          inRange(
            test.date,
            range.start,
            range.end,
          ),
      ),
    [
      analyticsTests,
      filterWithoutDate,
      range,
    ],
  );

  const priorTests = useMemo(
    () =>
      analyticsTests.filter(
        (test) =>
          filterWithoutDate(test) &&
          inRange(
            test.date,
            range.priorStart,
            range.priorEnd,
          ),
      ),
    [
      analyticsTests,
      filterWithoutDate,
      range,
    ],
  );

  const currentTestIds = useMemo(
    () =>
      new Set(
        currentTests
          .map(
            (test) =>
              test.practicalTestId,
          )
          .filter(Boolean) as string[],
      ),
    [currentTests],
  );

  const priorTestIds = useMemo(
    () =>
      new Set(
        priorTests
          .map(
            (test) =>
              test.practicalTestId,
          )
          .filter(Boolean) as string[],
      ),
    [priorTests],
  );

  const currentGrades = useMemo(
    () =>
      grades.filter((grade) =>
        currentTestIds.has(
          grade.practical_test_id,
        ),
      ),
    [grades, currentTestIds],
  );

  const priorGrades = useMemo(
    () =>
      grades.filter((grade) =>
        priorTestIds.has(
          grade.practical_test_id,
        ),
      ),
    [grades, priorTestIds],
  );

  const filterOptions = useMemo(() => {
    function uniqueSorted(values: string[]) {
      return [...new Set(values)]
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b),
        );
    }

    return {
      ratings: uniqueSorted(
        analyticsTests.map(
          (test) => test.ratingLabel,
        ),
      ),

      instructors: uniqueSorted(
        analyticsTests.map(
          (test) => test.instructor,
        ),
      ),

      schools: uniqueSorted(
        analyticsTests.map(
          (test) => test.school,
        ),
      ),

      states: uniqueSorted(
        analyticsTests.map(
          (test) => test.stateName,
        ),
      ),

      outcomes: uniqueSorted(
        analyticsTests.map(
          (test) => test.outcome,
        ),
      ),
    };
  }, [analyticsTests]);

  const totals = useMemo(() => {
    const count = currentTests.length;

    const passes = currentTests.filter(
      (test) => test.outcome === "pass",
    ).length;

    const fails = currentTests.filter(
      (test) => test.outcome === "fail",
    ).length;

    const discontinued = currentTests.filter(
      (test) =>
        test.outcome === "discontinued" ||
        test.outcome ===
          "letter_of_discontinuance",
    ).length;

    const other =
      count - passes - fails - discontinued;

    const priorCount = priorTests.length;

    const testChange =
      priorCount > 0
        ? ((count - priorCount) /
            priorCount) *
          100
        : null;

    return {
      count,
      passes,
      fails,
      discontinued,
      other,
      passRate:
        count > 0
          ? (passes / count) * 100
          : null,
      priorCount,
      testChange,
    };
  }, [currentTests, priorTests]);

  const ratingRows = useMemo(() => {
    const counts = new Map<string, number>();

    currentTests.forEach((test) => {
      counts.set(
        test.ratingLabel,
        (counts.get(test.ratingLabel) ?? 0) +
          1,
      );
    });

    return [...counts.entries()]
      .map(([label, value]) => ({
        label,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentTests]);

  const outcomeRows = useMemo(() => {
    const counts = new Map<string, number>();

    currentTests.forEach((test) => {
      counts.set(
        test.outcomeLabel,
        (counts.get(test.outcomeLabel) ?? 0) +
          1,
      );
    });

    return [...counts.entries()]
      .map(([label, value]) => ({
        label,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentTests]);

  const volumeTrend = useMemo(() => {
    const map = new Map<string, number>();

    currentTests.forEach((test) => {
      if (!test.date) return;

      const key = monthKey(test.date);

      map.set(
        key,
        (map.get(key) ?? 0) + 1,
      );
    });

    return [...map.entries()]
      .sort(([a], [b]) =>
        a.localeCompare(b),
      )
      .map(([key, value]) => ({
        key,
        label: monthLabel(key),
        value,
      }));
  }, [currentTests]);

  const taskSummaries = useMemo<
    TaskSummary[]
  >(() => {
    const grouped = new Map<
      string,
      PracticalTestGrade[]
    >();

    currentGrades.forEach((grade) => {
      const taskCode = clean(
        grade.task_code,
      );

      if (!taskCode) return;

      const existing =
        grouped.get(taskCode) ?? [];

      existing.push(grade);
      grouped.set(taskCode, existing);
    });

    return [...grouped.entries()]
      .map(([taskCode, rows]) => {
        const numeric = rows
          .map((row) =>
            parseNumericGrade(
              row.grade_value,
            ),
          )
          .filter(
            (value): value is number =>
              value !== null,
          );

        function componentAverage(
          component: "K" | "R" | "S",
        ) {
          const values = rows
            .filter(
              (row) =>
                row.grade_component ===
                component,
            )
            .map((row) =>
              parseNumericGrade(
                row.grade_value,
              ),
            )
            .filter(
              (value): value is number =>
                value !== null,
            );

          return average(values);
        }

        const uniqueTests = new Set(
          rows.map(
            (row) =>
              row.practical_test_id,
          ),
        );

        const grade1 = rows.filter(
          (row) => row.grade_value === "1",
        ).length;

        const grade2 = rows.filter(
          (row) => row.grade_value === "2",
        ).length;

        const grade3 = rows.filter(
          (row) => row.grade_value === "3",
        ).length;

        const grade4 = rows.filter(
          (row) => row.grade_value === "4",
        ).length;

        const np = rows.filter(
          (row) => row.grade_value === "NP",
        ).length;

        return {
          taskCode,
          evaluations: uniqueTests.size,
          average: average(numeric),
          kAverage:
            componentAverage("K"),
          rAverage:
            componentAverage("R"),
          sAverage:
            componentAverage("S"),
          grade1,
          grade2,
          grade3,
          grade4,
          np,
          lowGradeRate:
            numeric.length > 0
              ? ((grade1 + grade2) /
                  numeric.length) *
                100
              : 0,
        };
      })
      .sort((a, b) => {
        if (
          a.average === null &&
          b.average === null
        ) {
          return a.taskCode.localeCompare(
            b.taskCode,
          );
        }

        if (a.average === null) return 1;
        if (b.average === null) return -1;

        return a.average - b.average;
      });
  }, [currentGrades]);

  useEffect(() => {
    if (
      selectedTask &&
      taskSummaries.some(
        (row) =>
          row.taskCode === selectedTask,
      )
    ) {
      return;
    }

    setSelectedTask(
      taskSummaries[0]?.taskCode ?? "",
    );
  }, [taskSummaries, selectedTask]);

  const strongestTasks = useMemo(
    () =>
      [...taskSummaries]
        .filter(
          (row) => row.average !== null,
        )
        .sort(
          (a, b) =>
            (b.average ?? 0) -
            (a.average ?? 0),
        )
        .slice(0, 5),
    [taskSummaries],
  );

  const weakestTasks = useMemo(
    () =>
      taskSummaries
        .filter(
          (row) => row.average !== null,
        )
        .slice(0, 5),
    [taskSummaries],
  );

  const taskTrend = useMemo(() => {
    if (!selectedTask) return [];

    const testById = new Map<
      string,
      AnalyticsTest
    >();

    currentTests.forEach((test) => {
      if (test.practicalTestId) {
        testById.set(
          test.practicalTestId,
          test,
        );
      }
    });

    const grouped = new Map<
      string,
      number[]
    >();

    currentGrades
      .filter(
        (grade) =>
          grade.task_code ===
          selectedTask,
      )
      .forEach((grade) => {
        const numeric =
          parseNumericGrade(
            grade.grade_value,
          );

        if (numeric === null) return;

        const test = testById.get(
          grade.practical_test_id,
        );

        if (!test?.date) return;

        const key = monthKey(test.date);

        const values =
          grouped.get(key) ?? [];

        values.push(numeric);

        grouped.set(key, values);
      });

    return [...grouped.entries()]
      .sort(([a], [b]) =>
        a.localeCompare(b),
      )
      .map(([key, values]) => ({
        key,
        label: monthLabel(key),
        average: average(values) ?? 0,
      }));
  }, [
    selectedTask,
    currentGrades,
    currentTests,
  ]);

  const selectedTaskSummary =
    taskSummaries.find(
      (row) =>
        row.taskCode === selectedTask,
    ) ?? null;

  function openHistoricalRecords(
    filters: {
      rating?: string;
      outcome?: string;
      school?: string;
      instructor?: string;
      state?: string;
    } = {},
  ) {
    const params =
      new URLSearchParams();

    if (range.start) {
      params.set(
        "start",
        toDateInputValue(
          range.start,
        ),
      );
    }

    if (range.end) {
      params.set(
        "end",
        toDateInputValue(
          range.end,
        ),
      );
    }

    const rating =
      filters.rating ||
      ratingFilter;

    const outcome =
      filters.outcome ||
      outcomeFilter;

    const school =
      filters.school ||
      schoolFilter;

    const instructor =
      filters.instructor ||
      instructorFilter;

    const state =
      filters.state ||
      stateFilter;

    if (rating) {
      params.set(
        "rating",
        rating,
      );
    }

    if (outcome) {
      params.set(
        "outcome",
        outcome,
      );
    }

    if (school) {
      params.set(
        "school",
        school,
      );
    }

    if (instructor) {
      params.set(
        "instructor",
        instructor,
      );
    }

    if (state) {
      params.set(
        "state",
        state,
      );
    }

    router.push(
      `/examiner/historical-records?${params.toString()}`,
    );
  }

  const comparisonRows =
    useMemo<ComparisonRow[]>(() => {
      function keyFor(
        test: AnalyticsTest,
      ) {
        if (
          comparisonMode === "instructor"
        ) {
          return test.instructor;
        }

        if (comparisonMode === "school") {
          return test.school;
        }

        if (comparisonMode === "state") {
          return test.stateName;
        }

        return test.ratingLabel;
      }

      function build(
        tests: AnalyticsTest[],
        gradeRows: PracticalTestGrade[],
      ) {
        const groups = new Map<
          string,
          AnalyticsTest[]
        >();

        tests.forEach((test) => {
          const key = keyFor(test);

          const existing =
            groups.get(key) ?? [];

          existing.push(test);
          groups.set(key, existing);
        });

        const result = new Map<
          string,
          {
            tests: number;
            averageGrade: number | null;
            passRate: number | null;
          }
        >();

        groups.forEach(
          (groupTests, key) => {
            const ids = new Set(
              groupTests
                .map(
                  (test) =>
                    test.practicalTestId,
                )
                .filter(
                  Boolean,
                ) as string[],
            );

            const numeric = gradeRows
              .filter((grade) =>
                ids.has(
                  grade.practical_test_id,
                ),
              )
              .map((grade) =>
                parseNumericGrade(
                  grade.grade_value,
                ),
              )
              .filter(
                (
                  value,
                ): value is number =>
                  value !== null,
              );

            const knownOutcomes =
              groupTests.filter(
                (test) =>
                  test.outcome !==
                  "unknown",
              );

            const passes =
              knownOutcomes.filter(
                (test) =>
                  test.outcome ===
                  "pass",
              ).length;

            result.set(key, {
              tests:
                groupTests.length,
              averageGrade:
                average(numeric),
              passRate:
                knownOutcomes.length >
                0
                  ? (passes /
                      knownOutcomes.length) *
                    100
                  : null,
            });
          },
        );

        return result;
      }

      const current = build(
        currentTests,
        currentGrades,
      );

      const prior = build(
        priorTests,
        priorGrades,
      );

      return [...current.entries()]
        .map(([key, currentValue]) => {
          const priorValue =
            prior.get(key);

          const trend =
            currentValue.averageGrade !==
              null &&
            priorValue?.averageGrade !==
              null &&
            priorValue?.averageGrade !==
              undefined
              ? currentValue.averageGrade -
                priorValue.averageGrade
              : null;

          return {
            key,
            label: key,
            tests:
              currentValue.tests,
            averageGrade:
              currentValue.averageGrade,
            passRate:
              currentValue.passRate,
            priorAverageGrade:
              priorValue?.averageGrade ??
              null,
            trend,
          };
        })
        .sort((a, b) => {
          if (
            a.averageGrade !== null &&
            b.averageGrade !== null
          ) {
            return (
              b.averageGrade -
              a.averageGrade
            );
          }

          return b.tests - a.tests;
        });
    }, [
      comparisonMode,
      currentTests,
      priorTests,
      currentGrades,
      priorGrades,
    ]);

  const maxRating =
    Math.max(
      0,
      ...ratingRows.map(
        (row) => row.value,
      ),
    ) || 1;

  const maxOutcome =
    Math.max(
      0,
      ...outcomeRows.map(
        (row) => row.value,
      ),
    ) || 1;

  const maxVolume =
    Math.max(
      0,
      ...volumeTrend.map(
        (row) => row.value,
      ),
    ) || 1;

  const maxTaskTrend =
    Math.max(
      4,
      ...taskTrend.map(
        (row) => row.average,
      ),
    );

  function resetFilters() {
    setRatingFilter("");
    setInstructorFilter("");
    setSchoolFilter("");
    setStateFilter("");
    setOutcomeFilter("");
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-800">
            <Database
              aria-hidden
              className="h-6 w-6"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Data
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Practical-test volume, outcomes,
              ACS task performance, and trends
              by instructor, flight school,
              U.S. state, and rating.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
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

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-amber-700" />

          <h2 className="text-lg font-bold text-slate-900">
            Filters
          </h2>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["month", "Month"],
              ["ytd", "YTD"],
              ["12m", "Last 12 Months"],
              ["24m", "Last 24 Months"],
              ["custom", "Custom"],
            ] as Array<
              [DatePreset, string]
            >
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setPreset(value)
              }
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                preset === value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {preset === "custom" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Start Date
              <div className="mt-1 flex w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) =>
                    setCustomStart(
                      event.target.value,
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
                  value={customEnd}
                  onChange={(event) =>
                    setCustomEnd(
                      event.target.value,
                    )
                  }
                  className="block w-full min-w-0 border-0 bg-transparent p-0 text-base"
                />
              </div>
            </label>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-semibold text-slate-700">
            Rating
            <select
              value={ratingFilter}
              onChange={(event) =>
                setRatingFilter(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                All Ratings
              </option>

              {filterOptions.ratings.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Instructor
            <select
              value={instructorFilter}
              onChange={(event) =>
                setInstructorFilter(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                All Instructors
              </option>

              {filterOptions.instructors.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Flight School
            <select
              value={schoolFilter}
              onChange={(event) =>
                setSchoolFilter(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                All Flight Schools
              </option>

              {filterOptions.schools.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            U.S. State
            <select
              value={stateFilter}
              onChange={(event) =>
                setStateFilter(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                All States
              </option>

              {filterOptions.states.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Outcome
            <select
              value={outcomeFilter}
              onChange={(event) =>
                setOutcomeFilter(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                All Outcomes
              </option>

              {filterOptions.outcomes.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {getOutcomeLabel(
                      value,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-sm text-slate-500">
            {range.start.toLocaleDateString()}{" "}
            –{" "}
            {range.end.toLocaleDateString()}
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-bold text-amber-700 hover:text-amber-800"
          >
            Clear drill-down filters
          </button>
        </div>
      </section>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          Loading analytics…
        </div>
      ) : (
        <>
          <section className="mt-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current selected period compared
                with the immediately preceding
                equivalent period.
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <button
                type="button"
                onClick={() =>
                  openHistoricalRecords()
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Total Tests
                  </span>

                  <CalendarDays className="h-5 w-5 text-amber-600" />
                </div>

                <div className="mt-3 text-3xl font-bold text-slate-900">
                  {totals.count}
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Previous:{" "}
                  {totals.priorCount}
                  {totals.testChange !==
                  null
                    ? ` • ${
                        totals.testChange >
                        0
                          ? "+"
                          : ""
                      }${totals.testChange.toFixed(
                        1,
                      )}%`
                    : ""}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openHistoricalRecords({
                    outcome: "Pass",
                  })
                }
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:shadow-md"
              >
                <div className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                  Pass
                </div>

                <div className="mt-3 text-3xl font-bold text-emerald-900">
                  {totals.passes}
                </div>

                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  {formatPercent(
                    totals.passRate,
                  )}{" "}
                  of all tests
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openHistoricalRecords({
                    outcome:
                      "Disapproved",
                  })
                }
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left transition hover:shadow-md"
              >
                <div className="text-sm font-bold uppercase tracking-wide text-red-700">
                  Disapproved
                </div>

                <div className="mt-3 text-3xl font-bold text-red-900">
                  {totals.fails}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openHistoricalRecords({
                    outcome:
                      "Discontinued",
                  })
                }
                className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:shadow-md"
              >
                <div className="text-sm font-bold uppercase tracking-wide text-amber-700">
                  Discontinued
                </div>

                <div className="mt-3 text-3xl font-bold text-amber-900">
                  {totals.discontinued}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openHistoricalRecords({
                    outcome:
                      "Outcome Unavailable",
                  })
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:shadow-md"
              >
                <div className="text-sm font-bold uppercase tracking-wide text-slate-600">
                  Other / Unknown
                </div>

                <div className="mt-3 text-3xl font-bold text-slate-900">
                  {totals.other}
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Includes imported tests
                  where an outcome was not
                  stored.
                </div>
              </button>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-700" />

                  <h3 className="font-bold text-slate-900">
                    Test Volume Trend
                  </h3>
                </div>

                {volumeTrend.length ? (
                  <div className="mt-6 flex h-56 items-end gap-2 border-b border-slate-200 pb-2">
                    {volumeTrend.map(
                      (row) => (
                        <div
                          key={row.key}
                          className="flex min-w-0 flex-1 flex-col items-center justify-end"
                        >
                          <span className="mb-1 text-xs font-bold text-slate-700">
                            {row.value}
                          </span>

                          <div
                            className="w-full max-w-12 rounded-t bg-amber-500"
                            style={{
                              height: `${Math.max(
                                8,
                                (row.value /
                                  maxVolume) *
                                  160,
                              )}px`,
                            }}
                          />

                          <span className="mt-2 max-w-full truncate text-[11px] text-slate-500">
                            {row.label}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    No completed tests are
                    available for this period.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-700" />

                  <h3 className="font-bold text-slate-900">
                    Tests by Outcome
                  </h3>
                </div>

                <div className="mt-5 space-y-4">
                  {outcomeRows.length ? (
                    outcomeRows.map(
                      (row) => (
                        <button
                          key={row.label}
                          type="button"
                          onClick={() =>
                            openHistoricalRecords({
                              outcome:
                                row.label,
                            })
                          }
                          className="block w-full text-left"
                        >
                          <HorizontalBar
                            label={row.label}
                            value={row.value}
                            max={maxOutcome}
                          />
                        </button>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-slate-500">
                      No outcome data for
                      this period.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-amber-700" />

                <h3 className="font-bold text-slate-900">
                  Total Tests by Rating
                </h3>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {ratingRows.length ? (
                  ratingRows.map(
                    (row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() =>
                          openHistoricalRecords({
                            rating:
                              row.label,
                          })
                        }
                        className="text-left"
                      >
                        <HorizontalBar
                          label={row.label}
                          value={row.value}
                          max={maxRating}
                        />
                      </button>
                    ),
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    No rating data for the
                    selected period.
                  </p>
                )}
              </div>
            </section>
          </section>

          <section className="mt-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                ACS Task Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Numeric grades are calculated
                from the K, R, and S values
                stored by the EMT. NP is
                excluded from grade averages.
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-700" />

                  <h3 className="font-bold text-red-900">
                    Lowest Average Tasks
                  </h3>
                </div>

                <div className="mt-4 space-y-2">
                  {weakestTasks.length ? (
                    weakestTasks.map(
                      (task) => (
                        <button
                          key={task.taskCode}
                          type="button"
                          onClick={() =>
                            setSelectedTask(
                              task.taskCode,
                            )
                          }
                          className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left"
                        >
                          <span className="font-semibold text-slate-800">
                            {task.taskCode}
                          </span>

                          <span className="font-bold text-red-700">
                            {formatAverage(
                              task.average,
                            )}
                          </span>
                        </button>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-red-700">
                      No EMT grade data is
                      available in this period.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />

                  <h3 className="font-bold text-emerald-900">
                    Highest Average Tasks
                  </h3>
                </div>

                <div className="mt-4 space-y-2">
                  {strongestTasks.length ? (
                    strongestTasks.map(
                      (task) => (
                        <button
                          key={task.taskCode}
                          type="button"
                          onClick={() =>
                            setSelectedTask(
                              task.taskCode,
                            )
                          }
                          className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left"
                        >
                          <span className="font-semibold text-slate-800">
                            {task.taskCode}
                          </span>

                          <span className="font-bold text-emerald-700">
                            {formatAverage(
                              task.average,
                            )}
                          </span>
                        </button>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-emerald-700">
                      No EMT grade data is
                      available in this period.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="font-bold text-slate-900">
                  Average Grade by Task
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select any task to display
                  its detailed trend below.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">
                        Task
                      </th>
                      <th className="px-5 py-3">
                        Tests
                      </th>
                      <th className="px-5 py-3">
                        Avg
                      </th>
                      <th className="px-5 py-3">
                        K
                      </th>
                      <th className="px-5 py-3">
                        R
                      </th>
                      <th className="px-5 py-3">
                        S
                      </th>
                      <th className="px-5 py-3">
                        Grade 1
                      </th>
                      <th className="px-5 py-3">
                        Grade 2
                      </th>
                      <th className="px-5 py-3">
                        Grade 3
                      </th>
                      <th className="px-5 py-3">
                        Grade 4
                      </th>
                      <th className="px-5 py-3">
                        NP
                      </th>
                      <th className="px-5 py-3">
                        Grade 1–2 %
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {taskSummaries.map(
                      (task) => (
                        <tr
                          key={task.taskCode}
                          onClick={() =>
                            setSelectedTask(
                              task.taskCode,
                            )
                          }
                          className={`cursor-pointer text-sm hover:bg-amber-50 ${
                            selectedTask ===
                            task.taskCode
                              ? "bg-amber-50"
                              : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-5 py-3 font-bold text-slate-900">
                            {task.taskCode}
                          </td>

                          <td className="px-5 py-3">
                            {task.evaluations}
                          </td>

                          <td className="px-5 py-3 font-bold">
                            {formatAverage(
                              task.average,
                            )}
                          </td>

                          <td className="px-5 py-3">
                            {formatAverage(
                              task.kAverage,
                            )}
                          </td>

                          <td className="px-5 py-3">
                            {formatAverage(
                              task.rAverage,
                            )}
                          </td>

                          <td className="px-5 py-3">
                            {formatAverage(
                              task.sAverage,
                            )}
                          </td>

                          <td className="px-5 py-3">
                            {task.grade1}
                          </td>

                          <td className="px-5 py-3">
                            {task.grade2}
                          </td>

                          <td className="px-5 py-3">
                            {task.grade3}
                          </td>

                          <td className="px-5 py-3">
                            {task.grade4}
                          </td>

                          <td className="px-5 py-3">
                            {task.np}
                          </td>

                          <td className="px-5 py-3">
                            {task.lowGradeRate.toFixed(
                              1,
                            )}
                            %
                          </td>
                        </tr>
                      ),
                    )}

                    {!taskSummaries.length ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-5 py-10 text-center text-sm text-slate-500"
                        >
                          No task-grade records
                          match the selected
                          filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedTaskSummary ? (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Selected Task
                    </div>

                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {
                        selectedTaskSummary.taskCode
                      }
                    </h3>
                  </div>

                  <label className="min-w-56 text-sm font-semibold text-slate-700">
                    Task
                    <div className="relative mt-1">
                      <select
                        value={selectedTask}
                        onChange={(
                          event,
                        ) =>
                          setSelectedTask(
                            event.target.value,
                          )
                        }
                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm"
                      >
                        {taskSummaries.map(
                          (task) => (
                            <option
                              key={
                                task.taskCode
                              }
                              value={
                                task.taskCode
                              }
                            >
                              {
                                task.taskCode
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </label>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  {[
                    [
                      "Average",
                      formatAverage(
                        selectedTaskSummary.average,
                      ),
                    ],
                    [
                      "K Avg",
                      formatAverage(
                        selectedTaskSummary.kAverage,
                      ),
                    ],
                    [
                      "R Avg",
                      formatAverage(
                        selectedTaskSummary.rAverage,
                      ),
                    ],
                    [
                      "S Avg",
                      formatAverage(
                        selectedTaskSummary.sAverage,
                      ),
                    ],
                    [
                      "Tests",
                      String(
                        selectedTaskSummary.evaluations,
                      ),
                    ],
                    [
                      "Grade 1–2",
                      `${selectedTaskSummary.lowGradeRate.toFixed(
                        1,
                      )}%`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {label}
                      </div>

                      <div className="mt-1 text-xl font-bold text-slate-900">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7">
                  <h4 className="font-bold text-slate-900">
                    Monthly Trend
                  </h4>

                  {taskTrend.length ? (
                    <div className="mt-5 flex h-56 items-end gap-2 border-b border-slate-200 pb-2">
                      {taskTrend.map(
                        (row) => (
                          <div
                            key={
                              row.key
                            }
                            className="flex min-w-0 flex-1 flex-col items-center justify-end"
                          >
                            <span className="mb-1 text-xs font-bold text-slate-700">
                              {row.average.toFixed(
                                2,
                              )}
                            </span>

                            <div
                              className="w-full max-w-12 rounded-t bg-slate-900"
                              style={{
                                height: `${Math.max(
                                  8,
                                  (row.average /
                                    maxTaskTrend) *
                                    160,
                                )}px`,
                              }}
                            />

                            <span className="mt-2 max-w-full truncate text-[11px] text-slate-500">
                              {
                                row.label
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      There is not enough
                      dated grade data to show
                      a trend for this task.
                    </p>
                  )}
                </div>
              </section>
            ) : null}
          </section>

          <section className="mt-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Comparative Analytics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Compare average grades,
                test counts, pass rates, and
                movement from the preceding
                equivalent period.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  [
                    "instructor",
                    "By Instructor",
                    Users,
                  ],
                  [
                    "school",
                    "By Flight School",
                    School,
                  ],
                  [
                    "state",
                    "By U.S. State",
                    MapPin,
                  ],
                  [
                    "rating",
                    "By Rating",
                    GraduationCap,
                  ],
                ] as const
              ).map(
                ([
                  value,
                  label,
                  Icon,
                ]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setComparisonMode(
                        value,
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
                      comparisonMode ===
                      value
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ),
              )}
            </div>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">
                        {comparisonMode ===
                        "instructor"
                          ? "Instructor"
                          : comparisonMode ===
                              "school"
                            ? "Flight School"
                            : comparisonMode ===
                                "state"
                              ? "U.S. State"
                              : "Rating"}
                      </th>

                      <th className="px-5 py-3">
                        Tests
                      </th>

                      <th className="px-5 py-3">
                        Avg Grade
                      </th>

                      <th className="px-5 py-3">
                        Previous Avg
                      </th>

                      <th className="px-5 py-3">
                        Trend
                      </th>

                      <th className="px-5 py-3">
                        Pass Rate
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {comparisonRows.map(
                      (row) => (
                        <tr
                          key={row.key}
                          className="text-sm"
                        >
                          <td className="px-5 py-3 font-bold text-slate-900">
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  comparisonMode ===
                                  "instructor"
                                ) {
                                  openHistoricalRecords({
                                    instructor:
                                      row.label,
                                  });
                                  return;
                                }

                                if (
                                  comparisonMode ===
                                  "school"
                                ) {
                                  openHistoricalRecords({
                                    school:
                                      row.label,
                                  });
                                  return;
                                }

                                if (
                                  comparisonMode ===
                                  "state"
                                ) {
                                  openHistoricalRecords({
                                    state:
                                      row.label,
                                  });
                                  return;
                                }

                                openHistoricalRecords({
                                  rating:
                                    row.label,
                                });
                              }}
                              className="font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-amber-700"
                            >
                              {row.label}
                            </button>
                          </td>

                          <td className="px-5 py-3">
                            {row.tests}
                          </td>

                          <td className="px-5 py-3 font-bold">
                            {formatAverage(
                              row.averageGrade,
                            )}
                          </td>

                          <td className="px-5 py-3 text-slate-500">
                            {formatAverage(
                              row.priorAverageGrade,
                            )}
                          </td>

                          <td className="px-5 py-3">
                            <TrendBadge
                              value={
                                row.trend
                              }
                            />
                          </td>

                          <td className="px-5 py-3">
                            {formatPercent(
                              row.passRate,
                            )}
                          </td>
                        </tr>
                      ),
                    )}

                    {!comparisonRows.length ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-sm text-slate-500"
                        >
                          No comparison data
                          matches the selected
                          filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-bold text-slate-900">
              Analytics Coverage
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {analyticsTests.length}
                </div>

                <div className="text-sm text-slate-500">
                  completed test records
                  available
                </div>
              </div>

              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {
                    analyticsTests.filter(
                      (test) =>
                        test.hasEmtEvaluation,
                    ).length
                  }
                </div>

                <div className="text-sm text-slate-500">
                  tests with EMT evaluation
                  records
                </div>
              </div>

              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {grades.length}
                </div>

                <div className="text-sm text-slate-500">
                  stored K / R / S grade
                  components
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Historical imported tests are
              included in total-test analytics
              whenever a completed request is
              available. Task-grade analytics
              require an EMT evaluation record.
              Imported tests without a stored
              pass/disapproval result appear as
              Outcome Unavailable rather than
              having an outcome inferred.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
