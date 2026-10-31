"use client";

import { FormEvent, useEffect, useState } from "react";

import { LegalNameFields } from "@/components/legal-name-fields";
import { type LegalName } from "@/lib/legal-name";
import { createClient } from "@/lib/supabase/client";

// Instructor profile (Kele, Oct 31 2026). Top: the same name/phone/email block as the applicant profile.
// Below: flight schools, CFI certificate, ratings, recent experience and 14 CFR 61.195(h).
// Saving complete, current CFI information grants instructor access automatically (instructor_save_profile).

const CFI_RATINGS = [
  "Airplane Single-Engine",
  "Airplane Multiengine",
  "Instrument Airplane",
  "Rotorcraft Helicopter",
  "Instrument Helicopter",
  "Rotorcraft Gyroplane",
  "Glider",
  "Powered-Lift",
  "Instrument Powered-Lift",
  "Sport Pilot Instructor",
];

const RECENCY_BASES = [
  "Flight instructor refresher course (FIRC)",
  "Practical test (renewal or additional rating)",
  "Student practical-test record (5 or more applicants, 80% first-time pass)",
  "Part 121/135/141/142 check pilot, chief or assistant chief instructor duties",
  "Military instructor or check pilot",
];

const BASES_195H = [
  "(h)(2)(i) — held a flight instructor certificate 24 months and given 200 hours of flight training (80 in gliders)",
  "(h)(2)(ii) — trained and endorsed 5 practical-test applicants in the preceding 24 months, 80% passed on the first attempt",
  "(h)(2)(iii) — the (h)(2)(i) hours plus an FAA-approved enhanced qualification training program under 61.195(h)(3)",
];

type School = { id: string; name: string };

type Form = {
  name: LegalName;
  phone: string;
  email: string;
  schoolIds: string[];
  certificateNumber: string;
  expirationDate: string;
  issuedDate: string;
  ratings: string[];
  recencyBasis: string;
  recencyDate: string;
  meets195h: "" | "yes" | "no";
  basis195h: string;
};

const input = "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

