import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildOpenAssignmentAlertEmail } from "../../lib/email/practical-test";

// Open assignment alerts (Kele, Nov 2 2026): every 10 minutes, email examiners about new open
// assignments in the areas they chose in Settings → Locations. open_assignment_alerts_due()
// returns what hasn't been sent; each email is recorded in open_assignment_alert_log first so
// it's never sent twice.

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");

  if (!supabaseUrl || !serviceKey || !resendApiKey || !fromEmail || !siteUrl) {
    throw new Error("Open assignment alerts are missing required environment configuration.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(resendApiKey);

  const { data, error } = await supabase.rpc("open_assignment_alerts_due");
  if (error) throw error;

  type Due = {
    request_id: string;
    request_number: string;
    certificate_sought: string | null;
    rating_sought: string | null;
    requested_dates_text: string | null;
    airport_label: string | null;
    examiner_profile_id: string;
    examiner_name: string | null;
    examiner_email: string;
  };

  let sent = 0;
  let failed = 0;

  for (const alert of (data ?? []) as Due[]) {
    const { error: claimError } = await supabase.from("open_assignment_alert_log").insert({
      practical_test_request_id: alert.request_id,
      examiner_profile_id: alert.examiner_profile_id,
    });
    if (claimError) continue; // already claimed by another run

    const message = buildOpenAssignmentAlertEmail({
      examinerName: alert.examiner_name,
      requestNumber: alert.request_number,
      certificateSought: alert.certificate_sought,
      ratingSought: alert.rating_sought,
      requestedDatesText: alert.requested_dates_text,
      airportLabel: alert.airport_label,
      openAssignmentsUrl: `${siteUrl}/examiner/requests?tab=open`,
      locationsUrl: `${siteUrl}/examiner/settings/locations`,
    });

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [alert.examiner_email],
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (sendError) {
      failed += 1;
      console.error(`Open assignment alert ${alert.request_number} failed:`, sendError.message);
      await supabase
        .from("open_assignment_alert_log")
        .delete()
        .eq("practical_test_request_id", alert.request_id)
        .eq("examiner_profile_id", alert.examiner_profile_id);
    } else {
      sent += 1;
    }
  }

  console.log(`Open assignment alerts: ${sent} sent, ${failed} failed.`);
  return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
};

export const config = {
  schedule: "*/10 * * * *",
};
