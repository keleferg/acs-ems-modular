import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();

  // Current Supabase SSR/PKCE confirmation format:
  // /auth/confirm?code=...&next=...
  if (code) {
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorUrl = new URL(
        "/auth/error",
        requestUrl.origin,
      );

      errorUrl.searchParams.set("error", error.message);

      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(
      new URL(next, requestUrl.origin),
    );
  }

  // Also support token-hash email templates.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      const errorUrl = new URL(
        "/auth/error",
        requestUrl.origin,
      );

      errorUrl.searchParams.set("error", error.message);

      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(
      new URL(next, requestUrl.origin),
    );
  }

  const errorUrl = new URL(
    "/auth/error",
    requestUrl.origin,
  );

  errorUrl.searchParams.set(
    "error",
    "Confirmation link is missing its authentication code.",
  );

  return NextResponse.redirect(errorUrl);
}
