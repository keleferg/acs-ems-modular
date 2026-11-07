"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import AirportSelector, { type AirportSelection } from "@/components/practical-test/airport-selector";
import { orderByPriority } from "@/lib/open-offers/priority";
import { createClient } from "@/lib/supabase/client";

// Requests page → Open Offers (Kele, Nov 7 2026).
// The examiner pushes an open appointment slot to applicants. "Initiate Open Offer" takes the date,
// time, practical tests and airport(s); matching applicants (own requests + Open Assignments, no
// appointment yet) get a one-click Request / Decline email. Requests are listed in the order they
// came in; "Accept Request" schedules that request and tells the others the slot is filled.
// Not the same as Open Time, where an examiner releases a request to other examiners.

type Recipient = {
  id: string;
  request_id: string;
  request_number: string;
  applicant_name: string | null;
  applicant_email: string | null;
  test_name: string | null;
  airport: string | null;
  request_submitted_at: string | null;
  requested_dates_text: string | null;
  is_open_assignment: boolean;
  request_status: string;
  still_available: boolean;
  current_start_at: string | null;
  email_status: "pending" | "sent" | "failed" | "skipped";
  email_error: string | null;
  email_sent_at: string | null;
  response: "pending" | "requested" | "declined";
  responded_at: string | null;
  outcome: "accepted" | "not_selected" | "offer_cancelled" | null;
};

type Offer = {
  id: string;
  slot_date: string;
  start_at: string;
  end_at: string;
  notes: string | null;
  include_scheduled: boolean;
  status: "open" | "filled" | "cancelled" | "expired";
  created_at: string;
  filled_at: string | null;
  cancelled_at: string | null;
  accepted_recipient_id: string | null;
  test_types: { id: string; name: string }[];
  airports: { id: string; code: string; label: string }[];
  recipients: Recipient[];
};

type TestType = { id: string; display_name: string | null; certificate_name: string | null; rating_name: string | null; is_active: boolean; is_offered: boolean };

const STATUS_BADGE: Record<Offer["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  filled: { label: "Filled", className: "border-sky-200 bg-sky-50 text-sky-800" },
  cancelled: { label: "Withdrawn", className: "border-slate-200 bg-slate-100 text-slate-600" },
  expired: { label: "Time passed", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

function hawaiiToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu" }).format(new Date());
}

function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatStamp(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function airportLabel(airport: AirportSelection) {
  return `${airport.icao_identifier || airport.faa_identifier} — ${airport.airport_name}${airport.city ? `, ${airport.city}` : ""}${airport.state_code ? `, ${airport.state_code}` : ""}`;
}

function testTypeName(type: TestType) {
  return type.display_name?.trim() || [type.certificate_name, type.rating_name].filter(Boolean).join(" — ") || "Practical test";
}

async function postJson<T>(url: string, body: unknown): Promise<T & { ok: boolean; error?: string; warning?: string }> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    return (await response.json()) as T & { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: `The server answered ${response.status}.` } as T & { ok: boolean; error?: string };
  }
}

