import { NextResponse } from "next/server";

import { routeClient } from "@/lib/supabase/route-client";
import { createExaminerAccount, fetchAccount, PaymentError, paymentsService, saveAccount, stripe } from "@/lib/payments/server";

// Settings → Payments (Kele, Nov 19 2026).
// { action: "start" }   creates the examiner's own Stripe account the first time and returns Stripe's
//                       onboarding link. An examiner who already uses Stripe signs in with that login
//                       on Stripe's page.
// { action: "refresh" } re-reads the account from Stripe (on return from onboarding).

export async function POST(request: Request) {
  try {
    const { action } = ((await request.json().catch(() => ({}))) ?? {}) as { action?: string };
    const { user } = await routeClient(request);
    if (!user) throw new PaymentError(401, "You must be signed in.");

    const service = paymentsService();
    const { data: roles } = await service.from("user_roles").select("role").eq("profile_id", user.id);
    if (!(roles ?? []).some((r) => r.role === "examiner" || r.role === "administrator")) {
      throw new PaymentError(403, "Only examiners can connect a payment account.");
    }

    const { data: existing } = await service
      .from("examiner_payment_accounts")
      .select("stripe_account_id, disconnected_at")
      .eq("examiner_profile_id", user.id)
      .maybeSingle();
    const connectedId = existing && !existing.disconnected_at ? existing.stripe_account_id : null;

    if (action === "refresh") {
      if (!connectedId) return NextResponse.json({ ok: true, connected: false });
      const account = await saveAccount(service, user.id, await fetchAccount(connectedId));
      return NextResponse.json({ ok: true, connected: true, account });
    }
    if (action !== "start") throw new PaymentError(400, "Unknown action.");

    let accountId = connectedId;
    if (!accountId) {
      const { data: profile } = await service.from("profiles").select("email").eq("id", user.id).maybeSingle();
      const account = await createExaminerAccount(user.id, profile?.email ?? user.email, existing?.stripe_account_id ?? null);
      await saveAccount(service, user.id, account);
      accountId = account.id;
    }

    const origin = new URL(request.url).origin;
    const link = await stripe<{ url: string }>("POST", "/account_links", {
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/examiner/settings/payments?stripe=retry`,
      return_url: `${origin}/examiner/settings/payments?stripe=return`,
    });
    return NextResponse.json({ ok: true, url: link.url });
  } catch (cause) {
    const status = cause instanceof PaymentError ? cause.status : 500;
    if (status === 500) console.error("[payments connect]", cause);
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status });
  }
}
