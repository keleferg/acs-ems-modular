"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Examiner setting: read uploaded qualification pictures automatically (Kele, Oct 30 2026).
// On: an uploaded picture is read and fills in the card's fields (the applicant checks and saves).
// Off: pictures are only stored and the applicant types every value.
export default function QualificationSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setError("You must be signed in as an examiner."); setLoading(false); } return; }
      const { data, error: loadError } = await supabase
        .from("examiner_qualification_settings")
        .select("picture_scan_enabled")
        .eq("examiner_profile_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (loadError) setError(`Settings could not be loaded: ${loadError.message}`);
      setEnabled(Boolean(data?.picture_scan_enabled));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function save(next: boolean) {
    setSaving(true); setMessage(""); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be signed in as an examiner."); setSaving(false); return; }
    const { error: saveError } = await supabase
      .from("examiner_qualification_settings")
      .upsert({ examiner_profile_id: user.id, picture_scan_enabled: next, updated_at: new Date().toISOString() }, { onConflict: "examiner_profile_id" });
    if (saveError) setError(`The setting could not be saved: ${saveError.message}`);
    else { setEnabled(next); setMessage(next ? "Picture reading is on." : "Picture reading is off."); }
    setSaving(false);
  }

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Settings</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">Pretest Qualification</h2>
      <p className="mt-2 text-slate-600">How applicants complete the qualification package before the practical test.</p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold text-slate-900">Read uploaded pictures automatically</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>On:</strong> when an applicant uploads a picture or PDF on a requirement card, the system reads it and fills in the
              card&apos;s dates and other values it can see (for example the knowledge-test date and score, the medical exam date, or an
              endorsement date). The applicant checks the values and saves the card, and the usual date checks run against the test date.
              Your review panel shows what was read from each picture.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>Off:</strong> pictures are only stored, and the applicant types every value.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Pictures are sent to the AI service EMS already uses for reading documents. Handwritten logbook entries may not read reliably;
              the applicant can always correct a value.
            </p>
          </div>
          <label className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">{enabled ? "On" : "Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Read uploaded pictures automatically"
              disabled={loading || saving}
              onClick={() => void save(!enabled)}
              className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${enabled ? "bg-emerald-600" : "bg-slate-300"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} />
            </button>
          </label>
        </div>
        {message ? <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
