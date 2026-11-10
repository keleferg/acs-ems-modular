import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import {
  buildOpenOfferAcceptedApplicantEmail,
  buildOpenOfferFilledApplicantEmail,
  buildOpenOfferInvitationEmail,
  buildOpenOfferRequestedExaminerEmail,
} from "@/lib/email/practical-test";
import { orderByPriority } from "@/lib/open-offers/priority";

// Server-only helpers for Open Offers (Kele, Nov 7 2026).
// The applicant answers from a one-click emailed link with no sign-in: a random token whose SHA-256
// is stored in open_offer_recipients.token_hash, checked with the service key. Every email is
// written to practical_test_email_log and to the request's History.

export function serviceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Open Offers are not configured on the server.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Service = ReturnType<typeof serviceClient>;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isTokenShape(token: string) {
  return /^[A-Za-z0-9_-]{30,64}$/.test(token);
}

function mailer() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email is not configured on the server.");
  return { resend: new Resend(apiKey), from };
}

function hawaiiDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function hawaiiTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function slotText(startAt: string, endAt: string) {
  return `${hawaiiDate(startAt)} ${hawaiiTime(startAt)}–${hawaiiTime(endAt)}`;
}

async function examinerContact(service: Service, examinerProfileId: string) {
  const [{ data: designee }, { data: profile }] = await Promise.all([
    service.from("examiner_designee_profiles").select("designee_name, reply_to_email, email").eq("profile_id", examinerProfileId).maybeSingle(),
    service.from("profiles").select("first_name, last_name, email").eq("id", examinerProfileId).maybeSingle(),
  ]);
  const name =
    designee?.designee_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    null;
  const email = designee?.email?.trim() || profile?.email?.trim() || undefined;
  return { name, email, replyTo: designee?.reply_to_email?.trim() || email };
}

type RecipientRow = {
  id: string;
  open_offer_id: string;
  practical_test_request_id: string;
  recipient_email: string | null;
};

type OfferRow = { id: string; examiner_profile_id: string; start_at: string; end_at: string; notes: string | null };

type RequestRow = {
  id: string;
  request_number: string;
  applicant_name_snapshot: string | null;
  scheduled_location: string | null;
};

