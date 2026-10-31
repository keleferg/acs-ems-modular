"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { downloadQualificationReportPdf } from "@/lib/qualification/report-pdf";
import { formatDate, loadQualificationReport } from "@/lib/qualification/report";

import { getStatusPresentation, type QualificationWizardSummary } from "./QualificationReviewPanel";

// Qualification Review on the Requests page (Kele, Oct 31 2026): only whether the applicant is
// qualified, a link to the full review on its own page, and the downloadable report summary.

const NEXT_STEP: Record<string, string> = {
  not_available: "The qualification review opens for the applicant when the test is scheduled.",
  available: "Waiting for the applicant to start the qualification review.",
  applicant_in_progress: "The applicant is filling in the qualification review.",
  awaiting_instructor: "Submitted. Waiting for the recommending instructor to certify it.",
  instructor_changes_required: "The instructor asked the applicant for changes.",
  instructor_certified: "Ready for your review.",
  examiner_review: "Ready for your review.",
  deficiencies_found: "Returned to the applicant for corrections.",
};

export default function QualificationSummarySection({
  requestId,
  applicantName,
  wizard,
}: {
  requestId: string;
  applicantName: string;
  wizard: QualificationWizardSummary | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const presentation = getStatusPresentation(wizard);
  const qualified = wizard?.status === "accepted" || wizard?.status === "closed";
  const needsReview = wizard?.status === "instructor_certified" || wizard?.status === "examiner_review";

  async function download() {
    setDownloading(true);
    setError("");
    try {
      await downloadQualificationReportPdf(await loadQualificationReport(createClient(), requestId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report could not be made.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <details className="group border-t border-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span>Qualification Review</span>
          <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.classes}`}>{presentation.label}</span>
        </div>
        <span className="text-lg text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>

      <div className="bg-slate-50/60 p-6">
        {!wizard ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Qualification has not been initialized. It will be initialized when a qualifying appointment is saved.
          </p>
        ) : (
          <div className={`rounded-xl border p-5 ${qualified ? "border-emerald-200 bg-emerald-50" : needsReview ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {qualified ? (
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-6 w-6 shrink-0" aria-hidden>
                    <circle cx="10" cy="10" r="9" fill="#15803d" />
                    <path d="M5.5 10.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
                <div className="min-w-0">
                  <p className={`font-bold ${qualified ? "text-emerald-900" : "text-slate-900"}`}>
                    {qualified ? `${applicantName} is qualified for this practical test.` : presentation.label}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {qualified
                      ? `You accepted the qualification package${wizard.accepted_at ? ` on ${formatDate(wizard.accepted_at, true)}` : ""}.`
                      : (NEXT_STEP[wizard.status] ?? "")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/examiner/requests/${encodeURIComponent(requestId)}/review`}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${needsReview ? "bg-violet-700 text-white hover:bg-violet-800" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}
                >
                  {needsReview ? "Review Qualification" : "Open Qualification Review"}
                </Link>
                <button
                  type="button"
                  onClick={() => void download()}
                  disabled={downloading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {downloading ? "Preparing…" : "Download Qualification Report"}
                </button>
              </div>
            </div>
            {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
          </div>
        )}
      </div>
    </details>
  );
}
