"use client";

import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import { CmsMedia, listCmsMedia, uploadCmsMedia, updateCmsMedia } from "@/lib/api/cms";
import { apiErrorMessage } from "@/lib/api/client";
import { buttonClass, Field, inputClass } from "./Fields";

export function MediaPicker({ label = "Image", value, fallback = "", onChange, canUpload = true, mediaKind = "image" }: { label?: string; value?: string | null; fallback?: string; onChange: (id: string | null, url: string) => void; canUpload?: boolean; mediaKind?: "image" | "document" }) {
  const [media, setMedia] = useState<CmsMedia[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [alt, setAlt] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { let active = true; listCmsMedia().then((items) => { if (active) setMedia(items); }).catch(() => {}); return () => { active = false; }; }, []);
  const selected = media.find((item) => item.id === value);
  const url = selected?.file_url || fallback;
  const noun = mediaKind === "document" ? "document" : "image";
  return <div><p className="text-sm font-semibold">{label}</p>{url && (mediaKind === "image" ? <Image width={640} height={480} unoptimized src={url} alt={selected?.alt_text || label} className="mt-2 h-24 max-w-full rounded-lg bg-[var(--color-paper)] object-contain" /> : <a className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-sm font-semibold underline" href={url} target="_blank" rel="noreferrer"><span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded bg-white text-xs no-underline">PDF</span>{selected?.original_filename || "View selected PDF"}</a>)}
    <div className="mt-2 flex gap-2"><button type="button" className={buttonClass} onClick={() => { setError(""); dialog.current?.showModal(); listCmsMedia().then(setMedia).catch(() => setError("Could not load media. Try opening the library again.")); }}>Change {noun}</button>{(value || fallback) && <button type="button" className={buttonClass} onClick={() => onChange(null, "")}>Remove</button>}</div>
    <dialog ref={dialog} className="fixed inset-0 m-auto max-h-[85vh] w-[min(780px,92vw)] overflow-y-auto rounded-xl p-5 backdrop:bg-black/40" aria-label={`Choose a ${noun}`}>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-xl">{mediaKind === "document" ? "Document Library" : "Media Library"}</h2><button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>Close</button></div>
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      <label className="block text-sm font-semibold">Search {noun}s<input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      {canUpload && <div className="my-4 grid gap-3 rounded-lg bg-[var(--color-paper)] p-3 sm:grid-cols-2"><Field label={mediaKind === "document" ? "Document description" : "Image description (alt text)"} value={alt} onChange={setAlt} /><label className="text-sm font-semibold">Upload new {noun}<input type="file" accept={mediaKind === "document" ? "application/pdf" : "image/png,image/jpeg,image/webp,image/gif,image/x-icon"} disabled={busy} className="mt-2 block w-full" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); setError(""); try { const form = new FormData(); form.append("file", file); const asset = await uploadCmsMedia(form); if (alt) await updateCmsMedia(asset.id, { alt_text: alt }); setMedia(await listCmsMedia()); onChange(asset.id, asset.file_url); dialog.current?.close(); } catch (reason) { setError(apiErrorMessage(reason, `Upload failed. Please try again.`)); } finally { setBusy(false); } }} /></label></div>}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">{media.filter((item) => item.kind === mediaKind && item.status === "ready" && (item.original_filename + item.alt_text).toLowerCase().includes(query.toLowerCase())).map((item) => <button type="button" key={item.id} className="rounded-lg border p-2 text-left hover:border-[var(--color-accent)]" onClick={() => { onChange(item.id, item.file_url); dialog.current?.close(); }}>{mediaKind === "image" ? <Image width={640} height={480} unoptimized src={item.file_url} alt={item.alt_text || item.original_filename} className="h-20 w-full object-contain" /> : <span className="grid h-20 place-items-center rounded bg-[var(--color-paper)] text-xs font-bold">PDF</span>}<span className="mt-1 block truncate text-xs">{item.original_filename}</span></button>)}</div>
      {!media.some((item) => item.kind === mediaKind && item.status === "ready") && <p className="mt-5 text-sm">No {noun}s yet.</p>}
    </dialog>
  </div>;
}
