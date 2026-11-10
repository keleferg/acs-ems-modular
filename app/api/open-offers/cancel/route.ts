import { NextResponse } from "next/server";

import { routeClient } from "@/lib/supabase/route-client";
import { sendOpenOfferOutcomeEmails, serviceClient } from "@/lib/open-offers/server";

// Open Offers → "Withdraw Offer" (Kele, Nov 7 2026). Applicants who had requested the time are
// told it is no longer available; their requests stay active.

export async function POST(request: Request) {
  let offerId = "";
  try {
    offerId = String(((await request.json()) as { offerId?: string }).offerId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!offerId) return NextResponse.json({ ok: false, error: "Missing offer." }, { status: 400 });

  // Website login cookie or the EMS Examiner app's bearer token.
  const { supabase, user } = await routeClient(request);
  if (!user) return NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 });

  const { data, error } = await supabase.rpc("examiner_cancel_open_offer", { p_offer_id: offerId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const notify = ((data as { notify?: string[] }).notify ?? []) as string[];
  try {
    const emails = await sendOpenOfferOutcomeEmails(serviceClient(), offerId, { otherRecipientIds: notify, withdrawn: true }, new URL(request.url).origin, user.id);
    return NextResponse.json({ ok: true, notified: notify.length, failed: emails.failed });
  } catch (cause) {
    return NextResponse.json({ ok: true, notified: 0, warning: cause instanceof Error ? cause.message : "The emails could not be sent." });
  }
}
