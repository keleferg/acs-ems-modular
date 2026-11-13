import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { buildStageCheckSummaryEmail } from "@/lib/email/practical-test";

/*
 * EMT -> EMS interface (Kele, Nov 14 2026): the EMT gradesheet sends the Stage Check Summary Report PDF
 * here; EMS emails it to the signed-in instructor who gave the stage check and to the recommending
 * instructor. Nothing is saved. Instructors only; allowed EMT origins come from EMT_WEB_ORIGINS.
 * See BOUNDARY.md.
 */

type StageCheckEmailBody = {
  pdfBase64?: string;
  fileName?: string;
  recommendingInstructorEmail?: string;
  recommendingInstructorName?: string;
  studentName?: string;
  stageCheckLabel?: string;
  phaseOfTraining?: string;
  stageCheckDate?: string;
  readinessLabel?: string;
  flightSchool?: string;
  aircraft?: string;
};

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

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

function clean(value: unknown, max = 200) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

async function handlePost(request: Request): Promise<Response> {
  let body: StageCheckEmailBody;
  try {
    body = (await request.json()) as StageCheckEmailBody;
  } catch {
    return fail("Invalid request body.", 400);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) return fail("Transactional email is not fully configured.", 503);

  const bearerToken = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization")?.trim() ?? "")?.[1]?.trim();
  if (!bearerToken) return fail("Authentication is required.", 401);

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(bearerToken);
  if (userError || !user?.email) return fail("Authentication is required.", 401);

  const { data: isInstructor, error: roleError } = await supabase.rpc("has_role", { required_role: "instructor" });
  if (roleError) return fail("Your access could not be checked.", 500);
  if (!isInstructor) return fail("Only instructors can send stage check reports.", 403);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  const givenByName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

  const recommendingEmail = clean(body.recommendingInstructorEmail, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(recommendingEmail)) return fail("Enter a valid email for the recommending instructor.", 400);

  const pdfBase64 = String(body.pdfBase64 ?? "");
  const pdf = Buffer.from(pdfBase64, "base64");
  if (!pdf.length || pdf.length > MAX_PDF_BYTES || pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return fail("The Stage Check Summary Report PDF is missing or invalid.", 400);
  }

  const studentName = clean(body.studentName) || "Student";
  const fileName =
    (clean(body.fileName, 120).replace(/[^A-Za-z0-9._-]+/g, "-") || "Stage-Check-Summary-Report").replace(/\.pdf$/i, "") + ".pdf";

  const instructorEmail = user.email.toLowerCase();
  const recipients = [...new Set([instructorEmail, recommendingEmail])];

  const email = buildStageCheckSummaryEmail({
    studentName,
    stageCheckLabel: clean(body.stageCheckLabel) || "Stage check",
    phaseOfTraining: clean(body.phaseOfTraining, 80),
    stageCheckDate: clean(body.stageCheckDate, 40),
    readinessLabel: clean(body.readinessLabel),
    givenByName: clean(givenByName) || instructorEmail,
    recommendingInstructorName: clean(body.recommendingInstructorName) || recommendingEmail,
    flightSchool: clean(body.flightSchool),
    aircraft: clean(body.aircraft),
  });

  const resend = new Resend(resendApiKey);
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    replyTo: instructorEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [{ filename: fileName, content: pdf, contentType: "application/pdf" }],
  });

  if (sendError) {
    console.error("Stage check report email failed:", sendError);
    return fail(sendError.message || "The email could not be sent.", 502);
  }

  return NextResponse.json({ ok: true, sentTo: recipients });
}
