import { createHmac, timingSafeEqual } from "node:crypto";

import { serviceClient } from "@/lib/qualification/instructor-review-server";

// Super User Login (Kele, Oct 31 2026). A super user (an administrator listed in public.super_users) signs
// in as another user without that user's password: the server makes a one-time sign-in token for the
// other user with the service key and redeems it into this browser's session cookies. A signed cookie
// remembers the super user, so "Return to my account" can sign them back in the same way.

export const SU_COOKIE = "ems_su";
// Readable by the page, only to show the "signed in as" bar. Grants nothing on its own.
export const SU_BANNER_COOKIE = "ems_su_as";
export const SU_HOURS = 8;

type SuPayload = { su: string; log: string | null; exp: number };

function secret() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Super user login is not configured on the server.");
  return key;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(`ems-super-user:${body}`).digest("base64url");
}

export function encodeSuCookie(payload: SuPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSuCookie(value: string | undefined): SuPayload | null {
  if (!value) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SuPayload;
    if (typeof payload.su !== "string" || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieOptions(httpOnly: boolean) {
  return { httpOnly, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SU_HOURS * 3600 };
}

type Service = ReturnType<typeof serviceClient>;

/** Is this account an administrator listed as a super user? Checked with the service key. */
export async function isSuperUser(service: Service, profileId: string) {
  const [{ data: su }, { data: role }] = await Promise.all([
    service.from("super_users").select("profile_id").eq("profile_id", profileId).maybeSingle(),
    service.from("user_roles").select("role").eq("profile_id", profileId).eq("role", "administrator").maybeSingle(),
  ]);
  return Boolean(su && role);
}

/** A one-time sign-in token for this email (no email is sent). */
export async function signInTokenFor(service: Service, email: string) {
  const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token || !data.user) {
    const message = error?.message ?? "";
    throw new Error(/not.*found|no user/i.test(message) ? "No account uses that email." : message || "Could not sign in as that user.");
  }
  return { tokenHash: data.properties.hashed_token, userId: data.user.id, email: data.user.email ?? email };
}

/** Where a user lands after signing in, the same order as the login page. */
export async function homePathFor(service: Service, profileId: string) {
  const { data } = await service.from("user_roles").select("role").eq("profile_id", profileId);
  const roles = new Set((data ?? []).map((row) => String(row.role)));
  if (roles.has("examiner")) return "/examiner/dashboard";
  if (roles.has("instructor") && !roles.has("applicant")) return "/instructor/dashboard";
  if (roles.has("applicant")) return "/applicant/dashboard";
  if (roles.has("administrator")) return "/admin/dashboard";
  return "/applicant/dashboard";
}
