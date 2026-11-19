"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Examiner settings for the pretest qualification.
// - Read uploaded qualification pictures automatically (Kele, Oct 30 2026).
// - Build the Plan of Action and email the scenario when the applicant submits (Kele, Nov 12 2026);
//   off until the examiner turns it on (Nov 18 2026).
// - Require the recommending instructor to sign off on the qualification review (Nov 18 2026).
type SettingKey = "picture_scan_enabled" | "auto_poa_enabled" | "require_instructor_signoff";
type Settings = Record<SettingKey, boolean>;

const DEFAULTS: Settings = { picture_scan_enabled: false, auto_poa_enabled: false, require_instructor_signoff: false };

const SAVED_MESSAGES: Record<SettingKey, [string, string]> = {
  picture_scan_enabled: ["Picture reading is on.", "Picture reading is off."],
  auto_poa_enabled: ["Automatic scenarios are on.", "Automatic scenarios are off."],
  require_instructor_signoff: ["Instructor sign-off is required.", "Instructor sign-off is no longer required."],
};

function Switch({ on, label, disabled, onToggle }: { on: boolean; label: string; disabled: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-sm font-semibold text-slate-800">{on ? "On" : "Off"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${on ? "bg-emerald-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

export default function QualificationSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
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
        .select("picture_scan_enabled, auto_poa_enabled, require_instructor_signoff")
        .eq("examiner_profile_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (loadError) setError(`Settings could not be loaded: ${loadError.message}`);
      setSettings({
        picture_scan_enabled: Boolean(data?.picture_scan_enabled),
        auto_poa_enabled: Boolean(data?.auto_poa_enabled),
        require_instructor_signoff: Boolean(data?.require_instructor_signoff),
      });
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function save(key: SettingKey, next: boolean) {
    setSaving(true); setMessage(""); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be signed in as an examiner."); setSaving(false); return; }
    const { error: saveError } = await supabase
      .from("examiner_qualification_settings")
      .upsert({ examiner_profile_id: user.id, ...settings, [key]: next, updated_at: new Date().toISOString() }, { onConflict: "examiner_profile_id" });
    if (saveError) setError(`The setting could not be saved: ${saveError.message}`);
    else {
      setSettings((current) => ({ ...current, [key]: next }));
      setMessage(SAVED_MESSAGES[key][next ? 0 : 1]);
    }
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
            <h3 className="text-lg font-bold text-slate-900">Assign the scenario automatically</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>On:</strong> as soon as an applicant submits the pretest qualification (and, if you require it, their
              instructor signs off), EMS builds their Plan of Action from your
              template. The areas they answered incorrectly on the knowledge test are added to it. EMS then emails the applicant the
              scenario, a planning assignment and the test-day details, sends you a copy, and logs each step in the request&apos;s History.
              The applicant never sees the questions or triggers.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>Off:</strong> you build the Plan of Action yourself from the request (Build POA), and nothing is emailed.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Add-on ratings with more than one possible rating already held, tests without a template, and requests without a test
              airport are left for you to build; you get an email and a History note when that happens.
            </p>
          </div>
          <Switch
            on={settings.auto_poa_enabled}
            label="Build the Plan of Action automatically"
            disabled={loading || saving}
            onToggle={() => void save("auto_poa_enabled", !settings.auto_poa_enabled)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold text-slate-900">Require the recommending instructor to sign off</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>On:</strong> every qualification package you receive goes to the applicant&apos;s recommending instructor after
              the applicant submits it. The instructor gets an email to review and certify it, and a reminder each day until they do.
              You can&apos;t accept the package, and no automatic scenario is sent, until the instructor signs off.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>Off:</strong> the instructor signs off only on tests whose qualification list asks for it.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              If an instructor can&apos;t be reached, you can still skip the instructor step on the request with a reason.
            </p>
          </div>
          <Switch
            on={settings.require_instructor_signoff}
            label="Require the recommending instructor to sign off"
            disabled={loading || saving}
            onToggle={() => void save("require_instructor_signoff", !settings.require_instructor_signoff)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
          <Switch
            on={settings.picture_scan_enabled}
            label="Read uploaded pictures automatically"
            disabled={loading || saving}
            onToggle={() => void save("picture_scan_enabled", !settings.picture_scan_enabled)}
          />
        </div>
      </section>

      {message ? <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
