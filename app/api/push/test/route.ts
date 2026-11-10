import { NextResponse } from "next/server";

import { serviceClient } from "@/lib/open-offers/server";
import { routeClient } from "@/lib/supabase/route-client";

// "Send a test notification" in the EMS Examiner app (Kele, Nov 9 2026). Queues one push to the
// signed-in examiner's own phones; the database wakes push-dispatch.
export async function POST(request: Request) {
  const { supabase, user } = await routeClient(request);
  if (!user) return NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 });

  const { data: settings, error } = await supabase.rpc("examiner_get_push_settings");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!settings || Number((settings as { device_count?: number }).device_count ?? 0) === 0) {
    return NextResponse.json({ ok: false, error: "No iPhone is registered for notifications yet." }, { status: 400 });
  }

  const { error: insertError } = await serviceClient().from("push_outbox").insert({
    profile_id: user.id,
    event: "test",
    category: "REQUEST",
    title: "EMS Examiner",
    body: "Test notification: push is working.",
    data: {},
    dedupe_key: `test:${user.id}:${Date.now()}`,
  });
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
