"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const bucket = "qualification-photos";
const imageTypes = ["image/jpeg", "image/png", "image/webp"];

export function supportsRequirementPhotos(section: string) {
  return ["experience", "cross_country", "endorsements", "certification"].includes(section);
}

export default function RequirementPhotos({ wizardId, revisionId, requirementId, editable = false, active = false }: {
  wizardId: string;
  revisionId: string;
  requirementId: string;
  editable?: boolean;
  active?: boolean;
}) {
  const [photos, setPhotos] = useState<Array<{ name: string; url: string }>>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const folder = `${wizardId}/${revisionId}/${requirementId}`;

  const load = useCallback(async () => {
    const storage = createClient().storage.from(bucket);
    const { data, error: listError } = await storage.list(folder, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
    if (listError) { setError(listError.message); return; }
    const files = (data ?? []).filter((file) => file.id);
    if (!files.length) { setPhotos([]); setLoaded(true); return; }
    const { data: urls, error: urlError } = await storage.createSignedUrls(files.map((file) => `${folder}/${file.name}`), 3600);
    if (urlError) { setError(urlError.message); return; }
    setPhotos((urls ?? []).filter((photo) => photo.signedUrl).map((photo) => ({ name: photo.path?.split("/").pop() ?? "Photo", url: photo.signedUrl! })));
    setLoaded(true);
  }, [folder]);

  useEffect(() => { if (active) void load(); }, [active, load]);

  async function upload(file?: File) {
    if (!file || !editable || busy) return;
    setError("");
    if (!imageTypes.includes(file.type)) { setError("Choose a JPG, PNG, or WebP photo. If your phone uses HEIC, export it as JPG first."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Photos must be 10 MB or smaller."); return; }
    setBusy(true);
    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const { error: uploadError } = await createClient().storage.from(bucket).upload(`${folder}/${crypto.randomUUID()}.${extension}`, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo could not be uploaded. Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
    <p className="text-sm font-semibold text-slate-900">Requirement Photos</p>
    {editable && <>
      <p className="mt-1 text-sm text-slate-600">Photograph the relevant logbook entry or endorsement. Photos save immediately to this requirement.</p>
      <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => camera.current?.click()} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Uploading…" : "Take Photo"}</button>
        <button type="button" disabled={busy} onClick={() => picker.current?.click()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50">Upload Photo</button>
      </div>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <details className="mt-3" open={active || photos.length > 0} onToggle={(event) => { if (event.currentTarget.open && !loaded) void load(); }}>
      <summary className="cursor-pointer text-sm font-semibold text-sky-800">View uploaded photos{loaded ? ` (${photos.length})` : ""}</summary>
      {loaded && !photos.length && <p className="mt-2 text-sm text-slate-500">No photos uploaded for this requirement.</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{photos.map((photo, index) => <a key={photo.name} href={photo.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-200 p-2">
        {/* Private signed URLs are created on demand, rather than passed to an image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={`Requirement photo ${index + 1}`} className="max-h-64 w-full rounded object-contain" />
        <span className="mt-2 block text-sm text-sky-800">Open full-size photo {index + 1}</span>
      </a>)}</div>
    </details>
  </div>;
}
