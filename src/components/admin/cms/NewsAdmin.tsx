"use client";

import { useUnsavedChanges } from "./useUnsavedChanges";
import { Icon } from "@/components/ui/Icon";

import { useEffect, useRef, useState } from "react";
import { CmsArticle, CmsArticleDraft, CmsCategory, CmsPublicArticle, createCmsArticle, createCmsCategory, deleteCmsArticle, getCmsArticle, listCmsArticles, listCmsCategories, publishCmsArticle, saveCmsArticleDraft } from "@/lib/api/cms";
import { ArticlePage } from "@/components/cms/ArticlePage";
import { CmsAccess } from "../CmsAdmin";
import { Area, buttonClass, Field, inputClass, Panel, primaryClass, RichText } from "./Fields";
import { MediaPicker } from "./MediaPicker";

const blank = (): CmsArticleDraft => ({ slug: "", content_type: "news", categories: [], primary_category: null, author_display_name: "", title: "", standfirst: "", body: "", cover_media: null, gallery_media: [], seo_title: "", seo_description: "", change_summary: "" });
const slugOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
export function NewsAdmin({ access }: { access: CmsAccess }) {
  const [items, setItems] = useState<CmsArticle[]>([]);
  const [categories, setCategories] = useState<CmsCategory[]>([]);
  const [selected, setSelected] = useState<CmsArticle | null>(null);
  const [draft, setDraft] = useState<CmsArticleDraft | null>(null);
  const [query, setQuery] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<CmsPublicArticle | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { let active = true; Promise.all([listCmsArticles(), listCmsCategories()]).then(([articles, groups]) => { if (active) { setItems(articles); setCategories(groups); } }).catch(() => { if (active) setError("Could not load news."); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, []);
  useUnsavedChanges(dirty);
  const load = (article: CmsArticle) => { const rev = article.current_draft_revision || article.published_revision; setSelected(article); setDraft({ ...blank(), slug: article.slug, content_type: article.content_type, author_display_name: article.author_display_name, categories: article.categories?.map((c) => c.id) || [], primary_category: article.primary_category?.id || null, title: rev?.title || "", standfirst: rev?.standfirst || "", body: rev?.body || "", cover_media: rev?.cover_media?.id || null, gallery_media: rev?.gallery_media?.map((media) => media.id) || [], seo_title: rev?.seo_title || "", seo_description: rev?.seo_description || "" }); };
  const change = (patch: Partial<CmsArticleDraft>) => { setDraft((d) => d ? { ...d, ...patch } : d); setDirty(true); setNotice(""); };
  async function save(action: string) {
    if (!draft || !form.current?.reportValidity()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let article = selected;
      const payload = { ...draft, slug: draft.slug || slugOf(draft.title) };
      let number: number;
      if (!article) { article = await createCmsArticle(payload); setSelected(article); number = article.current_draft_revision_number!; change({ slug: article.slug }); }
      else number = (await saveCmsArticleDraft(article.id, payload)).number;
      if (action === "publish" || (action === "save" && article.published_revision_number)) await publishCmsArticle(article.id, number);
      const updated = await getCmsArticle(article.id); load(updated); setDirty(false); setItems(await listCmsArticles());
      if (action === "preview") { const rev = updated.current_draft_revision || updated.published_revision; if (rev) { setPreview({ id: updated.id, slug: updated.slug, content_type: updated.content_type, author_display_name: updated.author_display_name, category: updated.primary_category, published_at: updated.published_revision?.published_at || null, revision: rev }); dialog.current?.showModal(); } setNotice("Draft saved. Preview is private."); }
      else setNotice(action === "draft" || (action === "save" && !article.published_revision_number) ? "Draft saved successfully." : "Changes saved successfully.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save news."); } finally { setBusy(false); }
  }
  async function remove(article = selected) {
    if (!article || !window.confirm(`Remove “${article.live_title || article.slug}”? It will no longer appear on the public News page.`)) return;
    setBusy(true); setError(""); setNotice("");
    try { await deleteCmsArticle(article.id); setItems(await listCmsArticles()); if (selected?.id === article.id) { setSelected(null); setDraft(null); setDirty(false); } }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove this news item."); }
    finally { setBusy(false); }
  }
  if (!draft) return <div className="max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><label className="text-sm font-semibold">Search news<input className={inputClass} type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>{access.manage && <button className={primaryClass} onClick={() => { setSelected(null); setDraft(blank()); setError(""); setNotice(""); }}>+ Create News</button>}</div>{error && <p role="alert" className="mt-4 text-red-700">{error}</p>}<div className="mt-5 max-h-[60vh] overflow-auto rounded-xl border bg-white">{items.filter((item) => (item.live_title || item.slug).toLowerCase().includes(query.toLowerCase())).map((item) => <div key={item.id} className="flex items-center gap-3 border-b px-5 py-2 hover:bg-[var(--color-paper)]"><button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-4 py-2 text-left" disabled={busy} onClick={async () => { setBusy(true); try { load(await getCmsArticle(item.id)); } catch { setError("Could not load this article."); } finally { setBusy(false); } }}><strong className="truncate">{item.live_title || item.slug.replaceAll("-", " ")}</strong><span className="shrink-0 text-xs">{item.published_revision_number ? "Published" : "Draft"}</span></button>{access.manage && <button type="button" className="shrink-0 text-sm font-semibold text-red-700 underline disabled:opacity-50" disabled={busy} onClick={() => void remove(item)} aria-label={`Delete ${item.live_title || item.slug}`}>Delete</button>}</div>)}{!items.length && <p className="p-5 text-sm">{busy ? "Loading news…" : "No news yet."}</p>}</div></div>;
  return <div className="max-w-5xl"><button type="button" className="mb-5 text-sm font-semibold" onClick={() => { if (!dirty || window.confirm("Leave without saving your changes?")) { setDraft(null); setDirty(false); setError(""); setNotice(""); } }}><Icon name="arrow-left" className="h-4 w-4" /> Back to News</button><form ref={form} className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("save"); }}>
    <fieldset disabled={busy || !access.manage} className="space-y-4"><Panel title={selected ? "Edit News" : "Create News"} open><Field label="Title" value={draft.title} required onChange={(title) => change({ title })} /><MediaPicker label="Featured Image" value={draft.cover_media} onChange={(cover_media) => change({ cover_media })} canUpload={access.manage} /><div className="rounded-lg border border-[var(--color-line)] p-4"><h2 className="text-sm font-semibold">Additional gallery images</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Add as many supporting photos as needed. They appear below the article content.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{draft.gallery_media.map((mediaId, index) => <MediaPicker key={mediaId} label={`Gallery image ${index + 1}`} value={mediaId} onChange={(nextId) => change({ gallery_media: nextId ? draft.gallery_media.map((id) => id === mediaId ? nextId : id) : draft.gallery_media.filter((id) => id !== mediaId) })} canUpload={access.manage} />)}</div><div className="mt-4"><MediaPicker label="Add gallery image" value={null} onChange={(mediaId) => { if (mediaId && !draft.gallery_media.includes(mediaId)) change({ gallery_media: [...draft.gallery_media, mediaId] }); }} canUpload={access.manage} /></div></div><label className="block text-sm font-semibold">Category<select value={draft.primary_category || ""} className={inputClass} onChange={(e) => change({ primary_category: e.target.value || null, categories: e.target.value ? [e.target.value] : [] })}><option value="">No category</option>{categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {access.manage && <details><summary className="cursor-pointer text-sm">Add a category</summary><div className="mt-3 flex items-end gap-2"><Field label="Category name" value={categoryName} onChange={setCategoryName} /><button type="button" className={buttonClass} disabled={!categoryName.trim() || busy} onClick={async () => { setBusy(true); try { const category = await createCmsCategory({ name: categoryName, slug: slugOf(categoryName), taxonomy: "news", description: "", position: 0, is_active: true }); setCategories([...categories, category]); change({ primary_category: category.id, categories: [category.id] }); setCategoryName(""); } catch { setError("Could not add category. This name may already exist."); } finally { setBusy(false); } }}>Add</button></div></details>}
    <Area label="Excerpt" value={draft.standfirst} onChange={(standfirst) => change({ standfirst })} /><Field label="Author" value={draft.author_display_name} onChange={(author_display_name) => change({ author_display_name })} />{access.manage ? <RichText label="Article Content" value={draft.body} onChange={(body) => change({ body })} /> : <p>{draft.body.replace(/<[^>]*>/g, "")}</p>}</Panel><Panel title="Search engine settings"><Field label="Meta Title" value={draft.seo_title} onChange={(seo_title) => change({ seo_title })} /><Area label="Meta Description" value={draft.seo_description} onChange={(seo_description) => change({ seo_description })} /></Panel></fieldset>
    {access.manage && <div className="sticky bottom-0 rounded-xl border bg-white/95 p-4">{error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mb-3 text-sm text-emerald-800">{notice}</p>}<div className="flex flex-wrap items-center justify-between gap-2">{selected ? <button type="button" className="text-sm font-semibold text-red-700 underline disabled:opacity-50" disabled={busy} onClick={() => void remove()}>Remove news</button> : <span />}<div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => void save("draft")}>Save Draft</button><button type="button" className={buttonClass} disabled={busy} onClick={() => void save("preview")}>Preview</button>{!selected?.published_revision_number && <button type="button" className={buttonClass} disabled={busy} onClick={() => void save("publish")}>Publish</button>}<button className={primaryClass} disabled={busy}>Save Changes</button></div></div></div>}
  </form><dialog ref={dialog} aria-label="News preview" className="fixed inset-0 m-auto max-h-[90vh] w-[min(1200px,96vw)] overflow-auto rounded-xl backdrop:bg-black/50"><div className="sticky top-0 flex items-center justify-between bg-amber-100 p-4"><span>Private preview</span><button className={buttonClass} onClick={() => dialog.current?.close()}>Close preview</button></div>{preview && <ArticlePage article={preview} />}</dialog></div>;
}
