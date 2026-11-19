import { createHmac, timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

// Examiner card payments through Stripe Connect (Kele, Nov 19 2026).
//
// The money goes straight into the examiner's OWN Stripe account (Standard-style connected
// account, direct charges). EMS / ATS never holds the money, takes no fee and is not the seller:
// the examiner pays Stripe's processing fees and gets Stripe's tax forms. EMS only opens the
// checkout and records what Stripe reports back.
//
// Server environment (Netlify):
//   STRIPE_SECRET_KEY               ATS platform key (sk_test_… while testing, sk_live_… after)
//   STRIPE_CONNECT_WEBHOOK_SECRET   whsec_… of the "Connected accounts" webhook endpoint
//   STRIPE_API_VERSION (optional)   pins a Stripe API version; otherwise the account default
//   SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY (already set for Open Offers)

export class PaymentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function paymentsConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

export function paymentsService() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new PaymentError(500, "Payments are not configured on the server.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Service = ReturnType<typeof paymentsService>;

/** Calls a server-only payments_* database function; SQL guard errors become HTTP codes. */
export async function paymentsRpc<T>(service: Service, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await service.rpc(fn, args);
  if (error) {
    if (error.code === "42501") throw new PaymentError(403, error.message);
    if (error.code === "P0001" || error.code === "P0002") throw new PaymentError(409, error.message);
    console.error("[payments rpc]", fn, error);
    throw new PaymentError(500, error.message);
  }
  return data as T;
}

/** Flattens {a: {b: 1}} into a[b]=1, the way Stripe's API expects form fields. */
export function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") parts.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        else parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      const inner = formEncode(v as Record<string, unknown>, key);
      if (inner) parts.push(inner);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

/** Stripe REST call (no SDK). `account` makes the call on the examiner's connected account. */
export async function stripe<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  opts: { account?: string; idempotencyKey?: string } = {},
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new PaymentError(500, "Payments are not configured on the server.");
  const headers: Record<string, string> = { authorization: `Bearer ${secret}` };
  if (process.env.STRIPE_API_VERSION) headers["stripe-version"] = process.env.STRIPE_API_VERSION;
  if (opts.account) headers["stripe-account"] = opts.account;
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  let url = `https://api.stripe.com/v1${path}`;
  let payload: string | undefined;
  if (body && method === "GET") url += `?${formEncode(body)}`;
  else if (body) {
    payload = formEncode(body);
    headers["content-type"] = "application/x-www-form-urlencoded";
  }
  const response = await fetch(url, { method, headers, body: payload, cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) {
    console.error("[stripe]", method, path, response.status, data?.error?.message);
    throw new PaymentError(502, data?.error?.message ?? "Stripe request failed.");
  }
  return data as T;
}

/** Checks the Stripe-Signature header (t=…,v1=…) against the raw body and returns the event. */
export function verifyStripeEvent(rawBody: string, header: string | null, secret: string, toleranceSeconds = 300, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header) throw new PaymentError(400, "Missing Stripe-Signature.");
  const items = header.split(",").map((part) => part.trim().split("="));
  const timestamp = items.find(([k]) => k === "t")?.[1];
  const signatures = items.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!timestamp || signatures.length === 0) throw new PaymentError(400, "Bad Stripe-Signature.");
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) throw new PaymentError(400, "Stale Stripe event.");
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  const match = signatures.some((sig) => {
    const given = Buffer.from(sig);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!match) throw new PaymentError(400, "Signature mismatch.");
  return JSON.parse(rawBody) as StripeEvent;
}

export type StripeEvent = { id: string; type: string; account?: string; data?: { object?: Record<string, unknown> } };

type StripeAccount = {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  business_profile?: { name?: string | null } | null;
  settings?: { dashboard?: { display_name?: string | null } | null } | null;
};

export async function saveAccount(service: Service, examinerId: string, account: StripeAccount) {
  return paymentsRpc(service, "payments_upsert_account", {
    p_examiner_profile_id: examinerId,
    p_stripe_account_id: account.id,
    p_charges_enabled: account.charges_enabled,
    p_payouts_enabled: account.payouts_enabled,
    p_details_submitted: account.details_submitted,
    p_display_name: account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? null,
  });
}

