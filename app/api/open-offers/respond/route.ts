import { NextResponse } from "next/server";

import { addHistory, hashToken, isTokenShape, serviceClient, slotText } from "@/lib/open-offers/server";

// The applicant's one-click answer to an Open Offer email (no sign-in; Kele, Nov 7 2026).
// The emailed token is checked against open_offer_recipients.token_hash with the service key.

type Details = {
  recipient_id: string;
  state: "open" | "accepted" | "filled" | "cancelled" | "expired" | "unavailable";
  response: "pending" | "requested" | "declined";
  responded_at: string | null;
  start_at: string;
  end_at: string;
  notes: string | null;
  current_start_at: string | null;
  current_end_at: string | null;
  request_number: string;
  applicant_name: string | null;
  test_name: string | null;
  airport: string | null;
};

function publicView(details: Details) {
  return {
    state: details.state,
    response: details.response,
    respondedAt: details.responded_at,
    startAt: details.start_at,
    endAt: details.end_at,
    notes: details.notes,
    currentStartAt: details.current_start_at,
    currentEndAt: details.current_end_at,
    requestNumber: details.request_number,
    applicantName: details.applicant_name,
    testName: details.test_name,
    airport: details.airport,
  };
}

const INVALID = "This link is not valid. Please use the buttons in the most recent email.";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("t") ?? "";
    if (!isTokenShape(token)) return NextResponse.json({ ok: false, error: INVALID }, { status: 403 });
    const { data, error } = await serviceClient().rpc("open_offer_token_details", { p_token_hash: hashToken(token) });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: INVALID }, { status: 403 });
    return NextResponse.json({ ok: true, offer: publicView(data as Details) });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { t?: string; action?: string };
    const token = String(body.t ?? "");
    const action = body.action === "request" ? "request" : body.action === "decline" ? "decline" : "";
    if (!isTokenShape(token)) return NextResponse.json({ ok: false, error: INVALID }, { status: 403 });
    if (!action) return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });

    const service = serviceClient();
    const tokenHash = hashToken(token);
    const { data: before } = await service.rpc("open_offer_token_details", { p_token_hash: tokenHash });
    if (!before) return NextResponse.json({ ok: false, error: INVALID }, { status: 403 });

    const { data, error } = await service.rpc("open_offer_record_response", { p_token_hash: tokenHash, p_action: action });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    const after = data as Details;

    if (after.state === "open" && (before as Details).response !== after.response) {
      const { data: recipient } = await service
        .from("open_offer_recipients")
        .select("practical_test_request_id")
        .eq("id", after.recipient_id)
        .maybeSingle();
      if (recipient) {
        await addHistory(
          service,
          recipient.practical_test_request_id,
          after.response === "requested"
            ? `Applicant requested the Open Offer time ${slotText(after.start_at, after.end_at)}.`
            : `Applicant declined the Open Offer time ${slotText(after.start_at, after.end_at)}.`,
          { label: "Applicant" },
        );
      }
    }
    return NextResponse.json({ ok: true, offer: publicView(after) });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status: 500 });
  }
}
