import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { addHistory, sendOpenOfferOutcomeEmails, serviceClient, slotText } from "@/lib/open-offers/server";

// Open Offers → "Accept Request" (Kele, Nov 7 2026). Schedules the chosen applicant's request,
// then emails the confirmation and tells everyone else who requested the time that it is filled.

export async function POST(request: Request) {
  let recipientId = "";
  try {
    recipientId = String(((await request.json()) as { recipientId?: string }).recipientId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!recipientId) return NextResponse.json({ ok: false, error: "Missing response." }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 });

  const { data, error } = await supabase.rpc("examiner_accept_open_offer_response", { p_recipient_id: recipientId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const result = data as {
    offer_id: string;
    request_id: string;
    accepted_recipient_id: string;
    previous_start_at: string | null;
    previous_end_at: string | null;
    not_selected: string[];
  };
  try {
    const service = serviceClient();
    const { data: offer } = await service.from("open_offers").select("start_at, end_at").eq("id", result.offer_id).maybeSingle();
    if (offer) {
      const text =
        result.previous_start_at && result.previous_end_at
          ? `Appointment moved from ${slotText(result.previous_start_at, result.previous_end_at)} to ${slotText(offer.start_at, offer.end_at)} (Open Offer).`
          : `Appointment scheduled from an Open Offer: ${slotText(offer.start_at, offer.end_at)}.`;
      await addHistory(service, result.request_id, text, {
        type: "appointment_change",
        actorId: auth.user.id,
      });
    }
    const emails = await sendOpenOfferOutcomeEmails(
      service,
      result.offer_id,
      { acceptedRecipientId: result.accepted_recipient_id, otherRecipientIds: result.not_selected ?? [] },
      new URL(request.url).origin,
      auth.user.id,
    );
    return NextResponse.json({ ok: true, requestId: result.request_id, moved: Boolean(result.previous_start_at), notified: (result.not_selected ?? []).length, failed: emails.failed });
  } catch (cause) {
    return NextResponse.json({
      ok: true,
      requestId: result.request_id,
      warning: `The appointment was scheduled, but the emails could not be sent: ${cause instanceof Error ? cause.message : "unknown error"}`,
    });
  }
}
