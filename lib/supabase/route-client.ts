import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Supabase client for an API route, signed in as the caller (Kele, Nov 9 2026: EMS Examiner app).
 * The website sends its login cookie; the iPhone app sends `Authorization: Bearer <access token>`.
 * Either way the database rules apply to that user. Returns the user, or null when not signed in.
 */
export async function routeClient(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim();

  if (bearer) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase.auth.getUser(bearer);
    return { supabase, user: error ? null : data.user };
  }

  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
