"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { useEffect, useState } from "react";
import Image from "next/image";

import { EditableCopy } from "@/components/cms/EditableCopy";
import { useCmsPage } from "@/components/content/useCmsContent";
import { KnowledgeHero } from "@/components/knowledge/KnowledgeHero";
import { getPublishedCmsPage } from "@/lib/api/cms";
import { Icon } from "@/components/ui/Icon";

const fallbackPage = { eyebrow: "Knowledge centre", title: "Insight for better boardroom decisions.", summary: "Research, publications and practical resources for directors navigating an evolving governance landscape.", body: "", blocks: [] };
const categories = [
  { key: "research", label: "Research", href: "/knowledge/research" },
  { key: "reports", label: "Reports", href: "/knowledge/reports" },
  { key: "resources", label: "Resources", href: "/knowledge/resources" },
] as const;
type CategoryKey = (typeof categories)[number]["key"];
type InsightCard = { title: string; description: string; href: string; category: string; coverImageUrl: string };
const imageUrl = (value: unknown) => typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : "";

function documentFromPage(key: CategoryKey, page: Awaited<ReturnType<typeof getPublishedCmsPage>>): InsightCard | null {
  const data = page.revision.sections.find((section) => section.section_type === "document_list" && section.is_enabled)?.data;
  const item = Array.isArray(data?.items) ? data.items.find((value): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value) && typeof value.title === "string" && value.title.trim().length > 0) : undefined;
  if (!item) return null;
  const category = categories.find((entry) => entry.key === key)!;
  return { title: item.title as string, description: typeof item.description === "string" ? item.description : "", href: category.href, category: category.label, coverImageUrl: imageUrl(item.cover_image_url) };
}

function AllInsightCard({ item }: { item: InsightCard }) {
  return <article className="group overflow-hidden border border-[var(--color-line)] bg-white transition-colors hover:border-[var(--color-gold)]"><div className="relative aspect-[4/3] bg-[var(--color-paper)]">{item.coverImageUrl ? <Image src={item.coverImageUrl} alt={`Cover for ${item.title}`} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-xs font-bold tracking-[0.12em] text-[var(--color-slate)]">{item.category.toUpperCase()}</div>}</div><div className="flex min-h-60 flex-col p-6 sm:p-7"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-accent-dark)]">{item.category.toUpperCase()}</p><h3 className="mt-7 font-serif text-3xl leading-tight tracking-[-0.03em]">{item.title}</h3>{item.description && <p className="mt-4 leading-7 text-[var(--color-slate)]">{item.description}</p>}<a href={item.href} className="link-arrow mt-auto pt-8">Explore {item.category.toLowerCase()} <Icon name="arrow-right" className="h-4 w-4" /></a></div></article>;
}

export default function KnowledgePage() {
  const page = useCmsPage("knowledge-page", fallbackPage);
  const [collections, setCollections] = useState<Partial<Record<CategoryKey, InsightCard>>>({});
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all(categories.map(async (category) => {
      const categoryPage = await getPublishedCmsPage(`knowledge-${category.key}`);
      const document = documentFromPage(category.key, categoryPage);
      return [category.key, document || { title: categoryPage.revision.title, description: categoryPage.revision.summary, href: category.href, category: category.label, coverImageUrl: "" }] as const;
    })).then((results) => {
      if (!active) return;
      setCollections(Object.fromEntries(results));
    }).catch(() => undefined).finally(() => { if (active) setCollectionsLoaded(true); });
    return () => { active = false; };
  }, []);

  const allInsights = categories.reduce<InsightCard[]>((result, category) => {
    const collection = collections[category.key];
    return collection ? [...result, collection] : result;
  }, []);

  return <><KnowledgeHero active="all" eyebrow={page.eyebrow} title={page.title} description={page.summary} /><BuiltInSection sectionId="knowledge-insight" className="bg-white py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 border-b border-[var(--color-line)] pb-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback={"All insight"} /></p><h2 className="mt-4 max-w-3xl font-serif text-[clamp(2.25rem,3.5vw,3.75rem)] leading-[1.04] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Knowledge for the questions that matter."} /></h2></div><p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"Browse the latest research, reports and practical resources for confident boardroom decisions."} /></p></div><div className="my-10 flex flex-col gap-4 border-y border-[var(--color-line)] py-5 sm:flex-row"><input className="h-11 flex-1 border border-[var(--color-line)] px-4 text-sm outline-none focus:border-[var(--color-ink)]" placeholder="Search the knowledge centre" /><select className="h-11 border border-[var(--color-line)] bg-white px-4 text-sm outline-none focus:border-[var(--color-ink)]"><option>All categories</option><option>Research</option><option>Reports</option><option>Resources</option></select><select className="h-11 border border-[var(--color-line)] bg-white px-4 text-sm outline-none focus:border-[var(--color-ink)]"><option>All years</option><option>2026</option><option>2025</option></select></div>{!collectionsLoaded ? <p className="py-8 text-sm text-[var(--color-slate)]">Loading insight…</p> : allInsights.length ? <div className="grid gap-5 lg:grid-cols-3">{allInsights.map((item) => <AllInsightCard item={item} key={item.category} />)}</div> : <p className="py-8 text-sm text-[var(--color-slate)]">No published insight is available yet.</p>}</div></BuiltInSection></>;
}
