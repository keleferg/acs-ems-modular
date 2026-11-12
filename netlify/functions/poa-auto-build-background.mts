import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { runAutoPoaBuild, runPendingAutoPoaBuilds } from "../../lib/poa/auto-build";

// Automatic Plan of Action worker (Kele, Nov 12 2026). A Netlify background function (up to 15
// minutes), because a build reads the FAA airport and IFR data and writes a few hundred rows.
// Called by /api/poa/auto-build (one request, right after the applicant submits) and by the
// poa-auto-build schedule (every waiting build). Both send a key derived from the service key.

function sameKey(given: string, expected: string) {
  if (!given || !expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export default async (request: Request) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!supabaseUrl || !serviceKey || !siteUrl) {
    console.error("poa-auto-build-background: missing environment configuration.");
    return;
  }
  const expected = createHash("sha256").update(`${serviceKey}:auto-poa`).digest("hex");
  if (!sameKey(request.headers.get("x-auto-poa-key") ?? "", expected)) {
    console.warn("poa-auto-build-background: refused (bad key).");
    return;
  }
  let requestId = "";
  try {
    requestId = String(((await request.json()) as { requestId?: string }).requestId ?? "");
  } catch {
    requestId = "";
  }
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = /^[0-9a-f-]{36}$/i.test(requestId)
    ? [await runAutoPoaBuild(service, requestId, siteUrl)]
    : await runPendingAutoPoaBuilds(service, siteUrl);
  console.log(`poa-auto-build-background: ${JSON.stringify(results).slice(0, 1000)}`);
};
