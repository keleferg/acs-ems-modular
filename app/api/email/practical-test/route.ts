import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  buildAppointmentAcceptedExaminerEmail,
  buildAppointmentRescheduleRequestedExaminerEmail,
  buildRequestAcceptedApplicantEmail,
  buildRequestScheduledApplicantEmail,
  buildRequestSubmittedApplicantEmail,
} from "@/lib/email/practical-test";
import { createClient } from "@/lib/supabase/server";

type EmailRequestBody = {
  eventType?: string;
  requestId?: string;
};

type ClaimRow = {
  log_id: string;
  should_send: boolean;
  email_status: string;
};

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type ApplicantPortalDetail = {
  practical_test_request_id: string;
  examiner_profile_id: string | null;
  examiner_name: string | null;
  examiner_email: string | null;
  examiner_reply_to_email: string | null;
};

const supportedEvents = new Set([
  "request_submitted_applicant",
  "request_accepted_applicant",
  "request_scheduled_applicant",
  "appointment_accepted_examiner",
  "appointment_reschedule_requested_examiner",
]);

function getOrigin(request: Request) {
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  let body: EmailRequestBody;

  try {
    body = (await request.json()) as EmailRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  const eventType = body.eventType?.trim();
  const requestId = body.requestId?.trim();

  if (
    !eventType ||
    !supportedEvents.has(eventType) ||
    !requestId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid practical-test email event.",
      },
      {
        status: 400,
      },
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Transactional email is not fully configured.",
      },
      {
        status: 503,
      },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication is required.",
      },
      {
        status: 401,
      },
    );
  }

  const {
    data: practicalTestRequest,
    error: requestError,
  } = await supabase
    .from("practical_test_requests")
    .select(
      `
      id,
      request_number,
      applicant_profile_id,
      assigned_examiner_profile_id,
      applicant_name_snapshot,
      applicant_email_snapshot,
      certificate_sought,
      rating_sought,
      requested_dates_text,
      fee_amount,
      status,
      scheduled_start_at,
      scheduled_end_at,
      scheduled_location,
      appointment_response_status,
      appointment_responded_at,
      appointment_response_notes
      `,
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !practicalTestRequest) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The practical-test request could not be found.",
      },
      {
        status: 404,
      },
    );
  }

  const applicantGeneratedEvent =
    eventType === "request_submitted_applicant" ||
    eventType === "appointment_accepted_examiner" ||
    eventType === "appointment_reschedule_requested_examiner";

  let applicantAuthorized = false;

  if (applicantGeneratedEvent) {
    const {
      data: applicantProfile,
      error: applicantProfileError,
    } = await supabase
      .from("applicant_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (
      !applicantProfileError &&
      applicantProfile &&
      applicantProfile.id ===
        practicalTestRequest.applicant_profile_id
    ) {
      applicantAuthorized = true;
    }
  }

  let examinerAuthorized = false;
  let examinerReplyToEmail: string | undefined;

  if (
    eventType === "request_accepted_applicant" ||
    eventType === "request_scheduled_applicant"
  ) {
    const {
      data: roleRows,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", user.id)
      .in("role", ["examiner", "administrator"]);

    if (
      !roleError &&
      roleRows &&
      roleRows.length > 0
    ) {
      examinerAuthorized = true;
    }

    if (examinerAuthorized) {
      const {
        data: designeeProfile,
        error: designeeError,
      } = await supabase
        .from("examiner_designee_profiles")
        .select("reply_to_email, email")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (designeeError) {
        console.warn(
          "Unable to load examiner reply-to email:",
          designeeError,
        );
      } else {
        examinerReplyToEmail =
          designeeProfile?.reply_to_email?.trim() ||
          designeeProfile?.email?.trim() ||
          undefined;
      }
    }
  }

  if (
    applicantGeneratedEvent &&
    !applicantAuthorized
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "You are not authorized to send this practical-test email.",
      },
      {
        status: 403,
      },
    );
  }

  if (
    !applicantGeneratedEvent &&
    !examinerAuthorized
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "You are not authorized to send this practical-test email.",
      },
      {
        status: 403,
      },
    );
  }

  if (
    eventType === "request_accepted_applicant" &&
    practicalTestRequest.status !== "accepted"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The practical-test request is not currently accepted.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "request_scheduled_applicant" &&
    practicalTestRequest.status !== "scheduled"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The practical-test request is not currently scheduled.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "appointment_accepted_examiner" &&
    (
      practicalTestRequest.status !== "confirmed" ||
      practicalTestRequest.appointment_response_status !==
        "accepted"
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The practical-test appointment has not been confirmed.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "appointment_reschedule_requested_examiner" &&
    (
      practicalTestRequest.status !== "reschedule_required" ||
      practicalTestRequest.appointment_response_status !==
        "reschedule_requested"
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The applicant has not requested an appointment change.",
      },
      {
        status: 409,
      },
    );
  }

  const portalOrigin = getOrigin(request);

  let email: EmailContent;
  let recipientEmail: string;
  let recipientRole: string;
  let replyToEmail: string | undefined;
  let dedupeKey: string;

  if (eventType === "request_submitted_applicant") {
    recipientEmail =
      practicalTestRequest.applicant_email_snapshot
        ?.trim()
        .toLowerCase();

    if (!recipientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The practical-test request does not contain an applicant email address.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "applicant";

    email =
      buildRequestSubmittedApplicantEmail({
        applicantName:
          practicalTestRequest.applicant_name_snapshot,
        requestNumber:
          practicalTestRequest.request_number,
        certificateSought:
          practicalTestRequest.certificate_sought,
        ratingSought:
          practicalTestRequest.rating_sought,
        requestedDatesText:
          practicalTestRequest.requested_dates_text,
        portalUrl:
          `${portalOrigin}/applicant/requests`,
      });

    dedupeKey =
      `request_submitted_applicant:${practicalTestRequest.id}`;
  } else if (
    eventType === "request_accepted_applicant"
  ) {
    recipientEmail =
      practicalTestRequest.applicant_email_snapshot
        ?.trim()
        .toLowerCase();

    if (!recipientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The practical-test request does not contain an applicant email address.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "applicant";
    replyToEmail = examinerReplyToEmail;

    email =
      buildRequestAcceptedApplicantEmail({
        applicantName:
          practicalTestRequest.applicant_name_snapshot,
        requestNumber:
          practicalTestRequest.request_number,
        certificateSought:
          practicalTestRequest.certificate_sought,
        ratingSought:
          practicalTestRequest.rating_sought,
        portalUrl:
          `${portalOrigin}/applicant/requests`,
      });

    dedupeKey =
      `request_accepted_applicant:${practicalTestRequest.id}`;
  } else if (
    eventType === "request_scheduled_applicant"
  ) {
    recipientEmail =
      practicalTestRequest.applicant_email_snapshot
        ?.trim()
        .toLowerCase();

    if (!recipientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The practical-test request does not contain an applicant email address.",
        },
        {
          status: 422,
        },
      );
    }

    const scheduledStartAt =
      practicalTestRequest.scheduled_start_at;

    const scheduledEndAt =
      practicalTestRequest.scheduled_end_at;

    const scheduledLocation =
      practicalTestRequest.scheduled_location?.trim();

    if (
      !scheduledStartAt ||
      !scheduledEndAt ||
      !scheduledLocation
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The scheduled appointment is incomplete.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "applicant";
    replyToEmail = examinerReplyToEmail;

    email =
      buildRequestScheduledApplicantEmail({
        applicantName:
          practicalTestRequest.applicant_name_snapshot,
        requestNumber:
          practicalTestRequest.request_number,
        certificateSought:
          practicalTestRequest.certificate_sought,
        ratingSought:
          practicalTestRequest.rating_sought,
        scheduledStartAt,
        scheduledEndAt,
        scheduledLocation,
        feeAmount:
          practicalTestRequest.fee_amount === null
            ? null
            : Number(practicalTestRequest.fee_amount),
        portalUrl:
          `${portalOrigin}/applicant/requests`,
      });

    dedupeKey = [
      "request_scheduled_applicant",
      practicalTestRequest.id,
      scheduledStartAt,
      scheduledEndAt,
      scheduledLocation,
    ].join(":");
  } else {
    const assignedExaminerProfileId =
      practicalTestRequest.assigned_examiner_profile_id;

    if (!assignedExaminerProfileId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No examiner is assigned to this practical-test request.",
        },
        {
          status: 422,
        },
      );
    }

    const {
      data: portalDetailData,
      error: portalDetailError,
    } = await supabase.rpc(
      "applicant_get_request_portal_details",
    );

    if (portalDetailError) {
      console.error(
        "Unable to load assigned examiner email details:",
        portalDetailError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "The assigned examiner email could not be loaded.",
        },
        {
          status: 500,
        },
      );
    }

    const examinerDetail = (
      (portalDetailData ?? []) as ApplicantPortalDetail[]
    ).find(
      (detail) =>
        detail.practical_test_request_id ===
        practicalTestRequest.id,
    );

    if (
      !examinerDetail ||
      examinerDetail.examiner_profile_id !==
        assignedExaminerProfileId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The assigned examiner could not be verified.",
        },
        {
          status: 422,
        },
      );
    }

    recipientEmail = (
      examinerDetail.examiner_email ||
      examinerDetail.examiner_reply_to_email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!recipientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The assigned examiner does not have an email address configured.",
        },
        {
          status: 422,
        },
      );
    }

    const scheduledStartAt =
      practicalTestRequest.scheduled_start_at;

    const scheduledEndAt =
      practicalTestRequest.scheduled_end_at;

    const scheduledLocation =
      practicalTestRequest.scheduled_location?.trim();

    if (
      !scheduledStartAt ||
      !scheduledEndAt ||
      !scheduledLocation
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The confirmed appointment is incomplete.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "examiner";

    replyToEmail =
      practicalTestRequest.applicant_email_snapshot
        ?.trim() ||
      undefined;

    if (
      eventType === "appointment_reschedule_requested_examiner"
    ) {
      const rescheduleReason =
        practicalTestRequest.appointment_response_notes?.trim();

      if (!rescheduleReason) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The appointment change request does not contain an explanation.",
          },
          {
            status: 422,
          },
        );
      }

      email =
        buildAppointmentRescheduleRequestedExaminerEmail({
          examinerName:
            examinerDetail.examiner_name,
          applicantName:
            practicalTestRequest.applicant_name_snapshot,
          requestNumber:
            practicalTestRequest.request_number,
          certificateSought:
            practicalTestRequest.certificate_sought,
          ratingSought:
            practicalTestRequest.rating_sought,
          scheduledStartAt,
          scheduledEndAt,
          scheduledLocation,
          rescheduleReason,
          examinerPortalUrl:
            `${portalOrigin}/examiner/requests?request=${encodeURIComponent(
              practicalTestRequest.id,
            )}`,
        });

      dedupeKey = [
        "appointment_reschedule_requested_examiner",
        practicalTestRequest.id,
        scheduledStartAt,
        practicalTestRequest.appointment_responded_at ||
          "reschedule_requested",
      ].join(":");
    } else {
      email =
        buildAppointmentAcceptedExaminerEmail({
          examinerName:
            examinerDetail.examiner_name,
          applicantName:
            practicalTestRequest.applicant_name_snapshot,
          requestNumber:
            practicalTestRequest.request_number,
          certificateSought:
            practicalTestRequest.certificate_sought,
          ratingSought:
            practicalTestRequest.rating_sought,
          scheduledStartAt,
          scheduledEndAt,
          scheduledLocation,
          examinerPortalUrl:
            `${portalOrigin}/examiner/requests?request=${encodeURIComponent(
              practicalTestRequest.id,
            )}`,
        });

      dedupeKey = [
        "appointment_accepted_examiner",
        practicalTestRequest.id,
        scheduledStartAt,
        practicalTestRequest.appointment_responded_at ||
          "accepted",
      ].join(":");
    }
  }

  const {
    data: claimData,
    error: claimError,
  } = await supabase.rpc(
    "claim_practical_test_email",
    {
      p_request_id: practicalTestRequest.id,
      p_email_type: eventType,
      p_recipient_role: recipientRole,
      p_recipient_email: recipientEmail,
      p_subject: email.subject,
      p_dedupe_key: dedupeKey,
    },
  );

  if (claimError) {
    console.error(
      "Unable to claim practical-test email:",
      claimError,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "The email event could not be prepared.",
      },
      {
        status: 500,
      },
    );
  }

  const claim = (
    Array.isArray(claimData)
      ? claimData[0]
      : claimData
  ) as ClaimRow | null;

  if (!claim) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The email event did not return a claim record.",
      },
      {
        status: 500,
      },
    );
  }

  if (!claim.should_send) {
    return NextResponse.json({
      ok: true,
      sent: false,
      skipped: true,
      status: claim.email_status,
    });
  }

  const resend = new Resend(resendApiKey);

  const {
    data: resendData,
    error: resendError,
  } = await resend.emails.send({
    from: fromEmail,
    to: [recipientEmail],
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(replyToEmail
      ? {
          replyTo: replyToEmail,
        }
      : {}),
  });

  if (resendError) {
    console.error(
      "Resend practical-test email failed:",
      resendError,
    );

    await supabase.rpc(
      "complete_practical_test_email",
      {
        p_log_id: claim.log_id,
        p_status: "failed",
        p_provider_message_id: null,
        p_error_message:
          resendError.message ??
          "The email provider rejected the message.",
      },
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "The request update succeeded, but the email could not be sent.",
      },
      {
        status: 502,
      },
    );
  }

  const {
    error: completionError,
  } = await supabase.rpc(
    "complete_practical_test_email",
    {
      p_log_id: claim.log_id,
      p_status: "sent",
      p_provider_message_id:
        resendData?.id ?? null,
      p_error_message: null,
    },
  );

  if (completionError) {
    console.error(
      "Email sent but delivery log could not be completed:",
      completionError,
    );
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    messageId: resendData?.id ?? null,
  });
}
