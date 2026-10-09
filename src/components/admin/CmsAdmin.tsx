"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CmsPage, listCmsPages } from "@/lib/api/cms";
import { ApiError, apiRequestAt } from "@/lib/api/client";
import { PageEditor } from "./cms/PageEditor";
import { NewsAdmin } from "./cms/NewsAdmin";
import { MediaAdmin, NavigationAdmin, SettingsAdmin } from "./cms/WebsiteTools";
import { inputClass } from "./cms/Fields";
import { Icon } from "@/components/ui/Icon";

export type CmsAccess = { manage: boolean; areas: string[]; read_only: boolean };
export function CmsAdmin({ pageSlug, view = "pages" }: { pageSlug?: string; view?: string }) {
  const [access, setAccess] = useState<CmsAccess | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    apiRequestAt<CmsAccess>("/api/v2/cms/staff/access/").then((data) => {
      if (active) setAccess(data);
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
        setError("Your admin session could not be verified. Please sign in again with your admin account.");
      } else if (reason instanceof ApiError && reason.status === 404) {
        setError("The CMS service is out of date. Restart the backend server, then try again.");
      } else {
        setError("The CMS service could not be reached. Please try again shortly.");
      }
    });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <div role="alert" className="mt-6 rounded-lg bg-red-50 p-5"><p>{error}</p><button type="button" className="mt-3 text-sm font-semibold underline" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Try again</button></div>;
  if (!access) return <p className="mt-6">Loading content…</p>;
  return <div className="mt-6">{access.read_only && <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm">You have view-only access.</p>}
    {view === "pages" ? pageSlug === "footer" ? <SettingsAdmin access={access} /> : pageSlug ? <PageEditor key={pageSlug} slug={pageSlug} access={access} /> : <Pages /> : view === "news" ? <NewsAdmin access={access} /> : view === "media" ? <MediaAdmin access={access} /> : view === "navigation" ? <NavigationAdmin access={access} /> : <SettingsAdmin access={access} />}
  </div>;
}
function Pages() {
  const [pages, setPages] = useState<CmsPage[] | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; listCmsPages().then((items) => { if (active) setPages(items); }).catch(() => { if (active) setError("Could not load pages. Refresh to try again."); }); return () => { active = false; }; }, []);
  const filtered = (pages || []).filter((item) => !item.path.startsWith("/_cms/home-") && (item.label + item.path).toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.slug === "home" ? -1 : b.slug === "home" ? 1 : a.label.localeCompare(b.label));
  return <div className="max-w-5xl"><p className="mb-5 text-sm text-[var(--color-slate)]">Select a page to edit its text, images and sections.</p><Link href="/admin/content/footer" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[var(--color-accent)] bg-[var(--color-paper)] px-5 py-4 hover:bg-white"><span><strong className="block">Site footer</strong><span className="mt-1 block text-xs text-[var(--color-slate)]">Edit the footer shown across all public pages</span></span><span className="inline-flex items-center gap-1 text-sm font-semibold">Edit <Icon name="arrow-right" className="h-4 w-4" /></span></Link><label className="block text-sm font-semibold">Search pages<input type="search" className={inputClass + " mb-5 max-w-lg block"} placeholder="Search pages…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></label>
    {error && <p role="alert">{error}</p>}{!pages && !error && <p>Loading pages…</p>}
    <div className="divide-y divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">{filtered.slice(page * 10, page * 10 + 10).map((item) => <Link key={item.id} href={`/admin/content/${encodeURIComponent(item.slug)}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-paper)]"><span><strong className="block">{item.label}</strong><span className="mt-1 block text-xs text-[var(--color-slate)]">{item.path === "/" ? "Homepage" : item.path}</span></span><span className="flex items-center gap-5"><span className="hidden text-xs text-[var(--color-slate)] sm:inline">{item.published_revision_number ? "Published" : "Draft"}</span><span className="inline-flex items-center gap-1 text-sm font-semibold">Edit <Icon name="arrow-right" className="h-4 w-4" /></span></span></Link>)}{pages && !filtered.length && <p className="p-5 text-sm">No pages found.</p>}</div>
    {filtered.length > 10 && <div className="mt-4 flex items-center justify-between text-sm"><button disabled={!page} onClick={() => setPage(page - 1)} className="inline-flex items-center gap-1 disabled:opacity-40"><Icon name="arrow-left" className="h-4 w-4" /> Previous</button><span>{page + 1} of {Math.ceil(filtered.length / 10)}</span><button disabled={(page + 1) * 10 >= filtered.length} onClick={() => setPage(page + 1)} className="inline-flex items-center gap-1 disabled:opacity-40">Next <Icon name="arrow-right" className="h-4 w-4" /></button></div>}
  </div>;
}
