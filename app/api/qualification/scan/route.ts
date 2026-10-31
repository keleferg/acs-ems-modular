import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Reads an uploaded qualification picture or PDF and returns the values it shows for the card's
// fields (dates first), when the examiner has turned on "Read uploaded pictures" in Settings.
// The applicant still reviews the filled-in values and saves the card; the result is also kept on
// the upload so the examiner can compare it with what was entered.

const BUCKET = "qualification-evidence";
const MAX_BYTES = 15 * 1024 * 1024;
const READABLE_TYPES = new Set(["date", "number", "text", "select"]);

type FieldInput = { key: string; label?: string; type?: string; options?: string[] };

const ScanSchema = z.object({
  readable: z.boolean(),
  document_type: z.string(),
  fields: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  notes: z.string(),
});

function normalizeDate(value: string) {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const us = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  let body: { evidenceId?: string; fields?: FieldInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const evidenceId = String(body.evidenceId ?? "");
  const fields = (Array.isArray(body.fields) ? body.fields : [])
    .filter((field) => field && typeof field.key === "string" && READABLE_TYPES.has(String(field.type ?? "text")))
    .slice(0, 20);
  if (!evidenceId) return NextResponse.json({ ok: false, error: "Missing upload." }, { status: 400 });

  // The applicant's own session decides access: row-level security only returns uploads they can read.
  const supabase = await createClient();
  const { data: evidence, error: evidenceError } = await supabase
    .from("qualification_evidence")
    .select("id, object_path, mime_type, file_name, revision_id, requirement_id")
    .eq("id", evidenceId)
    .maybeSingle();
  if (evidenceError || !evidence) {
    return NextResponse.json({ ok: false, error: "Upload not found." }, { status: 404 });
  }

  const { data: enabled } = await supabase.rpc("qualification_picture_scan_enabled", { p_revision_id: evidence.revision_id });
  if (!enabled) return NextResponse.json({ ok: true, enabled: false });
  if (fields.length === 0) return NextResponse.json({ ok: true, enabled: true, values: {} });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !serviceKey) {
    return NextResponse.json({ ok: false, enabled: true, error: "Picture reading is not configured on the server." }, { status: 503 });
  }
  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: requirement } = await service
    .from("qualification_requirements")
    .select("title, description")
    .eq("id", evidence.requirement_id)
    .maybeSingle();

  try {
    const { data: blob, error: downloadError } = await service.storage.from(BUCKET).download(evidence.object_path);
    if (downloadError || !blob) throw new Error("The upload could not be read.");
    const bytes = await blob.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error("The upload is empty or too large to read.");
    const dataUrl = `data:${evidence.mime_type};base64,${Buffer.from(bytes).toString("base64")}`;
    const isPdf = evidence.mime_type === "application/pdf";

    const fieldList = fields
      .map((field) => `- ${field.key} (${field.type ?? "text"}): ${field.label ?? field.key}${field.options?.length ? ` — one of: ${field.options.join(" | ")}` : ""}`)
      .join("\n");

    const model = process.env.OPENAI_QUALIFICATION_MODEL?.trim() || process.env.OPENAI_POA_MODEL?.trim() || "gpt-5.6";
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.parse({
      model,
      input: [
        {
          role: "system",
          content:
            "You read pilot documents (FAA certificates, medical certificates, knowledge test reports, photo IDs, logbook endorsements and logbook pages) for a practical-test qualification check. " +
            "Return only values that are clearly shown on the document. Never guess or infer a value that is not visible. " +
            "Dates must be YYYY-MM-DD. For logbook pages, use the most recent qualifying entry for dates and the page totals for hours when the field asks for hours. " +
            "For a select field, return one of the listed options exactly, or leave it out. Leave out any field you cannot read. " +
            "For an FAA Airman Knowledge Test Report: the name and Applicant ID exactly as printed; the exam as the whole printed line including the code in parentheses (e.g. PRIVATE PILOT AIRPLANE (PAR)); " +
            "the expiration date printed on the report; and every learning statement code listed, exactly as printed, separated by single spaces (leave it out if none are listed).",
        },
        {
          role: "user",
          content: [
            isPdf
              ? { type: "input_file", filename: evidence.file_name || "document.pdf", file_data: dataUrl }
              : { type: "input_image", image_url: dataUrl, detail: "high" },
            {
              type: "input_text",
              text: `Requirement: ${requirement?.title ?? ""}\n${requirement?.description ?? ""}\n\nFields to fill (key, type, label):\n${fieldList}`,
            },
          ],
        },
      ],
      text: { format: zodTextFormat(ScanSchema, "qualification_scan") },
    });

    const scan = response.output_parsed;
    if (!scan) throw new Error("The picture could not be read.");

    const allowed = new Map(fields.map((field) => [field.key, field]));
    const values: Record<string, string> = {};
    for (const item of scan.fields) {
      const field = allowed.get(item.key);
      if (!field || item.confidence === "low" || !item.value.trim()) continue;
      if (field.type === "date") {
        const date = normalizeDate(item.value);
        if (date) values[item.key] = date;
      } else if (field.type === "number") {
        const number = Number(item.value.replace(/[^0-9.]/g, ""));
        if (Number.isFinite(number)) values[item.key] = String(number);
      } else if (field.type === "select") {
        if (field.options?.includes(item.value)) values[item.key] = item.value;
      } else {
        values[item.key] = item.value.trim();
      }
    }

    const result = { document_type: scan.document_type, readable: scan.readable, values, notes: scan.notes, model };
    await service
      .from("qualification_evidence")
      .update({ scan_status: Object.keys(values).length ? "read" : "nothing_found", scan_result: result, scanned_at: new Date().toISOString() })
      .eq("object_path", evidence.object_path);

    return NextResponse.json({ ok: true, enabled: true, values, documentType: scan.document_type });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The picture could not be read.";
    await service
      .from("qualification_evidence")
      .update({ scan_status: "failed", scan_result: { error: message }, scanned_at: new Date().toISOString() })
      .eq("id", evidence.id);
    return NextResponse.json({ ok: false, enabled: true, error: message }, { status: 502 });
  }
}