export async function fetchAccount(accountId: string) {
  return stripe<StripeAccount>("GET", `/accounts/${accountId}`);
}

/** Creates the examiner's own Stripe account (Standard-style). */
export async function createExaminerAccount(examinerId: string, email: string | null | undefined, previousAccountId: string | null) {
  return stripe<StripeAccount>(
    "POST",
    "/accounts",
    {
      country: "US",
      email: email ?? undefined,
      controller: {
        stripe_dashboard: { type: "full" }, // the examiner's own full Stripe dashboard
        fees: { payer: "account" }, // the examiner pays Stripe's fees
        losses: { payments: "stripe" }, // ATS is not liable for disputes or negative balances
        requirement_collection: "stripe", // Stripe collects identity, bank and tax details
      },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { ems_profile_id: examinerId },
    },
    { idempotencyKey: `ems-connect-${examinerId}-${previousAccountId ?? "new"}` },
  );
}

const idOf = (value: unknown) => (typeof value === "string" ? value : ((value as { id?: string } | null)?.id ?? null));

/** Applies one verified webhook event. Only rows of the sending Stripe account are touched. */
export async function applyStripeEvent(service: Service, event: StripeEvent) {
  const account = event.account;
  const obj = (event.data?.object ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      if (!account) return;
      const result =
        event.type === "checkout.session.async_payment_failed"
          ? "failed"
          : obj.payment_status === "paid" || obj.payment_status === "no_payment_required"
            ? "paid"
            : "processing";
      const intentId = idOf(obj.payment_intent);
      await paymentsRpc(service, "payments_apply_checkout_result", {
        p_checkout_session_id: obj.id,
        p_stripe_account_id: account,
        p_payment_intent_id: intentId,
        p_amount_cents: obj.amount_total ?? null,
        p_result: result,
      });
      // charge.succeeded can arrive before this event, so pick up the receipt here too.
      if (result === "paid" && intentId) {
        const intent = await stripe<{ latest_charge?: Record<string, any> | string | null }>( // eslint-disable-line @typescript-eslint/no-explicit-any
          "GET",
          `/payment_intents/${intentId}`,
          { "expand[]": "latest_charge" },
          { account },
        );
        const charge = intent.latest_charge;
        if (charge && typeof charge === "object") {
          await paymentsRpc(service, "payments_apply_charge_update", {
            p_payment_intent_id: intentId,
            p_stripe_account_id: account,
            p_refunded_cents: charge.amount_refunded ?? null,
            p_receipt_url: charge.receipt_url ?? null,
            p_disputed: charge.disputed ?? null,
          });
        }
      }
      return;
    }
    case "checkout.session.expired":
      if (!account) return;
      await paymentsRpc(service, "payments_apply_session_expired", { p_checkout_session_id: obj.id, p_stripe_account_id: account });
      return;
    case "charge.succeeded":
    case "charge.updated":
    case "charge.refunded":
      if (!account || !obj.payment_intent) return;
      await paymentsRpc(service, "payments_apply_charge_update", {
        p_payment_intent_id: idOf(obj.payment_intent),
        p_stripe_account_id: account,
        p_refunded_cents: obj.amount_refunded ?? null,
        p_receipt_url: obj.receipt_url ?? null,
        p_disputed: obj.disputed ?? null,
      });
      return;
    case "charge.dispute.created":
    case "charge.dispute.closed":
      if (!account || !obj.payment_intent) return;
      await paymentsRpc(service, "payments_apply_charge_update", {
        p_payment_intent_id: idOf(obj.payment_intent),
        p_stripe_account_id: account,
        p_refunded_cents: null,
        p_receipt_url: null,
        p_disputed: event.type === "charge.dispute.created" || obj.status !== "won",
      });
      return;
    case "account.updated":
      await paymentsRpc(service, "payments_refresh_account_flags", {
        p_stripe_account_id: obj.id,
        p_charges_enabled: Boolean(obj.charges_enabled),
        p_payouts_enabled: Boolean(obj.payouts_enabled),
        p_details_submitted: Boolean(obj.details_submitted),
      });
      return;
    case "account.application.deauthorized":
      if (account) await paymentsRpc(service, "payments_disconnect_account", { p_stripe_account_id: account });
      return;
  }
}
