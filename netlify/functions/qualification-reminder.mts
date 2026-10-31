import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildQualificationReminderApplicantEmail } from "../../lib/email/practical-test";

// Emails the applicant 4 days before a confirmed or scheduled practical test, asking them to fill
// out the pretest qualification and linking to it (Kele, Oct 30 2026). The qualification opens at
// the same time (initialize_pretest_qualification: 4 days before). One email per scheduled time:
// if the test is moved, the applicant gets a new one for the new time. A test booked less than
// 4 days out gets the email on the next run.

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUSES = ["confirmed", "scheduled"];
// Packages already submitted or reviewed don't need the reminder.
const OPEN_WIZARD_STATUSES = new Set(["not_available", "available", "applicant_in_progress", "instructor_changes_required"]);

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

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
      status,
      applicant_name_snapshot,
      applicant_email_snapshot,
      certificate_sought,
      rating_sought,
      practical_test_type_id,
      assigned_examiner_profile_id,
      scheduled_start_at,
      scheduled_location,
      qualification_reminder_start_at
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

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const request of requests ?? []) {
    const email = request.applicant_email_snapshot?.trim().toLowerCase();
    const alreadySent =
      request.qualification_reminder_start_at &&
      new Date(request.qualification_reminder_start_at).getTime() === new Date(request.scheduled_start_at).getTime();

    if (!email || alreadySent || !typesWithList.has(String(request.practical_test_type_id))) {
      skipped += 1;
      continue;
    }

    const { data: wizard } = await supabase
      .from("qualification_wizards")
      .select("status")
      .eq("practical_test_request_id", request.id)
      .maybeSingle();

    if (wizard && !OPEN_WIZARD_STATUSES.has(String(wizard.status))) {
      skipped += 1;
      continue;
    }

    // Record the reminder before sending, so a slow run can't send it twice.
    const { data: claimed, error: claimError } = await supabase
      .from("practical_test_requests")
      .update({
        qualification_reminder_start_at: request.scheduled_start_at,
        qualification_reminder_sent_at: now.toISOString(),
      })
      .eq("id", request.id)
      .eq("scheduled_start_at", request.scheduled_start_at)
      .select("id");

    if (claimError || !claimed?.length) {
      skipped += 1;
      continue;
    }

    let replyTo: string | undefined;
    if (request.assigned_examiner_profile_id) {
      const { data: designee } = await supabase
        .from("examiner_designee_profiles")
        .select("reply_to_email, email")
        .eq("profile_id", request.assigned_examiner_profile_id)
        .maybeSingle();
      replyTo = designee?.reply_to_email?.trim() || designee?.email?.trim() || undefined;
    }

    const message = buildQualificationReminderApplicantEmail({
      applicantName: request.applicant_name_snapshot ?? "",
      requestNumber: request.request_number,
      certificateSought: request.certificate_sought ?? "",
      ratingSought: request.rating_sought ?? "",
      scheduledStartAt: request.scheduled_start_at,
      scheduledLocation: request.scheduled_location,
      qualificationUrl: `${siteUrl.replace(/\/$/, "")}/applicant/qualification?request=${encodeURIComponent(request.id)}`,
    });

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      ...(replyTo ? { replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (sendError) {
      failed += 1;
      console.error(`Qualification reminder for ${request.request_number} failed:`, sendError.message);
      // Release the claim so the next run tries again.
      await supabase
        .from("practical_test_requests")
        .update({ qualification_reminder_start_at: request.qualification_reminder_start_at ?? null, qualification_reminder_sent_at: null })
        .eq("id", request.id);
      continue;
    }

    sent += 1;
  }

  console.log(JSON.stringify({ qualificationReminder: { due: requests?.length ?? 0, sent, skipped, failed } }));
};

/*
 * Netlify schedules run in UTC. Every hour at :25, so a test booked inside the 4-day window
 * gets its email within the hour.
 */
export const config = {
  schedule: "25 * * * *",
};