export default function OpenOffersPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [airports, setAirports] = useState<AirportSelection[]>([]);
  const [airportPickerKey, setAirportPickerKey] = useState(0);
  const [notes, setNotes] = useState("");
  const [includeScheduled, setIncludeScheduled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedRecipient, setSelectedRecipient] = useState<Record<string, string>>({});
  const [busyOffer, setBusyOffer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.rpc("examiner_list_open_offers", { p_include_past: showPast });
    if (loadError) setError(`Open offers could not be loaded: ${loadError.message}`);
    else setOffers((data ?? []) as Offer[]);
    setLoading(false);
  }, [showPast, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!formOpen || testTypes.length > 0) return;
    (async () => {
      const { data, error: typesError } = await supabase.rpc("examiner_get_practical_test_offerings");
      if (typesError) setError(`Your practical tests could not be loaded: ${typesError.message}`);
      else setTestTypes(((data ?? []) as TestType[]).filter((type) => type.is_active && type.is_offered));
    })();
  }, [formOpen, supabase, testTypes.length]);

  const grouped = useMemo(() => {
    const days = new Map<string, Offer[]>();
    for (const offer of [...offers].sort((a, b) => (showPast ? b.start_at.localeCompare(a.start_at) : a.start_at.localeCompare(b.start_at)))) {
      days.set(offer.slot_date, [...(days.get(offer.slot_date) ?? []), offer]);
    }
    return [...days.entries()];
  }, [offers, showPast]);

  function resetForm() {
    setDate("");
    setStartTime("09:00");
    setEndTime("12:00");
    setSelectedTypes([]);
    setAirports([]);
    setNotes("");
    setIncludeScheduled(false);
  }

  async function submitOffer() {
    setError("");
    setMessage("");
    if (!date || !startTime || !endTime) return setError("Enter the date, start time and end time.");
    if (endTime <= startTime) return setError("The end time must be after the start time.");
    if (selectedTypes.length === 0) return setError("Choose at least one practical test.");
    if (airports.length === 0) return setError("Add at least one airport.");

    setSubmitting(true);
    const result = await postJson<{ matched: number; sent: number; failed: string[] }>("/api/open-offers", {
      date,
      startTime,
      endTime,
      testTypeIds: selectedTypes,
      airportIds: airports.map((airport) => airport.id),
      notes,
      includeScheduled,
    });
    setSubmitting(false);
    if (!result.ok) return setError(result.error || "The open offer could not be created.");

    const parts: string[] = [];
    if (result.matched === 0) {
      parts.push("Open offer saved, but no requests matched this date, test and airport, so no emails were sent.");
    } else {
      parts.push(`Open offer sent to ${result.sent} applicant${result.sent === 1 ? "" : "s"}.`);
      if (result.failed?.length) parts.push(`Email failed for ${result.failed.join(", ")}.`);
    }
    if (result.warning) parts.push(result.warning);
    setMessage(parts.join(" "));
    resetForm();
    setFormOpen(false);
    await load();
  }

  async function acceptRequest(offer: Offer) {
    const recipientId = selectedRecipient[offer.id];
    if (!recipientId) return setError("Click the applicant's request you want to accept first.");
    setError("");
    setMessage("");
    setBusyOffer(offer.id);
    const result = await postJson<{ notified: number; moved?: boolean; failed?: string[] }>("/api/open-offers/accept", { recipientId });
    setBusyOffer(null);
    if (!result.ok) return setError(result.error || "The request could not be accepted.");
    const chosen = offer.recipients.find((recipient) => recipient.id === recipientId);
    const parts = [
      `${chosen?.applicant_name ?? "The applicant"} (${chosen?.request_number ?? ""}) ${result.moved ? "has been moved up to" : "is scheduled for"} ${formatDay(offer.slot_date)}, ${formatTime(offer.start_at)}–${formatTime(offer.end_at)}. A confirmation email was sent.`,
    ];
    if (result.notified) parts.push(`${result.notified} other applicant${result.notified === 1 ? " was" : "s were"} told the slot has been filled.`);
    if (result.failed?.length) parts.push(`Email failed for ${result.failed.join(", ")}.`);
    if (result.warning) parts.push(result.warning);
    if (!result.moved) parts.push("Send the fee information from Practical Test Requests as usual.");
    else parts.push("Their previous appointment time is now free.");
    setMessage(parts.join(" "));
    await load();
  }

  async function withdrawOffer(offer: Offer) {
    setError("");
    setMessage("");
    setBusyOffer(offer.id);
    const result = await postJson<{ notified: number; failed?: string[] }>("/api/open-offers/cancel", { offerId: offer.id });
    setBusyOffer(null);
    if (!result.ok) return setError(result.error || "The offer could not be withdrawn.");
    setMessage(
      `Open offer withdrawn.${result.notified ? ` ${result.notified} applicant${result.notified === 1 ? " who had" : "s who had"} requested the time ${result.notified === 1 ? "was" : "were"} told it is no longer available.` : ""}${result.warning ? ` ${result.warning}` : ""}`,
    );
    await load();
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Open Offers</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Push an open appointment time to applicants. Applicants whose requests match the date, practical test and airport — from your
            requests and Open Assignments, without an appointment yet — get an email to request or decline the time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} />
            Show past offers
          </label>
          <button
            type="button"
            onClick={() => {
              setFormOpen((open) => !open);
              setError("");
            }}
            className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-800"
          >
            {formOpen ? "Close" : "Initiate Open Offer"}
          </button>
        </div>
      </div>

      {message ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div> : null}

      {formOpen ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
          <h3 className="font-bold text-slate-900">Initiate Open Offer</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700">
              Date
              <input
                type="date"
                min={hawaiiToday()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Start time (Hawaii)
              <input
                type="time"
                step={900}
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              End time (Hawaii)
              <input
                type="time"
                step={900}
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-slate-700">Practical tests offered</legend>
            {testTypes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Loading your practical tests…</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button type="button" className="font-semibold text-sky-700 hover:underline" onClick={() => setSelectedTypes(testTypes.map((type) => type.id))}>
                    Select all
                  </button>
                  <button type="button" className="font-semibold text-sky-700 hover:underline" onClick={() => setSelectedTypes([])}>
                    Clear
                  </button>
                </div>
                <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
                  {testTypes.map((type) => (
                    <label key={type.id} className="flex items-start gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedTypes.includes(type.id)}
                        onChange={(event) =>
                          setSelectedTypes((current) => (event.target.checked ? [...current, type.id] : current.filter((id) => id !== type.id)))
                        }
                      />
                      {testTypeName(type)}
                    </label>
                  ))}
                </div>
              </>
            )}
          </fieldset>

          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-700">Airport location(s)</p>
            {airports.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {airports.map((airport) => (
                  <span key={airport.id} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800">
                    {airportLabel(airport)}
                    <button
                      type="button"
                      aria-label={`Remove ${airport.faa_identifier}`}
                      className="font-bold text-slate-400 hover:text-red-600"
                      onClick={() => setAirports((current) => current.filter((item) => item.id !== airport.id))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-2 max-w-xl">
              <AirportSelector
                key={airportPickerKey}
                compact
                selectedLabel=""
                placeholder="Add an airport: HNL, PHNL, Kona…"
                onSelect={(airport) => {
                  setAirports((current) => (current.some((item) => item.id === airport.id) ? current : [...current, airport]));
                  setAirportPickerKey((key) => key + 1);
                }}
                onClear={() => undefined}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Requests match on the flight airport the applicant chose, or their flight school&apos;s airport if they chose none.</p>
          </div>

          <label className="mt-5 flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" className="mt-1" checked={includeScheduled} onChange={(event) => setIncludeScheduled(event.target.checked)} />
            <span>
              <span className="font-semibold">Also offer to applicants already scheduled or confirmed</span>
              <span className="block text-xs text-slate-500">
                Your scheduled and confirmed applicants whose current appointment is later than this time. If you accept one, their appointment moves to
                this time; everyone else keeps their current appointment.
              </span>
            </span>
          </label>

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Note to applicants (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="e.g. Oral at Lagoon Drive, flight to follow."
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitOffer()}
              className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {submitting ? "Finding applicants and sending…" : "Send Open Offer"}
            </button>
            <p className="text-xs text-slate-500">
              Matches requests with no appointment yet whose requested dates include this date, that chose first available, or whose earliest
              requested date is later (a sooner opening). A request with no requested dates counts as first available{includeScheduled ? ", plus your scheduled and confirmed applicants whose appointment is later" : ""}.
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading open offers…</p>
      ) : grouped.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {showPast ? "No open offers yet." : "No upcoming open offers. Click Initiate Open Offer to push an open appointment time to applicants."}
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {grouped.map(([day, dayOffers]) => (
            <div key={day}>
              <h3 className="border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">{formatDay(day)}</h3>
              <div className="mt-4 space-y-4">
                {dayOffers.map((offer) => {
                  const requested = orderByPriority(offer.recipients.filter((recipient) => recipient.response === "requested"));
                  const others = offer.recipients.filter((recipient) => recipient.response !== "requested");
                  const declined = others.filter((recipient) => recipient.response === "declined").length;
                  const waiting = others.filter((recipient) => recipient.response === "pending" && recipient.email_status === "sent").length;
                  const badge = STATUS_BADGE[offer.status];
                  const isOpen = offer.status === "open";
                  return (
                    <article key={offer.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-bold text-slate-900">
                              {formatTime(offer.start_at)} – {formatTime(offer.end_at)}
                            </p>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{offer.test_types.map((type) => type.name).join(" · ")}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{offer.airports.map((airport) => airport.label).join(" · ")}</p>
                          {offer.include_scheduled ? (
                            <p className="mt-1 text-xs font-semibold text-indigo-700">Also offered to scheduled / confirmed applicants (move-up)</p>
                          ) : null}
                          {offer.notes ? <p className="mt-1 text-sm italic text-slate-500">“{offer.notes}”</p> : null}
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>
                            Emailed {offer.recipients.filter((recipient) => recipient.email_status === "sent").length} · Requested {requested.length} · Declined{" "}
                            {declined} · No answer {waiting}
                          </p>
                          <p className="mt-0.5">Sent {formatStamp(offer.created_at)}</p>
                          {isOpen ? (
                            <button
                              type="button"
                              disabled={busyOffer === offer.id}
                              onClick={() => void withdrawOffer(offer)}
                              className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Withdraw Offer
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Requested this time — priority order</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Responses within an hour of each other are ranked by when the applicant submitted their request (oldest first); later responses
                          follow. You can accept any applicant.
                        </p>
                        {requested.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">{isOpen ? "No requests yet." : "No one requested this time."}</p>
                        ) : (
                          <ol className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                            {requested.map((recipient, index) => {
                              const selectable = isOpen && recipient.still_available;
                              const selected = selectedRecipient[offer.id] === recipient.id;
                              return (
                                <li key={recipient.id}>
                                  <button
                                    type="button"
                                    disabled={!selectable}
                                    onClick={() => setSelectedRecipient((current) => ({ ...current, [offer.id]: recipient.id }))}
                                    className={`grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-3 py-2.5 text-left text-sm ${
                                      selected ? "bg-amber-50 ring-2 ring-inset ring-amber-500" : selectable ? "hover:bg-slate-50" : "cursor-default"
                                    }`}
                                  >
                                    <span className="text-center font-bold text-slate-400" title="Priority">
                                      #{index + 1}
                                    </span>
                                    <span>
                                      <span className="font-semibold text-slate-900">{recipient.applicant_name || "Applicant"}</span>{" "}
                                      <span className="text-slate-500">
                                        {recipient.request_number} · {recipient.test_name || "—"}
                                        {recipient.airport ? ` · ${recipient.airport}` : ""}
                                      </span>
                                      {recipient.is_open_assignment ? (
                                        <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-700">Open Assignment</span>
                                      ) : null}
                                      {recipient.current_start_at ? (
                                        <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
                                          {recipient.outcome === "accepted" ? "Moved from" : "Currently scheduled"} {formatStamp(recipient.current_start_at)}
                                        </span>
                                      ) : null}
                                      {recipient.outcome === "accepted" ? (
                                        <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-700">Accepted · Scheduled</span>
                                      ) : null}
                                      {recipient.outcome === "not_selected" ? <span className="ml-2 text-xs text-slate-400">Told slot filled</span> : null}
                                      {!recipient.still_available && recipient.outcome !== "accepted" ? (
                                        <span className="ml-2 text-xs font-semibold text-red-600">No longer available ({recipient.request_status.replaceAll("_", " ")})</span>
                                      ) : null}
                                    </span>
                                    <span className="text-right text-xs text-slate-500">
                                      Responded {formatStamp(recipient.responded_at)}
                                      <span className="block">Request submitted {formatStamp(recipient.request_submitted_at)}</span>
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                        {isOpen && requested.length > 0 ? (
                          <button
                            type="button"
                            disabled={!selectedRecipient[offer.id] || busyOffer === offer.id}
                            onClick={() => void acceptRequest(offer)}
                            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {busyOffer === offer.id ? "Accepting…" : "Accept Request"}
                          </button>
                        ) : null}
                      </div>

                      {others.length > 0 ? (
                        <details className="mt-4 text-sm">
                          <summary className="cursor-pointer font-semibold text-slate-600">Other applicants offered this time ({others.length})</summary>
                          <table className="mt-2 w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                              <tr>
                                <th className="py-1 pr-3">Applicant</th>
                                <th className="py-1 pr-3">Request</th>
                                <th className="py-1 pr-3">Requested dates</th>
                                <th className="py-1">Answer</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {others.map((recipient) => (
                                <Fragment key={recipient.id}>
                                  <tr>
                                    <td className="py-1.5 pr-3 text-slate-900">
                                      {recipient.applicant_name || "Applicant"}
                                      {recipient.is_open_assignment ? <span className="ml-2 text-xs text-violet-700">Open Assignment</span> : null}
                                    </td>
                                    <td className="py-1.5 pr-3 text-slate-600">{recipient.request_number}</td>
                                    <td className="py-1.5 pr-3 text-slate-600">
                                      {recipient.current_start_at ? `Scheduled ${formatStamp(recipient.current_start_at)}` : recipient.requested_dates_text || "—"}
                                    </td>
                                    <td className="py-1.5 text-slate-600">
                                      {recipient.email_status === "skipped"
                                        ? "No email on file"
                                        : recipient.email_status === "failed"
                                          ? <span className="text-red-600">Email failed{recipient.email_error ? `: ${recipient.email_error}` : ""}</span>
                                          : recipient.email_status === "pending"
                                            ? "Not sent"
                                            : recipient.response === "declined"
                                              ? `Declined ${formatStamp(recipient.responded_at)}`
                                              : "No answer yet"}
                                    </td>
                                  </tr>
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
