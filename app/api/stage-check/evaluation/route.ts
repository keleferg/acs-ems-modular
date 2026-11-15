import { NextResponse } from "next/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildStageCheckEvaluation,
  extractCodes,
  type DpePoa,
  type LibraryQuestion,
  type StageCheckTask,
} from "@/lib/stage-check/evaluation";

/*
 * EMT -> EMS interface (Kele, Nov 14 2026): builds the Ground / Flight Evaluation for an End of
 * Course stage check. EMT sends the stage check's ACS Tasks and the student's knowledge-test codes;
 * EMS picks the oral questions from the examiner question library on the server and returns only
 * the picked questions (with answers) and the flight Task order. Instructors never read the library
 * itself, and nothing is saved. Instructors only; EMT origins from EMT_WEB_ORIGINS. See BOUNDARY.md.
 *
 * "Recent DPE" questions (left out): questions in a DPE POA created in the last 90 days that was
 * assigned to a practical test request or used in a graded test. Practice/template builds with no
 * request don't count. The "never the same as a DPE POA" checks compare against every POA.
 */

type Body = {
  tasks?: { code?: unknown; name?: unknown; ground?: unknown }[];
  writtenCodes?: unknown[];
  stageCheckLabel?: unknown;
};

const RECENT_DAYS = 90;
const PAGE = 1000;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (process.env.EMT_WEB_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const response = await handlePost(request);
  for (const [key, value] of Object.entries(corsHeaders(request))) response.headers.set(key, value);
  return response;
}

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

