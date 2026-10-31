import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  cookieOptions,
  encodeSuCookie,
  homePathFor,
  isSuperUser,
  signInTokenFor,
  SU_BANNER_COOKIE,
  SU_COOKIE,
  SU_HOURS,
} from "@/lib/admin/super-user-server";
import { serviceClient } from "@/lib/qualification/instructor-review-server";
import { createClient } from "@/lib/supabase/server";

// Super User Login (Kele, Oct 31 2026): sign this browser in as the account with the given email.
// Only an administrator listed in public.super_users may do this, and never as another super user.

export async function POST(request: Request) {
  let email = "";
  try {
    email = String(((await request.json()) as { email?: string }).email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter the email address of the account." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });

  try {
    const service = serviceClient();
    if (!(await isSuperUser(service, user.id))) {
      return NextResponse.json({ ok: false, error: "Only administrators with super user ability can do this." }, { status: 403 });
    }
    if ((user.email ?? "").toLowerCase() === email) {
      return NextResponse.json({ ok: false, error: "That is your own account." }, { status: 400 });
    }

    const target = await signInTokenFor(service, email);
    if (await isSuperUser(service, target.userId)) {
      return NextResponse.json({ ok: false, error: "You can't sign in as another super user." }, { status: 403 });
    }

    const headerList = await headers();
    const { data: log } = await service
      .from("super_user_sessions")
      .insert({
        super_user_profile_id: user.id,
        target_profile_id: target.userId,
        target_email: target.email,
        ip_address: headerList.get("x-nf-client-connection-ip") ?? headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        user_agent: headerList.get("user-agent"),
      })
      .select("id")
      .single();

    // Replaces this browser's session with the other user's.
    const { error: verifyError } = await supabase.auth.verifyOtp({ type: "email", token_hash: target.tokenHash });
    if (verifyError) throw new Error(verifyError.message);

    const cookieStore = await cookies();
    cookieStore.set(SU_COOKIE, encodeSuCookie({ su: user.id, log: log?.id ?? null, exp: Date.now() + SU_HOURS * 3600_000 }), cookieOptions(true));
    cookieStore.set(SU_BANNER_COOKIE, target.email, cookieOptions(false));

    return NextResponse.json({ ok: true, redirect: await homePathFor(service, target.userId) });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Could not sign in as that user." }, { status: 400 });
  }
}
