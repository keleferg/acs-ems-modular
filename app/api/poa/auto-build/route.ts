import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { runAutoPoaBuild } from "@/lib/poa/auto-build";

// Automatic Plan of Action (Kele, Nov 12 2026). The applicant's qualification page calls this right
// after submitting. Row-level security decides whether the signed-in user may see the request; the
// build itself runs in the poa-auto-build-background function (up to 15 minutes). Outside Netlify
// (local development) it runs here instead.

function serviceKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export async function POST(request: Request) {
  let requestId = "";
  try {
    requestId = String(((await request.json()) as { requestId?: string }).requestId ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return NextResponse.json({ ok: false, error: "Missing request." }, { status: 400 });

  const supabase = await createServerClient();
  const { data: visible } = await supabase.from("practical_test_requests").select("id").eq("id", requestId).maybeSingle();
  if (!visible) return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });

  const key = serviceKey();
  if (!key) return NextResponse.json({ ok: false, error: "The automatic POA build is not configured on the server." }, { status: 500 });
  const origin = (process.env.URL || new URL(request.url).origin).replace(/\/$/, "");

  if (process.env.NETLIFY) {
    const response = await fetch(`${origin}/.netlify/functions/poa-auto-build-background`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-auto-poa-key": createHash("sha256").update(`${key}:auto-poa`).digest("hex") },
      body: JSON.stringify({ requestId }),
    });
    return NextResponse.json({ ok: response.ok, status: "started" });
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const result = await runAutoPoaBuild(service, requestId, origin);
    return NextResponse.json({ ok: true, ...result });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "The POA could not be built." }, { status: 500 });
  }
}
