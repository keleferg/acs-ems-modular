/* Loads a request's POA focus areas (Kele, Nov 11 2026). See lib/poa/focus.ts. */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  acsPrefixFor,
  knowledgeTestAreas,
  retestAreas,
  trendAreas,
  type FocusArea,
  type GradeRow,
} from "./focus";

export type FocusSummary = {
  areas: FocusArea[];
  /** Who the trends are about, for the summary box. Null when the request doesn't say. */
  instructorName: string | null;
  schoolName: string | null;
  stateName: string | null;
  knowledgeTestFound: boolean;
};

type RequestRow = {
  id: string;
  certificate_sought: string | null;
  category_sought: string | null;
  rating_sought: string | null;
  flight_school_id: string | null;
  flight_school_name_snapshot: string | null;
  instructor_profile_id: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  flight_airport_id: string | null;
  is_retest: boolean | null;
  original_request_id: string | null;
};

const REQUEST_FIELDS =
  "id, certificate_sought, category_sought, rating_sought, flight_school_id, flight_school_name_snapshot, instructor_profile_id, instructor_name, instructor_email, flight_airport_id, is_retest, original_request_id";

const clean = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
const instructorKey = (row: RequestRow) =>
  row.instructor_profile_id || clean(row.instructor_email) || clean(row.instructor_name) || null;

async function inChunks<T>(ids: string[], load: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 200) out.push(...(await load(ids.slice(i, i + 200))));
  return out;
}

export async function loadFocusAreas(supabase: SupabaseClient, requestId: string, testPrefix: string): Promise<FocusSummary | null> {
  const { data: request } = await supabase.from("practical_test_requests").select(REQUEST_FIELDS).eq("id", requestId).maybeSingle();
  if (!request) return null;
  const current = request as RequestRow;
  const prefix = testPrefix || acsPrefixFor(current.certificate_sought, current.category_sought, current.rating_sought);
  const areas: FocusArea[] = [];

  const { data: reports } = await supabase
    .from("qualification_knowledge_test_reports")
    .select("missed_codes")
    .eq("practical_test_request_id", requestId);
  const missed = (reports ?? []).flatMap((row) => (row.missed_codes as string[] | null) ?? []);
  areas.push(...knowledgeTestAreas(missed, prefix));

  // History: every other request the examiner can see for the same ACS.
  const { data: history } = await supabase.from("practical_test_requests").select(REQUEST_FIELDS).neq("id", requestId).limit(10000);
  const sameAcs = ((history ?? []) as RequestRow[]).filter(
    (row) => acsPrefixFor(row.certificate_sought, row.category_sought, row.rating_sought) === prefix,
  );
  const requestIds = sameAcs.map((row) => row.id);
  const tests = await inChunks(requestIds, async (chunk) => {
    const { data } = await supabase.from("practical_tests").select("id, practical_test_request_id").in("practical_test_request_id", chunk);
    return (data ?? []) as { id: string; practical_test_request_id: string }[];
  });
  const grades = await inChunks(
    tests.map((test) => test.id),
    async (chunk) => {
      const { data } = await supabase
        .from("practical_test_grades")
        .select("practical_test_id, task_code, grade_component, grade_value")
        .in("practical_test_id", chunk);
      return (data ?? []) as { practical_test_id: string; task_code: string; grade_component: string; grade_value: string }[];
    },
  );
  const requestByTest = new Map(tests.map((test) => [test.id, test.practical_test_request_id]));
  const gradesByRequest = new Map<string, GradeRow[]>();
  for (const grade of grades) {
    const owner = requestByTest.get(grade.practical_test_id);
    if (!owner) continue;
    const list = gradesByRequest.get(owner) ?? [];
    list.push({ testId: grade.practical_test_id, taskCode: grade.task_code, component: grade.grade_component, value: grade.grade_value });
    gradesByRequest.set(owner, list);
  }

  if (current.is_retest && current.original_request_id) {
    areas.push(...retestAreas(gradesByRequest.get(current.original_request_id) ?? [], prefix));
  }

  // US state of each test airport.
  const airportIds = [...new Set([current.flight_airport_id, ...sameAcs.map((row) => row.flight_airport_id)].filter(Boolean) as string[])];
  const airports = await inChunks(airportIds, async (chunk) => {
    const { data } = await supabase.from("faa_airports").select("id, state_code, state_name").in("id", chunk);
    return (data ?? []) as { id: string; state_code: string | null; state_name: string | null }[];
  });
  const stateById = new Map(airports.map((airport) => [airport.id, airport]));
  const currentState = current.flight_airport_id ? stateById.get(current.flight_airport_id) ?? null : null;

  const gradesWhere = (keep: (row: RequestRow) => boolean) =>
    sameAcs.filter(keep).flatMap((row) => gradesByRequest.get(row.id) ?? []);

  const myInstructor = instructorKey(current);
  if (myInstructor) {
    areas.push(...trendAreas("instructor", gradesWhere((row) => instructorKey(row) === myInstructor), prefix, "with this instructor"));
  }
  if (current.flight_school_id) {
    areas.push(...trendAreas("school", gradesWhere((row) => row.flight_school_id === current.flight_school_id), prefix, "from this school"));
  }
  if (currentState?.state_code) {
    areas.push(
      ...trendAreas(
        "state",
        gradesWhere((row) => Boolean(row.flight_airport_id) && stateById.get(row.flight_airport_id!)?.state_code === currentState.state_code),
        prefix,
        `in ${currentState.state_name ?? currentState.state_code}`,
      ),
    );
  }

  return {
    areas,
    instructorName: current.instructor_name?.trim() || null,
    schoolName: current.flight_school_name_snapshot?.trim() || null,
    stateName: currentState?.state_name ?? currentState?.state_code ?? null,
    knowledgeTestFound: (reports ?? []).length > 0,
  };
}
