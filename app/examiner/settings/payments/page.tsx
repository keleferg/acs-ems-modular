"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Settings → Card Payments (Kele, Nov 19 2026).
// The examiner connects their OWN Stripe account. Applicants then pay the examiner directly:
// the money, the fees (2.9% + 30¢ per card payment) and the tax forms are all the examiner's.
// EMS / ATS takes no part in the money and no fee.

type Account = {
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  payments_enabled: boolean;
  display_name: string | null;
  disconnected_at: string | null;
};

export default function PaymentSettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setError("You must be signed in as an examiner."); setLoading(false); } return; }

      const returned = new URLSearchParams(window.location.search).get("stripe");
      if (returned === "return" || returned === "retry") {
        // Back from Stripe: ask Stripe how far setup got.
        await fetch("/api/payments/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "refresh" }) }).catch(() => undefined);
        window.history.replaceState(null, "", "/examiner/settings/payments");
      }
      const { data, error: loadError } = await supabase
        .from("examiner_payment_accounts")
        .select("stripe_account_id, charges_enabled, payouts_enabled, details_submitted, payments_enabled, display_name, disconnected_at")
        .eq("examiner_profile_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (loadError) setError(`Payment settings could not be loaded: ${loadError.message}`);
      setAccount(data && !data.disconnected_at ? (data as Account) : null);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function connect() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/payments/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const result = (await response.json()) as { ok: boolean; url?: string; error?: string };
      if (!result.ok || !result.url) throw new Error(result.error ?? "Stripe could not be opened.");
      window.location.href = result.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stripe could not be opened.");
      setBusy(false);
    }
  }

  async function toggle(next: boolean) {
    setBusy(true); setError(""); setMessage("");
    const { data, error: saveError } = await createClient().rpc("examiner_set_payments_enabled", { p_enabled: next });
    if (saveError) setError(saveError.message);
    else {
      setAccount(data as Account);
      setMessage(next ? "Applicants can now pay you by card." : "Card payments are off. Applicants won't see the Pay button.");
    }
    setBusy(false);
  }

  const ready = Boolean(account?.charges_enabled);

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Settings</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">Card Payments</h2>
      <p className="mt-2 max-w-3xl text-slate-600">
        Let applicants pay your test and travel fees by card from their request. The money goes straight into your own Stripe
        account; EMS only shows the Pay button and the receipt.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Your Stripe account</h3>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : !account ? (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Not connected. Stripe will ask for your business details, your bank account for payouts and the identity checks it needs.
              If you already have a Stripe login, use it.
            </p>
            <button type="button" disabled={busy} onClick={() => void connect()} className="mt-4 rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-60">
              {busy ? "Opening Stripe…" : "Connect Stripe"}
            </button>
          </>
        ) : !ready ? (
          <>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Stripe setup isn&apos;t finished{account.details_submitted ? " — Stripe is still reviewing your details" : ""}. You can take card
              payments once Stripe approves the account.
            </p>
            <button type="button" disabled={busy} onClick={() => void connect()} className="mt-4 rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-60">
              {busy ? "Opening Stripe…" : "Continue Stripe setup"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Connected{account.display_name ? ` as ${account.display_name}` : ""}.{" "}
              {account.payouts_enabled ? "Payouts to your bank are on." : "Stripe hasn't turned on payouts yet."}
            </p>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-amber-800 hover:underline">
              Open your Stripe dashboard (payouts, refunds, tax forms) ↗
            </a>
          </>
        )}
      </section>

      {account ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900">Accept card payments</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <strong>On:</strong> once you finalize the fees on a request, the applicant sees a &quot;Pay by card&quot; button for the
                test fee plus travel fee. Paid, refunded and disputed payments show on the request with the receipt.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <strong>Off:</strong> no Pay button; collect your fees the way you do today.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Stripe charges you 2.9% + 30¢ per card payment. EMS adds no fee. To stop for good, disconnect EMS from your Stripe
                dashboard.
              </p>
            </div>
            <label className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">{account.payments_enabled ? "On" : "Off"}</span>
              <button
                type="button"
                role="switch"
                aria-checked={account.payments_enabled}
                aria-label="Accept card payments"
                disabled={busy || !ready}
                onClick={() => void toggle(!account.payments_enabled)}
                className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${account.payments_enabled ? "bg-emerald-600" : "bg-slate-300"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${account.payments_enabled ? "left-6" : "left-1"}`} />
              </button>
            </label>
          </div>
        </section>
      ) : null}

      {message ? <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
