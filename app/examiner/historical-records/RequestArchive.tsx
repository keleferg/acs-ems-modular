"use client";

import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Request Archive (Kele, Nov 2 2026): every request the examiner had, with its final
// disposition. A request moves here 15 days after it is completed or cancelled (closed_at) and
// is then no longer shown on the Requests page.

export const REQUEST_ARCHIVE_DAYS = 15;

type ArchivedRequest = {
  id: string;
  request_number: string;
  status: string;
  status_reason: string | null;
  cancellation_reason: string | null;
  applicant_name_snapshot: string | null;
  ftn_number_snapshot: string | null;
  certificate_sought: string | null;
  rating_sought: string | null;
  flight_school_name_snapshot: string | null;
  submitted_at: string | null;
  created_at: string;
  scheduled_start_at: string | null;
  scheduled_location: string | null;
  flight_airport_code: string | null;
  dms_preapproval_number: string | null;
  source_system: string | null;
  closed_at: string;
};

type StatusChange = {
  id: string;
  previous_status: string | null;
  new_status: string;
  status_reason: string | null;
  changed_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  awaiting_applicant_information: "Awaiting applicant information",
  accepted: "Accepted",
  scheduling: "Scheduling",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  reschedule_required: "Reschedule required",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  cancelled_by_applicant: "Cancelled by applicant",
  cancelled_by_examiner: "Cancelled by examiner",
  no_show: "No-show",
  unable_to_accommodate: "Unable to accommodate",
};

