"use client";

import {
  Archive,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Filter,
  History,
  Plane,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type RequestRow = {
  id: string;
  request_number: string;

  assigned_examiner_profile_id: string | null;

  applicant_name_snapshot: string;
  applicant_email_snapshot: string;
  applicant_phone_snapshot: string | null;
  ftn_number_snapshot: string | null;

  certificate_sought: string;
  category_sought: string | null;
  class_sought: string | null;
  rating_sought: string;
  issuance_type: string | null;

  status: string;
  source_system: string | null;

  flight_school_name_snapshot: string | null;

  instructor_name: string | null;
  instructor_email: string | null;
  instructor_certificate_number: string | null;

  aircraft_description: string | null;
  aircraft_make: string | null;
  aircraft_model: string | null;
  aircraft_registration: string | null;

  dms_preapproval_number: string | null;
  fee_amount: number | null;

  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  scheduled_location: string | null;

  oral_test_location: string | null;
  flight_airport_id: string | null;
  flight_airport_code: string | null;
  flight_airport_icao: string | null;

  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;

  legacy_status: string | null;
  legacy_location_text: string | null;
  legacy_finalized_datetime_text: string | null;
};

type PracticalTestRow = {
  id: string;
  practical_test_request_id: string;

  dms_preapproval_number: string | null;
  result: string | null;

  started_at: string | null;
  completed_at: string | null;

  aircraft_used: string | null;
  fee_amount: number | null;
  examiner_notes: string | null;

  evaluation_status: string | null;
  evaluation_state: unknown;

  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type GradeRow = {
  id: string;
  practical_test_id: string;
  task_code: string;
  grade_component: "K" | "R" | "S";
  grade_value: "NP" | "1" | "2" | "3" | "4";
};

type ReportRow = {
  id: string;
  practical_test_id: string;
  report_type: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  generated_at: string;
  released_to_applicant_at: string | null;
  superseded_at: string | null;
};

type AuditRow = {
  id: string;
  practical_test_request_id: string;
  previous_status: string | null;
  new_status: string;
  status_reason: string | null;
  changed_by_profile_id: string | null;
  changed_at: string;
};

type HistoryRow = {
  id: string;
  practical_test_request_id: string;
  entry_text: string;
  entry_type: string;
  created_by_profile_id: string | null;
  created_by_label: string | null;
  created_at: string;
  updated_at: string;
};

type RequestInstructorRow = {
  practical_test_request_id: string;
  relationship_type: string | null;
  instructor_name_snapshot: string | null;
  instructor_email_snapshot: string | null;
};

type AirportRow = {
  id: string;
  faa_identifier: string | null;
  icao_identifier: string | null;
  state_code: string | null;
  state_name: string | null;
};

type ArchiveRecord = {
  request: RequestRow;
  test: PracticalTestRow | null;
  date: Date | null;
  ratingLabel: string;
  outcome: string;
  flightSchool: string;
  instructor: string;
  aircraft: string;
  location: string;
  state: string;
  isLegacy: boolean;
};

type TaskGradeSummary = {
  taskCode: string;
  K: string;
  R: string;
  S: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function display(
  value: unknown,
  fallback = "Not specified",
) {
  return clean(value) || fallback;
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function formatStatus(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not specified";
  }

  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatOutcome(
  value: string | null | undefined,
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
        ? formatStatus(value)
        : "Outcome Unavailable";
  }
}

function outcomeClass(value: string) {
  if (value === "Pass") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (value === "Disapproved") {
    return "bg-red-100 text-red-800";
  }

  if (value === "Discontinued") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

function formatDate(
  date: Date | null,
) {
  if (!date) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Pacific/Honolulu",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not specified";
  }

  const parsed = new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Pacific/Honolulu",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(parsed);
}

function parseLegacyDate(
  value: string | null,
) {
  const text = clean(value);

  if (!text) {
    return null;
  }

  const direct = new Date(text);

  if (
    !Number.isNaN(
      direct.getTime(),
    )
  ) {
    return direct;
  }

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?/i,
  );

  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  let hour = Number(
    match[4] || 0,
  );

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

function getRecordDate(
  request: RequestRow,
  test: PracticalTestRow | null,
) {
  const candidates = [
    test?.completed_at,
    test?.started_at,
    request.completed_at,
    request.scheduled_start_at,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const parsed =
      new Date(candidate);

    if (
      !Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return parsed;
    }
  }

  return parseLegacyDate(
    request
      .legacy_finalized_datetime_text,
  );
}

function getRatingLabel(
  request: RequestRow,
) {
  const parts = [
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
    [...new Set(parts)].join(
      " — ",
    ) || "Not specified"
  );
}

function getAircraft(
  request: RequestRow,
  test: PracticalTestRow | null,
) {
  if (
    clean(test?.aircraft_used)
  ) {
    return clean(
      test?.aircraft_used,
    );
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

function getLocation(
  request: RequestRow,
) {
  return (
    clean(
      request.flight_airport_code,
    ) ||
    clean(
      request.scheduled_location,
    ) ||
    clean(
      request.oral_test_location,
    ) ||
    clean(
      request.legacy_location_text,
    ) ||
    "Not specified"
  );
}

function parseDateInput(
  value: string,
) {
  if (!value) {
    return null;
  }

  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
}

function startOfDay(
  date: Date,
) {
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

function endOfDay(
  date: Date,
) {
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

  if (!text) {
    return "";
  }

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
          [
            ...prefix,
            key,
          ],
        );

      const normalized =
        normalizeDuration(
          value,
        );

      if (normalized) {
        return normalized;
      }
    }
  }

  return "Not specified";
}

function money(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not specified";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(value);
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function ExaminerHistoricalRecordsPage() {
  const [loading, setLoading] =
    useState(true);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [requests, setRequests] =
    useState<RequestRow[]>([]);

  const [tests, setTests] =
    useState<
      PracticalTestRow[]
    >([]);

  const [grades, setGrades] =
    useState<GradeRow[]>([]);

  const [reports, setReports] =
    useState<ReportRow[]>([]);

  const [audits, setAudits] =
    useState<AuditRow[]>([]);

  const [
    historyEntries,
    setHistoryEntries,
  ] = useState<HistoryRow[]>([]);

  const [
    requestInstructors,
    setRequestInstructors,
  ] = useState<
    RequestInstructorRow[]
  >([]);

  const [airports, setAirports] =
    useState<AirportRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    ratingFilter,
    setRatingFilter,
  ] = useState("");

  const [
    outcomeFilter,
    setOutcomeFilter,
  ] = useState("");

  const [
    schoolFilter,
    setSchoolFilter,
  ] = useState("");

  const [
    instructorFilter,
    setInstructorFilter,
  ] = useState("");

  const [
    stateFilter,
    setStateFilter,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [endDate, setEndDate] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState<
      "newest" | "oldest"
    >("newest");

  const [
    expandedRequestId,
    setExpandedRequestId,
  ] = useState<
    string | null
  >(null);

  const [
    downloadingReportId,
    setDownloadingReportId,
  ] = useState<
    string | null
  >(null);

  const loadRecords =
    useCallback(async () => {
      setLoading(true);
      setPageError("");

      const supabase =
        createClient();

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        setPageError(
          "You must be signed in to view historical records.",
        );

        setLoading(false);
        return;
      }

      const user =
        authData.user;

      const {
        data: roleRows,
        error: roleError,
      } = await supabase
        .from("user_roles")
        .select("role")
        .eq(
          "profile_id",
          user.id,
        )
        .in("role", [
          "examiner",
          "administrator",
        ]);

      if (roleError) {
        setPageError(
          `Your examiner access could not be verified: ${roleError.message}`,
        );

        setLoading(false);
        return;
      }

      if (
        !roleRows ||
        roleRows.length === 0
      ) {
        setPageError(
          "Examiner or administrator access is required to view historical records.",
        );

        setLoading(false);
        return;
      }

      const {
        data: requestRows,
        error: requestError,
      } = await supabase
        .from(
          "practical_test_requests",
        )
        .select(
          `
            id,
            request_number,
            assigned_examiner_profile_id,

            applicant_name_snapshot,
            applicant_email_snapshot,
            applicant_phone_snapshot,
            ftn_number_snapshot,

            certificate_sought,
            category_sought,
            class_sought,
            rating_sought,
            issuance_type,

            status,
            source_system,

            flight_school_name_snapshot,

            instructor_name,
            instructor_email,
            instructor_certificate_number,

            aircraft_description,
            aircraft_make,
            aircraft_model,
            aircraft_registration,

            dms_preapproval_number,
            fee_amount,

            scheduled_start_at,
            scheduled_end_at,
            scheduled_location,

            oral_test_location,
            flight_airport_id,
            flight_airport_code,
            flight_airport_icao,

            submitted_at,
            completed_at,
            created_at,
            updated_at,

            legacy_status,
            legacy_location_text,
            legacy_finalized_datetime_text
          `,
        )
        .eq(
          "assigned_examiner_profile_id",
          user.id,
        )
        .eq(
          "status",
          "completed",
        )
        .order(
          "completed_at",
          {
            ascending: false,
            nullsFirst: false,
          },
        )
        .limit(10000);

      if (requestError) {
        setPageError(
          `Historical requests could not be loaded: ${requestError.message}`,
        );

        setLoading(false);
        return;
      }

      const loadedRequests =
        (requestRows ??
          []) as RequestRow[];

      setRequests(
        loadedRequests,
      );

      const requestIds =
        loadedRequests.map(
          (request) =>
            request.id,
        );

      if (
        requestIds.length === 0
      ) {
        setTests([]);
        setGrades([]);
        setReports([]);
        setAudits([]);
        setHistoryEntries([]);
        setRequestInstructors([]);
        setAirports([]);
        setLoading(false);
        return;
      }

      const [
        testResult,
        auditResult,
        historyResult,
        instructorResult,
        airportResult,
      ] = await Promise.all([
        supabase
          .from(
            "practical_tests",
          )
          .select(
            `
              id,
              practical_test_request_id,
              dms_preapproval_number,
              result,
              started_at,
              completed_at,
              aircraft_used,
              fee_amount,
              examiner_notes,
              evaluation_status,
              evaluation_state,
              submitted_at,
              created_at,
              updated_at
            `,
          )
          .in(
            "practical_test_request_id",
            requestIds,
          ),

        supabase
          .from(
            "practical_test_request_status_audit",
          )
          .select(
            `
              id,
              practical_test_request_id,
              previous_status,
              new_status,
              status_reason,
              changed_by_profile_id,
              changed_at
            `,
          )
          .in(
            "practical_test_request_id",
            requestIds,
          )
          .order(
            "changed_at",
            {
              ascending: true,
            },
          ),

        supabase
          .from(
            "practical_test_request_history",
          )
          .select(
            `
              id,
              practical_test_request_id,
              entry_text,
              entry_type,
              created_by_profile_id,
              created_by_label,
              created_at,
              updated_at
            `,
          )
          .in(
            "practical_test_request_id",
            requestIds,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          ),

        supabase
          .from(
            "request_instructors",
          )
          .select(
            `
              practical_test_request_id,
              relationship_type,
              instructor_name_snapshot,
              instructor_email_snapshot
            `,
          )
          .in(
            "practical_test_request_id",
            requestIds,
          ),

        supabase
          .from("faa_airports")
          .select(
            `
              id,
              faa_identifier,
              icao_identifier,
              state_code,
              state_name
            `,
          )
          .eq("is_active", true)
          .limit(20000),
      ]);

      const baseErrors = [
        testResult.error,
        auditResult.error,
        historyResult.error,
        instructorResult.error,
        airportResult.error,
      ].filter(Boolean);

      if (
        baseErrors.length
      ) {
        setPageError(
          baseErrors
            .map(
              (error) =>
                error?.message,
            )
            .filter(Boolean)
            .join(" • "),
        );

        setLoading(false);
        return;
      }

      const loadedTests =
        (testResult.data ??
          []) as PracticalTestRow[];

      setTests(
        loadedTests,
      );

      setAudits(
        (auditResult.data ??
          []) as AuditRow[],
      );

      setHistoryEntries(
        (historyResult.data ??
          []) as HistoryRow[],
      );

      setRequestInstructors(
        (instructorResult.data ??
          []) as RequestInstructorRow[],
      );

      setAirports(
        (airportResult.data ??
          []) as AirportRow[],
      );

      const testIds =
        loadedTests.map(
          (test) => test.id,
        );

      if (
        testIds.length > 0
      ) {
        const [
          gradeResult,
          reportResult,
        ] = await Promise.all([
          supabase
            .from(
              "practical_test_grades",
            )
            .select(
              `
                id,
                practical_test_id,
                task_code,
                grade_component,
                grade_value
              `,
            )
            .in(
              "practical_test_id",
              testIds,
            )
            .limit(50000),

          supabase
            .from(
              "practical_test_reports",
            )
            .select(
              `
                id,
                practical_test_id,
                report_type,
                storage_bucket,
                storage_path,
                file_name,
                generated_at,
                released_to_applicant_at,
                superseded_at
              `,
            )
            .in(
              "practical_test_id",
              testIds,
            )
            .is(
              "superseded_at",
              null,
            )
            .order(
              "generated_at",
              {
                ascending: false,
              },
            ),
        ]);

        if (
          gradeResult.error ||
          reportResult.error
        ) {
          setPageError(
            [
              gradeResult.error
                ?.message,
              reportResult.error
                ?.message,
            ]
              .filter(Boolean)
              .join(" • "),
          );

          setLoading(false);
          return;
        }

        setGrades(
          (gradeResult.data ??
            []) as GradeRow[],
        );

        setReports(
          (reportResult.data ??
            []) as ReportRow[],
        );
      } else {
        setGrades([]);
        setReports([]);
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const parameters =
      new URLSearchParams(
        window.location.search,
      );

    const requestId =
      parameters.get(
        "request",
      );

    const rating =
      parameters.get("rating");

    const outcome =
      parameters.get("outcome");

    const school =
      parameters.get("school");

    const instructor =
      parameters.get("instructor");

    const state =
      parameters.get("state");

    const start =
      parameters.get("start");

    const end =
      parameters.get("end");

    if (requestId) {
      setExpandedRequestId(
        requestId,
      );
    }

    if (rating) {
      setRatingFilter(rating);
    }

    if (outcome) {
      setOutcomeFilter(outcome);
    }

    if (school) {
      setSchoolFilter(school);
    }

    if (instructor) {
      setInstructorFilter(
        instructor,
      );
    }

    if (state) {
      setStateFilter(state);
    }

    if (start) {
      setStartDate(start);
    }

    if (end) {
      setEndDate(end);
    }
  }, []);

  const testByRequest =
    useMemo(
      () =>
        new Map(
          tests.map(
            (test) => [
              test
                .practical_test_request_id,
              test,
            ],
          ),
        ),
      [tests],
    );

  const instructorByRequest =
    useMemo(() => {
      const result =
        new Map<
          string,
          RequestInstructorRow
        >();

      for (
        const row of
        requestInstructors
      ) {
        const existing =
          result.get(
            row
              .practical_test_request_id,
          );

        if (
          !existing ||
          row.relationship_type ===
            "recommending_instructor"
        ) {
          result.set(
            row
              .practical_test_request_id,
            row,
          );
        }
      }

      return result;
    }, [requestInstructors]);

  const airportById =
    useMemo(
      () =>
        new Map(
          airports.map((airport) => [
            airport.id,
            airport,
          ]),
        ),
      [airports],
    );

  const airportByCode =
    useMemo(() => {
      const map =
        new Map<string, AirportRow>();

      for (const airport of airports) {
        const faa = normalize(
          airport.faa_identifier,
        );

        const icao = normalize(
          airport.icao_identifier,
        );

        if (faa) {
          map.set(faa, airport);
        }

        if (icao) {
          map.set(icao, airport);
        }
      }

      return map;
    }, [airports]);

  const records =
    useMemo<ArchiveRecord[]>(
      () =>
        requests.map(
          (request) => {
            const test =
              testByRequest.get(
                request.id,
              ) ?? null;

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
              "Not specified";

            const airport =
              (request.flight_airport_id
                ? airportById.get(
                    request.flight_airport_id,
                  )
                : undefined) ||
              airportByCode.get(
                normalize(
                  request.flight_airport_icao,
                ),
              ) ||
              airportByCode.get(
                normalize(
                  request.flight_airport_code,
                ),
              );

            const state =
              clean(airport?.state_name) ||
              clean(airport?.state_code) ||
              "Not specified";

            return {
              request,
              test,
              date:
                getRecordDate(
                  request,
                  test,
                ),
              ratingLabel:
                getRatingLabel(
                  request,
                ),
              outcome:
                formatOutcome(
                  test?.result,
                ),
              flightSchool:
                display(
                  request
                    .flight_school_name_snapshot,
                ),
              instructor,
              aircraft:
                getAircraft(
                  request,
                  test,
                ),
              location:
                getLocation(
                  request,
                ),
              state,
              isLegacy:
                normalize(
                  request
                    .source_system,
                ) ===
                  "sharepoint" ||
                Boolean(
                  clean(
                    request
                      .legacy_status,
                  ),
                ),
            };
          },
        ),
      [
        requests,
        testByRequest,
        instructorByRequest,
        airportById,
        airportByCode,
      ],
    );

  const filterOptions =
    useMemo(() => {
      function unique(
        values: string[],
      ) {
        return [
          ...new Set(
            values.filter(
              (value) =>
                value &&
                value !==
                  "Not specified",
            ),
          ),
        ].sort(
          (a, b) =>
            a.localeCompare(b),
        );
      }

      return {
        ratings: unique(
          records.map(
            (record) =>
              record.ratingLabel,
          ),
        ),
        outcomes: unique(
          records.map(
            (record) =>
              record.outcome,
          ),
        ),
        schools: unique(
          records.map(
            (record) =>
              record.flightSchool,
          ),
        ),
        instructors: unique(
          records.map(
            (record) =>
              record.instructor,
          ),
        ),
        states: unique(
          records.map(
            (record) =>
              record.state,
          ),
        ),
      };
    }, [records]);

  const filteredRecords =
    useMemo(() => {
      const term =
        normalize(search);

      const parsedStart =
        parseDateInput(
          startDate,
        );

      const parsedEnd =
        parseDateInput(
          endDate,
        );

      const start =
        parsedStart
          ? startOfDay(
              parsedStart,
            )
          : null;

      const end =
        parsedEnd
          ? endOfDay(
              parsedEnd,
            )
          : null;

      return records
        .filter((record) => {
          if (term) {
            const searchable = [
              record.request
                .request_number,
              record.request
                .applicant_name_snapshot,
              record.request
                .applicant_email_snapshot,
              record.request
                .ftn_number_snapshot,
              record.ratingLabel,
              record.flightSchool,
              record.instructor,
              record.aircraft,
              record.location,
              record.state,
              record.outcome,
            ]
              .map(normalize)
              .join(" ");

            if (
              !searchable.includes(
                term,
              )
            ) {
              return false;
            }
          }

          if (
            ratingFilter &&
            record.ratingLabel !==
              ratingFilter
          ) {
            return false;
          }

          if (
            outcomeFilter &&
            record.outcome !==
              outcomeFilter
          ) {
            return false;
          }

          if (
            schoolFilter &&
            record.flightSchool !==
              schoolFilter
          ) {
            return false;
          }

          if (
            instructorFilter &&
            record.instructor !==
              instructorFilter
          ) {
            return false;
          }

          if (
            stateFilter &&
            record.state !==
              stateFilter
          ) {
            return false;
          }

          if (
            start &&
            (!record.date ||
              record.date <
                start)
          ) {
            return false;
          }

          if (
            end &&
            (!record.date ||
              record.date > end)
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const aTime =
            a.date?.getTime() ??
            0;

          const bTime =
            b.date?.getTime() ??
            0;

          return sortOrder ===
            "newest"
            ? bTime - aTime
            : aTime - bTime;
        });
    }, [
      records,
      search,
      ratingFilter,
      outcomeFilter,
      schoolFilter,
      instructorFilter,
      stateFilter,
      startDate,
      endDate,
      sortOrder,
    ]);

  const gradesByTest =
    useMemo(() => {
      const result =
        new Map<
          string,
          GradeRow[]
        >();

      for (
        const grade of grades
      ) {
        const existing =
          result.get(
            grade.practical_test_id,
          ) ?? [];

        existing.push(grade);

        result.set(
          grade.practical_test_id,
          existing,
        );
      }

      return result;
    }, [grades]);

  const reportsByTest =
    useMemo(() => {
      const result =
        new Map<
          string,
          ReportRow[]
        >();

      for (
        const report of reports
      ) {
        const existing =
          result.get(
            report.practical_test_id,
          ) ?? [];

        existing.push(report);

        result.set(
          report.practical_test_id,
          existing,
        );
      }

      return result;
    }, [reports]);

  const auditsByRequest =
    useMemo(() => {
      const result =
        new Map<
          string,
          AuditRow[]
        >();

      for (
        const audit of audits
      ) {
        const existing =
          result.get(
            audit
              .practical_test_request_id,
          ) ?? [];

        existing.push(audit);

        result.set(
          audit
            .practical_test_request_id,
          existing,
        );
      }

      return result;
    }, [audits]);

  const historyByRequest =
    useMemo(() => {
      const result =
        new Map<
          string,
          HistoryRow[]
        >();

      for (
        const entry of
        historyEntries
      ) {
        const existing =
          result.get(
            entry
              .practical_test_request_id,
          ) ?? [];

        existing.push(entry);

        result.set(
          entry
            .practical_test_request_id,
          existing,
        );
      }

      return result;
    }, [historyEntries]);

  function taskSummaries(
    testId: string,
  ) {
    const testGrades =
      gradesByTest.get(
        testId,
      ) ?? [];

    const map =
      new Map<
        string,
        TaskGradeSummary
      >();

    for (
      const grade of
      testGrades
    ) {
      const existing =
        map.get(
          grade.task_code,
        ) ?? {
          taskCode:
            grade.task_code,
          K: "—",
          R: "—",
          S: "—",
        };

      existing[
        grade.grade_component
      ] = grade.grade_value;

      map.set(
        grade.task_code,
        existing,
      );
    }

    return [
      ...map.values(),
    ].sort((a, b) =>
      a.taskCode.localeCompare(
        b.taskCode,
        undefined,
        {
          numeric: true,
        },
      ),
    );
  }

  async function openReport(
    report: ReportRow,
  ) {
    setDownloadingReportId(
      report.id,
    );

    const supabase =
      createClient();

    const {
      data,
      error,
    } = await supabase.storage
      .from(
        report.storage_bucket,
      )
      .createSignedUrl(
        report.storage_path,
        60 * 10,
      );

    setDownloadingReportId(
      null,
    );

    if (
      error ||
      !data?.signedUrl
    ) {
      window.alert(
        error?.message ||
          "The report could not be opened.",
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function clearFilters() {
    setSearch("");
    setRatingFilter("");
    setOutcomeFilter("");
    setSchoolFilter("");
    setInstructorFilter("");
    setStateFilter("");
    setStartDate("");
    setEndDate("");
    setSortOrder(
      "newest",
    );
  }

  const passCount =
    filteredRecords.filter(
      (record) =>
        record.outcome ===
        "Pass",
    ).length;

  const failCount =
    filteredRecords.filter(
      (record) =>
        record.outcome ===
        "Disapproved",
    ).length;

  return (
    <main className="w-full max-w-none px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-800">
            <Archive
              aria-hidden
              className="h-6 w-6"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Historical Records
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Search completed practical
              tests, archived requests,
              reports, EMS evaluations, and
              legacy records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRecords()
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

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-amber-700" />

          <h2 className="text-lg font-bold text-slate-900">
            Search Archive
          </h2>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search applicant, request number, FTN, rating, school, instructor, aircraft, location..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">
            Start Date

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            End Date

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

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
                All U.S. States
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
            Sort

            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target.value as
                    | "newest"
                    | "oldest",
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-5 text-sm">
            <span>
              <span className="text-slate-500">
                Records
              </span>{" "}
              <strong>
                {
                  filteredRecords.length
                }
              </strong>
            </span>

            <span>
              <span className="text-slate-500">
                Pass
              </span>{" "}
              <strong className="text-emerald-700">
                {passCount}
              </strong>
            </span>

            <span>
              <span className="text-slate-500">
                Disapproved
              </span>{" "}
              <strong className="text-red-700">
                {failCount}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-bold text-amber-700 hover:text-amber-800"
          >
            Clear Filters
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-600">
            Loading historical
            records…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="w-12 px-3 py-3" />

                  <th className="whitespace-nowrap px-3 py-3">
                    Date
                  </th>

                  <th className="px-3 py-3">
                    Applicant
                  </th>

                  <th className="px-3 py-3">
                    Rating
                  </th>

                  <th className="px-3 py-3">
                    Outcome
                  </th>

                  <th className="px-3 py-3">
                    Flight School
                  </th>

                  <th className="px-3 py-3">
                    Instructor
                  </th>

                  <th className="px-3 py-3">
                    Aircraft
                  </th>

                  <th className="px-3 py-3">
                    Location
                  </th>

                  <th className="px-3 py-3">
                    Record
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(
                  (record) => {
                    const request =
                      record.request;

                    const test =
                      record.test;

                    const expanded =
                      expandedRequestId ===
                      request.id;

                    const testReports =
                      test
                        ? reportsByTest.get(
                            test.id,
                          ) ?? []
                        : [];

                    const taskRows =
                      test
                        ? taskSummaries(
                            test.id,
                          )
                        : [];

                    const requestAudits =
                      auditsByRequest.get(
                        request.id,
                      ) ?? [];

                    const requestHistory =
                      historyByRequest.get(
                        request.id,
                      ) ?? [];

                    const dmsNumber =
                      clean(
                        test
                          ?.dms_preapproval_number,
                      ) ||
                      clean(
                        request
                          .dms_preapproval_number,
                      ) ||
                      "Not specified";

                    const fee =
                      test
                        ?.fee_amount ??
                      request.fee_amount;

                    return (
                      <Fragment key={request.id}>
                        <tr
                          className={`align-top text-sm hover:bg-slate-50 ${
                            expanded
                              ? "bg-amber-50/60"
                              : ""
                          }`}
                        >
                          <td className="px-3 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRequestId(
                                  expanded
                                    ? null
                                    : request.id,
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                              aria-label={
                                expanded
                                  ? "Collapse record"
                                  : "Open record"
                              }
                            >
                              {expanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-900">
                            {formatDate(
                              record.date,
                            )}
                          </td>

                          <td className="px-3 py-4 break-words">
                            <div className="font-bold text-slate-900">
                              {
                                request
                                  .applicant_name_snapshot
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                request
                                  .request_number
                              }
                            </div>
                          </td>

                          <td className="px-3 py-4 break-words">
                            {
                              record.ratingLabel
                            }
                          </td>

                          <td className="whitespace-nowrap px-3 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${outcomeClass(
                                record.outcome,
                              )}`}
                            >
                              {
                                record.outcome
                              }
                            </span>
                          </td>

                          <td className="px-3 py-4 break-words">
                            {
                              record.flightSchool
                            }
                          </td>

                          <td className="px-3 py-4 break-words">
                            {
                              record.instructor
                            }
                          </td>

                          <td className="px-3 py-4 break-words">
                            {
                              record.aircraft
                            }
                          </td>

                          <td className="px-3 py-4 break-words">
                            {
                              record.location
                            }
                          </td>

                          <td className="whitespace-nowrap px-3 py-4">
                            {record.isLegacy ? (
                              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                                Legacy / SharePoint
                              </span>
                            ) : test ? (
                              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                                EMT
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                Request Only
                              </span>
                            )}
                          </td>
                        </tr>

                        {expanded ? (
                          <tr
                            key={`${request.id}-detail`}
                          >
                            <td
                              colSpan={10}
                              className="bg-slate-50 px-6 py-6"
                            >
                              <div className="space-y-6">
                                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h3 className="text-lg font-bold text-slate-900">
                                        Practical
                                        Test
                                        Summary
                                      </h3>

                                      <p className="mt-1 text-sm text-slate-500">
                                        {
                                          request.request_number
                                        }
                                      </p>
                                    </div>

                                    <a
                                      href={`/examiner/requests?request=${request.id}`}
                                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Open
                                      Original
                                      Request
                                    </a>
                                  </div>

                                  <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                    <DetailField
                                      label="Applicant"
                                      value={
                                        request
                                          .applicant_name_snapshot
                                      }
                                    />

                                    <DetailField
                                      label="FTN"
                                      value={display(
                                        request
                                          .ftn_number_snapshot,
                                      )}
                                    />

                                    <DetailField
                                      label="Test Date"
                                      value={formatDate(
                                        record.date,
                                      )}
                                    />

                                    <DetailField
                                      label="Outcome"
                                      value={
                                        record.outcome
                                      }
                                    />

                                    <DetailField
                                      label="Certificate / Rating"
                                      value={
                                        record.ratingLabel
                                      }
                                    />

                                    <DetailField
                                      label="Issuance"
                                      value={display(
                                        request
                                          .issuance_type,
                                      )}
                                    />

                                    <DetailField
                                      label="Flight School"
                                      value={
                                        record.flightSchool
                                      }
                                    />

                                    <DetailField
                                      label="Recommending Instructor"
                                      value={
                                        record.instructor
                                      }
                                    />

                                    <DetailField
                                      label="Instructor Certificate"
                                      value={display(
                                        request
                                          .instructor_certificate_number,
                                      )}
                                    />

                                    <DetailField
                                      label="Aircraft"
                                      value={
                                        record.aircraft
                                      }
                                    />

                                    <DetailField
                                      label="Registration"
                                      value={display(
                                        request
                                          .aircraft_registration,
                                      )}
                                    />

                                    <DetailField
                                      label="Location"
                                      value={
                                        record.location
                                      }
                                    />

                                    <DetailField
                                      label="DMS Preapproval"
                                      value={
                                        dmsNumber
                                      }
                                    />

                                    <DetailField
                                      label="Fee"
                                      value={money(
                                        fee,
                                      )}
                                    />

                                    <DetailField
                                      label="Ground Duration"
                                      value={getEvaluationDuration(
                                        test
                                          ?.evaluation_state,
                                        "ground",
                                      )}
                                    />

                                    <DetailField
                                      label="Flight Duration"
                                      value={getEvaluationDuration(
                                        test
                                          ?.evaluation_state,
                                        "flight",
                                      )}
                                    />
                                  </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                  <div className="flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-amber-700" />

                                    <h3 className="text-lg font-bold text-slate-900">
                                      EMS
                                      Evaluation
                                    </h3>
                                  </div>

                                  {!test ? (
                                    <p className="mt-4 text-sm text-slate-500">
                                      No
                                      EMS
                                      evaluation
                                      record
                                      exists
                                      for
                                      this
                                      historical
                                      test.
                                    </p>
                                  ) : (
                                    <>
                                      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                        <DetailField
                                          label="Evaluation Status"
                                          value={formatStatus(
                                            test.evaluation_status,
                                          )}
                                        />

                                        <DetailField
                                          label="Started"
                                          value={formatDateTime(
                                            test.started_at,
                                          )}
                                        />

                                        <DetailField
                                          label="Completed"
                                          value={formatDateTime(
                                            test.completed_at,
                                          )}
                                        />

                                        <DetailField
                                          label="Result"
                                          value={formatOutcome(
                                            test.result,
                                          )}
                                        />
                                      </div>

                                      {clean(
                                        test.examiner_notes,
                                      ) ? (
                                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Examiner
                                            Notes
                                          </div>

                                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                            {
                                              test.examiner_notes
                                            }
                                          </p>
                                        </div>
                                      ) : null}

                                      <div className="mt-6">
                                        <h4 className="font-bold text-slate-900">
                                          K
                                          /
                                          R
                                          /
                                          S
                                          Task
                                          Grades
                                        </h4>

                                        {taskRows.length ? (
                                          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="min-w-full divide-y divide-slate-200">
                                              <thead className="bg-slate-50">
                                                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                  <th className="px-3 py-3">
                                                    Task
                                                  </th>

                                                  <th className="px-3 py-3">
                                                    K
                                                  </th>

                                                  <th className="px-3 py-3">
                                                    R
                                                  </th>

                                                  <th className="px-3 py-3">
                                                    S
                                                  </th>
                                                </tr>
                                              </thead>

                                              <tbody className="divide-y divide-slate-100">
                                                {taskRows.map(
                                                  (
                                                    task,
                                                  ) => (
                                                    <tr
                                                      key={
                                                        task.taskCode
                                                      }
                                                      className="text-sm"
                                                    >
                                                      <td className="px-3 py-3 font-bold text-slate-900">
                                                        {
                                                          task.taskCode
                                                        }
                                                      </td>

                                                      <td className="px-3 py-3">
                                                        {
                                                          task.K
                                                        }
                                                      </td>

                                                      <td className="px-3 py-3">
                                                        {
                                                          task.R
                                                        }
                                                      </td>

                                                      <td className="px-3 py-3">
                                                        {
                                                          task.S
                                                        }
                                                      </td>
                                                    </tr>
                                                  ),
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <p className="mt-3 text-sm text-slate-500">
                                            No
                                            normalized
                                            task
                                            grades
                                            are
                                            stored
                                            for
                                            this
                                            test.
                                          </p>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-amber-700" />

                                    <h3 className="text-lg font-bold text-slate-900">
                                      Documents
                                      &
                                      Reports
                                    </h3>
                                  </div>

                                  {testReports.length ? (
                                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                      {testReports.map(
                                        (
                                          report,
                                        ) => (
                                          <div
                                            key={
                                              report.id
                                            }
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                                          >
                                            <div>
                                              <div className="font-bold text-slate-900">
                                                {report.report_type ===
                                                "applicant_practical_test_report"
                                                  ? "Applicant Practical Test Report"
                                                  : report.report_type ===
                                                      "designee_practical_test_report"
                                                    ? "Designee Practical Test Report"
                                                    : formatStatus(
                                                        report.report_type,
                                                      )}
                                              </div>

                                              <div className="mt-1 text-xs text-slate-500">
                                                Generated{" "}
                                                {formatDateTime(
                                                  report.generated_at,
                                                )}
                                              </div>

                                              {report.released_to_applicant_at ? (
                                                <div className="mt-1 text-xs font-semibold text-emerald-700">
                                                  Released
                                                  to
                                                  applicant{" "}
                                                  {formatDateTime(
                                                    report.released_to_applicant_at,
                                                  )}
                                                </div>
                                              ) : null}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                void openReport(
                                                  report,
                                                )
                                              }
                                              disabled={
                                                downloadingReportId ===
                                                report.id
                                              }
                                              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                                            >
                                              <Download className="h-4 w-4" />

                                              {downloadingReportId ===
                                              report.id
                                                ? "Opening…"
                                                : "Open PDF"}
                                            </button>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : (
                                    <p className="mt-4 text-sm text-slate-500">
                                      No
                                      active
                                      generated
                                      reports
                                      are
                                      stored
                                      for
                                      this
                                      test.
                                    </p>
                                  )}
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                  <div className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-amber-700" />

                                    <h3 className="text-lg font-bold text-slate-900">
                                      Workflow
                                      History
                                    </h3>
                                  </div>

                                  <div className="mt-5 grid gap-6 xl:grid-cols-2">
                                    <div>
                                      <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                        Status
                                        Timeline
                                      </h4>

                                      {requestAudits.length ? (
                                        <div className="mt-3 space-y-3">
                                          {requestAudits.map(
                                            (
                                              audit,
                                            ) => (
                                              <div
                                                key={
                                                  audit.id
                                                }
                                                className="border-l-2 border-amber-300 pl-4"
                                              >
                                                <div className="font-semibold text-slate-900">
                                                  {audit.previous_status
                                                    ? `${formatStatus(
                                                        audit.previous_status,
                                                      )} → `
                                                    : ""}
                                                  {formatStatus(
                                                    audit.new_status,
                                                  )}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-500">
                                                  {formatDateTime(
                                                    audit.changed_at,
                                                  )}
                                                </div>

                                                {clean(
                                                  audit.status_reason,
                                                ) ? (
                                                  <p className="mt-1 text-sm text-slate-600">
                                                    {
                                                      audit.status_reason
                                                    }
                                                  </p>
                                                ) : null}
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      ) : (
                                        <p className="mt-3 text-sm text-slate-500">
                                          No
                                          status
                                          audit
                                          entries
                                          are
                                          available.
                                        </p>
                                      )}
                                    </div>

                                    <div>
                                      <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                        Examiner
                                        History
                                      </h4>

                                      {requestHistory.length ? (
                                        <div className="mt-3 space-y-3">
                                          {requestHistory.map(
                                            (
                                              entry,
                                            ) => (
                                              <div
                                                key={
                                                  entry.id
                                                }
                                                className="rounded-xl bg-slate-50 p-4"
                                              >
                                                <p className="whitespace-pre-wrap text-sm text-slate-700">
                                                  {
                                                    entry.entry_text
                                                  }
                                                </p>

                                                <div className="mt-2 text-xs text-slate-500">
                                                  {entry.created_by_label
                                                    ? `${entry.created_by_label} • `
                                                    : ""}
                                                  {formatDateTime(
                                                    entry.created_at,
                                                  )}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      ) : (
                                        <p className="mt-3 text-sm text-slate-500">
                                          No
                                          examiner
                                          history
                                          entries
                                          are
                                          stored
                                          for
                                          this
                                          request.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </section>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  },
                )}

                {!filteredRecords.length ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      No
                      completed
                      practical-test
                      records
                      match
                      the
                      selected
                      filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
