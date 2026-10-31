import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { buildInstructorDecisionExaminerEmail, buildInstructorReviewRequestEmail } from "@/lib/email/practical-test";

// Server-only helpers for the instructor certification link (Kele, Oct 31 2026).
// The instructor has no account: a random token in the emailed link is checked against its SHA-256
// in qualification_instructor_review_tokens, using the service key.

export const INSTRUCTOR_LINK_DAYS = 14;

export const INSTRUCTOR_CERTIFICATION_STATEMENT =
  "I have reviewed this applicant's records, including the logbook, endorsements, certificates and knowledge test report, " +
  "and I certify that the information in this pretest qualification package is accurate and that the applicant meets the " +
  "aeronautical knowledge, experience and endorsement requirements for this practical test.";

export function serviceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Instructor review is not configured on the server.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type Service = ReturnType<typeof serviceClient>;

async function examinerReplyTo(service: Service, examinerProfileId: string | null) {
  if (!examinerProfileId) return { replyTo: undefined as string | undefined, examinerEmail: undefined as string | undefined };
  const { data: designee } = await service
    .from("examiner_designee_profiles")
    .select("reply_to_email, email")
    .eq("profile_id", examinerProfileId)
    .maybeSingle();
  let examinerEmail = designee?.email?.trim() || undefined;
  if (!examinerEmail) {
    const { data: profile } = await service.from("profiles").select("email").eq("id", examinerProfileId).maybeSingle();
    examinerEmail = profile?.email?.trim() || undefined;
  }
  return { replyTo: designee?.reply_to_email?.trim() || examinerEmail, examinerEmail };
}

function mailer() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email is not configured on the server.");
  return { resend: new Resend(apiKey), from };
}

/** Creates a new link for the current revision and emails it to the instructor on the request. */
export async function sendInstructorReviewLink(service: Service, wizardId: string, origin: string) {
  const { data: wizard, error: wizardError } = await service
    .from("qualification_wizards")
    .select("id, status, current_revision_number, examiner_profile_id, practical_test_request_id")
    .eq("id", wizardId)
    .maybeSingle();
  if (wizardError || !wizard) throw new Error("Qualification package not found.");
  if (wizard.status !== "awaiting_instructor") throw new Error("This package is not waiting for the instructor.");

  const { data: revision } = await service
    .from("qualification_wizard_revisions")
    .select("id")
    .eq("wizard_id", wizard.id)
    .eq("revision_number", wizard.current_revision_number)
    .maybeSingle();
  if (!revision) throw new Error("The submitted revision was not found.");

  const { data: review } = await service
    .from("qualification_instructor_reviews")
    .select("instructor_name, instructor_email")
    .eq("revision_id", revision.id)
    .maybeSingle();
  const email = review?.instructor_email?.trim();
  if (!email) throw new Error("The request has no instructor email.");

  const { data: request } = await service
    .from("practical_test_requests")
    .select("request_number, applicant_name_snapshot, certificate_sought, rating_sought, scheduled_start_at")
    .eq("id", wizard.practical_test_request_id)
    .maybeSingle();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INSTRUCTOR_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: tokenError } = await service.from("qualification_instructor_review_tokens").insert({
    revision_id: revision.id,
    token_hash: hashToken(token),
    instructor_email: email,
    expires_at: expiresAt,
  });
  if (tokenError) throw new Error(tokenError.message);

  const message = buildInstructorReviewRequestEmail({
    instructorName: review?.instructor_name ?? "",
    applicantName: request?.applicant_name_snapshot ?? "The applicant",
    requestNumber: request?.request_number ?? "",
    certificateSought: request?.certificate_sought ?? "",
    ratingSought: request?.rating_sought ?? "",
    scheduledStartAt: request?.scheduled_start_at ?? null,
    reviewUrl: `${origin.replace(/\/$/, "")}/instructor-review?t=${encodeURIComponent(token)}`,
    expiresAt,
  });
  const { replyTo } = await examinerReplyTo(service, wizard.examiner_profile_id);
  const { resend, from } = mailer();
  const { error: sendError } = await resend.emails.send({
    from,
    to: [email],
    ...(replyTo ? { replyTo } : {}),
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (sendError) throw new Error(`The email to the instructor could not be sent: ${sendError.message}`);
  return { sentTo: email };
}

/** Tells the examiner what the instructor decided. Failures are logged, not thrown. */
export async function notifyExaminerOfInstructorDecision(
  service: Service,
  wizardId: string,
  instructorName: string,
  certified: boolean,
  notes: string | null,
  origin: string,
) {
  try {
    const { data: wizard } = await service
      .from("qualification_wizards")
      .select("examiner_profile_id, practical_test_request_id")
      .eq("id", wizardId)
      .maybeSingle();
    if (!wizard) return;
    const { examinerEmail } = await examinerReplyTo(service, wizard.examiner_profile_id);
    if (!examinerEmail) return;
    const { data: request } = await service
      .from("practical_test_requests")
      .select("request_number, applicant_name_snapshot")
      .eq("id", wizard.practical_test_request_id)
      .maybeSingle();
    const message = buildInstructorDecisionExaminerEmail({
      applicantName: request?.applicant_name_snapshot ?? "Applicant",
      requestNumber: request?.request_number ?? "",
      instructorName,
      certified,
      notes,
      examinerPortalUrl: `${origin.replace(/\/$/, "")}/examiner/requests`,
    });
    const { resend, from } = mailer();
    await resend.emails.send({ from, to: [examinerEmail], subject: message.subject, html: message.html, text: message.text });
  } catch (cause) {
    console.error("Instructor decision email failed:", cause);
  }
}
