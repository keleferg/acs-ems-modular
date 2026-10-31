"use client";

import { useEffect, useState } from "react";

import { LEG_NAMES, parseLegs } from "@/lib/qualification/legs";

// Instructor certification of a pretest qualification package (Kele, Oct 31 2026).
// Opened from the emailed link; no sign-in. Read-only view of the applicant's entries, pictures and
// automatic results, then Certify or Request changes.

type Field = { key: string; label?: string; type?: string };
type Requirement = {
  id: string;
  section_code: string;
  title: string;
  description: string | null;
  regulation_citation: string | null;
  required: boolean;
  rule_config: Record<string, unknown>;
  display_config: { fields?: Field[] };
};
type Answer = {
  requirement_id: string;
  answer_value: Record<string, unknown>;
  applicant_notes: string | null;
  automated_result: string | null;
  automated_result_message: string | null;
};
type Evidence = { id: string; requirement_id: string; file_name: string; mime_type: string; caption: string | null; url: string | null };
type Package = {
  ok: true;
  waiting: true;
  request: {
    request_number: string;
    applicant_name_snapshot: string | null;
    certificate_sought: string | null;
    rating_sought: string | null;
    scheduled_start_at: string | null;
    scheduled_location: string | null;
  } | null;
  ruleSetName: string;
  instructor: { name: string; certificateNumber: string };
  statement: string;
  requirements: Requirement[];
  answers: Answer[];
  evidence: Evidence[];
  expiresAt: string;
};
type Closed = { ok: true; waiting: false; decision: string | null };

const SECTION_ORDER = ["identity", "eligibility", "knowledge_test", "application", "medical", "experience", "cross_country", "endorsements", "certification"];
const SECTION_NAMES: Record<string, string> = {
  identity: "Identity", eligibility: "Eligibility", knowledge_test: "Knowledge Test", application: "Application",
  medical: "Medical Certificate", experience: "Aeronautical Experience", cross_country: "Cross-Country Flights",
  endorsements: "Endorsements", certification: "Certifications",
};
const SKIP_KEYS = new Set(["instructor_source", "total_distance_nm", "certified"]);

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu", month: "short", day: "numeric", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value ?? "").trim();
  if (text === "true") return "Yes";
  if (text === "false") return "No";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? formatDate(text) : text;
}

function resultStyle(result: string | null) {
  if (result === "meets") return { row: "border-l-emerald-500 bg-emerald-50", chip: "bg-emerald-100 text-emerald-800", label: "Passes the automatic check" };
  if (result === "does_not_meet") return { row: "border-l-red-500 bg-red-50", chip: "bg-red-100 text-red-800", label: "Does not pass" };
  return { row: "border-l-amber-400 bg-amber-50", chip: "bg-amber-100 text-amber-900", label: "Needs review" };
}

