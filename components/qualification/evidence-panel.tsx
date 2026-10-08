"use client";
// Private signed URLs and local blob URLs must not pass through the image optimizer.
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localEvidence, type Evidence } from "@/lib/qualification/local-evidence";

const BUCKET = "qualification-evidence";
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const TYPES = ACCEPT.split(",");
const MAX_SIZE = 15 * 1024 * 1024;
export function EvidencePanel({ revisionId, requirementId, editable = false, preview = false, required = false, instruction, onCount }: {
  revisionId: string; requirementId: string; editable?: boolean; preview?: boolean; required?: boolean;
  instruction?: string;
  onCount?: (requirementId: string, count: number) => void;
}) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Evidence[]>([]);
  const [showExisting, setShowExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try {
      let rows: Evidence[];
      if (preview) rows = (await localEvidence.list()).filter((row) => row.revision_id === revisionId);
      else {
        const result = await createClient().from("qualification_evidence").select("*").eq("revision_id", revisionId).order("created_at");
        if (result.error) throw result.error;
        rows = result.data ?? [];
      }
      const attached = rows.filter((row) => row.requirement_id === requirementId);
      setItems(attached);
      const seen = new Set(attached.map((row) => row.object_path));
      setExisting(rows.filter((row) => { if (seen.has(row.object_path)) return false; seen.add(row.object_path); return true; }));
      onCount?.(requirementId, attached.length);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Evidence could not be loaded. Database setup may be needed."); }
  }, [preview, revisionId, requirementId, onCount]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    const supabase = preview ? null : createClient();
    void Promise.all(items.map(async (item) => {
      if (preview && item.blob) {
        const url = URL.createObjectURL(item.blob); objectUrls.push(url); return [item.id, url];
      }
      const result = await supabase?.storage.from(BUCKET).createSignedUrl(item.object_path, 600);
      return [item.id, result?.data?.signedUrl ?? ""];
    })).then((entries) => { if (active) setUrls(Object.fromEntries(entries)); });
    return () => { active = false; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [items, preview]);
  async function upload(files: FileList | null) {
    if (!files || !editable) return;
    setBusy(true); setError("");
    try {
      const supabase = preview ? null : createClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (!preview && !user) throw new Error("Please sign in again before uploading.");
      for (const file of Array.from(files)) {
        if (!TYPES.includes(file.type)) throw new Error(`${file.name}: use JPG, PNG, WebP, or PDF. Export HEIC pictures as JPG first.`);
        if (!file.size || file.size > MAX_SIZE) throw new Error(`${file.name}: file must be between 1 byte and 15 MB.`);
        const id = crypto.randomUUID();
        const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
        const path = `${user?.id ?? "local"}/${revisionId}/${id}.${extension}`;
        const evidence: Evidence = { id, revision_id: revisionId, requirement_id: requirementId, object_path: path, file_name: file.name, mime_type: file.type, caption, created_at: new Date().toISOString() };
        if (preview) await localEvidence.put({ ...evidence, blob: file });
        else if (supabase) {
          const stored = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
          if (stored.error) throw new Error(stored.error.message);
          const inserted = await supabase.from("qualification_evidence").insert(evidence);
          if (inserted.error) {
            await supabase.storage.from(BUCKET).remove([path]);
            throw new Error(inserted.error.message);
          }
        }
      }
      setCaption("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
    finally { await load(); setBusy(false); if (fileInput.current) fileInput.current.value = ""; if (cameraInput.current) cameraInput.current.value = ""; }
  }
  async function reuse(item: Evidence) {
    if (!editable) return;
    setBusy(true); setError("");
    try {
      const next = { ...item, id: crypto.randomUUID(), requirement_id: requirementId, caption: caption || item.caption, created_at: new Date().toISOString() };
      if (preview) await localEvidence.put(next);
      else {
        const result = await createClient().from("qualification_evidence").insert(next);
        if (result.error) throw new Error(result.error.message);
      }
      setShowExisting(false); setCaption(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not link upload."); }
    finally { setBusy(false); }
  }
  async function remove(item: Evidence) {
    if (!editable) return;
    setBusy(true); setError("");
    try {
      if (preview) await localEvidence.remove(item.id);
      else {
        const result = await createClient().from("qualification_evidence").delete().eq("id", item.id).select("id");
        if (result.error || !result.data?.length) throw new Error(result.error?.message ?? "This attachment is locked or no longer editable.");
        // Keep stored objects: other requirements or immutable revisions can share them.
      }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove upload."); }
    finally { setBusy(false); }
  }
  return <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4" aria-label="Supporting evidence">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold text-slate-900">Supporting pictures / documents {required ? <span className="text-red-700">· Required</span> : null}</h4><span className="text-xs text-slate-600">{items.length} attached · Review pending</span></div>
    {editable ? <><p className="mt-2 text-xs text-slate-500">{instruction ?? "Attach the endorsement or logbook entries for this requirement."} Multiple JPG, PNG, WebP pictures or PDFs; up to 15 MB each.</p><label className="mt-3 block text-sm text-slate-700">Caption / entry date / page (optional)<input value={caption} disabled={busy} onChange={(event) => setCaption(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="mt-3 flex flex-wrap gap-2">
      <input ref={fileInput} type="file" multiple accept={ACCEPT} hidden onChange={(event) => void upload(event.target.files)} />
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => void upload(event.target.files)} />
      <button type="button" disabled={busy} onClick={() => cameraInput.current?.click()} className="rounded-lg border border-sky-300 px-3 py-2 text-sm font-semibold text-sky-800 disabled:opacity-50">Take Photo</button>
      <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Upload Pictures / PDF"}</button>
      <button type="button" disabled={busy} onClick={() => { setShowExisting(!showExisting); void load(); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Use Existing Upload</button>
    </div></> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {showExisting ? <div className="mt-3 rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Reuse an upload from another requirement in this revision.</p>{existing.length ? existing.map((item) => <button key={item.id} type="button" disabled={busy} onClick={() => void reuse(item)} className="mt-2 block text-sm text-sky-800 underline">{item.file_name}{item.caption ? ` — ${item.caption}` : ""}</button>) : <p className="mt-2 text-sm">No other uploads available.</p>}</div> : null}
    <div className="mt-3 grid gap-3 sm:grid-cols-3">{items.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200 p-2">
      {urls[item.id] ? <a href={urls[item.id]} target="_blank" rel="noreferrer" className="block text-sm text-sky-800 underline">{item.mime_type.startsWith("image/") ? <img src={urls[item.id]} alt={item.caption || item.file_name} className="mb-2 h-28 w-full rounded object-contain" /> : <span className="mb-2 flex h-20 items-center justify-center rounded bg-slate-100 font-semibold">PDF · Open document</span>}<span className="break-words">{item.file_name}</span></a> : <p className="break-words text-sm text-slate-600">{item.file_name} · Preview unavailable; reload to retry.</p>}
      {item.caption ? <p className="mt-1 text-xs text-slate-500">{item.caption}</p> : null}
      {editable ? <button type="button" disabled={busy} onClick={() => void remove(item)} className="mt-2 text-xs font-semibold text-red-700 disabled:opacity-50">Remove attachment</button> : null}
    </div>)}</div>
    <p className="mt-2 text-xs text-slate-500">{preview ? "Saved only in this browser for local testing." : "Private uploads visible to authorized reviewers."} An attachment does not verify the requirement.</p>
  </section>;
}
