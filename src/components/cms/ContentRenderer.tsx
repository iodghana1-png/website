"use client";

import Image from "next/image";

import DOMPurify from "dompurify";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CmsPageRevision, CmsPublicArticle, CmsSection, getPublishedCmsArticles } from "@/lib/api/cms";
import { MembersDirectory } from "@/components/membership/MembersDirectory";
import { layoutSlot, sectionState } from "@/lib/cms/sectionVisibility";

export function linkUrl(value: string) { return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value.trim()) ? value.trim() : ""; }
export function copy(data: Record<string, unknown>, ...keys: string[]) { for (const key of keys) if (typeof data[key] === "string") return data[key] as string; return ""; }
const subscribeToHydration = () => () => {};
export function RichContent({ value }: { value: string }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  if (!/<\/?[a-z][\s\S]*>/i.test(value)) return <div className="cms-rich-text whitespace-pre-line">{value}</div>;
  if (!hydrated) return <div className="cms-rich-text whitespace-pre-line">{value.replace(/<[^>]*>/g, " ")}</div>;
  const html = DOMPurify.sanitize(value, { ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "a", "blockquote"], ALLOWED_ATTR: ["href", "rel"] });
  return <div className="cms-rich-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
function Feed({ type }: { type: "news" | "event" }) {
  const [articles, setArticles] = useState<CmsPublicArticle[]>([]);
  useEffect(() => { let active = true; getPublishedCmsArticles(type).then((items) => { if (active) setArticles(items); }).catch(() => {}); return () => { active = false; }; }, [type]);
  return <div className="mt-6 grid gap-5 md:grid-cols-3">{articles.map((item) => <a key={item.id} href={(type === "news" ? "/news/" : "/events/") + item.slug} className="rounded border border-[var(--color-line)] p-5"><h3 className="text-xl">{item.revision.title}</h3><p className="mt-3">{item.revision.standfirst}</p></a>)}</div>;
}
export function SectionRenderer({ section }: { section: CmsSection }) {
  if (!section.is_enabled || section.slot === layoutSlot) return null;
  if (["partner_logos", "profile_gallery", "seminar_list", "video_list"].includes(section.section_type)) return null;
  const data = section.data;
  const title = copy(data, "heading", "title", "label");
  const image = section.primary_media?.file_url || copy(data, "image_url");
  const items = Array.isArray(data.items) ? data.items.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
  const href = linkUrl(copy(data, "button_href"));
  return <section className="border-t border-[var(--color-line)] py-12"><div className="site-container">
    {title && <h2 className="mb-5 text-3xl tracking-tight">{title}</h2>}
    <div className={image ? "grid gap-8 md:grid-cols-2 md:items-center" : ""}>{image && linkUrl(image) && <Image width={640} height={480} unoptimized src={image} alt={section.primary_media?.alt_text || copy(data, "alt_text") || title} className="max-h-[480px] w-full object-contain" />}<div className="text-lg leading-8"><RichContent value={copy(data, "copy", "text", "description", "summary")} />{copy(data, "attribution") && <p className="mt-4 text-sm font-semibold">{copy(data, "attribution")}</p>}{href && <a href={href} className="mt-6 inline-block bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white">{copy(data, "button_label") || "Learn more"}</a>}</div></div>
    {items.length > 0 && <div className="mt-6 grid gap-5 md:grid-cols-3">{items.map((item, index) => section.section_type === "faq" ? <details key={index} className="rounded border p-5"><summary className="cursor-pointer font-semibold">{copy(item, "title")}</summary><div className="mt-3"><RichContent value={copy(item, "description")} /></div></details> : <article key={index} className="border border-[var(--color-line)] p-5">{linkUrl(copy(item, "image_url")) && <Image width={640} height={480} unoptimized src={copy(item, "image_url")} alt={copy(item, "title")} className="mb-4 h-48 w-full object-contain" />}<h3 className={section.section_type === "stat_grid" ? "text-4xl" : "text-xl"}>{copy(item, "title")}</h3><div className="mt-3 leading-7"><RichContent value={copy(item, "description", "summary")} /></div>{linkUrl(copy(item, "href")) && <a href={linkUrl(copy(item, "href"))} className="mt-4 inline-block underline">Learn more</a>}</article>)}</div>}
    {section.section_type === "article_feed" && <Feed type="news" />}{section.section_type === "event_feed" && <Feed type="event" />}{section.section_type === "member_directory" && <MembersDirectory />}
  </div></section>;
}
export function PageContent({ revision, sectionsOnly = false, omitSectionTypes = [] }: { revision: CmsPageRevision; sectionsOnly?: boolean; omitSectionTypes?: string[] }) {
  return <>{!sectionsOnly && !sectionState(revision, "hero") && <header className="border-b border-[var(--color-line)] bg-white py-16"><div className="site-container"><p className="eyebrow">{revision.eyebrow}</p><h1 className="mt-4 max-w-5xl text-5xl tracking-tight">{revision.title}</h1>{revision.summary && <p className="mt-6 max-w-2xl text-lg leading-8">{revision.summary}</p>}</div></header>}{revision.body && !sectionState(revision, "body") && <div className="site-container py-12 text-lg leading-8"><RichContent value={revision.body} /></div>}{revision.sections.filter((s) => s.is_enabled && !omitSectionTypes.includes(s.section_type) && !["hero_image", "page_copy", layoutSlot].includes(s.slot) && !s.data.legacy_blocks).sort((a, b) => a.position - b.position).map((section, index) => <SectionRenderer key={section.id || index} section={section} />)}</>;
}