function statusLabel(status: string | null) {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function disposition(request: ArchivedRequest, result: string | undefined) {
  if (request.status === "completed") {
    if (result === "pass") return { label: "Completed — Approved", tone: "emerald" };
    if (result === "fail") return { label: "Completed — Disapproved", tone: "red" };
    if (result === "discontinued") return { label: "Completed — Discontinued", tone: "amber" };
    return { label: "Completed", tone: "emerald" };
  }
  if (request.status === "no_show") return { label: "No-show", tone: "red" };
  return { label: statusLabel(request.status), tone: "slate" };
}

const TONES: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-red-200 bg-red-50 text-red-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function csvCell(value: string | null | undefined) {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function RequestArchive() {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<ArchivedRequest[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, StatusChange[] | "loading">>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("You must be signed in to view the request archive.");
      setLoading(false);
      return;
    }
    const cutoff = new Date(Date.now() - REQUEST_ARCHIVE_DAYS * 86_400_000).toISOString();
    const { data, error: loadError } = await supabase
      .from("practical_test_requests")
      .select(
        `id, request_number, status, status_reason, cancellation_reason, applicant_name_snapshot,
         ftn_number_snapshot, certificate_sought, rating_sought, flight_school_name_snapshot,
         submitted_at, created_at, scheduled_start_at, scheduled_location, flight_airport_code,
         dms_preapproval_number, source_system, closed_at`,
      )
      .eq("assigned_examiner_profile_id", auth.user.id)
      .not("closed_at", "is", null)
      .lte("closed_at", cutoff)
      .order("closed_at", { ascending: false })
      .limit(10000);
    if (loadError) {
      setError(`The request archive could not be loaded: ${loadError.message}`);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as ArchivedRequest[];
    setRequests(rows);

    const completedIds = rows.filter((row) => row.status === "completed").map((row) => row.id);
    const nextResults: Record<string, string> = {};
    for (let start = 0; start < completedIds.length; start += 200) {
      const { data: tests } = await supabase
        .from("practical_tests")
        .select("practical_test_request_id, result")
        .in("practical_test_request_id", completedIds.slice(start, start + 200));
      for (const test of (tests ?? []) as { practical_test_request_id: string; result: string | null }[]) {
        if (test.result) nextResults[test.practical_test_request_id] = test.result;
      }
    }
    setResults(nextResults);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(request: ArchivedRequest) {
    if (openId === request.id) {
      setOpenId(null);
      return;
    }
    setOpenId(request.id);
    if (history[request.id]) return;
    setHistory((current) => ({ ...current, [request.id]: "loading" }));
    const { data } = await supabase
      .from("practical_test_request_status_audit")
      .select("id, previous_status, new_status, status_reason, changed_at")
      .eq("practical_test_request_id", request.id)
      .order("changed_at", { ascending: true });
    setHistory((current) => ({ ...current, [request.id]: (data ?? []) as StatusChange[] }));
  }

  const rows = useMemo(
    () => requests.map((request) => ({ request, disposition: disposition(request, results[request.id]) })),
    [requests, results],
  );

  const years = useMemo(
    () => [...new Set(requests.map((request) => formatDate(request.closed_at).slice(-4)))].sort().reverse(),
    [requests],
  );

  const dispositions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.disposition.label, (counts.get(row.disposition.label) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(({ request, disposition: item }) => {
      if (dispositionFilter && item.label !== dispositionFilter) return false;
      if (yearFilter && !formatDate(request.closed_at).endsWith(yearFilter)) return false;
      if (!term) return true;
      return [
        request.request_number,
        request.applicant_name_snapshot,
        request.ftn_number_snapshot,
        request.certificate_sought,
        request.rating_sought,
        request.flight_school_name_snapshot,
        request.status_reason,
        request.cancellation_reason,
        request.dms_preapproval_number,
        item.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, dispositionFilter, yearFilter]);

  function downloadCsv() {
    const header = [
      "Request",
      "Applicant",
      "FTN",
      "Certificate",
      "Rating",
      "Flight school",
      "Submitted",
      "Appointment",
      "Closed",
      "Disposition",
      "Reason",
      "DMS",
    ];
    const lines = visible.map(({ request, disposition: item }) =>
      [
        request.request_number,
        request.applicant_name_snapshot,
        request.ftn_number_snapshot,
        request.certificate_sought,
        request.rating_sought,
        request.flight_school_name_snapshot,
        formatDate(request.submitted_at ?? request.created_at),
        formatDate(request.scheduled_start_at, true),
        formatDate(request.closed_at),
        item.label,
        request.cancellation_reason || request.status_reason,
        request.dms_preapproval_number,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Request-Archive-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-slate-600">
          Every request you handled, with its final disposition. Requests move here {REQUEST_ARCHIVE_DAYS} days
          after they are completed or cancelled, and are no longer shown on the Requests page.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download CSV
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDispositionFilter("")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            dispositionFilter === "" ? "border-amber-700 bg-amber-700 text-white" : "border-slate-300 bg-white text-slate-700"
          }`}
        >
          All {rows.length}
        </button>
        {dispositions.map(([label, count]) => (
          <button
            key={label}
            type="button"
            onClick={() => setDispositionFilter(dispositionFilter === label ? "" : label)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              dispositionFilter === label
                ? "border-amber-700 bg-amber-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {label} {count}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applicant, request number, FTN, rating, school, reason, DMS…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900"
          />
        </label>
        <select
          value={yearFilter}
          onChange={(event) => setYearFilter(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="">All years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              Closed in {year}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_1.3fr] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>Applicant · Request</span>
          <span>Test</span>
          <span>Submitted</span>
          <span>Closed</span>
          <span>Disposition</span>
        </div>

        {loading ? <p className="px-5 py-6 text-sm text-slate-600">Loading the request archive…</p> : null}
        {!loading && visible.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            {requests.length === 0 ? "No requests have been archived yet." : "No archived requests match."}
          </p>
        ) : null}

        {!loading
          ? visible.map(({ request, disposition: item }) => {
              const open = openId === request.id;
              const changes = history[request.id];
              const reason = request.cancellation_reason || request.status_reason;
              return (
                <div key={request.id} className="border-b border-slate-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => void toggle(request)}
                    className="grid w-full gap-2 px-5 py-3 text-left text-sm hover:bg-slate-50 md:grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_1.3fr] md:items-center md:gap-3"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      {open ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">
                          {request.applicant_name_snapshot || "—"}
                        </span>
                        <span className="block text-xs text-slate-500">{request.request_number}</span>
                      </span>
                    </span>
                    <span className="truncate text-slate-700">
                      {[request.certificate_sought, request.rating_sought].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <span className="text-slate-700">{formatDate(request.submitted_at ?? request.created_at)}</span>
                    <span className="text-slate-700">{formatDate(request.closed_at)}</span>
                    <span>
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[item.tone]}`}>
                        {item.label}
                      </span>
                    </span>
                  </button>

                  {open ? (
                    <div className="grid gap-5 bg-slate-50 px-12 py-4 text-sm md:grid-cols-2">
                      <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-slate-700">
                        <dt className="text-slate-500">FTN</dt>
                        <dd>{request.ftn_number_snapshot || "—"}</dd>
                        <dt className="text-slate-500">Flight school</dt>
                        <dd>{request.flight_school_name_snapshot || "—"}</dd>
                        <dt className="text-slate-500">Appointment</dt>
                        <dd>
                          {formatDate(request.scheduled_start_at, true)}
                          {request.scheduled_location ? ` · ${request.scheduled_location}` : ""}
                          {request.flight_airport_code ? ` · Flight: ${request.flight_airport_code}` : ""}
                        </dd>
                        <dt className="text-slate-500">DMS preapproval</dt>
                        <dd>{request.dms_preapproval_number || "—"}</dd>
                        <dt className="text-slate-500">Final disposition</dt>
                        <dd>
                          {item.label} on {formatDate(request.closed_at, true)}
                        </dd>
                        {reason ? (
                          <>
                            <dt className="text-slate-500">Reason</dt>
                            <dd className="whitespace-pre-wrap">{reason}</dd>
                          </>
                        ) : null}
                      </dl>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status history</p>
                        {changes === "loading" || !changes ? (
                          <p className="mt-2 text-slate-500">Loading…</p>
                        ) : changes.length === 0 ? (
                          <p className="mt-2 text-slate-500">No status changes were recorded.</p>
                        ) : (
                          <ol className="mt-2 space-y-1.5">
                            {changes.map((change) => (
                              <li key={change.id} className="flex gap-3">
                                <span className="w-36 shrink-0 text-xs text-slate-500">
                                  {formatDate(change.changed_at, true)}
                                </span>
                                <span className="text-slate-800">
                                  {statusLabel(change.new_status)}
                                  {change.status_reason ? (
                                    <span className="block text-xs text-slate-500">{change.status_reason}</span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          : null}
      </div>
    </section>
  );
}
