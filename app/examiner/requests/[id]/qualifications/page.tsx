"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { downloadQualificationReportPdf } from "@/lib/qualification/report-pdf";
import { formatDate, loadQualificationReport, SECTION_NAMES, SECTION_ORDER, type Report, type Status } from "@/lib/qualification/report";

// "Validate Qualifications" report (Kele, Oct 31 2026): every qualification item with
// a green check (passes), a yellow triangle (check it yourself) or a red X with the issue.
// Fits on one printed page.

function Icon({ status }: { status: Status }) {
  if (status === "pass") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-label="Passes validation" role="img">
        <circle cx="10" cy="10" r="9" fill="#15803d" />
        <path d="M5.5 10.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "check") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-label="Check manually" role="img">
        <path d="M10 1.8L19 18H1z" fill="#eab308" stroke="#a16207" strokeWidth="0.8" strokeLinejoin="round" />
        <rect x="9" y="7" width="2" height="6" rx="1" fill="#1f2937" />
        <circle cx="10" cy="15.2" r="1.1" fill="#1f2937" />
      </svg>
    );
  }
  if (status === "issue") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-label="Known issue" role="img">
        <circle cx="10" cy="10" r="9" fill="#dc2626" />
        <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className="inline-block h-4 w-4 text-center text-xs text-slate-400" aria-label="Not applicable">–</span>;
}

function ReportContent() {
  const params = useParams<{ id: string }>();
  const requestId = typeof params?.id === "string" ? params.id : "";
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    loadQualificationReport(createClient(), requestId)
      .then((loaded) => { if (active) setReport(loaded); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "The report could not be loaded."); });
    return () => { active = false; };
  }, [requestId]);

  if (error) return <main className="mx-auto max-w-4xl p-8 text-red-700">{error}</main>;
  if (!report) return <main className="mx-auto max-w-4xl p-8 text-slate-600">Loading the qualification report…</main>;

  const counts = report.rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {} as Record<Status, number>);
  const sections = SECTION_ORDER.filter((code) => report.rows.some((row) => row.requirement.section_code === code));

  return (
    <main className="report mx-auto max-w-5xl bg-white px-6 py-6 text-slate-900">
      <style>{`
        @page { size: letter; margin: 0.35in; }
        @media print {
          .no-print, aside, header.sticky { display: none !important; }
          body, .bg-slate-100 { background: #fff !important; }
          .lg\\:pl-72 { padding-left: 0 !important; }
          .min-h-screen { min-height: 0 !important; }
          .report { max-width: none; padding: 0; font-size: 9px; }
          .report h1 { font-size: 15px; }
          .report td, .report th { padding-top: 1.5px !important; padding-bottom: 1.5px !important; }
          .report svg { width: 11px; height: 11px; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-4 flex justify-end gap-2">
        <button type="button" onClick={() => void downloadQualificationReportPdf(report)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Download PDF</button>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Print</button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Validate Qualifications</p>
          <h1 className="mt-1 text-2xl font-bold">{report.request.applicant_name_snapshot}</h1>
          <p className="text-sm text-slate-700">
            {report.request.request_number} · {report.ruleSetName || `${report.request.certificate_sought ?? ""} — ${report.request.rating_sought ?? ""}`}
          </p>
        </div>
        <div className="text-right text-sm text-slate-700">
          <p><strong>Test:</strong> {formatDate(report.request.scheduled_start_at, true)}{report.request.scheduled_location ? ` · ${report.request.scheduled_location}` : ""}</p>
          <p><strong>Submitted:</strong> {formatDate(report.wizard.applicant_submitted_at, true)}</p>
          <p><strong>Instructor:</strong> {report.instructorReview?.instructor_name ?? report.wizard.instructor_name ?? "—"}{report.instructorReview?.certified_at ? ` (certified ${formatDate(report.instructorReview.certified_at)})` : ""}</p>
          <p><strong>Status:</strong> {report.wizard.status.replaceAll("_", " ")}{report.wizard.accepted_at ? ` · accepted ${formatDate(report.wizard.accepted_at)}` : ""}</p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <span className="flex items-center gap-1.5"><Icon status="pass" /> {counts.pass ?? 0} pass</span>
        <span className="flex items-center gap-1.5"><Icon status="check" /> {counts.check ?? 0} check manually</span>
        <span className="flex items-center gap-1.5"><Icon status="issue" /> {counts.issue ?? 0} known issue{(counts.issue ?? 0) === 1 ? "" : "s"}</span>
        {counts.na ? <span className="flex items-center gap-1.5"><Icon status="na" /> {counts.na} not applicable</span> : null}
      </div>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-400 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <th className="w-6 py-1"></th>
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2">Entered</th>
            <th className="w-10 py-1 pr-2 text-center">Pics</th>
            <th className="py-1">Issue / check</th>
          </tr>
        </thead>
        {sections.map((section) => (
          <tbody key={section}>
            <tr>
              <td colSpan={5} className="bg-slate-100 px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{SECTION_NAMES[section] ?? section}</td>
            </tr>
            {report.rows.filter((row) => row.requirement.section_code === section).map((row) => (
              <tr key={row.requirement.id} className="border-b border-slate-200 align-top">
                <td className="py-1"><Icon status={row.status} /></td>
                <td className="py-1 pr-2">
                  <span className="font-semibold">{row.requirement.title}</span>
                  {row.requirement.regulation_citation ? <span className="ml-1 text-slate-500">{row.requirement.regulation_citation}</span> : null}
                </td>
                <td className="py-1 pr-2 text-slate-700">{row.entered || "—"}</td>
                <td className="py-1 pr-2 text-center">{row.pictures || "—"}</td>
                <td className={`py-1 ${row.status === "issue" ? "font-semibold text-red-700" : row.status === "check" ? "text-amber-800" : "text-slate-500"}`}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <p className="mt-3 text-[10px] text-slate-500">
        Green: passes the automatic checks (and has its picture). Yellow: the system can&apos;t verify it — check it against the pictures or records.
        Red: a known issue, shown at right. Generated {formatDate(new Date().toISOString(), true)}.
      </p>
    </main>
  );
}

export default function ValidateQualificationsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-8 text-slate-600">Loading…</main>}>
      <ReportContent />
    </Suspense>
  );
}
