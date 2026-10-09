"use client";

import { useUnsavedChanges } from "./useUnsavedChanges";
import { Icon } from "@/components/ui/Icon";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CmsPage, CmsPageDraft, CmsPageRevision, deleteCmsPage, getCmsPage, listCmsPages, pageRevisionAction, saveCmsPageDraft } from "@/lib/api/cms";
import { ApiError } from "@/lib/api/client";
import { CmsRevisionRenderer } from "@/components/cms/CmsPublishedRoute";
import { CmsAccess } from "../CmsAdmin";
import { Area, buttonClass, Field, Panel, primaryClass, RichText } from "./Fields";
import { MediaPicker } from "./MediaPicker";
import { PageCopyFields, Sections } from "./Sections";
import { BuiltInSections } from "./BuiltInSections";
import { layoutSlot, replaceSectionGroup } from "@/lib/cms/sectionVisibility";

function draftOf(page: CmsPage): CmsPageDraft {
  const revision = page.current_draft_revision || page.published_revision;
  return { label: page.label, path: page.path, slug: page.slug, template_key: page.template_key, eyebrow: revision?.eyebrow || "", title: revision?.title || "", summary: revision?.summary || "", body: revision?.body || "", seo_title: revision?.seo_title || "", seo_description: revision?.seo_description || "", canonical_path: revision?.canonical_path || "", robots: revision?.robots || "index,follow", social_image: revision?.social_image?.id || null, sections: revision?.sections.map((section) => ({ slot: section.slot, section_type: section.section_type, position: section.position, data: section.data, primary_media: section.primary_media?.id || null, is_enabled: section.is_enabled })) || [], change_summary: "", base_revision_number: revision?.number };
}
export function PageEditor({ slug, access }: { slug: string; access: CmsAccess }) {
  const router = useRouter();
  const [record, setRecord] = useState<CmsPage | null>(null);
  const [draft, setDraft] = useState<CmsPageDraft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<CmsPageRevision | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    let active = true;
    listCmsPages().then((pages) => { const page = pages.find((item) => item.slug === slug); if (!page) throw new Error("This page was not found."); return getCmsPage(page.id); }).then((page) => { if (active) { setRecord(page); setDraft(draftOf(page)); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load this page."); });
    return () => { active = false; };
  }, [slug]);
  useUnsavedChanges(dirty);
  const change = (patch: Partial<CmsPageDraft>) => { setDraft((current) => current ? { ...current, ...patch } : current); setDirty(true); setNotice(""); };
  async function removePage() {
    if (!record || !window.confirm(`Remove “${record.label}” from the CMS? Its revision history will be retained, but the page will no longer be available through the CMS.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await deleteCmsPage(record.id);
      router.replace("/admin/content");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove this page. Please try again.");
      setBusy(false);
    }
  }
  async function save(action: "save" | "draft" | "preview" | "publish") {
    if (!record || !draft || !form.current?.reportValidity()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await saveCmsPageDraft(record.id, { ...draft, sections: draft.sections.map((section, position) => ({ ...section, position })) });
      // Refresh the conflict token even if publishing or preview subsequently fails.
      change({ base_revision_number: saved.number });
      if (action === "publish" || (action === "save" && record.published_revision_number)) await pageRevisionAction(record.id, saved.number, "publish");
      const updated = await getCmsPage(record.id);
      setRecord(updated); setDraft(draftOf(updated)); setDirty(false);
      if (action === "preview") {
        if (record.template_key === "legacy") {
          const result = await pageRevisionAction(record.id, saved.number, "preview");
          if ("token" in result) setPreviewUrl(record.path + "?cmsPreview=" + encodeURIComponent(result.revision.id) + "&token=" + encodeURIComponent(result.token));
        } else setPreview(updated.current_draft_revision || saved);
        dialog.current?.showModal(); setNotice("Draft saved. Preview is private.");
      }
      else setNotice(action === "draft" || (action === "save" && !record.published_revision_number) ? "Draft saved successfully." : "Changes saved successfully.");
    } catch (reason) {
      const detail = reason instanceof ApiError && reason.details ? Object.values(reason.details).flat().join(" ") : "";
      setError(detail || (reason instanceof Error ? reason.message : "Could not save changes. Please try again."));
    } finally { setBusy(false); }
  }
  if (!draft || !record) return <div>{error ? <p role="alert">{error}</p> : <p>Loading page…</p>}<Link href="/admin/content" className="mt-4 inline-block underline"><Icon name="arrow-left" className="h-4 w-4" /> Back to Pages</Link></div>;
  if (access.read_only) return <><Link href="/admin/content"><Icon name="arrow-left" className="h-4 w-4" /> Back to Pages</Link><CmsRevisionRenderer templateKey={record.template_key} revision={(record.current_draft_revision || record.published_revision)!} /></>;
  const editableSections = draft.sections.filter((section) => !["hero_image", "page_copy", layoutSlot].includes(section.slot) && !(Array.isArray(section.data.legacy_blocks) && !section.data.legacy_blocks.length));
  const profileSections = record.path === "/about/secretariat" ? editableSections.filter((section) => section.section_type === "profile_gallery") : [];
  const assessmentSections = slug === "training-exams" ? editableSections.filter((section) => section.section_type === "exam_assessment") : [];
  const reportDocumentSections = slug === "knowledge-reports" ? editableSections.filter((section) => section.section_type === "document_list") : [];
  const researchDocumentSections = slug === "knowledge-research" ? editableSections.filter((section) => section.section_type === "document_list") : [];
  const cpdSeminarSections = slug === "training-cpd" ? editableSections.filter((section) => section.section_type === "seminar_list") : [];
  const cpdVideoSections = slug === "training-cpd" ? editableSections.filter((section) => section.section_type === "video_list") : [];
  const homeCountdownSections = slug === "home" ? editableSections.filter((section) => section.section_type === "training_countdown") : [];
  const homeTrainingSections = slug === "home" ? editableSections.filter((section) => section.data.home_section === "training") : [];
  const eventGallerySections = slug === "media-event-gallery" ? editableSections.filter((section) => section.section_type === "gallery") : [];
  const standardSections = editableSections.filter((section) => !(record.path === "/about/secretariat" && section.section_type === "profile_gallery") && !(slug === "training-exams" && section.section_type === "exam_assessment") && !(slug === "knowledge-reports" && section.section_type === "document_list") && !(slug === "knowledge-research" && section.section_type === "document_list") && !(slug === "training-cpd" && ["seminar_list", "video_list"].includes(section.section_type)) && !(slug === "home" && (section.section_type === "training_countdown" || section.data.home_section === "training")));
  const pageStandardSections = standardSections.filter((section) => !(slug === "media-event-gallery" && section.section_type === "gallery"));
  const movableHomeSectionIndexes = slug === "home" ? draft.sections.map((section, index) => ({ section, index })).filter(({ section }) => !!section.data.home_section && section.data.home_section !== "hero" && section.section_type !== "training_countdown").map(({ index }) => index) : [];
  const trainingOrderIndex = movableHomeSectionIndexes.findIndex((index) => draft.sections[index].data.home_section === "training");
  const moveHomeTraining = (direction: -1 | 1) => {
    const sourceIndex = movableHomeSectionIndexes[trainingOrderIndex];
    const targetIndex = movableHomeSectionIndexes[trainingOrderIndex + direction];
    if (sourceIndex === undefined || targetIndex === undefined) return;
    const next = [...draft.sections];
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    change({ sections: next });
  };
  const replaceGroup = (group: CmsPageDraft["sections"], sections: CmsPageDraft["sections"]) => change({ sections: replaceSectionGroup(draft.sections, group, sections) });
  return <div className="max-w-5xl"><Link href="/admin/content" className="text-sm font-semibold"><Icon name="arrow-left" className="h-4 w-4" /> Back to Pages</Link>
    {slug === "membership-members-in-good-standing" && <p className="mt-4 rounded-lg bg-[var(--color-paper)] p-4 text-sm">Edit this page’s heading, image and text below. To change member names or who appears in the register, <Link href="/admin/directory" className="font-semibold underline">manage the member directory</Link>.</p>}
    <div className="my-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl">{record.label}</h2><span className="rounded-full bg-[var(--color-paper)] px-3 py-1 text-xs">{record.published_revision_number ? "Published" : "Draft"}{dirty ? " · Unsaved changes" : record.current_draft_revision_number && record.published_revision_number ? " · Draft changes" : ""}</span></div>
    <form ref={form} className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("save"); }}>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <div className="grid gap-4 rounded-xl border border-[var(--color-line)] bg-white p-5 sm:grid-cols-2"><Field label="Page Title" value={draft.label} required onChange={(label) => change({ label })} /><div className="text-sm"><p className="font-semibold">URL</p><p className="mt-4 break-all text-[var(--color-slate)]">{record.path}</p></div></div>
        {slug !== "home" && <BuiltInSections path={record.path} legacy={record.template_key === "legacy"} sections={draft.sections} onChange={(sections) => change({ sections })} />}
        {record.path === "/about/secretariat" && <Panel title="Secretariat profiles" open><p className="text-sm text-[var(--color-slate)]">Each person has an individual profile panel below. Add or edit their photo, name, role and biography here.</p><Sections sections={profileSections} onChange={(sections) => replaceGroup(profileSections, sections)} canUpload={access.manage} sectionTypes={["profile_gallery"]} /></Panel>}
        {slug === "training-exams" && <Panel title="Assessment questions" open><p className="text-sm text-[var(--color-slate)]">Set the candidate instructions, questions, answers and correct answer for the browser-based practice assessment.</p><Sections sections={assessmentSections} onChange={(sections) => replaceGroup(assessmentSections, sections)} canUpload={access.manage} sectionTypes={["exam_assessment"]} /></Panel>}
        {slug === "knowledge-reports" && <Panel title="Report documents" open><p className="text-sm text-[var(--color-slate)]">Upload each report PDF, add its portrait cover image, and publish it for visitors to download.</p><Sections sections={reportDocumentSections} onChange={(sections) => replaceGroup(reportDocumentSections, sections)} canUpload={access.manage} sectionTypes={["document_list"]} /></Panel>}
        {slug === "knowledge-research" && <Panel title="Research documents" open><p className="text-sm text-[var(--color-slate)]">Upload each research PDF, add its portrait cover image, and publish it for visitors to download.</p><Sections sections={researchDocumentSections} onChange={(sections) => replaceGroup(researchDocumentSections, sections)} canUpload={access.manage} sectionTypes={["document_list"]} /></Panel>}
        {slug === "training-cpd" && <Panel title="Monthly seminars" open><p className="text-sm text-[var(--color-slate)]">Add each seminar&apos;s flyer, speaker, topic, date and registration link here.</p><Sections sections={cpdSeminarSections} onChange={(sections) => replaceGroup(cpdSeminarSections, sections)} canUpload={access.manage} sectionTypes={["seminar_list"]} /></Panel>}
        {slug === "training-cpd" && <Panel title="Seminar recordings" open><p className="text-sm text-[var(--color-slate)]">Add a YouTube link for each recording. The video thumbnail is created automatically on the CPD page, so no image upload is needed.</p><Sections sections={cpdVideoSections} onChange={(sections) => replaceGroup(cpdVideoSections, sections)} canUpload={access.manage} sectionTypes={["video_list"]} /></Panel>}
        {slug === "home" && <Panel title="Next training countdown" open><p className="text-sm text-[var(--color-slate)]">Each training countdown has its own programme, Ghana date and time. To remove one completely, open it, choose <strong>Remove this timer</strong>, then choose <strong>Save Changes</strong>.</p><Sections sections={homeCountdownSections} onChange={(sections) => replaceGroup(homeCountdownSections, sections)} canUpload={access.manage} sectionTypes={["training_countdown"]} addLabel="+ Add training timer" removeLabel="Remove this timer" /></Panel>}
        {slug === "home" && <Panel title="Upcoming events" open><div className="flex flex-wrap items-start justify-between gap-4"><p className="max-w-2xl text-sm text-[var(--color-slate)]">This homepage section automatically displays the same published events as the main Events page. Manage event cards on the Events page; edit this section&apos;s heading and link here.</p><div className="flex shrink-0 gap-2"><button type="button" className={buttonClass} disabled={trainingOrderIndex <= 0} onClick={() => moveHomeTraining(-1)}>Move up</button><button type="button" className={buttonClass} disabled={trainingOrderIndex < 0 || trainingOrderIndex >= movableHomeSectionIndexes.length - 1} onClick={() => moveHomeTraining(1)}>Move down</button></div></div><Sections sections={homeTrainingSections} onChange={(sections) => replaceGroup(homeTrainingSections, sections)} canUpload={access.manage} allowAdd={false} /></Panel>}
        {slug === "media-event-gallery" && <Panel title="Event gallery photos" open><p className="text-sm text-[var(--color-slate)]">Upload event photos here. Each image appears on the public Event Gallery as soon as you save and publish the page.</p><Sections sections={eventGallerySections} onChange={(sections) => replaceGroup(eventGallerySections, sections)} canUpload={access.manage} sectionTypes={["gallery"]} allowAdd={eventGallerySections.length === 0} addLabel="Create photo gallery" /></Panel>}
        {slug !== "home" && <Panel title="Hero" open><Field label="Heading" value={draft.title} required onChange={(title) => change({ title })} /><Area label="Description" value={draft.summary} onChange={(summary) => change({ summary })} /><Field label="Short introduction" value={draft.eyebrow} onChange={(eyebrow) => change({ eyebrow })} /></Panel>}
        {slug !== "home" && <Panel title="Page content"><RichText label="Content" value={draft.body} onChange={(body) => change({ body })} /></Panel>}
        {slug !== "home" && <Panel title="Hero Image"><MediaPicker label="Hero Image" value={draft.sections.find((s) => s.slot === "hero_image")?.primary_media} fallback={String(draft.sections.find((s) => s.slot === "hero_image")?.data.image_url ?? (slug === "about-page" ? "/images/leadership-forum.png" : ""))} canUpload={access.manage} onChange={(id, url) => change({ sections: [{ slot: "hero_image", section_type: "image", position: 0, data: { image_url: url }, primary_media: id, is_enabled: true }, ...draft.sections.filter((s) => s.slot !== "hero_image")] })} /></Panel>}
        {draft.sections.filter((s) => s.slot === "page_copy").map((section, index) => <PageCopyFields key={index} canUpload={access.manage} data={section.data} onChange={(data) => change({ sections: draft.sections.map((s) => s === section ? { ...s, data } : s) })} />)}
        <Sections sections={pageStandardSections} onChange={(sections) => replaceGroup(pageStandardSections, sections)} canUpload={access.manage} />
        <Panel title="Search engine settings"><Field label="Meta Title" value={draft.seo_title} onChange={(seo_title) => change({ seo_title })} /><Area label="Meta Description" value={draft.seo_description} onChange={(seo_description) => change({ seo_description })} /><MediaPicker label="Social Image" value={draft.social_image} onChange={(social_image) => change({ social_image })} canUpload={access.manage} /><Field label="Canonical URL" value={draft.canonical_path} onChange={(canonical_path) => change({ canonical_path })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!draft.robots.includes("noindex")} onChange={(e) => change({ robots: e.target.checked ? "index,follow" : "noindex,nofollow" })} />Allow search engines to index this page</label></Panel>
      </fieldset>
      <div className="sticky bottom-0 z-10 rounded-xl border border-[var(--color-line)] bg-white/95 p-4 shadow-sm backdrop-blur">
        {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mb-3 text-sm text-emerald-800">{notice}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2"><div>{!record.is_system_page ? <button type="button" className="text-sm font-semibold text-red-700 underline disabled:opacity-50" disabled={busy} onClick={() => void removePage()}>Remove page</button> : <span className="text-xs text-[var(--color-slate)]">This protected system page cannot be removed.</span>}</div><div className="flex flex-wrap justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => void save("draft")}>Save Draft</button><button type="button" className={buttonClass} disabled={busy} onClick={() => void save("preview")}>Preview</button>{!record.published_revision_number && <button type="button" className={buttonClass} disabled={busy} onClick={() => void save("publish")}>Publish</button>}<button className={primaryClass} disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button></div></div>
      </div>
    </form>
    <dialog ref={dialog} aria-label="Page preview" className="fixed inset-0 m-auto max-h-[90vh] w-[min(1200px,96vw)] overflow-y-auto rounded-xl backdrop:bg-black/50"><div className="sticky top-0 z-10 flex items-center justify-between bg-amber-100 p-4 text-sm"><p>Private preview · Your draft has not been published.</p><button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>Close preview</button></div>{previewUrl ? <iframe title="Page preview" src={previewUrl} referrerPolicy="no-referrer" className="h-[75vh] w-full border-0" /> : preview && <CmsRevisionRenderer templateKey={record.template_key} revision={preview} />}</dialog>
  </div>;
}
