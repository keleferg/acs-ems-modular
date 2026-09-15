import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildRequestFollowupApplicantEmail } from "../../lib/email/practical-test";

const DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function formatSubmittedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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
      "15-day follow-up function is missing required environment configuration.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const resend = new Resend(resendApiKey);

  const cutoff = new Date(Date.now() - 15 * DAY_MS).toISOString();

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
    .or("source_system.is.null,source_system.neq.sharepoint")
    .lte("followup_anchor_at", cutoff)
    .order("followup_anchor_at", {
      ascending: true,
    })
    .limit(200);

  if (requestError) {
    throw requestError;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const request of requests ?? []) {
    const emailAddress = request.applicant_email_snapshot?.trim().toLowerCase();

    const cycleAnchor = request.followup_anchor_at;

    if (!emailAddress || !cycleAnchor) {
      skipped += 1;
      continue;
    }

    const { data: existing, error: existingError } = await supabase
      .from("practical_test_request_followups")
      .select(
        `
        id,
        email_status,
        created_at,
        responded_at
      `,
      )
      .eq("practical_test_request_id", request.id)
      .eq("cycle_anchor_at", cycleAnchor)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);
      failed += 1;
      continue;
    }

    if (
      existing &&
      (existing.email_status === "sent" ||
        existing.email_status === "responded" ||
        (existing.email_status === "pending" &&
          new Date(existing.created_at).getTime() >
            Date.now() - 60 * 60 * 1000))
    ) {
      skipped += 1;
      continue;
    }

    if (existing) {
      await supabase
        .from("practical_test_request_followups")
        .delete()
        .eq("id", existing.id);
    }

    const token = randomBytes(32).toString("hex");

    const tokenHash = hashToken(token);

    const expiresAt = new Date(Date.now() + 30 * DAY_MS).toISOString();

    const { data: followup, error: followupError } = await supabase
      .from("practical_test_request_followups")
      .insert({
        practical_test_request_id: request.id,

        cycle_anchor_at: cycleAnchor,

        token_hash: tokenHash,

        token_expires_at: expiresAt,

        email_status: "pending",

        recipient_email: emailAddress,
      })
      .select("id")
      .single();

    if (followupError || !followup) {
      console.error("Unable to create request follow-up:", followupError);
      failed += 1;
      continue;
    }

    const requestedDates = request.first_available
      ? "First available appointment"
      : request.requested_dates_text?.trim() ||
        [
          request.requested_date_1,
          request.requested_date_2,
          request.requested_date_3,
        ]
          .filter(Boolean)
          .join(", ") ||
        "No specific date preference recorded";

    const location =
      request.oral_test_location?.trim() ||
      request.flight_airport_code?.trim() ||
      "Not specified";

    const submitted = request.submitted_at || request.created_at;

    const commonUrl =
      `${siteUrl.replace(/\/$/, "")}` +
      `/request-follow-up` +
      `?token=${encodeURIComponent(token)}`;

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
    });

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: [emailAddress],
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (resendError) {
      failed += 1;

      await supabase
        .from("practical_test_request_followups")
        .update({
          email_status: "failed",
          error_message:
            resendError.message ?? "Email provider rejected message.",
        })
        .eq("id", followup.id);

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

    sent += 1;
  }

  console.log(
    JSON.stringify({
      practicalTestFollowup: {
        due: requests?.length ?? 0,
        sent,
        skipped,
        failed,
      },
    }),
  );
};

/*
 * Netlify schedules run in UTC.
 *
 * 06:20 UTC:
 *   12:20 AM CST
 *    1:20 AM CDT
 *
 * The exact clock time is not operationally important;
 * the eligibility test itself is a full 15-day interval.
 */
export const config = {
  schedule: "20 6 * * *",
};
