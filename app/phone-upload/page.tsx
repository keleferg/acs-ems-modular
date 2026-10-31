"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

// Phone page for "Use my phone" on a qualification requirement card (Kele, Oct 31 2026).
// Opened from the QR code; no sign-in. The token in the link allows uploads to one card for 30 minutes.

const BUCKET = "qualification-evidence";
const MAX_EDGE = 2400;

type Info = { title: string; description: string; expiresAt: string; remaining: number };

// Phone photos are large; shrink them before uploading so they go up quickly on mobile data.
async function prepare(file: File): Promise<{ blob: Blob; type: string; name: string }> {
  if (file.type === "application/pdf") return { blob: file, type: file.type, name: file.name };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob) return { blob, type: "image/jpeg", name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } catch {
    // Fall back to the original file.
  }
  return { blob: file, type: file.type || "image/jpeg", name: file.name };
}

export default function PhoneUploadPage() {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    setToken(t);
    void fetch(`/api/qualification/phone-upload?t=${encodeURIComponent(t)}`)
      .then((response) => response.json())
      .then((result) => (result.ok ? setInfo(result) : setError(result.error ?? "This link is not valid.")))
      .catch(() => setError("This link could not be opened. Check your connection and try again."));
  }, []);

  async function call(body: Record<string, unknown>) {
    const response = await fetch("/api/qualification/phone-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ t: token, ...body }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error ?? "Upload failed.");
    return result;
  }

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      for (const original of Array.from(list)) {
        const file = await prepare(original);
        const start = await call({ action: "start", fileName: file.name, mimeType: file.type, size: file.blob.size });
        const { error: storageError } = await supabase.storage.from(BUCKET).uploadToSignedUrl(start.path, start.uploadToken, file.blob, { contentType: file.type });
        if (storageError) throw new Error(storageError.message);
        await call({ action: "finish", path: start.path, fileName: file.name, mimeType: file.type, caption });
        setUploaded((current) => [...current, file.name]);
      }
      setCaption("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (camera.current) camera.current.value = "";
      if (files.current) files.current.value = "";
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-8 text-slate-900">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Pretest Qualification</p>
      <h1 className="mt-2 text-2xl font-bold">{info ? info.title : "Upload from your phone"}</h1>

      {!info && !error ? <p className="mt-6 flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Opening…</p> : null}

      {info ? (
        <>
          {info.description ? <p className="mt-2 text-sm text-slate-600">{info.description}</p> : null}
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            Take a clear, well-lit picture of the whole page. The pictures appear on your computer in a few seconds.
          </p>

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Caption / entry date / page (optional)
            <input value={caption} disabled={busy} onChange={(event) => setCaption(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base" />
          </label>

          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(event) => void upload(event.target.files)} />
          <input ref={files} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={(event) => void upload(event.target.files)} />

          <div className="mt-5 grid gap-3">
            <button type="button" disabled={busy} onClick={() => camera.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} {busy ? "Uploading…" : "Take Photo"}
            </button>
            <button type="button" disabled={busy} onClick={() => files.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-4 text-base font-semibold text-sky-800 disabled:opacity-50">
              <ImagePlus className="h-5 w-5" /> Choose from photos or files
            </button>
          </div>

          {uploaded.length ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 font-bold text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Uploaded {uploaded.length} {uploaded.length === 1 ? "file" : "files"}</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">{uploaded.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul>
              <p className="mt-3 text-sm text-emerald-900">Take another, or go back to your computer to check the item and save it.</p>
            </div>
          ) : null}

          <p className="mt-6 text-xs text-slate-500">
            This link works for 30 minutes (until {new Date(info.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}). Pictures are private to your qualification package and are deleted after your practical test.
          </p>
        </>
      ) : null}

      {error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    </main>
  );
}
