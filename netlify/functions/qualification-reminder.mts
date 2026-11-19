import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  buildQualificationReminderApplicantEmail,
  buildQualificationReminderInstructorEmail,
} from "../../lib/email/practical-test";
import { sendInstructorReviewLink } from "../../lib/qualification/instructor-review-server";

// Daily pretest qualification reminders (Kele, Oct 30 2026; daily since Nov 18 2026).
// From 4 days before a confirmed or scheduled practical test until the checkride time:
//   applicant_submit   - the student, once a day until they submit (starts again if the package is
//                        sent back for correction by the examiner or the instructor)
//   instructor_submit  - the recommending instructor, the same days: their student still needs to submit
//   instructor_signoff - the instructor, once a day after the student submits, while the package waits
//                        for their sign-off; each one carries a fresh review link
// Each send is recorded in qualification_reminder_sends (one per kind per ~24 hours). Only tests with
// a qualification list are reminded. The qualification opens 4 days before the test
// (initialize_pretest_qualification), when the first reminder goes out.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Hourly runs: "a day" since the last send, with an hour of slack so the time of day doesn't drift.
const RESEND_AFTER_MS = 23 * HOUR_MS;
const STATUSES = ["confirmed", "scheduled"];
// Not submitted yet (or sent back): the student and instructor get the "please submit" reminder.
const NOT_SUBMITTED = new Set(["not_available", "available", "applicant_in_progress", "instructor_changes_required"]);

