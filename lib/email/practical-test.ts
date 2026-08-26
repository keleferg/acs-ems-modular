type AppointmentAcceptedExaminerEmailInput = {
  examinerName: string | null;
  applicantName: string;
  requestNumber: string;
  certificateSought: string;
  ratingSought: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  scheduledLocation: string;
  examinerPortalUrl: string;
};

type AppointmentRescheduleRequestedExaminerEmailInput = {
  examinerName: string | null;
  applicantName: string;
  requestNumber: string;
  certificateSought: string;
  ratingSought: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  scheduledLocation: string;
  rescheduleReason: string;
  examinerPortalUrl: string;
};

type RequestScheduledApplicantEmailInput = {
  applicantName: string;
  requestNumber: string;
  certificateSought: string;
  ratingSought: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  scheduledLocation: string;
  feeAmount: number | null;
  portalUrl: string;
};

type RequestAcceptedApplicantEmailInput = {
  applicantName: string;
  requestNumber: string;
  certificateSought: string;
  ratingSought: string;
  portalUrl: string;
};

type RequestSubmittedApplicantEmailInput = {
  applicantName: string;
  requestNumber: string;
  certificateSought: string;
  ratingSought: string;
  requestedDatesText: string | null;
  portalUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstName(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return "Applicant";
  }

  return cleaned.split(/\s+/)[0];
}

export function buildRequestSubmittedApplicantEmail(
  input: RequestSubmittedApplicantEmailInput,
) {
  const applicantFirstName = firstName(input.applicantName);

  const subject =
    `Practical Test Request Received — ${input.requestNumber}`;

  const requestedDates =
    input.requestedDatesText?.trim() ||
    "No specific date preference recorded";

  const html = `
<!doctype html>
<html lang="en">
  <body style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
    color:#0f172a;
  ">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#f8fafc;padding:32px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:640px;
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:16px;
              overflow:hidden;
            "
          >
            <tr>
              <td style="
                background:#0f172a;
                padding:24px 28px;
                color:#ffffff;
              ">
                <div style="
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:#fbbf24;
                ">
                  Aviation Training Services
                </div>

                <div style="
                  margin-top:7px;
                  font-size:24px;
                  line-height:1.25;
                  font-weight:700;
                ">
                  Practical Test Request Received
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <p style="
                  margin:0 0 18px;
                  font-size:16px;
                  line-height:1.6;
                ">
                  Aloha ${escapeHtml(applicantFirstName)},
                </p>

                <p style="
                  margin:0 0 22px;
                  font-size:15px;
                  line-height:1.7;
                  color:#334155;
                ">
                  Your practical test request has been received and
                  is now under review. No action is required from you
                  at this time.
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    border:1px solid #e2e8f0;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                      width:150px;
                    ">
                      Request Number
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                      font-weight:700;
                    ">
                      ${escapeHtml(input.requestNumber)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Certificate
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.certificateSought)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Rating
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.ratingSought)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Requested Date
                    </td>
                    <td style="
                      padding:12px 16px;
                      font-size:14px;
                    ">
                      ${escapeHtml(requestedDates)}
                    </td>
                  </tr>
                </table>

                <div style="margin-top:26px;">
                  <a
                    href="${escapeHtml(input.portalUrl)}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#d97706;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:8px;
                      font-size:14px;
                      font-weight:700;
                    "
                  >
                    View My Request
                  </a>
                </div>

                <p style="
                  margin:26px 0 0;
                  font-size:13px;
                  line-height:1.6;
                  color:#64748b;
                ">
                  You can return to the Applicant Portal at any time
                  to review the status of your request.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text = [
    `Aloha ${applicantFirstName},`,
    "",
    "Your practical test request has been received and is now under review.",
    "No action is required from you at this time.",
    "",
    `Request Number: ${input.requestNumber}`,
    `Certificate: ${input.certificateSought}`,
    `Rating: ${input.ratingSought}`,
    `Requested Date: ${requestedDates}`,
    "",
    `View your request: ${input.portalUrl}`,
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}

export function buildRequestAcceptedApplicantEmail(
  input: RequestAcceptedApplicantEmailInput,
) {
  const applicantFirstName = firstName(input.applicantName);

  const subject =
    `Practical Test Request Accepted — ${input.requestNumber}`;

  const html = `
<!doctype html>
<html lang="en">
  <body style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
    color:#0f172a;
  ">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#f8fafc;padding:32px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:640px;
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:16px;
              overflow:hidden;
            "
          >
            <tr>
              <td style="
                background:#0f172a;
                padding:24px 28px;
                color:#ffffff;
              ">
                <div style="
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:#fbbf24;
                ">
                  Aviation Training Solutions
                </div>

                <div style="
                  margin-top:7px;
                  font-size:24px;
                  line-height:1.25;
                  font-weight:700;
                ">
                  Practical Test Request Accepted
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <p style="
                  margin:0 0 18px;
                  font-size:16px;
                  line-height:1.6;
                ">
                  Aloha ${escapeHtml(applicantFirstName)},
                </p>

                <p style="
                  margin:0 0 22px;
                  font-size:15px;
                  line-height:1.7;
                  color:#334155;
                ">
                  Your practical test request has been accepted by
                  the examiner and is now moving into scheduling.
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    border:1px solid #e2e8f0;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                      width:150px;
                    ">
                      Request Number
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                      font-weight:700;
                    ">
                      ${escapeHtml(input.requestNumber)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Certificate
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.certificateSought)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Rating
                    </td>
                    <td style="
                      padding:12px 16px;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.ratingSought)}
                    </td>
                  </tr>
                </table>

                <div style="
                  margin-top:22px;
                  padding:16px;
                  border-radius:10px;
                  background:#fffbeb;
                  border:1px solid #fde68a;
                  color:#78350f;
                  font-size:14px;
                  line-height:1.6;
                ">
                  Your examiner will finalize the appointment date,
                  time, location, and fee. Once the appointment is
                  scheduled, you will receive another notification
                  and will be asked to accept the appointment.
                </div>

                <div style="margin-top:26px;">
                  <a
                    href="${escapeHtml(input.portalUrl)}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#d97706;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:8px;
                      font-size:14px;
                      font-weight:700;
                    "
                  >
                    View My Request
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text = [
    `Aloha ${applicantFirstName},`,
    "",
    "Your practical test request has been accepted by the examiner and is now moving into scheduling.",
    "",
    `Request Number: ${input.requestNumber}`,
    `Certificate: ${input.certificateSought}`,
    `Rating: ${input.ratingSought}`,
    "",
    "Your examiner will finalize the appointment date, time, location, and fee.",
    "Once the appointment is scheduled, you will receive another notification and will be asked to accept the appointment.",
    "",
    `View your request: ${input.portalUrl}`,
  ].join("\\n");

  return {
    subject,
    html,
    text,
  };
}

function formatScheduledAppointmentDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatScheduledAppointmentTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatScheduledAppointmentFee(value: number | null) {
  if (value === null || value === undefined) {
    return "To be confirmed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function buildRequestScheduledApplicantEmail(
  input: RequestScheduledApplicantEmailInput,
) {
  const applicantFirstName = firstName(input.applicantName);

  const appointmentDate =
    formatScheduledAppointmentDate(input.scheduledStartAt);

  const appointmentStartTime =
    formatScheduledAppointmentTime(input.scheduledStartAt);

  const appointmentEndTime =
    formatScheduledAppointmentTime(input.scheduledEndAt);

  const fee =
    formatScheduledAppointmentFee(input.feeAmount);

  const subject =
    `Practical Test Appointment Scheduled — ${input.requestNumber}`;

  const html = `
<!doctype html>
<html lang="en">
  <body style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
    color:#0f172a;
  ">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#f8fafc;padding:32px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:640px;
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:16px;
              overflow:hidden;
            "
          >
            <tr>
              <td style="
                background:#0f172a;
                padding:24px 28px;
                color:#ffffff;
              ">
                <div style="
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:#fbbf24;
                ">
                  Aviation Training Solutions
                </div>

                <div style="
                  margin-top:7px;
                  font-size:24px;
                  line-height:1.25;
                  font-weight:700;
                ">
                  Practical Test Appointment Scheduled
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <p style="
                  margin:0 0 18px;
                  font-size:16px;
                  line-height:1.6;
                ">
                  Aloha ${escapeHtml(applicantFirstName)},
                </p>

                <p style="
                  margin:0 0 22px;
                  font-size:15px;
                  line-height:1.7;
                  color:#334155;
                ">
                  Your practical test appointment has been scheduled.
                  Please review the appointment details below.
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    border:1px solid #e2e8f0;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                      width:150px;
                    ">
                      Request Number
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                      font-weight:700;
                    ">
                      ${escapeHtml(input.requestNumber)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Date
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(appointmentDate)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Time
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(appointmentStartTime)}
                      –
                      ${escapeHtml(appointmentEndTime)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Location
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.scheduledLocation)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Fee
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(fee)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Certificate
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.certificateSought)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Rating
                    </td>
                    <td style="
                      padding:12px 16px;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.ratingSought)}
                    </td>
                  </tr>
                </table>

                <div style="
                  margin-top:22px;
                  padding:16px;
                  border-radius:10px;
                  background:#fffbeb;
                  border:1px solid #fde68a;
                  color:#78350f;
                  font-size:14px;
                  line-height:1.6;
                ">
                  Please sign in to your applicant portal to
                  <strong>accept the appointment</strong> or
                  <strong>request a reschedule</strong>.
                </div>

                <div style="margin-top:26px;">
                  <a
                    href="${escapeHtml(input.portalUrl)}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#d97706;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:8px;
                      font-size:14px;
                      font-weight:700;
                    "
                  >
                    Review Appointment
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text = [
    `Aloha ${applicantFirstName},`,
    "",
    "Your practical test appointment has been scheduled.",
    "",
    `Request Number: ${input.requestNumber}`,
    `Date: ${appointmentDate}`,
    `Time: ${appointmentStartTime} - ${appointmentEndTime}`,
    `Location: ${input.scheduledLocation}`,
    `Fee: ${fee}`,
    `Certificate: ${input.certificateSought}`,
    `Rating: ${input.ratingSought}`,
    "",
    "Please sign in to your applicant portal to accept the appointment or request a reschedule.",
    "",
    `Review appointment: ${input.portalUrl}`,
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}

export function buildAppointmentAcceptedExaminerEmail(
  input: AppointmentAcceptedExaminerEmailInput,
) {
  const examinerGreeting =
    input.examinerName?.trim()
      ? firstName(input.examinerName)
      : "Examiner";

  const appointmentDate =
    formatScheduledAppointmentDate(input.scheduledStartAt);

  const appointmentStartTime =
    formatScheduledAppointmentTime(input.scheduledStartAt);

  const appointmentEndTime =
    formatScheduledAppointmentTime(input.scheduledEndAt);

  const subject =
    `Practical Test Appointment Confirmed — ${input.requestNumber}`;

  const html = `
<!doctype html>
<html lang="en">
  <body style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
    color:#0f172a;
  ">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#f8fafc;padding:32px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:640px;
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:16px;
              overflow:hidden;
            "
          >
            <tr>
              <td style="
                background:#0f172a;
                padding:24px 28px;
                color:#ffffff;
              ">
                <div style="
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:#fbbf24;
                ">
                  Aviation Training Solutions
                </div>

                <div style="
                  margin-top:7px;
                  font-size:24px;
                  line-height:1.25;
                  font-weight:700;
                ">
                  Appointment Confirmed
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <p style="
                  margin:0 0 18px;
                  font-size:16px;
                  line-height:1.6;
                ">
                  Aloha ${escapeHtml(examinerGreeting)},
                </p>

                <p style="
                  margin:0 0 22px;
                  font-size:15px;
                  line-height:1.7;
                  color:#334155;
                ">
                  ${escapeHtml(input.applicantName)} has accepted
                  the scheduled practical test appointment.
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    border:1px solid #e2e8f0;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#475569;width:150px;">
                      Applicant
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;">
                      ${escapeHtml(input.applicantName)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#475569;">
                      Request Number
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">
                      ${escapeHtml(input.requestNumber)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#475569;">
                      Date
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">
                      ${escapeHtml(appointmentDate)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#475569;">
                      Time
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">
                      ${escapeHtml(appointmentStartTime)}
                      –
                      ${escapeHtml(appointmentEndTime)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#475569;">
                      Location
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">
                      ${escapeHtml(input.scheduledLocation)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#475569;">
                      Certificate
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">
                      ${escapeHtml(input.certificateSought)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;font-size:13px;font-weight:700;color:#475569;">
                      Rating
                    </td>
                    <td style="padding:12px 16px;font-size:14px;">
                      ${escapeHtml(input.ratingSought)}
                    </td>
                  </tr>
                </table>

                <div style="margin-top:26px;">
                  <a
                    href="${escapeHtml(input.examinerPortalUrl)}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#d97706;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:8px;
                      font-size:14px;
                      font-weight:700;
                    "
                  >
                    View Request
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text = [
    `Aloha ${examinerGreeting},`,
    "",
    `${input.applicantName} has accepted the scheduled practical test appointment.`,
    "",
    `Applicant: ${input.applicantName}`,
    `Request Number: ${input.requestNumber}`,
    `Date: ${appointmentDate}`,
    `Time: ${appointmentStartTime} - ${appointmentEndTime}`,
    `Location: ${input.scheduledLocation}`,
    `Certificate: ${input.certificateSought}`,
    `Rating: ${input.ratingSought}`,
    "",
    `View request: ${input.examinerPortalUrl}`,
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}

export function buildAppointmentRescheduleRequestedExaminerEmail(
  input: AppointmentRescheduleRequestedExaminerEmailInput,
) {
  const examinerFirstName =
    input.examinerName?.trim().split(/\s+/)[0] || "Examiner";

  const formatAppointmentDateTime = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Pacific/Honolulu",
    }).format(new Date(value));

  const subject =
    `Appointment Change Requested — ${input.requestNumber}`;

  const start =
    formatAppointmentDateTime(input.scheduledStartAt);

  const end =
    formatAppointmentDateTime(input.scheduledEndAt);

  const html = `
<!doctype html>
<html lang="en">
  <body style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
    color:#0f172a;
  ">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#f8fafc;padding:32px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:640px;
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:16px;
              overflow:hidden;
            "
          >
            <tr>
              <td style="
                background:#0f172a;
                padding:24px 28px;
                color:#ffffff;
              ">
                <div style="
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:#fbbf24;
                ">
                  Aviation Training Solutions
                </div>

                <div style="
                  margin-top:7px;
                  font-size:24px;
                  line-height:1.25;
                  font-weight:700;
                ">
                  Appointment Change Requested
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <p style="
                  margin:0 0 18px;
                  font-size:16px;
                  line-height:1.6;
                ">
                  Aloha ${escapeHtml(examinerFirstName)},
                </p>

                <p style="
                  margin:0 0 22px;
                  font-size:15px;
                  line-height:1.7;
                  color:#334155;
                ">
                  ${escapeHtml(input.applicantName)} has requested
                  a change to the scheduled practical test appointment.
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    border:1px solid #e2e8f0;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                      width:160px;
                    ">
                      Request Number
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                      font-weight:700;
                    ">
                      ${escapeHtml(input.requestNumber)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Applicant
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.applicantName)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Practical Test
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.certificateSought)}
                      — ${escapeHtml(input.ratingSought)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      border-bottom:1px solid #e2e8f0;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Current Appointment
                    </td>
                    <td style="
                      padding:12px 16px;
                      border-bottom:1px solid #e2e8f0;
                      font-size:14px;
                    ">
                      ${escapeHtml(start)} – ${escapeHtml(end)}
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding:12px 16px;
                      background:#f8fafc;
                      font-size:13px;
                      font-weight:700;
                      color:#475569;
                    ">
                      Location
                    </td>
                    <td style="
                      padding:12px 16px;
                      font-size:14px;
                    ">
                      ${escapeHtml(input.scheduledLocation)}
                    </td>
                  </tr>
                </table>

                <div style="
                  margin-top:22px;
                  padding:16px;
                  border-radius:10px;
                  background:#fef2f2;
                  border:1px solid #fecaca;
                  color:#7f1d1d;
                ">
                  <div style="
                    font-size:13px;
                    font-weight:700;
                    margin-bottom:8px;
                  ">
                    Applicant's Reason
                  </div>

                  <div style="
                    font-size:14px;
                    line-height:1.6;
                    white-space:pre-wrap;
                  ">
                    ${escapeHtml(input.rescheduleReason)}
                  </div>
                </div>

                <div style="margin-top:26px;">
                  <a
                    href="${escapeHtml(input.examinerPortalUrl)}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#d97706;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:8px;
                      font-size:14px;
                      font-weight:700;
                    "
                  >
                    Review Appointment
                  </a>
                </div>

                <p style="
                  margin:24px 0 0;
                  font-size:13px;
                  line-height:1.6;
                  color:#64748b;
                ">
                  Open the request in the Examiner Portal to enter
                  and send a revised appointment.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text = [
    `Aloha ${examinerFirstName},`,
    "",
    `${input.applicantName} has requested a change to the scheduled practical test appointment.`,
    "",
    `Request Number: ${input.requestNumber}`,
    `Applicant: ${input.applicantName}`,
    `Practical Test: ${input.certificateSought} — ${input.ratingSought}`,
    `Current Appointment: ${start} – ${end}`,
    `Location: ${input.scheduledLocation}`,
    "",
    "Applicant's Reason:",
    input.rescheduleReason,
    "",
    `Review the request: ${input.examinerPortalUrl}`,
  ].join("\\n");

  return {
    subject,
    html,
    text,
  };
}