async function handlePost(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Invalid request body.", 400);
  }

  // Signed-in instructor (same check as /api/email/stage-check).
  const bearerToken = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization")?.trim() ?? "")?.[1]?.trim();
  if (!bearerToken) return fail("Authentication is required.", 401);
  const asUser = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser(bearerToken);
  if (userError || !userData?.user) return fail("Authentication is required.", 401);
  const { data: isInstructor, error: roleError } = await asUser.rpc("has_role", { required_role: "instructor" });
  if (roleError) return fail("Your access could not be checked.", 500);
  if (!isInstructor) return fail("Only instructors can build a stage check evaluation.", 403);

  // Tasks from EMT (the stage check's ACS Tasks).
  const tasks: StageCheckTask[] = (Array.isArray(body.tasks) ? body.tasks : [])
    .slice(0, 250)
    .map((t) => ({
      code: String(t?.code ?? "").trim().toUpperCase(),
      name: String(t?.name ?? "").trim().slice(0, 200),
      ground: t?.ground === true,
    }))
    .filter((t) => /^[A-Z]{2,3}\.[IVX]+\.[A-Z]$/.test(t.code));
  if (!tasks.length) return fail("Choose the Type of Stage Check first.", 400);
  const prefix = tasks[0].code.split(".")[0];
  if (tasks.some((t) => !t.code.startsWith(`${prefix}.`))) return fail("The Tasks must all be from one ACS.", 400);
  const writtenCodes = (Array.isArray(body.writtenCodes) ? body.writtenCodes : [])
    .slice(0, 200)
    .flatMap((c) => extractCodes(String(c ?? "")));

  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return fail("The question library is not available.", 503);
  const db: SupabaseClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const [questions, applicability, poas, generatedQuestions, flightTasks, testedPoas] = await Promise.all([
      allRows<{ id: string; question: string; answer: string | null; reference: string | null; task_name: string | null; acs_reference: string | null }>(
        (from, to) => db.from("poa_questions").select("id,question,answer,reference,task_name,acs_reference").eq("is_active", true).order("id").range(from, to),
      ),
      allRows<{ question_id: string; acs_reference: string | null }>((from, to) =>
        db.from("poa_question_acs_applicability").select("question_id,acs_reference").order("id").range(from, to),
      ),
      allRows<{ id: string; title: string | null; created_at: string; practical_test_request_id: string | null }>((from, to) =>
        db.from("generated_plan_of_actions").select("id,title,created_at,practical_test_request_id").order("id").range(from, to),
      ),
      allRows<{ generated_plan_of_action_id: string; question_library_id: string | null; sort_order: number | null; acs_reference_snapshot: string | null }>(
        (from, to) =>
          db
            .from("generated_plan_of_action_questions")
            .select("generated_plan_of_action_id,question_library_id,sort_order,acs_reference_snapshot")
            .order("id")
            .range(from, to),
      ),
      allRows<{ generated_plan_of_action_id: string; acs_task_code_snapshot: string | null; sort_order: number | null; is_required: boolean | null }>(
        (from, to) =>
          db
            .from("generated_plan_of_action_flight_tasks")
            .select("generated_plan_of_action_id,acs_task_code_snapshot,sort_order,is_required")
            .order("id")
            .range(from, to),
      ),
      allRows<{ generated_plan_of_action_id: string | null }>((from, to) =>
        db.from("practical_test_poa_questions").select("generated_plan_of_action_id").not("generated_plan_of_action_id", "is", null).range(from, to),
      ),
    ]);

    const codesByQuestion = new Map<string, string[]>();
    for (const row of applicability) {
      const list = codesByQuestion.get(row.question_id) ?? [];
      list.push(...extractCodes(row.acs_reference ?? ""));
      codesByQuestion.set(row.question_id, list);
    }
    const library: LibraryQuestion[] = questions.map((q) => ({
      id: q.id,
      question: q.question ?? "",
      answer: q.answer,
      reference: q.reference,
      task_name: q.task_name,
      codes: [...new Set([...extractCodes(q.acs_reference ?? ""), ...(codesByQuestion.get(q.id) ?? [])])],
    }));

    // DPE POAs: questions and flight Tasks in order.
    const byPoa = new Map<string, DpePoa & { prefixes: string[] }>();
    for (const p of poas) byPoa.set(p.id, { id: p.id, questionIds: [], flightTaskCodes: [], prefixes: [] });
    const sortBy = <T extends { sort_order: number | null }>(rows: T[]) => [...rows].sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9));
    for (const q of sortBy(generatedQuestions)) {
      const poa = byPoa.get(q.generated_plan_of_action_id);
      if (!poa) continue;
      if (q.question_library_id) poa.questionIds.push(q.question_library_id);
      const first = extractCodes(q.acs_reference_snapshot ?? "")[0];
      if (first) poa.prefixes.push(first.split(".")[0]);
    }
    for (const t of sortBy(flightTasks)) {
      if (t.is_required === false) continue;
      const poa = byPoa.get(t.generated_plan_of_action_id);
      const code = String(t.acs_task_code_snapshot ?? "").trim().toUpperCase();
      if (poa && code) poa.flightTaskCodes.push(code);
    }

    // Recently used in a real DPE evaluation (assigned to a request or used in a graded test).
    const tested = new Set(testedPoas.map((r) => r.generated_plan_of_action_id).filter(Boolean) as string[]);
    const since = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
    const recentlyUsedIds = new Set<string>();
    for (const p of poas) {
      if (Date.parse(p.created_at) < since) continue;
      if (!p.practical_test_request_id && !tested.has(p.id)) continue;
      byPoa.get(p.id)?.questionIds.forEach((id) => recentlyUsedIds.add(id));
    }

    // Average DPE POA size for this ACS (original issuance POAs; fewer than 2 → 118).
    const mode = (list: string[]) => {
      const counts = new Map<string, number>();
      list.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    };
    const sizes = poas
      .filter((p) => !/additional rating/i.test(p.title ?? ""))
      .map((p) => byPoa.get(p.id)!)
      .filter((p) => mode(p.prefixes) === prefix && p.questionIds.length)
      .map((p) => p.questionIds.length);
    const dpeAverageQuestionCount = sizes.length >= 2 ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 118;

    const evaluation = buildStageCheckEvaluation({
      tasks,
      writtenCodes,
      library,
      recentlyUsedIds,
      dpePoas: [...byPoa.values()],
      dpeAverageQuestionCount,
    });

    const label = String(body.stageCheckLabel ?? "").trim().slice(0, 120);
    return NextResponse.json({
      ok: true,
      evaluation: {
        id: `stage-check-${crypto.randomUUID()}`,
        title: label ? `Stage Check — ${label}` : "Stage Check",
        scenario_name: "End of Course Stage Check",
        notes: "Built for this stage check from the question library. Not a DPE Plan of Action.",
        ...evaluation,
      },
    });
  } catch (error) {
    console.error("stage-check evaluation", error);
    return fail("The stage check evaluation could not be built. Try again.", 500);
  }
}