async function loadRecipients(service: Service, recipientIds: string[]) {
  if (recipientIds.length === 0) return [];
  const { data, error } = await service
    .from("open_offer_recipients")
    .select("id, open_offer_id, practical_test_request_id, recipient_email")
    .in("id", recipientIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as RecipientRow[];
}

async function loadOffer(service: Service, offerId: string) {
  const { data, error } = await service.from("open_offers").select("id, examiner_profile_id, start_at, end_at, notes").eq("id", offerId).maybeSingle();
  if (error || !data) throw new Error("Open offer not found.");
  return data as OfferRow;
}

/** test name + matched airport for one recipient (same text the applicant's page shows). */
async function recipientDetails(service: Service, tokenOrRecipient: { recipientId: string }) {
  const { data } = await service
    .from("open_offer_recipients")
    .select("token_hash")
    .eq("id", tokenOrRecipient.recipientId)
    .maybeSingle();
  if (!data?.token_hash) return null;
  const { data: details } = await service.rpc("open_offer_token_details", { p_token_hash: data.token_hash });
  return details as { test_name: string | null; airport: string | null; current_start_at: string | null; current_end_at: string | null } | null;
}

async function logEmail(
  service: Service,
  input: {
    requestId: string;
    type: string;
    email: string;
    subject: string;
    dedupeKey: string;
    ok: boolean;
    error?: string;
    messageId?: string;
    actorId?: string | null;
    role?: "applicant" | "examiner";
  },
) {
  const now = new Date().toISOString();
  const { error } = await service.from("practical_test_email_log").insert({
    practical_test_request_id: input.requestId,
    email_type: input.type,
    recipient_role: input.role ?? "applicant",
    recipient_email: input.email,
    subject: input.subject,
    dedupe_key: input.dedupeKey,
    status: input.ok ? "sent" : "failed",
    provider_message_id: input.messageId ?? null,
    error_message: input.error ?? null,
    attempted_by_profile_id: input.actorId ?? null,
    attempted_at: now,
    sent_at: input.ok ? now : null,
  });
  if (error) console.error("Open offer email log failed:", error);
}

export async function addHistory(
  service: Service,
  requestId: string,
  text: string,
  options: { type?: "email" | "appointment_change"; actorId?: string | null; label?: string } = {},
) {
  const { error } = await service.from("practical_test_request_history").insert({
    practical_test_request_id: requestId,
    entry_text: text,
    entry_type: options.type ?? "email",
    created_by_profile_id: options.actorId ?? null,
    created_by_label: options.label ?? "Examiner",
  });
  if (error) console.error("Open offer history entry failed:", error);
}

async function loadRequests(service: Service, ids: string[]) {
  const { data } = await service
    .from("practical_test_requests")
    .select("id, request_number, applicant_name_snapshot, scheduled_location")
    .in("id", ids);
  return new Map(((data ?? []) as RequestRow[]).map((row) => [row.id, row]));
}

/** Creates each recipient's link and sends the invitation. Returns how many were sent / failed. */
export async function sendOpenOfferInvitations(service: Service, offerId: string, recipientIds: string[], origin: string, actorId: string) {
  const offer = await loadOffer(service, offerId);
  const recipients = await loadRecipients(service, recipientIds);
  const requests = await loadRequests(service, recipients.map((r) => r.practical_test_request_id));
  const examiner = await examinerContact(service, offer.examiner_profile_id);
  const { resend, from } = mailer();
  const base = origin.replace(/\/$/, "");
  let sent = 0;
  const failed: string[] = [];

  for (const recipient of recipients) {
    const request = requests.get(recipient.practical_test_request_id);
    const email = recipient.recipient_email?.trim();
    if (!request || !email) continue;

    const token = randomBytes(32).toString("base64url");
    const { error: tokenError } = await service.from("open_offer_recipients").update({ token_hash: hashToken(token) }).eq("id", recipient.id);
    if (tokenError) {
      failed.push(request.request_number);
      await service.from("open_offer_recipients").update({ email_status: "failed", email_error: tokenError.message }).eq("id", recipient.id);
      continue;
    }

    const details = await recipientDetails(service, { recipientId: recipient.id });
    const link = `${base}/open-offer?t=${encodeURIComponent(token)}`;
    const message = buildOpenOfferInvitationEmail({
      applicantName: request.applicant_name_snapshot ?? "",
      examinerName: examiner.name,
      requestNumber: request.request_number,
      testName: details?.test_name ?? "",
      airportLabel: details?.airport ?? null,
      startAt: offer.start_at,
      endAt: offer.end_at,
      notes: offer.notes,
      currentStartAt: details?.current_start_at ?? null,
      currentEndAt: details?.current_end_at ?? null,
      requestUrl: `${link}&a=request`,
      declineUrl: `${link}&a=decline`,
    });

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      ...(examiner.replyTo ? { replyTo: examiner.replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    const now = new Date().toISOString();
    if (error) {
      failed.push(request.request_number);
      await service.from("open_offer_recipients").update({ email_status: "failed", email_error: error.message, updated_at: now }).eq("id", recipient.id);
    } else {
      sent += 1;
      await service.from("open_offer_recipients").update({ email_status: "sent", email_error: null, email_sent_at: now, updated_at: now }).eq("id", recipient.id);
      await addHistory(service, request.id, `Open Offer email sent to ${email} for ${slotText(offer.start_at, offer.end_at)}.`, { actorId });
    }
    await logEmail(service, {
      requestId: request.id,
      type: "open_offer_invitation",
      email,
      subject: message.subject,
      dedupeKey: `open_offer_invitation:${recipient.id}`,
      ok: !error,
      error: error?.message,
      messageId: data?.id,
      actorId,
    });
  }

  return { sent, failed };
}

/** Confirmation to the accepted applicant + "slot filled" / "no longer available" to the others. */
export async function sendOpenOfferOutcomeEmails(
  service: Service,
  offerId: string,
  input: { acceptedRecipientId?: string | null; otherRecipientIds: string[]; withdrawn?: boolean },
  origin: string,
  actorId: string,
) {
  const offer = await loadOffer(service, offerId);
  const ids = [...(input.acceptedRecipientId ? [input.acceptedRecipientId] : []), ...input.otherRecipientIds];
  const recipients = await loadRecipients(service, ids);
  const requests = await loadRequests(service, recipients.map((r) => r.practical_test_request_id));
  const examiner = await examinerContact(service, offer.examiner_profile_id);
  const { resend, from } = mailer();
  const portalUrl = `${origin.replace(/\/$/, "")}/applicant/requests`;
  const failed: string[] = [];

  for (const recipient of recipients) {
    const request = requests.get(recipient.practical_test_request_id);
    const email = recipient.recipient_email?.trim();
    if (!request) continue;
    if (!email) {
      await service.from("open_offer_recipients").update({ outcome_email_status: "skipped" }).eq("id", recipient.id);
      continue;
    }
    const accepted = recipient.id === input.acceptedRecipientId;
    const details = await recipientDetails(service, { recipientId: recipient.id });
    const common = {
      applicantName: request.applicant_name_snapshot ?? "",
      requestNumber: request.request_number,
      testName: details?.test_name ?? "",
      airportLabel: details?.airport ?? null,
      startAt: offer.start_at,
      endAt: offer.end_at,
      portalUrl,
    };
    // For an applicant who was already scheduled, current_start_at is the appointment they had
    // (refreshed to the one that was moved when they are the accepted applicant).
    const current = { start: details?.current_start_at ?? null, end: details?.current_end_at ?? null };
    const message = accepted
      ? buildOpenOfferAcceptedApplicantEmail({
          ...common,
          examinerName: examiner.name,
          scheduledLocation: request.scheduled_location ?? "",
          previousStartAt: current.start,
          previousEndAt: current.end,
        })
      : buildOpenOfferFilledApplicantEmail({ ...common, withdrawn: input.withdrawn, currentStartAt: current.start, currentEndAt: current.end });
    const type = accepted ? "open_offer_accepted" : input.withdrawn ? "open_offer_withdrawn" : "open_offer_filled";

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      ...(examiner.replyTo ? { replyTo: examiner.replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    const now = new Date().toISOString();
    await service
      .from("open_offer_recipients")
      .update({ outcome_email_status: error ? "failed" : "sent", outcome_email_sent_at: error ? null : now, updated_at: now })
      .eq("id", recipient.id);
    if (error) {
      failed.push(request.request_number);
    } else {
      const what = accepted
        ? current.start
          ? `Open Offer confirmation email sent to ${email}: appointment moved to ${slotText(offer.start_at, offer.end_at)}.`
          : `Open Offer confirmation email sent to ${email}: appointment ${slotText(offer.start_at, offer.end_at)} scheduled.`
        : input.withdrawn
          ? `Open Offer withdrawn email sent to ${email}: ${slotText(offer.start_at, offer.end_at)} is no longer available.`
          : `Open Offer "slot filled" email sent to ${email} for ${slotText(offer.start_at, offer.end_at)}.`;
      await addHistory(service, request.id, what, { actorId });
    }
    await logEmail(service, {
      requestId: request.id,
      type,
      email,
      subject: message.subject,
      dedupeKey: `${type}:${recipient.id}`,
      ok: !error,
      error: error?.message,
      messageId: data?.id,
      actorId,
    });
  }

  return { failed };
}

/**
 * Tells the examiner that an applicant requested the Open Offer time (Kele, Nov 9 2026), with the
 * applicant's priority among everyone who has requested it. Only for "request", not "decline".
 * Never throws: the applicant's answer is already saved.
 */
export async function sendOpenOfferRequestedNotice(service: Service, recipientId: string, origin: string) {
  try {
    const { data: recipient } = await service
      .from("open_offer_recipients")
      .select("id, open_offer_id, practical_test_request_id, recipient_email, responded_at, response, current_start_at, current_end_at, token_hash")
      .eq("id", recipientId)
      .maybeSingle();
    if (!recipient || recipient.response !== "requested" || !recipient.responded_at) return;

    const offer = await loadOffer(service, recipient.open_offer_id);
    const examiner = await examinerContact(service, offer.examiner_profile_id);
    if (!examiner.email) return;

    // Priority among everyone who has requested this time (same order as the Open Offers tab).
    const { data: requestedRows } = await service
      .from("open_offer_recipients")
      .select("id, responded_at, practical_test_request_id")
      .eq("open_offer_id", offer.id)
      .eq("response", "requested");
    type RequestedRow = { id: string; responded_at: string | null; practical_test_request_id: string };
    type RequestInfo = { id: string; request_number: string; applicant_name_snapshot: string | null; submitted_at: string | null; created_at: string | null };
    const requested = (requestedRows ?? []) as RequestedRow[];
    const requestIds = requested.map((row) => row.practical_test_request_id);
    const { data: requestRows } = await service
      .from("practical_test_requests")
      .select("id, request_number, applicant_name_snapshot, submitted_at, created_at")
      .in("id", requestIds.length ? requestIds : [recipient.practical_test_request_id]);
    const requestById = new Map<string, RequestInfo>(((requestRows ?? []) as RequestInfo[]).map((row) => [row.id, row]));
    const ranked = orderByPriority<{ id: string; responded_at: string | null; request_submitted_at: string | null }>(
      requested.map((row) => {
        const info = requestById.get(row.practical_test_request_id);
        return {
          id: row.id,
          responded_at: row.responded_at,
          request_submitted_at: info?.submitted_at ?? info?.created_at ?? null,
        };
      }),
    );
    const priority = Math.max(1, ranked.findIndex((row) => row.id === recipient.id) + 1);

    const request = requestById.get(recipient.practical_test_request_id as string);
    if (!request) return;
    const { data: details } = await service.rpc("open_offer_token_details", { p_token_hash: recipient.token_hash });
    const info = details as { test_name: string | null; airport: string | null } | null;

    const message = buildOpenOfferRequestedExaminerEmail({
      examinerName: examiner.name,
      applicantName: request.applicant_name_snapshot ?? "",
      applicantEmail: recipient.recipient_email,
      requestNumber: request.request_number,
      testName: info?.test_name ?? "",
      airportLabel: info?.airport ?? null,
      startAt: offer.start_at,
      endAt: offer.end_at,
      requestedAt: recipient.responded_at,
      priority,
      requestedCount: Math.max(ranked.length, 1),
      currentStartAt: recipient.current_start_at,
      currentEndAt: recipient.current_end_at,
      reviewUrl: `${origin.replace(/\/$/, "")}/examiner/requests?tab=offers`,
    });

    const { resend, from } = mailer();
    const { data, error } = await resend.emails.send({
      from,
      to: [examiner.email],
      ...(recipient.recipient_email ? { replyTo: recipient.recipient_email } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    await logEmail(service, {
      requestId: request.id,
      type: "open_offer_requested_examiner",
      email: examiner.email,
      subject: message.subject,
      dedupeKey: `open_offer_requested_examiner:${recipient.id}:${recipient.responded_at}`,
      ok: !error,
      error: error?.message,
      messageId: data?.id,
      role: "examiner",
    });
    if (!error) {
      await addHistory(service, request.id, `Examiner emailed at ${examiner.email}: applicant requested the Open Offer time ${slotText(offer.start_at, offer.end_at)} (priority #${priority}).`, {
        label: "EMS (automatic)",
      });
    }
  } catch (cause) {
    console.error("Open offer examiner notice failed:", cause);
  }
}
