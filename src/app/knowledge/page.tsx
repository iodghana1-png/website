"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { BuiltInSection } from "@/components/cms/BuiltInSection";
import { EditableCopy } from "@/components/cms/EditableCopy";
import { useCmsPage } from "@/components/content/useCmsContent";
import { KnowledgeHero } from "@/components/knowledge/KnowledgeHero";
import { brandText } from "@/components/ui/BrandText";
import { Icon } from "@/components/ui/Icon";
import { getPublishedCmsPage, type CmsPublicPage } from "@/lib/api/cms";

const fallbackPage = { eyebrow: "Knowledge centre", title: "Insight for better boardroom decisions.", summary: "Research, publications and practical resources for directors navigating an evolving governance landscape.", body: "", blocks: [] };
const categories = [
  { key: "research", label: "Research", href: "/knowledge/research" },
  { key: "reports", label: "Reports", href: "/knowledge/reports" },
  { key: "resources", label: "Resources", href: "/knowledge/resources" },
] as const;

type CategoryKey = (typeof categories)[number]["key"];
type InsightCard = { id: string; title: string; description: string; href: string; category: string; coverImageUrl: string; year: string };

const imageUrl = (value: unknown) => typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : "";

function documentCardsFromPage(key: CategoryKey, page: CmsPublicPage): InsightCard[] {
  const category = categories.find((entry) => entry.key === key)!;
  const fallbackYear = page.published_at ? new Date(page.published_at).getUTCFullYear().toString() : "";

  return page.revision.sections
    .filter((section) => section.section_type === "document_list" && section.is_enabled)
    .flatMap((section) => Array.isArray(section.data.items) ? section.data.items : [])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .flatMap((item, index) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return [];
      const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
      const year = typeof metadata.year === "string" && /^\d{4}$/.test(metadata.year.trim()) ? metadata.year.trim() : fallbackYear;
      return [{
        id: typeof item.id === "string" ? item.id : `${key}-${index}`,
        title,
        description: typeof item.description === "string" ? item.description : "",
        href: category.href,
        category: category.label,
        coverImageUrl: imageUrl(item.cover_image_url),
        year,
      }];
    });
}

function AllInsightCard({ item }: { item: InsightCard }) {
  return <article className="group grid h-full grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden border border-[var(--color-line)] bg-white transition-colors hover:border-[var(--color-gold)]">
    <div className="relative min-h-32 bg-[var(--color-paper)]">{item.coverImageUrl ? <Image src={item.coverImageUrl} alt={`Cover for ${item.title}`} fill sizes="72px" unoptimized className="object-contain p-2" /> : <div className="grid h-full place-items-center break-all p-2 text-[0.6rem] font-bold tracking-[0.06em] text-[var(--color-slate)]">{brandText(item.category.toUpperCase())}</div>}</div>
    <div className="flex min-w-0 flex-col p-4"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-accent-dark)]">{brandText([item.category, item.year].filter(Boolean).join(" · ").toUpperCase())}</p><h3 className="mt-2 break-words font-serif text-xl leading-tight tracking-[-0.03em]">{brandText(item.title)}</h3>{item.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-slate)]" title={item.description}>{brandText(item.description)}</p>}<a href={item.href} className="link-arrow mt-auto min-h-11 pt-3 text-sm">Explore {brandText(item.category.toLowerCase())} <Icon name="arrow-right" className="h-4 w-4" /></a></div>
  </article>;
}

export default function KnowledgePage() {
  const page = useCmsPage("knowledge-page", fallbackPage);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("all");

  useEffect(() => {
    let active = true;
    Promise.all(categories.map(async (entry) => documentCardsFromPage(entry.key, await getPublishedCmsPage(`knowledge-${entry.key}`))))
      .then((results) => { if (active) setInsights(results.flat()); })
      .catch(() => undefined)
      .finally(() => { if (active) setCollectionsLoaded(true); });
    return () => { active = false; };
  }, []);

  const years = useMemo(() => Array.from(new Set(insights.map((item) => item.year).filter(Boolean))).sort((a, b) => b.localeCompare(a)), [insights]);
  const filteredInsights = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return insights.filter((item) => (category === "all" || item.category === category) && (year === "all" || item.year === year) && (!search || [item.title, item.description, item.category, item.year].join(" ").toLocaleLowerCase().includes(search)));
  }, [category, insights, query, year]);
  const filtersApplied = query.trim() || category !== "all" || year !== "all";

  return <><KnowledgeHero active="all" eyebrow={page.eyebrow} title={page.title} description={page.summary} /><BuiltInSection sectionId="knowledge-insight" className="bg-white py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 border-b border-[var(--color-line)] pb-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback="All insight" /></p><h2 className="mt-4 max-w-3xl font-serif text-[clamp(2.25rem,3.5vw,3.75rem)] leading-[1.04] tracking-[-0.05em]"><EditableCopy label="Heading" fallback="Knowledge for the questions that matter." /></h2></div><p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback="Browse the latest research, reports and practical resources for confident boardroom decisions." /></p></div><div className="my-10 flex flex-col gap-4 border-y border-[var(--color-line)] py-5 sm:flex-row"><input aria-label="Search the knowledge centre" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 flex-1 border border-[var(--color-line)] px-4 text-sm outline-none focus:border-[var(--color-ink)]" placeholder="Search the knowledge centre" /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 border border-[var(--color-line)] bg-white px-4 text-sm outline-none focus:border-[var(--color-ink)]"><option value="all">All categories</option>{categories.map((entry) => <option key={entry.key} value={entry.label}>{entry.label}</option>)}</select><select aria-label="Filter by year" value={year} onChange={(event) => setYear(event.target.value)} className="h-11 border border-[var(--color-line)] bg-white px-4 text-sm outline-none focus:border-[var(--color-ink)]"><option value="all">All years</option>{years.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>{filtersApplied && <button type="button" className="h-11 px-2 text-sm font-semibold underline underline-offset-4" onClick={() => { setQuery(""); setCategory("all"); setYear("all"); }}>Clear filters</button>}</div>{!collectionsLoaded ? <p className="py-8 text-sm text-[var(--color-slate)]">Loading insight…</p> : filteredInsights.length ? <><p className="mb-5 text-sm text-[var(--color-slate)]">Showing {filteredInsights.length} {filteredInsights.length === 1 ? "item" : "items"}.</p><div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredInsights.map((item) => <AllInsightCard item={item} key={item.id} />)}</div></> : <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-paper)] p-8"><h3 className="font-serif text-2xl">{filtersApplied ? "No matching insight found." : "No published insight is available yet."}</h3><p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">{filtersApplied ? "Try a different search or clear the filters." : "The document libraries are being prepared. Please check back soon."}</p>{filtersApplied && <button type="button" className="mt-4 text-sm font-semibold underline underline-offset-4" onClick={() => { setQuery(""); setCategory("all"); setYear("all"); }}>Clear filters</button>}</div>}</div></BuiltInSection></>;
}
