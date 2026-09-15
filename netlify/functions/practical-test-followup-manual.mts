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
    timeZone: "Pacific/Honolulu",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

export default async (request: Request) => {
  if (request.method !== "POST") {
    return json(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  if (!supabaseUrl || !serviceKey || !resendApiKey || !fromEmail || !siteUrl) {
    return json(
      {
        error:
          "Manual request status email is missing required environment configuration.",
      },
      503,
    );
  }

  const authorization = request.headers.get("authorization") ?? "";

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return json(
      {
        error: "A valid examiner login is required.",
      },
      401,
    );
  }

  const accessToken = match[1];

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return json(
      {
        error: "Your examiner login could not be verified.",
      },
      401,
    );
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .in("role", ["examiner", "administrator"]);

  if (roleError) {
    console.error("Unable to verify manual follow-up sender role:", roleError);

    return json(
      {
        error: "Your examiner access could not be verified.",
      },
      500,
    );
  }

  if (!roleRows || roleRows.length === 0) {
    return json(
      {
        error: "Examiner or administrator access is required.",
      },
      403,
    );
  }

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
        followup_anchor_at,
        source_system
      `,
    )
    .eq("assigned_examiner_profile_id", user.id)
    .in("status", ["submitted", "under_review", "accepted"])
    .order("submitted_at", {
      ascending: true,
      nullsFirst: false,
    });

  if (requestError) {
    console.error(
      "Unable to load requests for manual follow-up:",
      requestError,
    );

    return json(
      {
        error: "Practical test requests could not be loaded.",
      },
      500,
    );
  }

  const resend = new Resend(resendApiKey);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const failures: string[] = [];

  for (const practicalRequest of requests ?? []) {
    const emailAddress = practicalRequest.applicant_email_snapshot
      ?.trim()
      .toLowerCase();

    if (!emailAddress) {
      skipped += 1;
      continue;
    }

    const previousAnchor = practicalRequest.followup_anchor_at;

    const cycleAnchor = new Date().toISOString();

    /*
     * A manual send starts a fresh follow-up cycle.
     *
     * Updating the anchor before transmission also prevents the
     * scheduled 15-day job from sending another email while this
     * manual email is being processed.
     */
    const { error: anchorError } = await supabase
      .from("practical_test_requests")
      .update({
        followup_anchor_at: cycleAnchor,
        updated_at: cycleAnchor,
      })
      .eq("id", practicalRequest.id)
      .in("status", ["submitted", "under_review", "accepted"]);

    if (anchorError) {
      console.error(
        `Unable to reset follow-up anchor for ${practicalRequest.request_number}:`,
        anchorError,
      );

      failed += 1;
      failures.push(practicalRequest.request_number);
      continue;
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const expiresAt = new Date(Date.now() + 30 * DAY_MS).toISOString();

    const { data: followup, error: followupError } = await supabase
      .from("practical_test_request_followups")
      .insert({
        practical_test_request_id: practicalRequest.id,

        cycle_anchor_at: cycleAnchor,
        token_hash: tokenHash,
        token_expires_at: expiresAt,

        email_status: "pending",
        recipient_email: emailAddress,
      })
      .select("id")
      .single();

    if (followupError || !followup) {
      console.error(
        `Unable to create manual follow-up for ${practicalRequest.request_number}:`,
        followupError,
      );

      await supabase
        .from("practical_test_requests")
        .update({
          followup_anchor_at: previousAnchor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", practicalRequest.id);

      failed += 1;
      failures.push(practicalRequest.request_number);
      continue;
    }

    const requestedDates = practicalRequest.first_available
      ? "First available appointment"
      : practicalRequest.requested_dates_text?.trim() ||
        [
          practicalRequest.requested_date_1,
          practicalRequest.requested_date_2,
          practicalRequest.requested_date_3,
        ]
          .filter(Boolean)
          .join(", ") ||
        "No specific date preference recorded";

    const location =
      practicalRequest.oral_test_location?.trim() ||
      practicalRequest.flight_airport_code?.trim() ||
      "Not specified";

    const submitted =
      practicalRequest.submitted_at || practicalRequest.created_at;

    const commonUrl =
      `${siteUrl.replace(/\/$/, "")}` +
      `/request-follow-up` +
      `?token=${encodeURIComponent(token)}`;

    /*
     * Reuse the exact existing EMS follow-up email.
     */
    const email = buildRequestFollowupApplicantEmail({
      applicantName: practicalRequest.applicant_name_snapshot,

      requestNumber: practicalRequest.request_number,

      certificateSought: practicalRequest.certificate_sought,

      ratingSought: practicalRequest.rating_sought,

      requestedDatesText: requestedDates,

      locationText: location,

      submittedDateText: formatSubmittedDate(submitted),

      remainActiveUrl: `${commonUrl}&action=remain_active`,

      cancelRequestUrl: `${commonUrl}&action=cancel_request`,
    });

    const manualEmailHtml = email.html.replace(
      /You submitted the practical test request below\s+approximately 15 days ago\.\s+We have not yet been\s+able to find an appointment time for your request\./,
      `You submitted the practical test request below recently. We have not yet been able to find an appointment time for your request, but we are working on finding you an appointment time as soon as we can.`,
    );

    const manualEmailText = email.text.replace(
      /You submitted the practical test request below approximately 15 days ago\.\nWe have not yet been able to find an appointment time\./,
      `You submitted the practical test request below recently. We have not yet been able to find an appointment time for your request, but we are working on finding you an appointment time as soon as we can.`,
    );

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: [emailAddress],
      subject: email.subject,
      html: manualEmailHtml,
      text: manualEmailText,
    });

    if (resendError) {
      console.error(
        `Manual follow-up email failed for ${practicalRequest.request_number}:`,
        resendError,
      );

      await supabase
        .from("practical_test_request_followups")
        .update({
          email_status: "failed",

          error_message:
            resendError.message ?? "Email provider rejected message.",
        })
        .eq("id", followup.id);

      /*
       * The email did not go out, so restore the
       * previous automatic-follow-up clock.
       */
      await supabase
        .from("practical_test_requests")
        .update({
          followup_anchor_at: previousAnchor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", practicalRequest.id);

      failed += 1;
      failures.push(practicalRequest.request_number);
      continue;
    }

    const historyDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Honolulu",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date());

    const { error: historyError } = await supabase
      .from("practical_test_request_status_audit")
      .insert({
        practical_test_request_id: practicalRequest.id,
        previous_status: practicalRequest.status,
        new_status: practicalRequest.status,
        status_reason: `Request Status Update Email Sent ${historyDate}`,
        changed_by_profile_id: user.id,
      });

    if (historyError) {
      console.error(
        `Could not record status-update email history for ${practicalRequest.request_number}:`,
        historyError,
      );
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

  return json({
    success: failed === 0,

    eligible: requests?.length ?? 0,
    sent,
    skipped,
    failed,

    failures,
  });
};
