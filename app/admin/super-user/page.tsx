"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Super User Login (Kele, Oct 31 2026): an administrator with super user ability signs in as any other
// account by email, without its password. Every sign-in is logged. Super users can add or remove others.

type SuperUser = { profile_id: string; email: string | null; full_name: string | null; granted_at: string };
type Session = { id: string; super_user_email: string | null; target_email: string; started_at: string; ended_at: string | null };

function formatHst(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function SuperUserLoginPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [superUsers, setSuperUsers] = useState<SuperUser[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newSuperUser, setNewSuperUser] = useState("");
  const [manageError, setManageError] = useState("");
  const [myId, setMyId] = useState("");

  const loadLists = useCallback(async () => {
    const supabase = createClient();
    const [listResult, sessionResult] = await Promise.all([
      supabase.rpc("super_user_list"),
      supabase.rpc("super_user_recent_sessions", { p_limit: 25 }),
    ]);
    setSuperUsers((listResult.data ?? []) as SuperUser[]);
    setSessions((sessionResult.data ?? []) as Session[]);
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: isSuper }, { data: userData }] = await Promise.all([supabase.rpc("is_super_user"), supabase.auth.getUser()]);
      setMyId(userData.user?.id ?? "");
      setAllowed(Boolean(isSuper));
      if (isSuper) await loadLists();
    }
    load().catch(() => setAllowed(false));
  }, [loadLists]);

  async function signInAs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const target = email.trim();
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/super-user-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const result = (await response.json()) as { ok: boolean; redirect?: string; error?: string };
      if (!result.ok || !result.redirect) throw new Error(result.error ?? "Could not sign in as that user.");
      window.location.assign(result.redirect);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in as that user.");
      setBusy(false);
    }
  }

  async function addSuperUser() {
    setManageError("");
    const { error: grantError } = await createClient().rpc("super_user_grant", { p_email: newSuperUser.trim() });
    if (grantError) {
      setManageError(grantError.message);
      return;
    }
    setNewSuperUser("");
    await loadLists();
  }

  async function removeSuperUser(profileId: string) {
    setManageError("");
    const { error: revokeError } = await createClient().rpc("super_user_revoke", { p_profile_id: profileId });
    if (revokeError) {
      setManageError(revokeError.message);
      return;
    }
    await loadLists();
  }

  if (allowed === null) return <main className="mx-auto max-w-4xl px-6 py-10 text-slate-600">Loading…</main>;
  if (!allowed) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Super User Login</h1>
        <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-700">Only administrators with super user ability can use this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Super User Login</h1>
      <p className="mt-1 text-slate-600">Sign in as another person to see and do exactly what they can. No password is needed. Every sign-in is recorded below.</p>

      <form onSubmit={signInAs} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="su-email" className="block text-sm font-semibold text-slate-800">Email address of the account</label>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            id="su-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
          <button type="submit" disabled={busy || !email.trim()} className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in as this user"}
          </button>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <p className="mt-3 text-xs text-slate-500">
          You&apos;ll leave your own account. A bar at the bottom of every page shows whose account you&apos;re in, with
          <span className="font-semibold"> Return to my account</span>. The borrowed sign-in lasts up to 8 hours.
        </p>
      </form>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Recent super user sign-ins</h2>
        {sessions.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="py-2 pr-4">Signed in as</th><th className="py-2 pr-4">By</th><th className="py-2 pr-4">Started</th><th className="py-2">Returned</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{session.target_email}</td>
                    <td className="py-2 pr-4 text-slate-700">{session.super_user_email ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{formatHst(session.started_at)}</td>
                    <td className="py-2 text-slate-700">{formatHst(session.ended_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">None yet.</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Super users</h2>
        <p className="mt-1 text-sm text-slate-600">Administrators who can use Super User Login. Super users can&apos;t sign in as each other.</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {superUsers.map((person) => (
            <li key={person.profile_id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-semibold text-slate-900">{person.full_name ?? person.email}</span>
                <span className="ml-2 text-slate-500">{person.email}</span>
              </span>
              {person.profile_id === myId ? (
                <span className="text-xs text-slate-500">You</span>
              ) : (
                <button type="button" onClick={() => void removeSuperUser(person.profile_id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            value={newSuperUser}
            onChange={(event) => setNewSuperUser(event.target.value)}
            placeholder="Administrator's email"
            aria-label="Add a super user by email"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void addSuperUser()} disabled={!newSuperUser.trim()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Add super user
          </button>
        </div>
        {manageError ? <p role="alert" className="mt-2 text-sm text-red-700">{manageError}</p> : null}
      </section>
    </main>
  );
}