export default function InstructorReviewPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Package | Closed | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [agree, setAgree] = useState(false);
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"certify" | "request_changes">("certify");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "certify" | "request_changes">("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    setToken(t);
    void fetch(`/api/qualification/instructor-review?t=${encodeURIComponent(t)}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.ok) {
          setError(result.error ?? "This link is not valid.");
          return;
        }
        setData(result);
        if (result.waiting) {
          setName(result.instructor?.name ?? "");
          setCertificateNumber(result.instructor?.certificateNumber ?? "");
        }
      })
      .catch(() => setError("This page could not be opened. Check your connection and try again."));
  }, []);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/qualification/instructor-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ t: token, action: mode, name, certificateNumber, agree, notes }),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error ?? "Your decision could not be saved.");
      setDone(mode);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your decision could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-slate-900">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Instructor Certification</p>
        <h1 className="mt-2 text-2xl font-bold">{done === "certify" ? "Thank you — the package is certified." : "Sent back to the applicant."}</h1>
        <p className="mt-3 text-slate-700">
          {done === "certify"
            ? "The examiner has been notified and will review the package before the practical test."
            : "The applicant will see your notes, make the changes and resubmit. You'll get a new email when it's ready to review again."}
        </p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>
      </main>
    );
  }
  if (!data) return <main className="mx-auto max-w-3xl px-5 py-12 text-slate-600">Loading the qualification package…</main>;
  if (!data.waiting) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-bold text-slate-900">This package is no longer waiting for your review.</h1>
        <p className="mt-3 text-slate-700">
          {data.decision === "certified"
            ? "It has already been certified."
            : data.decision === "changes_required"
              ? "It was sent back to the applicant for changes. You'll get a new link when it's resubmitted."
              : data.decision === "waived"
                ? "The examiner completed this step."
                : "Ask the applicant or the examiner if you need a new link."}
        </p>
      </main>
    );
  }

  const answers = new Map(data.answers.map((answer) => [answer.requirement_id, answer]));
  const sections = SECTION_ORDER.filter((code) => data.requirements.some((requirement) => requirement.section_code === code));
  const reviewable = data.requirements.filter((requirement) => !["instructor_certification", "computed"].includes(String(requirement.rule_config.answer_type ?? "")));
  const counts = reviewable.reduce(
    (total, requirement) => {
      const result = answers.get(requirement.id)?.automated_result ?? null;
      if (result === "meets") total.pass += 1;
      else if (result === "does_not_meet") total.fail += 1;
      else total.review += 1;
      return total;
    },
    { pass: 0, review: 0, fail: 0 },
  );
  const request = data.request;

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Instructor Certification</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{request?.applicant_name_snapshot ?? "Applicant"}</h1>
      <p className="mt-1 text-slate-700">
        {data.ruleSetName || `${request?.certificate_sought ?? ""} — ${request?.rating_sought ?? ""}`} · {request?.request_number}
      </p>
      <p className="text-sm text-slate-600">
        Practical test: {formatDate(request?.scheduled_start_at, true)}
        {request?.scheduled_location ? ` · ${request.scheduled_location}` : ""}
      </p>

      <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        Review each item against the applicant&apos;s logbook, endorsements and documents. Green items passed the automatic
        checks, yellow items need a person to confirm them, and red items failed a check. Then certify the package or send it
        back with the changes needed.
        <div className="mt-2 font-semibold">
          {counts.pass} pass · {counts.review} to confirm · {counts.fail} failed
        </div>
      </div>

      {sections.map((section) => (
        <section key={section} className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-lg font-bold">{SECTION_NAMES[section] ?? section}</h2>
          {data.requirements
            .filter((requirement) => requirement.section_code === section)
            .filter((requirement) => String(requirement.rule_config.answer_type ?? "") !== "instructor_certification")
            .map((requirement) => {
              const answer = answers.get(requirement.id);
              const style = resultStyle(answer?.automated_result ?? null);
              const labels = new Map((requirement.display_config.fields ?? []).map((field) => [field.key, field.label ?? field.key]));
              const values = Object.entries(answer?.answer_value ?? {}).filter(([key, value]) => !SKIP_KEYS.has(key) && key !== "legs" && displayValue(value) !== "");
              const legs = parseLegs(answer?.answer_value?.legs);
              const pictures = data.evidence.filter((item) => item.requirement_id === requirement.id);
              return (
                <div key={requirement.id} className={`border-b border-l-4 border-slate-200 px-5 py-4 last:border-b-0 ${style.row}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold">{requirement.title}</h3>
                      {requirement.regulation_citation ? <p className="text-xs font-semibold text-sky-800">{requirement.regulation_citation}</p> : null}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}>{style.label}</span>
                  </div>
                  {answer ? (
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[14rem_1fr]">
                      {values.map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className="text-slate-600">{key === "value" ? "Answer" : labels.get(key) ?? key.replaceAll("_", " ")}</dt>
                          <dd className="whitespace-pre-wrap break-words font-medium">{displayValue(value)}</dd>
                        </div>
                      ))}
                      {legs.map((leg, index) => (
                        <div key={index} className="contents">
                          <dt className="text-slate-600">{LEG_NAMES[index] ?? `Leg ${index + 1}`}</dt>
                          <dd className="font-medium">
                            {formatDate(leg.date)} · {leg.departure} → {leg.destination} · {leg.distance_nm} NM
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Not answered.</p>
                  )}
                  {answer?.automated_result_message ? <p className="mt-2 text-sm text-slate-700">{answer.automated_result_message}</p> : null}
                  {answer?.applicant_notes ? <p className="mt-2 text-sm text-slate-700"><strong>Applicant note:</strong> {answer.applicant_notes}</p> : null}
                  {pictures.length ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {pictures.map((picture) =>
                        picture.url ? (
                          <a key={picture.id} href={picture.url} target="_blank" rel="noopener" className="block w-36 rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-sky-800 hover:border-sky-400">
                            {picture.mime_type.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={picture.url} alt={picture.caption || picture.file_name} className="h-24 w-full rounded object-cover" />
                            ) : (
                              <span className="flex h-24 items-center justify-center rounded bg-slate-100 font-semibold text-slate-600">PDF</span>
                            )}
                            <span className="mt-1 block truncate">{picture.caption || picture.file_name}</span>
                          </a>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </section>
      ))}

      <section className="mt-8 rounded-2xl border-2 border-slate-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold">Your decision</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("certify")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "certify" ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
            Certify the package
          </button>
          <button type="button" onClick={() => setMode("request_changes")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "request_changes" ? "bg-amber-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
            Request changes
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Your name
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Flight instructor certificate number
            <input value={certificateNumber} onChange={(event) => setCertificateNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </label>
        </div>

        {mode === "certify" ? (
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="mt-1 h-4 w-4" />
            <span>{data.statement}</span>
          </label>
        ) : null}

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          {mode === "certify" ? "Notes for the examiner (optional)" : "Changes the applicant needs to make"}
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
        </label>

        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

        <button
          type="button"
          disabled={
            busy ||
            (mode === "certify" ? !agree || !name.trim() || !certificateNumber.trim() : !notes.trim())
          }
          onClick={() => void submit()}
          className={`mt-5 rounded-lg px-5 py-3 text-sm font-bold text-white disabled:opacity-50 ${mode === "certify" ? "bg-emerald-700" : "bg-amber-600"}`}
        >
          {busy ? "Saving…" : mode === "certify" ? "Certify Qualification Package" : "Send Back for Changes"}
        </button>
        <p className="mt-3 text-xs text-slate-500">This link works until {formatDate(data.expiresAt)}. Pictures are private and are deleted after the practical test.</p>
      </section>
    </main>
  );
}
