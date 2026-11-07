"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The applicant's answer to an Open Offer email (Kele, Nov 7 2026). No sign-in: the emailed token
// is checked by /api/open-offers/respond. The email buttons open this page with a=request or
// a=decline, and the answer is recorded straight away (one click). The applicant can change it here
// while the time is still open.

type Offer = {
  state: "open" | "accepted" | "filled" | "cancelled" | "expired" | "unavailable";
  response: "pending" | "requested" | "declined";
  respondedAt: string | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  currentStartAt: string | null;
  currentEndAt: string | null;
  requestNumber: string;
  applicantName: string | null;
  testName: string | null;
  airport: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

export default function OpenOfferPage() {
  const [token, setToken] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const respond = useCallback(
    async (action: "request" | "decline", t: string = token) => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/open-offers/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ t, action }),
        });
        const result = (await response.json()) as { ok: boolean; offer?: Offer; error?: string };
        if (!result.ok || !result.offer) throw new Error(result.error || "Your answer could not be saved.");
        setOffer(result.offer);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Your answer could not be saved.");
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const search = new URLSearchParams(window.location.search);
    const linkToken = search.get("t") ?? "";
    const initialAction = search.get("a");
    setToken(linkToken);
    if (initialAction === "request" || initialAction === "decline") {
      // Drop the action from the address so reloading the page doesn't answer again.
      window.history.replaceState(null, "", `/open-offer?t=${encodeURIComponent(linkToken)}`);
      void respond(initialAction, linkToken);
      return;
    }
    (async () => {
      try {
        const response = await fetch(`/api/open-offers/respond?t=${encodeURIComponent(linkToken)}`);
        const result = (await response.json()) as { ok: boolean; offer?: Offer; error?: string };
        if (!result.ok || !result.offer) throw new Error(result.error || "This link is not valid.");
        setOffer(result.offer);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "This link is not valid.");
      }
    })();
  }, [respond]);

  if (error && !offer) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>
      </main>
    );
  }
  if (!offer) {
    return <main className="mx-auto max-w-2xl px-5 py-12 text-slate-600">{busy ? "Saving your answer…" : "Loading…"}</main>;
  }

  let heading = "Open Appointment Time";
  let message = "";
  let tone = "border-slate-200 bg-slate-50 text-slate-800";
  const current = offer.currentStartAt && offer.currentEndAt ? `${formatDate(offer.currentStartAt)}, ${formatTime(offer.currentStartAt)} – ${formatTime(offer.currentEndAt)}` : null;
  if (offer.state === "open") {
    if (offer.response === "requested") {
      heading = "You've requested this appointment time";
      message = current
        ? `Your examiner will choose from the applicants who request this time. If your request is accepted, your appointment moves to this time and you will receive a confirmation email. Until then, your current appointment (${current}) stays as it is.`
        : "Your examiner will choose from the applicants who request this time. This time is not yours until you receive a confirmation email. If it goes to someone else, your request stays active and we will let you know about other openings.";
      tone = "border-emerald-200 bg-emerald-50 text-emerald-900";
    } else if (offer.response === "declined") {
      heading = "You've declined this appointment time";
      message = current
        ? `No problem. Your current appointment (${current}) stays as it is.`
        : "No problem. Your practical test request stays active, and we will let you know about other openings.";
    } else {
      message = current
        ? `This time is earlier than your current appointment (${current}). Would you like to move to it?`
        : "Would you like this appointment time?";
    }
  } else if (offer.state === "accepted") {
    heading = "This appointment is yours";
    message = current
      ? `Your examiner accepted your request. Your appointment has moved from ${current} to this time. Check your email for the confirmation.`
      : "Your examiner accepted your request for this time. Check your email for the confirmation.";
    tone = "border-emerald-200 bg-emerald-50 text-emerald-900";
  } else if (offer.state === "filled") {
    heading = "This appointment time has been filled";
    message = current
      ? `Your current appointment (${current}) has not changed, and we will notify you of any sooner openings.`
      : "Your practical test request is still active, and we will notify you of any sooner openings.";
    tone = "border-amber-200 bg-amber-50 text-amber-900";
  } else if (offer.state === "cancelled") {
    heading = "This appointment time is no longer available";
    message = current
      ? `Your current appointment (${current}) has not changed, and we will notify you of any sooner openings.`
      : "Your practical test request is still active, and we will notify you of any sooner openings.";
    tone = "border-amber-200 bg-amber-50 text-amber-900";
  } else if (offer.state === "expired") {
    heading = "This appointment time has passed";
    message = "Your practical test request is still active, and we will notify you of any openings.";
    tone = "border-amber-200 bg-amber-50 text-amber-900";
  } else {
    heading = "This offer no longer applies to your request";
    message = "Your request already has an appointment or is no longer active. Check the applicant portal for details.";
    tone = "border-amber-200 bg-amber-50 text-amber-900";
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Aviation Training Solutions</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{heading}</h1>

      <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${tone}`}>{message}</div>

      <dl className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 text-sm">
        {[
          ["Date", formatDate(offer.startAt)],
          ["Time", `${formatTime(offer.startAt)} – ${formatTime(offer.endAt)}`],
          ["Airport", offer.airport || "—"],
          ["Practical Test", offer.testName || "—"],
          ["Request Number", offer.requestNumber],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-3">
            <dt className="font-semibold text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {offer.notes ? <p className="mt-4 whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{offer.notes}</p> : null}

      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      {offer.state === "open" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {offer.response !== "requested" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond("request")}
              className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Request This Appointment Time
            </button>
          ) : null}
          {offer.response !== "declined" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond("decline")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Decline Appointment Time
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-sm text-slate-500">
        <a href="/applicant/requests" className="font-semibold text-sky-700 hover:underline">
          Go to the applicant portal
        </a>{" "}
        (sign-in required)
      </p>
    </main>
  );
}
