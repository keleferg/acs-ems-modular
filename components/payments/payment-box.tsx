"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Card payment box on a request (Kele, Nov 19 2026). The applicant pays the examiner through the
// examiner's own Stripe account; EMS only shows the button and what Stripe reported back.

type Payment = {
  id: string;
  status: "pending" | "paid" | "failed" | "partially_refunded" | "refunded" | "disputed";
  amount_cents: number;
  refunded_cents: number;
  paid_at: string | null;
  receipt_url: string | null;
  created_at: string;
};

type Summary = {
  total_cents: number;
  amount_due_cents: number;
  can_pay: boolean;
  block_reason: string | null;
  payments: Payment[];
};

const STATUS_TEXT: Record<Payment["status"], string> = {
  pending: "Checkout started",
  paid: "Paid",
  failed: "Failed",
  partially_refunded: "Partly refunded",
  refunded: "Refunded",
  disputed: "Disputed",
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function PaymentBox({ requestId, viewer }: { requestId: string; viewer: "applicant" | "examiner" }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [returned, setReturned] = useState<"success" | "cancelled" | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await createClient().rpc("payments_request_summary", { p_request_id: requestId });
    if (!loadError) setSummary(data as Summary);
    return (data as Summary | null) ?? null;
  }, [requestId]);

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("request") === requestId) {
      const result = params.get("payment");
      if (result === "success" || result === "cancelled") setReturned(result);
    }
  }, [load, requestId]);

  // Back from Stripe: the webhook usually lands within seconds. Check a few times.
  useEffect(() => {
    if (returned !== "success") return;
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries += 1;
      const latest = await load();
      const paid = latest?.payments.some((p) => p.status === "paid" || p.status === "partially_refunded");
      if (paid || tries >= 10) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [returned, load]);

  async function pay() {
    setPaying(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const result = (await response.json()) as { ok: boolean; url?: string; error?: string };
      if (!result.ok || !result.url) throw new Error(result.error ?? "The payment page could not be opened.");
      window.location.href = result.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The payment page could not be opened.");
      setPaying(false);
    }
  }

  if (!summary) return null;
  const shown = summary.payments.filter((p) => p.status !== "pending" || viewer === "examiner");
  // Nothing paid yet: the applicant sees the box only when they can pay; the examiner only when
  // applicants can pay them on this request.
  if (shown.length === 0 && (viewer === "applicant" ? !summary.can_pay : summary.block_reason !== null)) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-900">Card Payment</h3>

      {returned === "success" ? (
        <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Thank you. Your payment went to your examiner&apos;s Stripe account; the receipt appears here once Stripe confirms it.
        </p>
      ) : null}
      {returned === "cancelled" ? (
        <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Payment cancelled. Nothing was charged.</p>
      ) : null}

      {shown.length ? (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {shown.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-slate-800">
                {money(p.amount_cents)} · <strong>{STATUS_TEXT[p.status]}</strong>
                {p.refunded_cents > 0 && p.status !== "refunded" ? ` (${money(p.refunded_cents)} refunded)` : ""}
                {p.paid_at ? ` · ${when(p.paid_at)}` : ""}
              </span>
              {p.receipt_url ? (
                <a href={p.receipt_url} target="_blank" rel="noreferrer" className="font-semibold text-amber-800 hover:underline">
                  Receipt
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {summary.amount_due_cents > 0 && (summary.can_pay || viewer === "examiner") ? (
        <p className="mt-3 text-sm text-slate-700">
          Amount due: <strong>{money(summary.amount_due_cents)}</strong>
          {summary.amount_due_cents !== summary.total_cents ? ` of ${money(summary.total_cents)}` : ""}
        </p>
      ) : null}
      {summary.amount_due_cents === 0 && summary.total_cents > 0 ? <p className="mt-3 text-sm text-emerald-800">Paid in full.</p> : null}

      {viewer === "applicant" && summary.can_pay ? (
        <>
          <button
            type="button"
            disabled={paying}
            onClick={() => void pay()}
            className="mt-4 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying ? "Opening secure payment…" : `Pay ${money(summary.amount_due_cents)} by card`}
          </button>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            You pay your examiner directly through Stripe. EMS never sees your card number.
          </p>
        </>
      ) : null}

      {viewer === "examiner" ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Payments go straight to your Stripe account. Refunds are made from your{" "}
          <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer" className="underline">
            Stripe dashboard
          </a>{" "}
          and show here automatically.
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