export default function InstructorProfilePage() {
  const [form, setForm] = useState<Form | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [isInstructor, setIsInstructor] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [profileResult, schoolResult] = await Promise.all([
        supabase.rpc("instructor_get_profile"),
        supabase.from("flight_schools").select("id, name").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
      ]);
      if (profileResult.error) {
        setError(profileResult.error.message);
        return;
      }
      const data = (profileResult.data ?? {}) as {
        profile: Record<string, unknown> | null;
        account: { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null;
        flight_school_ids: string[];
        is_instructor: boolean;
      };
      const p = data.profile ?? {};
      const text = (key: string) => (typeof p[key] === "string" ? (p[key] as string) : "");
      setSchools((schoolResult.data ?? []) as School[]);
      setIsInstructor(Boolean(data.is_instructor));
      setForm({
        name: {
          first: text("legal_first_name") || data.account?.first_name || "",
          middle: text("legal_middle_name"),
          last: text("legal_last_name") || data.account?.last_name || "",
          suffix: "",
        },
        phone: text("phone") || data.account?.phone || "",
        email: data.account?.email ?? "",
        schoolIds: data.flight_school_ids ?? [],
        certificateNumber: text("certificate_number"),
        expirationDate: text("certificate_expiration_date"),
        issuedDate: text("cfi_issued_date"),
        ratings: Array.isArray(p.cfi_ratings) ? (p.cfi_ratings as string[]) : [],
        recencyBasis: text("recency_basis"),
        recencyDate: text("recency_date"),
        meets195h: p.meets_61_195h === true ? "yes" : p.meets_61_195h === false ? "no" : "",
        basis195h: text("basis_61_195h"),
      });
    }
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "Your profile could not be loaded."));
  }, []);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving) return;
    setError("");
    setMessage("");
    setReasons([]);
    if (!form.name.first.trim() || !form.name.middle.trim() || !form.name.last.trim() || !form.phone.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.meets195h === "yes" && !form.basis195h) {
      setError("Select how you meet 14 CFR 61.195(h).");
      return;
    }
    setSaving(true);
    try {
      const { data, error: saveError } = await createClient().rpc("instructor_save_profile", {
        p_profile: {
          first_name: form.name.first,
          middle_name: form.name.middle,
          last_name: form.name.last,
          phone: form.phone,
          flight_school_ids: form.schoolIds,
          certificate_number: form.certificateNumber,
          certificate_expiration_date: form.expirationDate || null,
          cfi_issued_date: form.issuedDate || null,
          cfi_ratings: form.ratings,
          recency_basis: form.recencyBasis,
          recency_date: form.recencyDate || null,
          meets_61_195h: form.meets195h === "" ? null : form.meets195h === "yes",
          basis_61_195h: form.meets195h === "yes" ? form.basis195h : null,
        },
      });
      if (saveError) throw new Error(saveError.message);
      const result = data as { valid: boolean; granted: boolean; reasons: string[]; is_instructor: boolean };
      setIsInstructor(result.is_instructor);
      setReasons(result.reasons ?? []);
      if (result.granted) {
        setMessage("Your instructor profile was saved and instructor access is now on. Loading your portal…");
        window.setTimeout(() => window.location.assign("/instructor/dashboard"), 1200);
      } else {
        setMessage(result.valid || result.is_instructor ? "Your instructor profile was saved." : "Your profile was saved. Instructor access turns on when the items below are complete.");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) return <main className="mx-auto max-w-3xl px-6 py-10"><p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p></main>;
  if (!form) return <main className="mx-auto max-w-3xl px-6 py-10 text-slate-600">Loading profile…</main>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
      <p className="mt-2 text-slate-600">
        {isInstructor
          ? "Review and update your instructor information."
          : "Enter your flight instructor information. Instructor access turns on automatically when it's complete and current."}
      </p>

      {message ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">{message}</div> : null}
      {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">{error}</div> : null}
      {reasons.length ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">{isInstructor ? "Please update:" : "Instructor access needs:"}</p>
          <ul className="mt-1 list-disc pl-5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
      ) : null}

      <form onSubmit={save} className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <LegalNameFields value={form.name} onChange={(next) => update("name", next)} />

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800">
            Phone number<span className="ml-1 text-red-600">*</span>
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required className={`mt-2 font-normal ${input}`} />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Login email
            <input value={form.email} readOnly className={`mt-2 bg-slate-100 font-normal text-slate-600 ${input}`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Contact the administrator to change your login email.</span>
          </label>
        </div>

        <fieldset className="border-t border-slate-200 pt-6">
          <legend className="text-lg font-bold text-slate-900">Flight schools</legend>
          <p className="mt-1 text-sm text-slate-600">Select the flight schools you instruct for.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {schools.map((school) => (
              <label key={school.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={form.schoolIds.includes(school.id)} onChange={() => update("schoolIds", toggle(form.schoolIds, school.id))} className="h-4 w-4" />
                {school.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-6">
          <legend className="text-lg font-bold text-slate-900">Flight instructor certificate</legend>
          <div className="mt-3 grid gap-6 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-800 sm:col-span-1">
              CFI certificate number<span className="ml-1 text-red-600">*</span>
              <input value={form.certificateNumber} onChange={(event) => update("certificateNumber", event.target.value.toUpperCase())} required className={`mt-2 font-normal ${input}`} />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Date first issued
              <input type="date" value={form.issuedDate} onChange={(event) => update("issuedDate", event.target.value)} className={`mt-2 font-normal ${input}`} />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Expiration date
              <input type="date" value={form.expirationDate} onChange={(event) => update("expirationDate", event.target.value)} className={`mt-2 font-normal ${input}`} />
              <span className="mt-1 block text-xs font-normal text-slate-500">Only if your certificate shows one.</span>
            </label>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-800">CFI ratings held<span className="ml-1 text-red-600">*</span></p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CFI_RATINGS.map((rating) => (
              <label key={rating} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={form.ratings.includes(rating)} onChange={() => update("ratings", toggle(form.ratings, rating))} className="h-4 w-4" />
                {rating}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-6">
          <legend className="text-lg font-bold text-slate-900">Recent experience</legend>
          <p className="mt-1 text-sm text-slate-600">Your most recent flight instructor recent-experience activity. It must be within the preceding 24 calendar months.</p>
          <div className="mt-3 grid gap-6 sm:grid-cols-[1fr_12rem]">
            <label className="block text-sm font-semibold text-slate-800">
              Basis<span className="ml-1 text-red-600">*</span>
              <select value={form.recencyBasis} onChange={(event) => update("recencyBasis", event.target.value)} required className={`mt-2 bg-white font-normal ${input}`}>
                <option value="">Select</option>
                {RECENCY_BASES.map((basis) => <option key={basis} value={basis}>{basis}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Date<span className="ml-1 text-red-600">*</span>
              <input type="date" value={form.recencyDate} onChange={(event) => update("recencyDate", event.target.value)} required className={`mt-2 font-normal ${input}`} />
            </label>
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-6">
          <legend className="text-lg font-bold text-slate-900">14 CFR 61.195(h)</legend>
          <p className="mt-1 text-sm text-slate-600">
            Do you meet the requirements of 14 CFR 61.195(h) to train an initial applicant for a flight instructor certificate?
            Your initial-CFI students can&apos;t submit their qualification review until you&apos;ve verified this here.
          </p>
          <div className="mt-3 flex gap-3">
            {(["yes", "no"] as const).map((option) => (
              <label key={option} className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${form.meets195h === option ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-300 text-slate-700"}`}>
                <input type="radio" name="meets195h" checked={form.meets195h === option} onChange={() => update("meets195h", option)} className="h-4 w-4" />
                {option === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
          {form.meets195h === "yes" ? (
            <label className="mt-4 block text-sm font-semibold text-slate-800">
              How you meet it<span className="ml-1 text-red-600">*</span>
              <select value={form.basis195h} onChange={(event) => update("basis195h", event.target.value)} className={`mt-2 bg-white font-normal ${input}`}>
                <option value="">Select</option>
                {BASES_195H.map((basis) => <option key={basis} value={basis}>{basis}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                By selecting this you verify that you meet 14 CFR 61.195(h), including the § 61.183 eligibility requirements and the appropriate certificate and rating.
              </span>
            </label>
          ) : null}
        </fieldset>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <button type="submit" disabled={saving} className="rounded-lg bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
