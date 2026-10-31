import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeSuCookie, isSuperUser, signInTokenFor, SU_BANNER_COOKIE, SU_COOKIE } from "@/lib/admin/super-user-server";
import { serviceClient } from "@/lib/qualification/instructor-review-server";
import { createClient } from "@/lib/supabase/server";

// "Return to my account" after a Super User Login (Kele, Oct 31 2026): signs the super user back in.

export async function POST() {
  const cookieStore = await cookies();
  const payload = decodeSuCookie(cookieStore.get(SU_COOKIE)?.value);
  const clear = () => {
    cookieStore.delete(SU_COOKIE);
    cookieStore.delete(SU_BANNER_COOKIE);
  };

  if (!payload) {
    clear();
    return NextResponse.json({ ok: true, redirect: "/auth/login" });
  }

  try {
    const service = serviceClient();
    if (payload.log) await service.from("super_user_sessions").update({ ended_at: new Date().toISOString() }).eq("id", payload.log);

    const { data: account } = await service.auth.admin.getUserById(payload.su);
    const email = account?.user?.email;
    if (!email || !(await isSuperUser(service, payload.su))) {
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: "local" });
      clear();
      return NextResponse.json({ ok: true, redirect: "/auth/login" });
    }

    const token = await signInTokenFor(service, email);
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: token.tokenHash });
    if (error) throw new Error(error.message);
    clear();
    return NextResponse.json({ ok: true, redirect: "/admin/super-user" });
  } catch (cause) {
    clear();
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Could not return to your account.", redirect: "/auth/login" }, { status: 400 });
  }
}
