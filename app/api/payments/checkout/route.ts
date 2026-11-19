import { NextResponse } from "next/server";

import { routeClient } from "@/lib/supabase/route-client";
import { PaymentError, paymentsRpc, paymentsService, stripe } from "@/lib/payments/server";

// Applicant → "Pay examiner" (Kele, Nov 19 2026).
// Opens Stripe Checkout as a DIRECT charge on the examiner's own Stripe account: the examiner is the
// seller on the receipt and the card statement, the money lands in their balance, and EMS takes no fee.
// The database works out the amount (test fee + travel fee − already paid); the browser never sends one.

type Prep = {
  request_id: string;
  request_number: string;
  examiner_profile_id: string;
  examiner_name: string;
  stripe_account_id: string;
  amount_due_cents: number;
  applicant_email: string | null;
  description: string;
  existing_checkout_url: string | null;
};

export async function POST(request: Request) {
  try {
    const { requestId } = ((await request.json().catch(() => ({}))) ?? {}) as { requestId?: string };
    if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) throw new PaymentError(400, "Missing request.");
    const { user } = await routeClient(request);
    if (!user) throw new PaymentError(401, "You must be signed in.");

    const service = paymentsService();
    const prep = await paymentsRpc<Prep>(service, "payments_prepare_checkout", { p_request_id: requestId, p_user_id: user.id });

    // Same amount and the earlier checkout is still open → send them back to it (no second charge).
    if (prep.existing_checkout_url) return NextResponse.json({ ok: true, url: prep.existing_checkout_url });

    const back = `${new URL(request.url).origin}/applicant/requests?request=${prep.request_id}`;
    const session = await stripe<{ id: string; url: string; expires_at: number }>(
      "POST",
      "/checkout/sessions",
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: prep.amount_due_cents,
              product_data: { name: `Practical test ${prep.request_number}`, description: prep.description },
            },
          },
        ],
        customer_email: prep.applicant_email ?? undefined,
        success_url: `${back}&payment=success`,
        cancel_url: `${back}&payment=cancelled`,
        metadata: { ems_request_id: prep.request_id, ems_request_number: prep.request_number },
        payment_intent_data: {
          description: prep.description,
          metadata: { ems_request_id: prep.request_id, ems_request_number: prep.request_number },
        },
      },
      {
        account: prep.stripe_account_id,
        // Two clicks in the same minute for the same amount → the same session.
        idempotencyKey: `ems-co-${prep.request_id}-${prep.amount_due_cents}-${Math.floor(Date.now() / 60000)}`,
      },
    );

    await paymentsRpc(service, "payments_record_checkout", {
      p_request_id: prep.request_id,
      p_examiner_profile_id: prep.examiner_profile_id,
      p_payer_profile_id: user.id,
      p_stripe_account_id: prep.stripe_account_id,
      p_checkout_session_id: session.id,
      p_checkout_url: session.url,
      p_expires_at: new Date(session.expires_at * 1000).toISOString(),
      p_amount_cents: prep.amount_due_cents,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (cause) {
    const status = cause instanceof PaymentError ? cause.status : 500;
    if (status === 500) console.error("[payments checkout]", cause);
    const message = cause instanceof Error ? cause.message.replace(/^payment not available: /, "") : "Something went wrong.";
    return NextResponse.json({ ok: false, error: friendly(message) }, { status });
  }
}

function friendly(reason: string) {
  const map: Record<string, string> = {
    nothing_due: "Nothing is due on this request.",
    fees_not_final: "Your examiner hasn't finalized the fees yet.",
    request_not_active: "This request can't be paid right now.",
    examiner_not_connected: "Your examiner doesn't take card payments in EMS.",
    examiner_account_not_ready: "Your examiner's payment account isn't ready yet.",
    examiner_payments_off: "Your examiner doesn't take card payments in EMS right now.",
    no_examiner: "No examiner is assigned yet.",
  };
  return map[reason] ?? reason;
}
