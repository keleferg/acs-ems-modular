import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  buildAppointmentAcceptedExaminerEmail,
  buildAssignmentProposedApplicantEmail,
  buildAppointmentRescheduleRequestedExaminerEmail,
  buildFeesFinalizedApplicantEmail,
  buildPpcCompletedApplicantEmail,
  buildRequestAcceptedApplicantEmail,
  buildRequestDeclinedApplicantEmail,
  buildRequestScheduledApplicantEmail,
  buildRequestSubmittedApplicantEmail,
} from "@/lib/email/practical-test";
import { createClient as createServerClient } from "@/lib/supabase/server";

type EmailRequestBody = {
  eventType?: string;
  requestId?: string;
  proposedStartAt?: string;
  proposedEndAt?: string;
  proposedLocation?: string;
  proposedFee?: number | null;
  proposalNotes?: string | null;
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

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
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
  "request_declined_applicant",
  "request_scheduled_applicant",
  "request_fees_finalized_applicant",
  "assignment_proposed_applicant",
  "appointment_accepted_examiner",
  "appointment_reschedule_requested_examiner",
  "ppc_completed_applicant",
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

  if (!eventType || !supportedEvents.has(eventType) || !requestId) {
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
        error: "Transactional email is not fully configured.",
      },
      {
        status: 503,
      },
    );
  }

  const authorization = request.headers.get("authorization")?.trim();

  const supabase = authorization
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: {
              Authorization: authorization,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      )
    : await createServerClient();

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

  const { data: practicalTestRequest, error: requestError } = await supabase
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
      scheduled_start_at,
      ppc_type_rating_designation,
      ppc_aircraft_civil_model_designation,
      requested_dates_text,
      fee_amount,
      travel_fee_amount,
      fees_finalized_at,
      fee_response_status,
      status,
      status_reason,
      scheduled_end_at,
      scheduled_location,
      appointment_response_status,
      appointment_responded_at,
      appointment_response_notes
      `,
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    console.error(
      "Unable to load practical-test request for email:",
      requestError,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          requestError.message ||
          "The practical-test request could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }

  if (!practicalTestRequest) {
    return NextResponse.json(
      {
        ok: false,
        error: "The practical-test request could not be found.",
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
    const { data: applicantProfile, error: applicantProfileError } =
      await supabase
        .from("applicant_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

    if (
      !applicantProfileError &&
      applicantProfile &&
      applicantProfile.id === practicalTestRequest.applicant_profile_id
    ) {
      applicantAuthorized = true;
    }
  }

  let examinerAuthorized = false;
  let administratorAuthorized = false;
  let examinerReplyToEmail: string | undefined;

  if (
    eventType === "request_accepted_applicant" ||
    eventType === "request_declined_applicant" ||
    eventType === "request_scheduled_applicant" ||
    eventType === "request_fees_finalized_applicant" ||
    eventType === "assignment_proposed_applicant" ||
    eventType === "ppc_completed_applicant"
  ) {
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", user.id)
      .in("role", ["examiner", "administrator"]);

    if (!roleError && roleRows && roleRows.length > 0) {
      examinerAuthorized = true;
      administratorAuthorized = roleRows.some(
        (row) => row.role === "administrator",
      );
    }

    if (examinerAuthorized) {
      const { data: designeeProfile, error: designeeError } = await supabase
        .from("examiner_designee_profiles")
        .select("reply_to_email, email")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (designeeError) {
        console.warn("Unable to load examiner reply-to email:", designeeError);
      } else {
        examinerReplyToEmail =
          designeeProfile?.reply_to_email?.trim() ||
          designeeProfile?.email?.trim() ||
          undefined;
      }
    }
  }

  if (applicantGeneratedEvent && !applicantAuthorized) {
    return NextResponse.json(
      {
        ok: false,
        error: "You are not authorized to send this practical-test email.",
      },
      {
        status: 403,
      },
    );
  }

  if (!applicantGeneratedEvent && !examinerAuthorized) {
    return NextResponse.json(
      {
        ok: false,
        error: "You are not authorized to send this practical-test email.",
      },
      {
        status: 403,
      },
    );
  }

  if (
    eventType === "request_accepted_applicant" &&
    practicalTestRequest.status !== "accepted" &&
    practicalTestRequest.status !== "scheduling"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The practical-test request is not currently accepted or in scheduling.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "request_declined_applicant" &&
    (practicalTestRequest.status !== "declined" ||
      !practicalTestRequest.status_reason?.trim())
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The practical-test request is not declined or does not contain a decline reason.",
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
        error: "The practical-test request is not currently scheduled.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "request_fees_finalized_applicant" &&
    (practicalTestRequest.fees_finalized_at === null ||
      practicalTestRequest.fee_amount === null ||
      practicalTestRequest.fee_response_status !== "pending")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "The practical-test fees are not awaiting acceptance.",
      },
      { status: 409 },
    );
  }

  if (
    eventType === "request_fees_finalized_applicant" &&
    practicalTestRequest.assigned_examiner_profile_id !== user.id &&
    !administratorAuthorized
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only the assigned examiner or an administrator may email these fees.",
      },
      { status: 403 },
    );
  }

  if (
    eventType === "ppc_completed_applicant" &&
    practicalTestRequest.status !== "completed"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "The PPC event has not been completed.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "ppc_completed_applicant" &&
    practicalTestRequest.assigned_examiner_profile_id !== user.id &&
    !administratorAuthorized
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only the assigned examiner or an administrator may email the completed FAA Form 8410-1.",
      },
      {
        status: 403,
      },
    );
  }

  if (
    eventType === "appointment_accepted_examiner" &&
    (practicalTestRequest.status !== "confirmed" ||
      practicalTestRequest.appointment_response_status !== "accepted")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "The practical-test appointment has not been confirmed.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    eventType === "appointment_reschedule_requested_examiner" &&
    (practicalTestRequest.status !== "reschedule_required" ||
      practicalTestRequest.appointment_response_status !==
        "reschedule_requested")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "The applicant has not requested an appointment change.",
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
  let attachment: EmailAttachment | undefined;

  if (eventType === "request_submitted_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
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

    email = buildRequestSubmittedApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought: practicalTestRequest.certificate_sought,
      ratingSought: practicalTestRequest.rating_sought,
      requestedDatesText: practicalTestRequest.requested_dates_text,
      portalUrl: `${portalOrigin}/applicant/requests`,
    });

    dedupeKey = `request_submitted_applicant:${practicalTestRequest.id}`;
  } else if (eventType === "ppc_completed_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
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

    const { data: document, error: documentError } = await supabase
      .from("ppc_8410_documents")
      .select("finalized_pdf_path, finalized_pdf_sha256, finalized_at")
      .eq("practical_test_request_id", practicalTestRequest.id)
      .not("finalized_at", "is", null)
      .maybeSingle();

    if (
      documentError ||
      !document?.finalized_pdf_path ||
      !document.finalized_pdf_sha256 ||
      !document.finalized_at
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The signed FAA Form 8410-1 could not be found for this completed PPC.",
        },
        {
          status: 422,
        },
      );
    }

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from("ppc-8410-documents")
      .download(document.finalized_pdf_path);

    if (downloadError || !pdfBlob) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The signed FAA Form 8410-1 PDF could not be downloaded for email delivery.",
        },
        {
          status: 500,
        },
      );
    }

    recipientRole = "applicant";
    replyToEmail = examinerReplyToEmail;

    email = buildPpcCompletedApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought:
        practicalTestRequest.certificate_sought ||
        practicalTestRequest.rating_sought ||
        "Proficiency Check",
      ratingSought: practicalTestRequest.rating_sought,
      testDate: (() => {
        const rawDate = practicalTestRequest.scheduled_start_at;

        if (!rawDate) return "Not provided";

        const parsed = new Date(rawDate);

        if (Number.isNaN(parsed.getTime())) {
          return String(rawDate);
        }

        return new Intl.DateTimeFormat("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          timeZone: "Pacific/Honolulu",
        }).format(parsed);
      })(),
      aircraftType:
        practicalTestRequest.ppc_aircraft_civil_model_designation ||
        practicalTestRequest.ppc_type_rating_designation ||
        "Not provided",
    });

    attachment = {
      filename: `${practicalTestRequest.request_number}-FAA-8410-1.pdf`,
      content: Buffer.from(await pdfBlob.arrayBuffer()),
      contentType: "application/pdf",
    };

    dedupeKey = [
      "ppc_completed_applicant",
      practicalTestRequest.id,
      document.finalized_pdf_sha256,
    ].join(":");
  } else if (eventType === "request_declined_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
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

    const declineReason = practicalTestRequest.status_reason?.trim();

    if (!declineReason) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A decline reason is required before this email can be sent.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "applicant";
    replyToEmail = examinerReplyToEmail;

    email = buildRequestDeclinedApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought: practicalTestRequest.certificate_sought,
      ratingSought: practicalTestRequest.rating_sought,
      declineReason,
      portalUrl: `${portalOrigin}/applicant/requests`,
    });

    dedupeKey = `request_declined_applicant:${practicalTestRequest.id}`;

  } else if (eventType === "request_accepted_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
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

    email = buildRequestAcceptedApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought: practicalTestRequest.certificate_sought,
      ratingSought: practicalTestRequest.rating_sought,
      portalUrl: `${portalOrigin}/applicant/requests`,
    });

    dedupeKey = `request_accepted_applicant:${practicalTestRequest.id}`;
  } else if (eventType === "assignment_proposed_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
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

    const proposedStartAt = body.proposedStartAt?.trim();
    const proposedEndAt = body.proposedEndAt?.trim();
    const proposedLocation = body.proposedLocation?.trim();

    if (!proposedStartAt || !proposedEndAt || !proposedLocation) {
      return NextResponse.json(
        {
          ok: false,
          error: "The proposed appointment is incomplete.",
        },
        {
          status: 422,
        },
      );
    }

    const { data: proposalRows, error: proposalError } = await supabase
      .from("practical_test_assignment_proposals")
      .select(
        `
        id,
        examiner_profile_id,
        proposed_start_at,
        proposed_end_at,
        proposed_location,
        fee_amount,
        examiner_notes,
        updated_at
        `,
      )
      .eq("practical_test_request_id", practicalTestRequest.id)
      .eq("examiner_profile_id", user.id)
      .eq("status", "pending")
      .order("updated_at", {
        ascending: false,
      })
      .limit(1);

    if (proposalError) {
      console.error("Unable to verify assignment proposal:", proposalError);

      return NextResponse.json(
        {
          ok: false,
          error: "The appointment proposal could not be verified.",
        },
        {
          status: 500,
        },
      );
    }

    const proposal = proposalRows?.[0];

    if (!proposal) {
      return NextResponse.json(
        {
          ok: false,
          error: "No pending appointment proposal was found.",
        },
        {
          status: 422,
        },
      );
    }

    const { data: examinerProfile, error: examinerProfileError } =
      await supabase
        .from("profiles")
        .select(
          `
        first_name,
        last_name,
        email
        `,
        )
        .eq("id", user.id)
        .maybeSingle();

    if (examinerProfileError) {
      console.error(
        "Unable to load proposal examiner profile:",
        examinerProfileError,
      );
    }

    const { data: examinerDesignee, error: examinerDesigneeError } =
      await supabase
        .from("examiner_designee_profiles")
        .select(
          `
        designee_name,
        email,
        reply_to_email
        `,
        )
        .eq("profile_id", user.id)
        .maybeSingle();

    if (examinerDesigneeError) {
      console.error(
        "Unable to load proposal examiner designee profile:",
        examinerDesigneeError,
      );
    }

    const examinerName =
      examinerDesignee?.designee_name?.trim() ||
      [examinerProfile?.first_name, examinerProfile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Designated Pilot Examiner";

    replyToEmail =
      examinerDesignee?.reply_to_email?.trim() ||
      examinerDesignee?.email?.trim() ||
      examinerProfile?.email?.trim() ||
      undefined;

    recipientRole = "applicant";

    email = buildAssignmentProposedApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought: practicalTestRequest.certificate_sought,
      ratingSought: practicalTestRequest.rating_sought,
      examinerName,
      proposedStartAt: proposal.proposed_start_at,
      proposedEndAt: proposal.proposed_end_at,
      proposedLocation: proposal.proposed_location,
      feeAmount:
        proposal.fee_amount === null ? null : Number(proposal.fee_amount),
      examinerMessage: proposal.examiner_notes,
      portalUrl: `${portalOrigin}/applicant/requests`,
    });

    dedupeKey = [
      "assignment_proposed_applicant",
      practicalTestRequest.id,
      proposal.id,
      proposal.updated_at,
    ].join(":");
  } else if (eventType === "request_fees_finalized_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
      ?.trim()
      .toLowerCase();

    if (!recipientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The practical-test request does not contain an applicant email address.",
        },
        { status: 422 },
      );
    }

    const testFee = Number(practicalTestRequest.fee_amount);
    const travelFee = Number(practicalTestRequest.travel_fee_amount ?? 0);

    recipientRole = "applicant";
    replyToEmail = examinerReplyToEmail;
    email = buildFeesFinalizedApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought: practicalTestRequest.certificate_sought,
      ratingSought: practicalTestRequest.rating_sought,
      testFee,
      travelFee,
      portalUrl: `${portalOrigin}/applicant/requests`,
    });
    dedupeKey = [
      "request_fees_finalized_applicant",
      practicalTestRequest.id,
      practicalTestRequest.fees_finalized_at,
      testFee,
      travelFee,
    ].join(":");
  } else if (eventType === "request_scheduled_applicant") {
    recipientEmail = practicalTestRequest.applicant_email_snapshot
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

    const scheduledStartAt = practicalTestRequest.scheduled_start_at;

    const scheduledEndAt = practicalTestRequest.scheduled_end_at;

    const scheduledLocation = practicalTestRequest.scheduled_location?.trim();

    if (!scheduledStartAt || !scheduledEndAt || !scheduledLocation) {
      return NextResponse.json(
        {
          ok: false,
          error: "The scheduled appointment is incomplete.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "applicant";
    replyToEmail = examinerReplyToEmail;

    email = buildRequestScheduledApplicantEmail({
      applicantName: practicalTestRequest.applicant_name_snapshot,
      requestNumber: practicalTestRequest.request_number,
      certificateSought: practicalTestRequest.certificate_sought,
      ratingSought: practicalTestRequest.rating_sought,
      scheduledStartAt,
      scheduledEndAt,
      scheduledLocation,
      feeAmount:
        practicalTestRequest.fee_amount === null
          ? null
          : Number(practicalTestRequest.fee_amount),
      portalUrl: `${portalOrigin}/applicant/requests`,
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
          error: "No examiner is assigned to this practical-test request.",
        },
        {
          status: 422,
        },
      );
    }

    const { data: portalDetailData, error: portalDetailError } =
      await supabase.rpc("applicant_get_request_portal_details");

    if (portalDetailError) {
      console.error(
        "Unable to load assigned examiner email details:",
        portalDetailError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "The assigned examiner email could not be loaded.",
        },
        {
          status: 500,
        },
      );
    }

    const examinerDetail = (
      (portalDetailData ?? []) as ApplicantPortalDetail[]
    ).find(
      (detail) => detail.practical_test_request_id === practicalTestRequest.id,
    );

    if (
      !examinerDetail ||
      examinerDetail.examiner_profile_id !== assignedExaminerProfileId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "The assigned examiner could not be verified.",
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

    const scheduledStartAt = practicalTestRequest.scheduled_start_at;

    const scheduledEndAt = practicalTestRequest.scheduled_end_at;

    const scheduledLocation = practicalTestRequest.scheduled_location?.trim();

    if (!scheduledStartAt || !scheduledEndAt || !scheduledLocation) {
      return NextResponse.json(
        {
          ok: false,
          error: "The confirmed appointment is incomplete.",
        },
        {
          status: 422,
        },
      );
    }

    recipientRole = "examiner";

    replyToEmail =
      practicalTestRequest.applicant_email_snapshot?.trim() || undefined;

    if (eventType === "appointment_reschedule_requested_examiner") {
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

      email = buildAppointmentRescheduleRequestedExaminerEmail({
        examinerName: examinerDetail.examiner_name,
        applicantName: practicalTestRequest.applicant_name_snapshot,
        requestNumber: practicalTestRequest.request_number,
        certificateSought: practicalTestRequest.certificate_sought,
        ratingSought: practicalTestRequest.rating_sought,
        scheduledStartAt,
        scheduledEndAt,
        scheduledLocation,
        rescheduleReason,
        examinerPortalUrl: `${portalOrigin}/examiner/requests?request=${encodeURIComponent(
          practicalTestRequest.id,
        )}`,
      });

      dedupeKey = [
        "appointment_reschedule_requested_examiner",
        practicalTestRequest.id,
        scheduledStartAt,
        practicalTestRequest.appointment_responded_at || "reschedule_requested",
      ].join(":");
    } else {
      email = buildAppointmentAcceptedExaminerEmail({
        examinerName: examinerDetail.examiner_name,
        applicantName: practicalTestRequest.applicant_name_snapshot,
        requestNumber: practicalTestRequest.request_number,
        certificateSought: practicalTestRequest.certificate_sought,
        ratingSought: practicalTestRequest.rating_sought,
        scheduledStartAt,
        scheduledEndAt,
        scheduledLocation,
        examinerPortalUrl: `${portalOrigin}/examiner/requests?request=${encodeURIComponent(
          practicalTestRequest.id,
        )}`,
      });

      dedupeKey = [
        "appointment_accepted_examiner",
        practicalTestRequest.id,
        scheduledStartAt,
        practicalTestRequest.appointment_responded_at || "accepted",
      ].join(":");
    }
  }

  const { data: claimData, error: claimError } = await supabase.rpc(
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
    console.error("Unable to claim practical-test email:", claimError);

    return NextResponse.json(
      {
        ok: false,
        error: "The email event could not be prepared.",
      },
      {
        status: 500,
      },
    );
  }

  const claim = (
    Array.isArray(claimData) ? claimData[0] : claimData
  ) as ClaimRow | null;

  if (!claim) {
    return NextResponse.json(
      {
        ok: false,
        error: "The email event did not return a claim record.",
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

  const { data: resendData, error: resendError } = await resend.emails.send({
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
    ...(attachment
      ? {
          attachments: [attachment],
        }
      : {}),
  });

  if (resendError) {
    console.error("Resend practical-test email failed:", resendError);

    await supabase.rpc("complete_practical_test_email", {
      p_log_id: claim.log_id,
      p_status: "failed",
      p_provider_message_id: null,
      p_error_message:
        resendError.message ?? "The email provider rejected the message.",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "The request update succeeded, but the email could not be sent.",
      },
      {
        status: 502,
      },
    );
  }

  const { error: completionError } = await supabase.rpc(
    "complete_practical_test_email",
    {
      p_log_id: claim.log_id,
      p_status: "sent",
      p_provider_message_id: resendData?.id ?? null,
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
