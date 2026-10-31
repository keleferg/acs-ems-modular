import { NextResponse } from "next/server";

import {
  hashToken,
  INSTRUCTOR_CERTIFICATION_STATEMENT,
  notifyExaminerOfInstructorDecision,
  serviceClient,
} from "@/lib/qualification/instructor-review-server";

// The instructor's review page (no sign-in). Every call carries the emailed token, checked against
// qualification_instructor_review_tokens (SHA-256, 14-day expiry, one package). Kele, Oct 31 2026.

const BUCKET = "qualification-evidence";

type TokenRow = { id: string; revision_id: string; expires_at: string; used_at: string | null };

async function checkToken(service: ReturnType<typeof serviceClient>, token: string) {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return { error: "This link is not valid." };
  const { data } = await service
    .from("qualification_instructor_review_tokens")
    .select("id, revision_id, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  const row = data as TokenRow | null;
  if (!row) return { error: "This link is not valid." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { error: "This link has expired. Ask the applicant or the examiner to send a new one." };
  }
  const { data: revision } = await service
    .from("qualification_wizard_revisions")
    .select("id, wizard_id, revision_number")
    .eq("id", row.revision_id)
    .maybeSingle();
  if (!revision) return { error: "This qualification package was not found." };
  const { data: wizard } = await service
    .from("qualification_wizards")
    .select("id, status, current_revision_number, rule_set_id, practical_test_request_id, instructor_name, instructor_certificate_number")
    .eq("id", revision.wizard_id)
    .maybeSingle();
  if (!wizard) return { error: "This qualification package was not found." };
  const waiting = wizard.status === "awaiting_instructor" && wizard.current_revision_number === revision.revision_number;
  return { row, revision, wizard, waiting };
}

export async function GET(request: Request) {
  try {
    const service = serviceClient();
    const check = await checkToken(service, new URL(request.url).searchParams.get("t") ?? "");
    if ("error" in check) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });
    const { row, revision, wizard, waiting } = check;

    const { data: review } = await service
      .from("qualification_instructor_reviews")
      .select("status, instructor_name, instructor_certificate_number, certified_at, review_notes")
      .eq("revision_id", revision.id)
      .maybeSingle();

    if (!waiting) {
      return NextResponse.json({ ok: true, waiting: false, decision: review?.status ?? null, decidedAt: review?.certified_at ?? null });
    }
    if (!row.used_at) await service.from("qualification_instructor_review_tokens").update({ opened_at: new Date().toISOString() }).eq("id", row.id);

    const [requestResult, ruleSetResult, requirementResult, answerResult, evidenceResult] = await Promise.all([
      service
        .from("practical_test_requests")
        .select("request_number, applicant_name_snapshot, certificate_sought, rating_sought, scheduled_start_at, scheduled_location")
        .eq("id", wizard.practical_test_request_id)
        .maybeSingle(),
      service.from("qualification_rule_sets").select("display_name").eq("id", wizard.rule_set_id).maybeSingle(),
      service
        .from("qualification_requirements")
        .select("id, section_code, requirement_code, title, description, regulation_citation, required, rule_config, display_config, sort_order")
        .eq("rule_set_id", wizard.rule_set_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      service
        .from("qualification_answers")
        .select("requirement_id, answer_value, applicant_notes, automated_result, automated_result_message")
        .eq("revision_id", revision.id),
      service
        .from("qualification_evidence")
        .select("id, requirement_id, object_path, file_name, mime_type, caption")
        .eq("revision_id", revision.id)
        .order("created_at", { ascending: true }),
    ]);

    const evidence = await Promise.all(
      (evidenceResult.data ?? []).map(async (item) => {
        const { data } = await service.storage.from(BUCKET).createSignedUrl(item.object_path, 60 * 60);
        return { id: item.id, requirement_id: item.requirement_id, file_name: item.file_name, mime_type: item.mime_type, caption: item.caption, url: data?.signedUrl ?? null };
      }),
    );

    return NextResponse.json({
      ok: true,
      waiting: true,
      request: requestResult.data,
      ruleSetName: ruleSetResult.data?.display_name ?? "",
      instructor: {
        name: review?.instructor_name ?? wizard.instructor_name ?? "",
        certificateNumber: review?.instructor_certificate_number ?? wizard.instructor_certificate_number ?? "",
      },
      statement: INSTRUCTOR_CERTIFICATION_STATEMENT,
      requirements: requirementResult.data ?? [],
      answers: answerResult.data ?? [],
      evidence,
      expiresAt: row.expires_at,
    });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const service = serviceClient();
    const body = (await request.json()) as { t?: string; action?: string; name?: string; certificateNumber?: string; agree?: boolean; notes?: string };
    const check = await checkToken(service, String(body.t ?? ""));
    if ("error" in check) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });
    if (!check.waiting) return NextResponse.json({ ok: false, error: "This package is no longer waiting for your review." }, { status: 409 });

    const action = body.action === "certify" ? "certify" : body.action === "request_changes" ? "request_changes" : "";
    if (!action) return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
    if (action === "certify" && body.agree !== true) {
      return NextResponse.json({ ok: false, error: "Tick the certification statement to certify." }, { status: 400 });
    }

    const name = String(body.name ?? "").trim().slice(0, 200);
    const certificateNumber = String(body.certificateNumber ?? "").trim().slice(0, 40);
    const notes = String(body.notes ?? "").trim().slice(0, 4000);
    const { error } = await service.rpc("instructor_decide_pretest_qualification", {
      p_revision_id: check.revision.id,
      p_action: action,
      p_instructor_name: name,
      p_certificate_number: certificateNumber,
      p_statement: action === "certify" ? INSTRUCTOR_CERTIFICATION_STATEMENT : null,
      p_notes: notes || null,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await service.from("qualification_instructor_review_tokens").update({ used_at: new Date().toISOString() }).eq("id", check.row.id);
    await notifyExaminerOfInstructorDecision(service, check.wizard.id, name || "The instructor", action === "certify", notes || null, new URL(request.url).origin);
    return NextResponse.json({ ok: true, action });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status: 500 });
  }
}
