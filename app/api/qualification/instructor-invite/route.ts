import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendInstructorReviewLink, serviceClient } from "@/lib/qualification/instructor-review-server";

// Emails the recommending instructor a private link to review and certify a submitted package
// (Kele, Oct 31 2026). Called by the applicant page right after submitting, and by the examiner's
// "Resend instructor email" button. Row-level security decides whether the signed-in user may see the package.

export async function POST(request: Request) {
  let wizardId = "";
  try {
    wizardId = String(((await request.json()) as { wizardId?: string }).wizardId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!wizardId) return NextResponse.json({ ok: false, error: "Missing package." }, { status: 400 });

  const supabase = await createClient();
  const { data: visible } = await supabase.from("qualification_wizards").select("id").eq("id", wizardId).maybeSingle();
  if (!visible) return NextResponse.json({ ok: false, error: "Qualification package not found." }, { status: 404 });

  try {
    const result = await sendInstructorReviewLink(serviceClient(), wizardId, new URL(request.url).origin);
    return NextResponse.json({ ok: true, sentTo: result.sentTo });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "The instructor could not be emailed." }, { status: 500 });
  }
}