type Kind = "applicant_submit" | "instructor_submit" | "instructor_signoff";

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");

  if (!supabaseUrl || !serviceKey || !resendApiKey || !fromEmail || !siteUrl) {
    throw new Error("Qualification reminder function is missing required environment configuration.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(resendApiKey);

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 4 * DAY_MS).toISOString();

  const { data: requests, error } = await supabase
    .from("practical_test_requests")
    .select(`
      id,
      request_number,
      applicant_name_snapshot,
      applicant_email_snapshot,
      certificate_sought,
      rating_sought,
      practical_test_type_id,
      assigned_examiner_profile_id,
      scheduled_start_at,
      scheduled_location,
      instructor_name,
      instructor_email
    `)
    .in("status", STATUSES)
    .gt("scheduled_start_at", now.toISOString())
    .lte("scheduled_start_at", windowEnd)
    .order("scheduled_start_at", { ascending: true })
    .limit(200);

  if (error) throw error;

  // Only tests that have a qualification list; others would land on "no rules package".
  const { data: ruleSets } = await supabase
    .from("qualification_rule_sets")
    .select("practical_test_type_id")
    .eq("is_active", true);
  const typesWithList = new Set((ruleSets ?? []).map((row) => String(row.practical_test_type_id)));

  const counts = { sent: 0, skipped: 0, failed: 0 };
  const replyToCache = new Map<string, string | undefined>();

  async function replyToFor(examinerId: string | null) {
    if (!examinerId) return undefined;
    if (!replyToCache.has(examinerId)) {
      const { data: designee } = await supabase
        .from("examiner_designee_profiles")
        .select("reply_to_email, email")
        .eq("profile_id", examinerId)
        .maybeSingle();
      replyToCache.set(examinerId, designee?.reply_to_email?.trim() || designee?.email?.trim() || undefined);
    }
    return replyToCache.get(examinerId);
  }

  // Sent within the last day? Then this kind waits.
  async function sentRecently(requestId: string, kind: Kind) {
    const { data } = await supabase
      .from("qualification_reminder_sends")
      .select("sent_at")
      .eq("practical_test_request_id", requestId)
      .eq("reminder_kind", kind)
      .gt("sent_at", new Date(now.getTime() - RESEND_AFTER_MS).toISOString())
      .limit(1);
    return Boolean(data?.length);
  }

  async function everSent(requestId: string, kind: Kind) {
    const { data } = await supabase
      .from("qualification_reminder_sends")
      .select("id")
      .eq("practical_test_request_id", requestId)
      .eq("reminder_kind", kind)
      .limit(1);
    return Boolean(data?.length);
  }

  async function record(requestId: string, kind: Kind, email: string) {
    await supabase
      .from("qualification_reminder_sends")
      .insert({ practical_test_request_id: requestId, reminder_kind: kind, recipient_email: email, sent_at: now.toISOString() });
  }

  async function send(kind: Kind, requestId: string, to: string, replyTo: string | undefined, message: { subject: string; html: string; text: string }) {
    const { error: sendError } = await resend.emails.send({
      from: fromEmail!,
      to: [to],
      ...(replyTo ? { replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (sendError) {
      counts.failed += 1;
      console.error(`Qualification reminder (${kind}) for ${requestId} failed:`, sendError.message);
      return false;
    }
    await record(requestId, kind, to);
    counts.sent += 1;
    return true;
  }

  for (const request of requests ?? []) {
    if (!typesWithList.has(String(request.practical_test_type_id))) {
      counts.skipped += 1;
      continue;
    }

    const { data: wizard } = await supabase
      .from("qualification_wizards")
      .select("id, status")
      .eq("practical_test_request_id", request.id)
      .maybeSingle();

    // No wizard yet = the student hasn't opened it, so it isn't submitted.
    const status = wizard ? String(wizard.status) : "not_available";
    const replyTo = await replyToFor(request.assigned_examiner_profile_id);
    const applicantEmail = request.applicant_email_snapshot?.trim().toLowerCase();
    const instructorEmail = request.instructor_email?.trim().toLowerCase();

    if (NOT_SUBMITTED.has(status)) {
      // 1. The student.
      if (applicantEmail && !(await sentRecently(request.id, "applicant_submit"))) {
        const isFollowUp = await everSent(request.id, "applicant_submit");
        const message = buildQualificationReminderApplicantEmail({
          applicantName: request.applicant_name_snapshot ?? "",
          requestNumber: request.request_number,
          certificateSought: request.certificate_sought ?? "",
          ratingSought: request.rating_sought ?? "",
          scheduledStartAt: request.scheduled_start_at,
          scheduledLocation: request.scheduled_location,
          qualificationUrl: `${siteUrl}/applicant/qualification?request=${encodeURIComponent(request.id)}`,
          isFollowUp,
        });
        if (await send("applicant_submit", request.id, applicantEmail, replyTo, message)) {
          // Kept for the request page and older reports.
          await supabase
            .from("practical_test_requests")
            .update({ qualification_reminder_start_at: request.scheduled_start_at, qualification_reminder_sent_at: now.toISOString() })
            .eq("id", request.id);
        }
      } else {
        counts.skipped += 1;
      }

      // 2. The recommending instructor: "your student still needs to submit".
      if (instructorEmail && instructorEmail !== applicantEmail && !(await sentRecently(request.id, "instructor_submit"))) {
        const message = buildQualificationReminderInstructorEmail({
          instructorName: request.instructor_name ?? "",
          applicantName: request.applicant_name_snapshot ?? "Your student",
          requestNumber: request.request_number,
          certificateSought: request.certificate_sought ?? "",
          ratingSought: request.rating_sought ?? "",
          scheduledStartAt: request.scheduled_start_at,
          scheduledLocation: request.scheduled_location,
        });
        await send("instructor_submit", request.id, instructorEmail, replyTo, message);
      }
      continue;
    }

    // 3. Submitted and waiting for the instructor: "please sign off", with a fresh review link.
    if (status === "awaiting_instructor" && wizard && !(await sentRecently(request.id, "instructor_signoff"))) {
      // The first sign-off email goes out when the student submits; reminders start a day later.
      const { data: submittedAt } = await supabase
        .from("qualification_wizards")
        .select("applicant_submitted_at")
        .eq("id", wizard.id)
        .maybeSingle();
      const submitted = submittedAt?.applicant_submitted_at ? new Date(submittedAt.applicant_submitted_at).getTime() : 0;
      if (submitted && now.getTime() - submitted < RESEND_AFTER_MS) {
        counts.skipped += 1;
        continue;
      }
      try {
        const { sentTo } = await sendInstructorReviewLink(supabase, wizard.id, siteUrl, true);
        await record(request.id, "instructor_signoff", sentTo);
        counts.sent += 1;
      } catch (cause) {
        counts.failed += 1;
        console.error(`Sign-off reminder for ${request.request_number} failed:`, cause instanceof Error ? cause.message : cause);
      }
      continue;
    }

    counts.skipped += 1;
  }

  console.log(JSON.stringify({ qualificationReminder: { due: requests?.length ?? 0, ...counts } }));
};

/*
 * Netlify schedules run in UTC. Every hour at :25: a test booked inside the 4-day window gets its
 * first email within the hour, and each reminder repeats about 24 hours after the last one.
 */
export const config = {
  schedule: "25 * * * *",
};
