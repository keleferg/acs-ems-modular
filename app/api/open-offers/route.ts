import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendOpenOfferInvitations, serviceClient } from "@/lib/open-offers/server";

// Requests page → Open Offers → "Initiate Open Offer" (Kele, Nov 7 2026).
// examiner_create_open_offer (signed-in examiner) finds the matching requests; this route then
// emails each applicant a one-click Request / Decline link.

type Body = {
  date?: string;
  startTime?: string;
  endTime?: string;
  testTypeIds?: string[];
  airportIds?: string[];
  notes?: string;
  includeScheduled?: boolean;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 });

  const { data, error } = await supabase.rpc("examiner_create_open_offer", {
    p_slot_date: body.date ?? null,
    p_start_time: body.startTime ?? null,
    p_end_time: body.endTime ?? null,
    p_practical_test_type_ids: Array.isArray(body.testTypeIds) ? body.testTypeIds : [],
    p_airport_ids: Array.isArray(body.airportIds) ? body.airportIds : [],
    p_notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
    p_include_scheduled: body.includeScheduled === true,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const created = data as { offer_id: string; recipients: { recipient_id: string; request_id: string }[] };
  const recipientIds = (created.recipients ?? []).map((r) => r.recipient_id);

  try {
    const result = await sendOpenOfferInvitations(serviceClient(), created.offer_id, recipientIds, new URL(request.url).origin, auth.user.id);
    return NextResponse.json({ ok: true, offerId: created.offer_id, matched: recipientIds.length, sent: result.sent, failed: result.failed });
  } catch (cause) {
    return NextResponse.json({
      ok: true,
      offerId: created.offer_id,
      matched: recipientIds.length,
      sent: 0,
      failed: [],
      warning: cause instanceof Error ? cause.message : "The emails could not be sent.",
    });
  }
}
