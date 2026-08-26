"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ApplicantReportRow = {
  id: string;
  practical_test_id: string;
  report_type: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  generated_at: string;
  released_to_applicant_at: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ApplicantReportsPage() {
  const [reports, setReports] = useState<ApplicantReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [openingReportId, setOpeningReportId] = useState<string | null>(
    null,
  );

  const loadReports = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("practical_test_reports")
      .select(
        `
        id,
        practical_test_id,
        report_type,
        storage_bucket,
        storage_path,
        file_name,
        generated_at,
        released_to_applicant_at
        `,
      )
      .eq(
        "report_type",
        "applicant_practical_test_report",
      )
      .not("released_to_applicant_at", "is", null)
      .is("superseded_at", null)
      .order("generated_at", {
        ascending: false,
      });

    if (error) {
      setPageError(
        `Practical Test Reports could not be loaded: ${error.message}`,
      );
      setReports([]);
      setLoading(false);
      return;
    }

    setReports((data ?? []) as ApplicantReportRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function openReport(report: ApplicantReportRow) {
    if (openingReportId) return;

    setOpeningReportId(report.id);
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(report.storage_bucket)
      .createSignedUrl(
        report.storage_path,
        60 * 10,
      );

    if (error || !data?.signedUrl) {
      setPageError(
        `The Practical Test Report could not be opened: ${
          error?.message ??
          "No signed URL was returned."
        }`,
      );
      setOpeningReportId(null);
      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer",
    );

    setOpeningReportId(null);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">
        Practical Test Reports
      </h1>

      <p className="mt-2 text-slate-600">
        Released Applicant Practical Test Reports are available here
        for secure viewing and download.
      </p>

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
          Loading Practical Test Reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
          No released Practical Test Reports are currently available.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">
                  Applicant Practical Test Report
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {report.file_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Generated {formatDateTime(report.generated_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void openReport(report)}
                disabled={Boolean(openingReportId)}
                className="inline-flex items-center justify-center rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
              >
                {openingReportId === report.id
                  ? "Opening…"
                  : "View Report"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
