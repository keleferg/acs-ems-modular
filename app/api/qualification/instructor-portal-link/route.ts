import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hashToken, INSTRUCTOR_LINK_DAYS, serviceClient } from "@/lib/qualification/instructor-review-server";

// "Validate Qualification Review" in the instructor portal (Kele, Oct 31 2026): a signed-in instructor
// opens their student's submitted package in the same review page the emailed link uses.

export async function POST(request: Request) {
  let wizardId = "";
  try {
    wizardId = String(((await request.json()) as { wizardId?: string }).wizardId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!wizardId) return NextResponse.json({ ok: false, error: "Missing package." }, { status: 400 });

  const supabase = await createClient();
  const { data: allowed, error } = await supabase.rpc("instructor_can_review", { p_wizard_id: wizardId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "This package isn't waiting for your review, or the student didn't list your CFI certificate number." }, { status: 403 });
  }

  try {
    const service = serviceClient();
    const { data: wizard } = await service.from("qualification_wizards").select("id, current_revision_number").eq("id", wizardId).maybeSingle();
    if (!wizard) throw new Error("Qualification package not found.");
    const { data: revision } = await service
      .from("qualification_wizard_revisions")
      .select("id")
      .eq("wizard_id", wizard.id)
      .eq("revision_number", wizard.current_revision_number)
      .maybeSingle();
    if (!revision) throw new Error("The submitted revision was not found.");
    const { data: user } = await supabase.auth.getUser();
    const token = randomBytes(32).toString("base64url");
    const { error: tokenError } = await service.from("qualification_instructor_review_tokens").insert({
      revision_id: revision.id,
      token_hash: hashToken(token),
      instructor_email: user?.user?.email ?? "instructor-portal",
      expires_at: new Date(Date.now() + INSTRUCTOR_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (tokenError) throw new Error(tokenError.message);
    return NextResponse.json({ ok: true, url: `/instructor-review?t=${encodeURIComponent(token)}` });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "The review could not be opened." }, { status: 500 });
  }
}
