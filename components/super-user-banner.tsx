"use client";

import { useEffect, useState } from "react";

// Shown on every page while a super user is signed in as someone else (Kele, Oct 31 2026).
// The cookie it reads only names the account; the API checks the signed cookie.

function readBannerCookie() {
  const match = document.cookie.split("; ").find((part) => part.startsWith("ems_su_as="));
  return match ? decodeURIComponent(match.slice("ems_su_as=".length)) : "";
}

export function SuperUserBanner() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(readBannerCookie());
  }, []);

  if (!email) return null;

  async function returnToAccount() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/super-user-return", { method: "POST" });
      const result = (await response.json()) as { ok: boolean; redirect?: string; error?: string };
      if (!result.ok) setError(result.error ?? "Could not return to your account.");
      window.location.assign(result.redirect ?? "/auth/login");
    } catch {
      setError("Could not return to your account.");
      setBusy(false);
    }
  }

  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1">
          <span className="font-bold">Super user:</span> you are signed in as <span className="font-semibold break-all">{email}</span>.
          <span className="block text-xs text-amber-800">Use Return to my account, not Sign Out. Sign Out would sign this person out.</span>
        </p>
        <button
          type="button"
          onClick={() => void returnToAccount()}
          disabled={busy}
          className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {busy ? "Returning…" : "Return to my account"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
