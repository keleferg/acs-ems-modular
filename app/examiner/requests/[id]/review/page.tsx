"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { downloadQualificationReportPdf } from "@/lib/qualification/report-pdf";
import { formatDate, loadQualificationReport } from "@/lib/qualification/report";

import QualificationReviewPanel, { type QualificationWizardSummary } from "../../QualificationReviewPanel";

// Qualification Review on its own page (Kele, Oct 31 2026): every item in order, with the examiner's
// comments, instructor step, and Accept / Return controls. Opened from the Requests page.

type RequestHeader = {
  id: string;
  request_number: string;
  applicant_name_snapshot: string | null;
  certificate_sought: string | null;
  rating_sought: string | null;
  scheduled_start_at: string | null;
  scheduled_location: string | null;
};

function ReviewContent() {
  const params = useParams<{ id: string }>();
  const requestId = typeof params?.id === "string" ? params.id : "";
  const [request, setRequest] = useState<RequestHeader | null>(null);
  const [wizard, setWizard] = useState<QualificationWizardSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    async function load() {
      const supabase = createClient();
      const [requestResult, wizardResult] = await Promise.all([
        supabase
          .from("practical_test_requests")
          .select("id, request_number, applicant_name_snapshot, certificate_sought, rating_sought, scheduled_start_at, scheduled_location")
          .eq("id", requestId)
          .maybeSingle(),
        supabase
          .from("qualification_wizards")
          .select("id, practical_test_request_id, rule_set_id, status, available_at, opened_at, applicant_submitted_at, instructor_certified_at, examiner_reviewed_at, accepted_at, current_revision_number, instructor_name, instructor_email")
          .eq("practical_test_request_id", requestId)
          .maybeSingle(),
      ]);
      if (requestResult.error || !requestResult.data) throw new Error(requestResult.error?.message ?? "Request not found.");
      if (!active) return;
      setRequest(requestResult.data as RequestHeader);
      setWizard((wizardResult.data as QualificationWizardSummary | null) ?? null);
      setLoaded(true);
    }
    load().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "The qualification review could not be loaded.");
    });
    return () => {
      active = false;
    };
  }, [requestId]);

  async function download() {
    setDownloading(true);
    try {
      await downloadQualificationReportPdf(await loadQualificationReport(createClient(), requestId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report could not be made.");
    } finally {
      setDownloading(false);
    }
  }

  if (error && !loaded) return <main className="mx-auto max-w-5xl px-6 py-10 text-red-700">{error}</main>;
  if (!loaded || !request) return <main className="mx-auto max-w-5xl px-6 py-10 text-slate-600">Loading the qualification review…</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/examiner/requests" className="text-sm font-semibold text-sky-700 hover:underline">
        ← Back to Requests
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Qualification Review</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{request.applicant_name_snapshot ?? "Applicant"}</h1>
          <p className="mt-1 text-slate-600">
            {request.request_number} · {[request.certificate_sought, request.rating_sought].filter(Boolean).join(" — ")}
            {request.scheduled_start_at ? ` · Test ${formatDate(request.scheduled_start_at, true)}` : ""}
            {request.scheduled_location ? ` · ${request.scheduled_location}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {wizard ? (
            <Link
              href={`/examiner/requests/${encodeURIComponent(requestId)}/qualifications`}
              target="_blank"
              rel="noopener"
              className="rounded-lg border border-amber-600 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Validate Qualifications
            </Link>
          ) : null}
          {wizard ? (
            <button
              type="button"
              onClick={() => void download()}
              disabled={downloading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {downloading ? "Preparing…" : "Download Qualification Report"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      <div className="mt-6">
        <QualificationReviewPanel
          standalone
          requestNumber={request.request_number}
          applicantName={request.applicant_name_snapshot ?? "Applicant"}
          wizard={wizard}
          onWizardChanged={setWizard}
        />
      </div>
    </main>
  );
}

export default function QualificationReviewPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-6 py-10 text-slate-600">Loading…</main>}>
      <ReviewContent />
    </Suspense>
  );
}
