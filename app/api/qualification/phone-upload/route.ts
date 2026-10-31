import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// "Use my phone" uploads for a qualification requirement card (Kele, Oct 31 2026).
// The phone is not signed in: every call carries the QR token, which is checked against
// qualification_phone_upload_tokens (hash, card, 30-minute expiry, 20 uploads) and the package
// must still be editable. Files go straight from the phone to storage through a signed upload URL.

const BUCKET = "qualification-evidence";
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_SIZE = 15 * 1024 * 1024;
const MAX_UPLOADS = 20;
const EDITABLE = new Set(["available", "applicant_in_progress", "instructor_changes_required"]);

type TokenRow = {
  id: string;
  revision_id: string;
  requirement_id: string;
  applicant_user_id: string;
  expires_at: string;
  upload_count: number;
};

function service() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Phone upload is not configured on the server.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function checkToken(supabase: ReturnType<typeof service>, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return { error: "This link is not valid." };
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await supabase
    .from("qualification_phone_upload_tokens")
    .select("id, revision_id, requirement_id, applicant_user_id, expires_at, upload_count")
    .eq("token_hash", hash)
    .maybeSingle();
  const row = data as TokenRow | null;
  if (!row) return { error: "This link is not valid." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { error: "This link has expired. Open a new QR code on your computer." };

  const { data: revision } = await supabase
    .from("qualification_wizard_revisions")
    .select("id, revision_number, is_locked, wizard_id, qualification_wizards!inner ( status, current_revision_number, available_at )")
    .eq("id", row.revision_id)
    .maybeSingle();
  const wizard = (revision as unknown as { qualification_wizards?: { status: string; current_revision_number: number; available_at: string } } | null)?.qualification_wizards;
  if (
    !revision ||
    revision.is_locked ||
    !wizard ||
    wizard.current_revision_number !== revision.revision_number ||
    !EDITABLE.has(wizard.status) ||
    new Date(wizard.available_at).getTime() > Date.now()
  ) {
    return { error: "This qualification package can no longer be changed." };
  }

  const { data: requirement } = await supabase
    .from("qualification_requirements")
    .select("title, description")
    .eq("id", row.requirement_id)
    .maybeSingle();
  return { row, requirement };
}

export async function GET(request: Request) {
  try {
    const supabase = service();
    const token = new URL(request.url).searchParams.get("t") ?? "";
    const check = await checkToken(supabase, token);
    if ("error" in check) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });
    return NextResponse.json({
      ok: true,
      title: check.requirement?.title ?? "Requirement",
      description: check.requirement?.description ?? "",
      expiresAt: check.row.expires_at,
      uploads: check.row.upload_count,
      remaining: Math.max(0, MAX_UPLOADS - check.row.upload_count),
    });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = service();
    const body = (await request.json()) as {
      action?: string; t?: string; fileName?: string; mimeType?: string; size?: number; path?: string; caption?: string;
    };
    const check = await checkToken(supabase, String(body.t ?? ""));
    if ("error" in check) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });
    const { row } = check;
    const mimeType = String(body.mimeType ?? "");
    const folder = `${row.applicant_user_id}/${row.revision_id}/`;

    if (body.action === "start") {
      if (row.upload_count >= MAX_UPLOADS) return NextResponse.json({ ok: false, error: "Upload limit reached for this QR code." }, { status: 429 });
      if (!TYPES.has(mimeType)) return NextResponse.json({ ok: false, error: "Use a JPG, PNG or WebP picture, or a PDF." }, { status: 400 });
      if (!body.size || body.size > MAX_SIZE) return NextResponse.json({ ok: false, error: "The file must be under 15 MB." }, { status: 400 });
      const extension = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
      const path = `${folder}${randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "The upload could not be started.");
      return NextResponse.json({ ok: true, path, uploadToken: data.token });
    }

    if (body.action === "finish") {
      const path = String(body.path ?? "");
      if (!path.startsWith(folder) || path.slice(folder.length).includes("/")) {
        return NextResponse.json({ ok: false, error: "This upload does not belong to the link." }, { status: 400 });
      }
      const name = path.slice(folder.length);
      const { data: listed } = await supabase.storage.from(BUCKET).list(folder.slice(0, -1), { search: name, limit: 1 });
      if (!listed?.some((file) => file.name === name)) {
        return NextResponse.json({ ok: false, error: "The picture did not arrive. Please try again." }, { status: 400 });
      }
      const evidenceId = randomUUID();
      const { error } = await supabase.from("qualification_evidence").insert({
        id: evidenceId,
        revision_id: row.revision_id,
        requirement_id: row.requirement_id,
        object_path: path,
        file_name: String(body.fileName ?? name).slice(0, 200),
        mime_type: TYPES.has(mimeType) ? mimeType : "image/jpeg",
        caption: String(body.caption ?? "").slice(0, 300) || "Uploaded from phone",
        created_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      await supabase.from("qualification_phone_upload_tokens").update({ upload_count: row.upload_count + 1 }).eq("id", row.id);
      return NextResponse.json({ ok: true, evidenceId });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : "Something went wrong." }, { status: 500 });
  }
}
