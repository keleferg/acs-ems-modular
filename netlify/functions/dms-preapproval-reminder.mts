import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildDmsPreapprovalMissingExaminerEmail } from "../../lib/email/practical-test";

/*
 * Examiner reminder: DMS preapproval number missing within 48 hours.
 *
 * Every 15 minutes, finds appointments that are
 *   - scheduled or confirmed,
 *   - starting within the next 48 hours (and not yet started),
 *   - without a DMS preapproval number, and
 *   - set or moved at least one hour ago (appointment_set_at), so entering a
 *     last-minute checkride doesn't send an email while it's being set up,
 * and emails the assigned examiner once per appointment time. Sends are
 * recorded in practical_test_email_log (dedupe_key) like every other
 * practical-test email; failed sends retry on the next run.
 */

const HOUR_MS = 60 * 60 * 1000;
const EMAIL_TYPE = "dms_preapproval_missing_examiner";

type DueRequest = {
  id: string;
  request_number: string;
  applicant_name_snapshot: string;
  certificate_sought: string;
  rating_sought: string;
  scheduled_start_at: string;
  scheduled_end_at: string | null;
  scheduled_location: string | null;
  oral_test_location: string | null;
  flight_airport_code: string | null;
  dms_preapproval_number: string | null;
  assigned_examiner_profile_id: string;
  appointment_set_at: string | null;
};

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  if (!supabaseUrl || !serviceKey || !resendApiKey || !fromEmail || !siteUrl) {
    throw new Error(
      "DMS preapproval reminder is missing required environment configuration.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(resendApiKey);

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const windowEndIso = new Date(now + 48 * HOUR_MS).toISOString();
  const settledBefore = now - HOUR_MS;

  const { data, error } = await supabase
    .from("practical_test_requests")
    .select(
      `
      id,
      request_number,
      applicant_name_snapshot,
      certificate_sought,
      rating_sought,
      scheduled_start_at,
      scheduled_end_at,
      scheduled_location,
      oral_test_location,
      flight_airport_code,
      dms_preapproval_number,
      assigned_examiner_profile_id,
      appointment_set_at
    `,
    )
    .in("status", ["scheduled", "confirmed"])
    .gt("scheduled_start_at", nowIso)
    .lte("scheduled_start_at", windowEndIso)
    .not("assigned_examiner_profile_id", "is", null)
    .order("scheduled_start_at", { ascending: true })
    .limit(500);

  if (error) throw error;

  const due = ((data ?? []) as DueRequest[]).filter(
    (request) =>
      !request.dms_preapproval_number?.trim() &&
      // NULL = set before this column existed, i.e. long ago.
      (!request.appointment_set_at ||
        new Date(request.appointment_set_at).getTime() <= settledBefore),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  if (due.length === 0) {
    console.log(JSON.stringify({ dmsPreapprovalReminder: { due: 0, sent, skipped, failed } }));
    return;
  }

  const examinerIds = [...new Set(due.map((request) => request.assigned_examiner_profile_id))];

  const [designeeResult, profileResult] = await Promise.all([
    supabase
      .from("examiner_designee_profiles")
      .select("profile_id, designee_name, email, reply_to_email")
      .in("profile_id", examinerIds),
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", examinerIds),
  ]);

  if (designeeResult.error) throw designeeResult.error;
  if (profileResult.error) throw profileResult.error;

  const designees = new Map(
    (designeeResult.data ?? []).map((row) => [row.profile_id as string, row]),
  );
  const profiles = new Map(
    (profileResult.data ?? []).map((row) => [row.id as string, row]),
  );

  for (const request of due) {
    const designee = designees.get(request.assigned_examiner_profile_id);
    const profile = profiles.get(request.assigned_examiner_profile_id);

    const recipient = [designee?.email, designee?.reply_to_email, profile?.email]
      .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
      .find(Boolean);

    if (!recipient) {
      skipped += 1;
      continue;
    }

    const examinerName =
      (typeof designee?.designee_name === "string" && designee.designee_name.trim()) ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      null;

    const email = buildDmsPreapprovalMissingExaminerEmail({
      examinerName,
      applicantName: request.applicant_name_snapshot,
      requestNumber: request.request_number,
      certificateSought: request.certificate_sought,
      ratingSought: request.rating_sought,
      scheduledStartAt: request.scheduled_start_at,
      scheduledEndAt: request.scheduled_end_at ?? request.scheduled_start_at,
      scheduledLocation:
        request.scheduled_location?.trim() ||
        request.oral_test_location?.trim() ||
        request.flight_airport_code?.trim() ||
        "Location not entered",
      examinerPortalUrl: `${siteUrl.replace(/\/$/, "")}/examiner/requests?request=${encodeURIComponent(request.id)}`,
    });

    // One reminder per appointment time; a moved appointment gets its own.
    const dedupeKey = [EMAIL_TYPE, request.id, request.scheduled_start_at].join(":");

    const { data: existing, error: existingError } = await supabase
      .from("practical_test_email_log")
      .select("id, status, attempted_at")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);
      failed += 1;
      continue;
    }

    if (
      existing &&
      (existing.status === "sent" ||
        (existing.status === "pending" &&
          new Date(existing.attempted_at).getTime() > now - 10 * 60 * 1000))
    ) {
      skipped += 1;
      continue;
    }

    let logId: string;

    if (existing) {
      const { error: retryError } = await supabase
        .from("practical_test_email_log")
        .update({
          status: "pending",
          recipient_email: recipient,
          subject: email.subject,
          error_message: null,
          attempted_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", existing.id);

      if (retryError) {
        console.error(retryError);
        failed += 1;
        continue;
      }

      logId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("practical_test_email_log")
        .insert({
          practical_test_request_id: request.id,
          email_type: EMAIL_TYPE,
          recipient_role: "examiner",
          recipient_email: recipient,
          subject: email.subject,
          dedupe_key: dedupeKey,
          status: "pending",
          attempted_at: nowIso,
        })
        .select("id")
        .single();

      // A unique-key conflict means another run claimed it first.
      if (insertError || !inserted) {
        skipped += 1;
        continue;
      }

      logId = inserted.id;
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: [recipient],
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (resendError) {
      failed += 1;
      await supabase
        .from("practical_test_email_log")
        .update({
          status: "failed",
          error_message: resendError.message ?? "Email provider rejected message.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", logId);
      continue;
    }

    await supabase
      .from("practical_test_email_log")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: resendData?.id ?? null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId);

    sent += 1;
  }

  console.log(
    JSON.stringify({ dmsPreapprovalReminder: { due: due.length, sent, skipped, failed } }),
  );
};

// Every 15 minutes (Netlify schedules run in UTC; the 48-hour and 1-hour
// tests are absolute, so the clock time doesn't matter).
export const config = {
  schedule: "*/15 * * * *",
};
