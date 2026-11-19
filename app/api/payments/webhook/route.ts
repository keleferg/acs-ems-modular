import { NextResponse } from "next/server";

import { applyStripeEvent, PaymentError, paymentsRpc, paymentsService, verifyStripeEvent } from "@/lib/payments/server";

// Stripe → EMS (Kele, Nov 19 2026). Stripe endpoint type: "Connected accounts".
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, checkout.session.expired, charge.succeeded,
// charge.updated, charge.refunded, charge.dispute.created, charge.dispute.closed,
// account.updated, account.application.deauthorized.
// Not signed in: the Stripe signature is the check (see lib/supabase/proxy.ts). Each event is applied once.

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    if (!secret) throw new PaymentError(500, "Payments are not configured on the server.");
    const raw = await request.text();
    const event = verifyStripeEvent(raw, request.headers.get("stripe-signature"), secret);

    const service = paymentsService();
    const isNew = await paymentsRpc<boolean>(service, "payments_record_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_stripe_account_id: event.account ?? null,
    });
    if (!isNew) return NextResponse.json({ received: true, duplicate: true });

    try {
      await applyStripeEvent(service, event);
    } catch (cause) {
      // Forget the event so Stripe's retry is applied.
      await paymentsRpc(service, "payments_forget_event", { p_event_id: event.id }).catch(() => undefined);
      throw cause;
    }
    return NextResponse.json({ received: true });
  } catch (cause) {
    const status = cause instanceof PaymentError ? cause.status : 500;
    if (status === 500) console.error("[payments webhook]", cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "error" }, { status });
  }
}
