"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CmsPublicPage, getPublishedCmsPage } from "@/lib/api/cms";
import { Icon } from "@/components/ui/Icon";

type ResourceDocument = { id: string; title: string; description: string; category: string; href: string; coverImageUrl: string };
const downloadUrl = (value: unknown) => typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : "";

function documentsFromPage(page: CmsPublicPage): ResourceDocument[] {
  const section = page.revision.sections.find((item) => item.section_type === "document_list" && item.is_enabled);
  const items = Array.isArray(section?.data.items) ? section.data.items : [];
  return items.flatMap((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const href = downloadUrl(item.href);
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) return [];
    const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
    return [{ id: typeof item.id === "string" ? item.id : String(index), title, href, description: typeof item.description === "string" ? item.description : "", category: typeof metadata.category === "string" ? metadata.category : "", coverImageUrl: downloadUrl(item.cover_image_url) }];
  });
}

export function ResourcesDocuments({ initialPage }: { initialPage?: CmsPublicPage | null }) {
  return <><DocumentLibrary cmsSlug="knowledge-resources" eyebrow="Download centre" heading="Resources for your boardroom." description="Download practical guides, policies and reference documents from IoD-Gh." emptyTitle="Resources will appear here." initialPage={initialPage} /><BuiltInSection sectionId="resources-explore" className="border-t border-[var(--color-line)] bg-[var(--color-paper)] py-10"><div className="site-container flex flex-wrap items-center justify-between gap-4"><p className="font-serif text-2xl tracking-[-0.03em]">Looking for more boardroom insight?</p><Link href="/knowledge" className="link-arrow">Explore all insight <Icon name="arrow-right" className="h-4 w-4" /></Link></div></BuiltInSection></>;
}

export function ReportsDocuments({ initialPage }: { initialPage?: CmsPublicPage | null }) {
  return <DocumentLibrary cmsSlug="knowledge-reports" eyebrow="Reports library" heading="Reports and publications." description="Download IoD-Gh annual reports, institutional publications and other official documents." emptyTitle="Reports will appear here." initialPage={initialPage} />;
}

export function ResearchDocuments({ initialPage }: { initialPage?: CmsPublicPage | null }) {
  return <DocumentLibrary cmsSlug="knowledge-research" eyebrow="Research library" heading="Research for better governance." description="Download IoD-Gh research, studies and practical governance insight." emptyTitle="Research documents will appear here." initialPage={initialPage} />;
}

function DocumentLibrary({ cmsSlug, eyebrow, heading, description, emptyTitle, initialPage }: { cmsSlug: string; eyebrow: string; heading: string; description: string; emptyTitle: string; initialPage?: CmsPublicPage | null }) {
  const [documents, setDocuments] = useState<ResourceDocument[]>(() => initialPage ? documentsFromPage(initialPage) : []);
  const [loaded, setLoaded] = useState(Boolean(initialPage));

  useEffect(() => {
    if (initialPage) return;
    let active = true;
    getPublishedCmsPage(cmsSlug).then((page) => {
      if (!active) return;
      setDocuments(documentsFromPage(page));
    }).catch(() => undefined).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [cmsSlug, initialPage]);

  return <BuiltInSection sectionId="documents" sectionType="document_list" className="bg-white py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 border-b border-[var(--color-line)] pb-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow">{eyebrow}</p><h2 className="mt-4 font-serif text-[clamp(2.25rem,3.5vw,3.75rem)] leading-[1.04] tracking-[-0.05em]">{heading}</h2></div><p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9">{description}</p></div>{!loaded ? <p className="py-12 text-sm text-[var(--color-slate)]">Loading documents…</p> : documents.length ? <div className="mt-10 grid gap-5 md:grid-cols-2">{documents.map((document) => <article className="grid overflow-hidden border border-[var(--color-line)] bg-[var(--color-warm-white)] sm:grid-cols-[10rem_1fr]" key={document.id}><div className="relative aspect-[3/4] bg-[var(--color-paper)] sm:aspect-auto">{document.coverImageUrl ? <Image src={document.coverImageUrl} alt={`Cover for ${document.title}`} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center p-5 text-center text-xs font-bold tracking-[0.12em] text-[var(--color-slate)]">PDF<br />RESOURCE</div>}</div><div className="flex min-h-64 flex-col p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-accent-dark)]">{document.category || "RESOURCE"}</p><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded border border-[var(--color-line)] bg-white text-[0.65rem] font-bold">PDF</span></div><h3 className="mt-8 font-serif text-3xl leading-tight">{document.title}</h3>{document.description && <p className="mt-4 leading-7 text-[var(--color-slate)]">{document.description}</p>}{document.href ? <a className="link-arrow mt-auto pt-8" href={document.href} download>Download PDF <Icon name="download" className="h-4 w-4" /></a> : <p className="mt-auto pt-8 text-sm font-semibold text-[var(--color-slate)]">PDF file will be available soon.</p>}</div></article>)}</div> : <div className="mt-10 border border-dashed border-[var(--color-line)] bg-[var(--color-paper)] p-8"><h3 className="font-serif text-3xl">{emptyTitle}</h3><p className="mt-3 max-w-2xl leading-7 text-[var(--color-slate)]">The document library is being prepared. Please check back soon.</p></div>}</div></BuiltInSection>;
}
