"use client";

import { useContext, useEffect, useState } from "react";
import { CmsPageContext } from "@/components/cms/PageContext";
import { brandText } from "@/components/ui/BrandText";

import { ContentItem, ContentPage, ContentSection, getPublishedContentItems, getPublishedContentPage } from "@/lib/api/content";
import { CmsPublicArticle, getPublishedCmsArticles, getPublishedCmsPage } from "@/lib/api/cms";
import { eventCardsFromRevision, getPublishedEventCards } from "@/lib/cms/events";

export type CmsPageCopy = Pick<ContentPage, "eyebrow" | "title" | "summary" | "body" | "blocks">;
export type CmsItem = Pick<ContentItem, "id" | "title" | "summary" | "href" | "metadata" | "image_url" | "sort_order">;

const articleTypeForSection: Partial<Record<ContentSection, "news" | "insight" | "event">> = { news: "news", knowledge: "insight", events: "event" };

function articleAsItem(article: CmsPublicArticle, index: number): CmsItem {
  return {
    id: article.id,
    title: article.revision.title,
    summary: article.revision.standfirst,
    href: `/${article.content_type === "event" ? "events" : article.content_type === "insight" ? "knowledge" : "news"}/${article.slug}`,
    metadata: { display_meta: [article.category?.name, article.published_at ? new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""].filter(Boolean).join(" · "), alt_text: article.revision.cover_media?.alt_text || article.revision.title },
    image_url: article.revision.cover_media?.file_url || "",
    sort_order: index,
  };
}

export function useCmsItems(section: ContentSection, fallback: CmsItem[]) {
  const context = useContext(CmsPageContext);
  const [items, setItems] = useState<CmsItem[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const articleType = articleTypeForSection[section];
      const source = section === "events" ? getPublishedEventCards() : articleType ? getPublishedCmsArticles(articleType).then((content) => content.map(articleAsItem)) : getPublishedContentItems(section);
      source.then((content) => {
        if (!cancelled) setItems(content);
      }).catch(() => undefined);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section]);

  return section === "events" && context?.slug === "events-page" ? eventCardsFromRevision(context.revision) : items;
}

export function useCmsPage(slug: string | undefined, fallback: CmsPageCopy) {
  const context = useContext(CmsPageContext);
  const [page, setPage] = useState<CmsPageCopy>(fallback);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      getPublishedCmsPage(slug).then((content) => ({
        eyebrow: content.revision.eyebrow,
        title: content.revision.title,
        summary: content.revision.summary,
        body: content.revision.body,
        blocks: content.revision.sections.filter((section) => section.is_enabled).sort((a, b) => a.position - b.position).flatMap((section) => Array.isArray(section.data.legacy_blocks) ? section.data.legacy_blocks : [{ type: section.section_type, ...section.data }]),
      })).catch(() => getPublishedContentPage(slug)).then((content) => {
        if (!cancelled) setPage(content);
      }).catch(() => undefined);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [slug]);

  if (context && context.slug === slug) return {
    eyebrow: context.revision.eyebrow, title: context.revision.title, summary: context.revision.summary,
    body: context.revision.body,
    blocks: context.revision.sections.filter((section) => section.is_enabled).sort((a, b) => a.position - b.position).flatMap((section) => Array.isArray(section.data.legacy_blocks) ? section.data.legacy_blocks : [{ type: section.section_type, ...section.data }]),
  };
  return page;
}

export function cmsItemsInBlocks(blocks: unknown[], type: string): unknown[] {
  return blocks.flatMap((block) => {
    if (!block || typeof block !== "object" || !("type" in block) || block.type !== type || !("items" in block)) return [];
    return Array.isArray(block.items) ? block.items : [];
  });
}

export function cmsCta(blocks: unknown[], fallback: { label: string; href: string }) {
  const cta = blocks.find((block) => typeof block === "object" && block !== null && "type" in block && (block as { type?: unknown }).type === "cta") as { label?: unknown; href?: unknown } | undefined;
  const href = typeof cta?.href === "string" && (cta.href.startsWith("/") || /^https?:\/\//i.test(cta.href)) ? cta.href : fallback.href;
  const label = typeof cta?.label === "string" && cta.label.trim() ? cta.label : fallback.label;
  return { label, href };
}

export function cmsMeta(item: Pick<ContentItem, "metadata">, key: string, fallback = "") {
  const value = item.metadata[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function cmsHref(value: string, fallback = "/") {
  const href = value.trim();
  return href.startsWith("/") || /^https?:\/\//i.test(href) ? href : fallback;
}

export function CmsPageText({ slug, field, fallback }: { slug: string; field: "eyebrow" | "title" | "summary"; fallback: string }) {
  const page = useCmsPage(slug, { eyebrow: "", title: "", summary: "", body: "", blocks: [], [field]: fallback });
  return brandText(page[field]);
}
