"use client";

import type { LegalName } from "@/lib/legal-name";

// First / middle / last name on one line (wraps on a phone). Kele, Oct 31 2026.
const input =
  "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

export function LegalNameFields({ value, onChange }: { value: LegalName; onChange: (next: LegalName) => void }) {
  const set = (key: keyof LegalName, next: string) => onChange({ ...value, [key]: next });
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-semibold text-slate-800">
        Full legal name<span className="ml-1 text-red-600">*</span>
      </legend>
      <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Enter your name <strong>EXACTLY</strong> as it appears on your government-issued photo ID. Enter &apos;NMN&apos; if your ID shows none.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700" htmlFor="legalFirstName">
          First name<span className="ml-0.5 text-red-600">*</span>
          <input id="legalFirstName" value={value.first} onChange={(event) => set("first", event.target.value)} required autoComplete="given-name" className={`mt-1 ${input}`} />
        </label>
        <label className="text-xs font-semibold text-slate-700" htmlFor="legalMiddleName">
          Middle name(s)<span className="ml-0.5 text-red-600">*</span>
          <input id="legalMiddleName" value={value.middle} onChange={(event) => set("middle", event.target.value)} required placeholder="or NMN" autoComplete="additional-name" className={`mt-1 ${input}`} />
        </label>
        <label className="text-xs font-semibold text-slate-700" htmlFor="legalLastName">
          Last name<span className="ml-0.5 text-red-600">*</span>
          <input id="legalLastName" value={value.last} onChange={(event) => set("last", event.target.value)} required autoComplete="family-name" className={`mt-1 ${input}`} />
        </label>
      </div>
    </fieldset>
  );
}
