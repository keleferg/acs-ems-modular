import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  buildRequestAutoCancelledApplicantEmail,
  buildRequestFollowupApplicantEmail,
} from "../../lib/email/practical-test";

/*
 * Request follow-ups (Kele, Nov 2 2026). For requests still waiting for examiner review:
 *   day 14 after submission (or the applicant's last "Remain Active"): first follow-up email,
 *   3 days later with no answer: second notice,
 *   3 days after that with no answer: the request is cancelled and the applicant is emailed.
 * Each email, the cancellation and the applicant's answer are written to the request History.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const FOLLOWUP_INTERVAL_DAYS = 14;
const RESPONSE_WINDOW_DAYS = 3;
const STALE_PENDING_MS = 60 * 60 * 1000;

type FollowupRow = {
  id: string;
  attempt: number;
  email_status: string;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function formatLongDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatSubmittedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

/** A row that never finished sending (failed, or pending for over an hour) can be retried. */
function retryable(row: FollowupRow | undefined) {
  if (!row) return true;
  if (row.email_status === "failed") return true;
  return (
    row.email_status === "pending" &&
    new Date(row.created_at).getTime() < Date.now() - STALE_PENDING_MS
  );
}

function windowPassed(row: FollowupRow) {
  return (
    row.email_status === "sent" &&
    row.sent_at !== null &&
    new Date(row.sent_at).getTime() <= Date.now() - RESPONSE_WINDOW_DAYS * DAY_MS
  );
}

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  if (!supabaseUrl || !serviceKey || !resendApiKey || !fromEmail || !siteUrl) {
    throw new Error(
      "Request follow-up function is missing required environment configuration.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(resendApiKey);
  const baseUrl = siteUrl.replace(/\/$/, "");

  const cutoff = new Date(
    Date.now() - FOLLOWUP_INTERVAL_DAYS * DAY_MS,
  ).toISOString();

  const { data: requests, error: requestError } = await supabase
    .from("practical_test_requests")
    .select(
      `
      id,
      request_number,
      status,
      applicant_name_snapshot,
      applicant_email_snapshot,
      certificate_sought,
      rating_sought,
      first_available,
      requested_dates_text,
      requested_date_1,
      requested_date_2,
      requested_date_3,
      oral_test_location,
      flight_airport_code,
      submitted_at,
      created_at,
      followup_anchor_at
    `,
    )
    .in("status", ["submitted", "under_review"])
    .or("source_system.is.null,source_system.neq.legacy_import")
    .lte("followup_anchor_at", cutoff)
    .order("followup_anchor_at", { ascending: true })
    .limit(200);

  if (requestError) {
    throw requestError;
  }

  const counts = { first: 0, second: 0, cancelled: 0, skipped: 0, failed: 0 };

  async function logHistory(requestId: string, text: string) {
    const { error } = await supabase.rpc("service_log_request_event", {
      p_request_id: requestId,
      p_text: text,
    });
    if (error) console.error("Unable to write request history:", error);
  }

  for (const request of requests ?? []) {
    const emailAddress = request.applicant_email_snapshot?.trim().toLowerCase();
    const cycleAnchor = request.followup_anchor_at;

    if (!emailAddress || !cycleAnchor) {
      counts.skipped += 1;
      continue;
    }

    const { data: rowData, error: rowError } = await supabase
      .from("practical_test_request_followups")
      .select("id, attempt, email_status, created_at, sent_at, responded_at")
      .eq("practical_test_request_id", request.id)
      .eq("cycle_anchor_at", cycleAnchor);

    if (rowError) {
      console.error(rowError);
      counts.failed += 1;
      continue;
    }

    const rows = (rowData ?? []) as FollowupRow[];

    if (rows.some((row) => row.responded_at)) {
      counts.skipped += 1;
      continue;
    }

    const first = rows.find((row) => row.attempt === 1);
    const second = rows.find((row) => row.attempt === 2);
    const submitted = request.submitted_at || request.created_at;

    let attemptToSend: 1 | 2 | null = null;

    if (retryable(first)) {
      attemptToSend = 1;
    } else if (first && first.email_status === "sent" && retryable(second)) {
      attemptToSend = windowPassed(first) ? 2 : null;
    } else if (second && windowPassed(second)) {
      // Two unanswered follow-ups: cancel and tell the applicant.
      const { data: cancelled, error: cancelError } = await supabase.rpc(
        "service_auto_cancel_unanswered_request",
        { p_request_id: request.id, p_cycle_anchor_at: cycleAnchor },
      );

      if (cancelError) {
        console.error("Unable to cancel unanswered request:", cancelError);
        counts.failed += 1;
        continue;
      }

      if (!cancelled) {
        counts.skipped += 1;
        continue;
      }

      counts.cancelled += 1;

      const email = buildRequestAutoCancelledApplicantEmail({
        applicantName: request.applicant_name_snapshot,
        requestNumber: request.request_number,
        certificateSought: request.certificate_sought,
        ratingSought: request.rating_sought,
        submittedDateText: formatSubmittedDate(submitted),
        newRequestUrl: `${baseUrl}/applicant/requests/new`,
      });

      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: [emailAddress],
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      await logHistory(
        request.id,
        sendError
          ? `Cancellation email to ${emailAddress} could not be sent: ${sendError.message ?? "email provider error"}.`
          : `Cancellation email sent to ${emailAddress}.`,
      );
      continue;
    }

    if (!attemptToSend) {
      counts.skipped += 1;
      continue;
    }

    const stale = attemptToSend === 1 ? first : second;
    if (stale) {
      await supabase
        .from("practical_test_request_followups")
        .delete()
        .eq("id", stale.id);
    }

    const token = randomBytes(32).toString("hex");

    const { data: followup, error: followupError } = await supabase
      .from("practical_test_request_followups")
      .insert({
        practical_test_request_id: request.id,
        cycle_anchor_at: cycleAnchor,
        attempt: attemptToSend,
        token_hash: hashToken(token),
        token_expires_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
        email_status: "pending",
        recipient_email: emailAddress,
      })
      .select("id")
      .single();

    if (followupError || !followup) {
      console.error("Unable to create request follow-up:", followupError);
      counts.failed += 1;
      continue;
    }

    const requestedDates = request.first_available
      ? "First available appointment"
      : request.requested_dates_text?.trim() ||
        [request.requested_date_1, request.requested_date_2, request.requested_date_3]
          .filter(Boolean)
          .join(", ") ||
        "No specific date preference recorded";

    const location =
      request.oral_test_location?.trim() ||
      request.flight_airport_code?.trim() ||
      "Not specified";

    const commonUrl = `${baseUrl}/request-follow-up?token=${encodeURIComponent(token)}`;
    const respondBy = formatLongDate(
      new Date(Date.now() + RESPONSE_WINDOW_DAYS * DAY_MS),
    );

    const email = buildRequestFollowupApplicantEmail({
      applicantName: request.applicant_name_snapshot,
      requestNumber: request.request_number,
      certificateSought: request.certificate_sought,
      ratingSought: request.rating_sought,
      requestedDatesText: requestedDates,
      locationText: location,
      submittedDateText: formatSubmittedDate(submitted),
      remainActiveUrl: `${commonUrl}&action=remain_active`,
      cancelRequestUrl: `${commonUrl}&action=cancel_request`,
      noticeNumber: attemptToSend,
      respondByText: respondBy,
    });

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: [emailAddress],
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    const label = attemptToSend === 1 ? "Follow-up email" : "Second follow-up email";

    if (resendError) {
      counts.failed += 1;
      await supabase
        .from("practical_test_request_followups")
        .update({
          email_status: "failed",
          error_message: resendError.message ?? "Email provider rejected message.",
        })
        .eq("id", followup.id);
      await logHistory(
        request.id,
        `${label} to ${emailAddress} could not be sent: ${resendError.message ?? "email provider error"}.`,
      );
      continue;
    }

    await supabase
      .from("practical_test_request_followups")
      .update({
        email_status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: resendData?.id ?? null,
        error_message: null,
      })
      .eq("id", followup.id);

    await logHistory(
      request.id,
      attemptToSend === 1
        ? `${label} sent to ${emailAddress} asking the applicant to keep the request active or cancel it (respond by ${respondBy}).`
        : `${label} sent to ${emailAddress}. If there is no response by ${respondBy}, the request will be cancelled automatically.`,
    );

    if (attemptToSend === 1) counts.first += 1;
    else counts.second += 1;
  }

  console.log(
    JSON.stringify({ practicalTestFollowup: { due: requests?.length ?? 0, ...counts } }),
  );
};

/*
 * Netlify schedules run in UTC. 06:20 UTC = 8:20 PM in Hawaii.
 * The job runs daily; the 14-day and 3-day windows are checked on each run.
 */
export const config = {
  schedule: "20 6 * * *",
};
