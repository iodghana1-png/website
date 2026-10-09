"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { CmsPageRevision, CmsPublicArticle, getPublishedCmsArticles, getPublishedCmsPage } from "@/lib/api/cms";
import { SectionRenderer } from "@/components/cms/ContentRenderer";

import { HomeIntroduction } from "@/components/content/HomeIntroduction";
import { HomeTrainingCountdown } from "@/components/content/HomeTrainingCountdown";
import { HomepageWhatsApp } from "@/components/content/HomepageWhatsApp";
import { HomepagePartnerLogos } from "@/components/content/PartnerLogos";
import { HeroCarousel, type HeroSlide } from "@/components/ui/HeroCarousel";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { events, membershipCategories, newsItems } from "@/data/site";
import { ContentItem, ContentPage, ContentSection, getPublishedContentItems, getPublishedContentPage } from "@/lib/api/content";
import { KnowledgeDocument, knowledgeDocumentsFromPage, knowledgeSources } from "@/lib/knowledge-documents";

type HomepageItem = Pick<ContentItem, "id" | "title" | "summary" | "href" | "metadata" | "image_url" | "sort_order">;
type HomepageItems = Record<HomepageSection, HomepageItem[]>;
type HeadingCopy = { eyebrow: string; title: string; summary: string; ctaLabel?: string; ctaHref?: string };

const sections = ["hero", "membership", "training", "knowledge", "news", "partners"] as const satisfies readonly ContentSection[];
type HomepageSection = (typeof sections)[number];

const fallbackItems: HomepageItems = {
  hero: [
    {
      id: "fallback-hero-1", title: "Better boards. Better governance.", summary: "Developing directors and leaders for a stronger Ghana.", href: "/events/national-corporate-governance-conference", image_url: "/images/leadership-forum.png", sort_order: 10,
      metadata: { eyebrow: "Institute of Directors Ghana", primary_label: "Become a member", primary_href: "/membership/apply", secondary_label: "Explore training", secondary_href: "/training", feature: "National Corporate Governance Conference", alt_text: "Ghanaian executives connecting at a leadership forum" },
    },
    {
      id: "fallback-hero-2", title: "Directors ready to lead.", summary: "Practical programmes for sharper judgement, stronger challenge and greater boardroom impact.", href: "/training", image_url: "/images/leadership-director.png", sort_order: 20,
      metadata: { eyebrow: "Professional development", primary_label: "Explore programmes", primary_href: "/training", secondary_label: "View CPD", secondary_href: "/training/cpd", feature: "Learning for the work that matters", alt_text: "Ghanaian director reviewing board documents" },
    },
    {
      id: "fallback-hero-3", title: "Governance that creates trust.", summary: "Independent perspective and practical support for organisations that expect more from their boards.", href: "/services/board-evaluation", image_url: "/images/board-meeting.png", sort_order: 30,
      metadata: { eyebrow: "Governance in practice", primary_label: "Explore services", primary_href: "/services", secondary_label: "Our approach", secondary_href: "/about", feature: "Better boards start with better dialogue", alt_text: "Ghanaian board members in a focused meeting" },
    },
  ],
  membership: membershipCategories.map((item, index) => ({ id: `fallback-membership-${index}`, title: item.title, summary: item.description, href: item.href, image_url: "", sort_order: index + 1, metadata: { display_meta: item.meta || "" } })),
  training: events.map((item, index) => ({ id: `fallback-event-${index}`, title: item.title, summary: item.description, href: item.href, image_url: "", sort_order: index + 1, metadata: { display_meta: item.date || "", detail: item.meta || "" } })),
  knowledge: [],
  news: newsItems.map((item, index) => ({ id: `fallback-news-${index}`, title: item.title, summary: item.description, href: item.href, image_url: index === 0 ? "/images/leadership-forum.png" : "", sort_order: index + 1, metadata: { display_meta: [item.category, item.date].filter(Boolean).join(" · "), alt_text: "Leadership forum participants" } })),
  partners: [],
};

const fallbackHeadings: Record<string, HeadingCopy> = {
  "home-membership": { eyebrow: "Membership", title: "Find your place at IoD-Gh.", summary: "A professional home for directors and organisations at every stage of their governance journey.", ctaLabel: "Explore membership", ctaHref: "/membership" },
  "home-training": { eyebrow: "Upcoming events", title: "Develop your directorship.", summary: "Practical programmes that bring sharper insight and greater confidence to the work of the board." },
  "home-knowledge": { eyebrow: "Knowledge centre", title: "Insight for the boardroom.", summary: "A considered collection of research, reports and practical resources for better governance.", ctaLabel: "Explore all insights", ctaHref: "/knowledge" },
  "home-news": { eyebrow: "News & perspectives", title: "The governance conversation.", summary: "", ctaLabel: "View all news", ctaHref: "/news" },
  "home-partners": { eyebrow: "Strategic partners", title: "Partnerships that extend our impact.", summary: "We collaborate with institutions that share our commitment to stronger governance and capable leadership.", ctaLabel: "Explore partnerships", ctaHref: "/about/partners" },
};

function readMeta(metadata: Record<string, unknown>, key: string, fallback = "") {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function safeHref(value: string, fallback = "/") {
  const href = value.trim();
  return href.startsWith("/") || /^https?:\/\//i.test(href) ? href : fallback;
}

function asHomepageKnowledgeItems(documents: KnowledgeDocument[]): HomepageItem[] {
  return documents.map((document, index) => ({ id: document.id, title: document.title, summary: document.summary, href: document.href, image_url: document.image_url, sort_order: index, metadata: { display_meta: document.category, alt_text: document.alt_text, collection_href: document.collection_href, collection_label: document.collection_label } }));
}

function asHomepageNewsItems(articles: CmsPublicArticle[]): HomepageItem[] {
  return articles.map((article, index) => ({
    id: article.id,
    title: article.revision.title,
    summary: article.revision.standfirst,
    href: `/news/${article.slug}`,
    image_url: article.revision.cover_media?.file_url || "",
    sort_order: index,
    metadata: {
      display_meta: [article.category?.name, article.published_at ? new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""].filter(Boolean).join(" · "),
      alt_text: article.revision.cover_media?.alt_text || article.revision.title,
    },
  }));
}

function asHomepageEventItems(articles: CmsPublicArticle[]): HomepageItem[] {
  return articles.map((article, index) => ({
    id: article.id,
    title: article.revision.title,
    summary: article.revision.standfirst,
    href: `/events/${article.slug}`,
    image_url: article.revision.cover_media?.file_url || "",
    sort_order: index,
    metadata: {
      display_meta: [article.category?.name, article.published_at ? new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""].filter(Boolean).join(" Â· "),
      alt_text: article.revision.cover_media?.alt_text || article.revision.title,
    },
  }));
}

function HomeKnowledgeDocumentCard({ item }: { item: HomepageItem }) {
  const collectionHref = safeHref(readMeta(item.metadata, "collection_href", "/knowledge"));
  const collectionLabel = readMeta(item.metadata, "collection_label", "Knowledge centre");
  return <article className="grid overflow-hidden border border-[var(--color-line)] bg-white sm:grid-cols-[5.5rem_1fr]"><div className="relative h-28 bg-[var(--color-paper)] sm:h-auto sm:min-h-36">{item.image_url ? <Image src={item.image_url} alt={readMeta(item.metadata, "alt_text", `Cover for ${item.title}`)} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center p-3 text-center text-[0.65rem] font-bold tracking-[0.1em] text-[var(--color-slate)]">PDF<br />DOCUMENT</div>}</div><div className="flex min-h-0 flex-col p-4"><p className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{readMeta(item.metadata, "display_meta", "INSIGHT")}</p><h3 className="mt-3 font-serif text-lg leading-tight tracking-[-0.02em]">{item.title}</h3>{item.summary && <p className="mt-2 text-xs leading-5 text-[var(--color-slate)]">{item.summary}</p>}<Link href={collectionHref} className="link-arrow mt-auto pt-3 text-sm">Explore {collectionLabel.toLowerCase()} <Icon name="arrow-right" className="h-4 w-4" /></Link></div></article>;
}

function HomeTrainingCard({ item }: { item: HomepageItem }) {
  return <article className="group bg-[var(--color-ink)] p-7">{item.image_url && <div className="relative mb-7 aspect-[16/9] overflow-hidden bg-white/10"><Image src={item.image_url} alt={readMeta(item.metadata, "alt_text", item.title)} fill unoptimized className="object-cover transition duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none" /><div aria-hidden="true" className="absolute inset-0 bg-[var(--color-ink)]/0 transition-colors duration-500 group-hover:bg-[var(--color-ink)]/15 motion-reduce:transition-none" /></div>}<p className="text-xs font-bold tracking-[0.12em] text-[var(--color-gold-light)]">{readMeta(item.metadata, "display_meta")}</p><h3 className="mt-8 font-serif text-3xl">{item.title}</h3><p className="mt-4 leading-7 text-[var(--color-mist)]">{item.summary}</p>{readMeta(item.metadata, "detail") && <p className="mt-5 text-sm text-[var(--color-mist)]">{readMeta(item.metadata, "detail")}</p>}<Link href={safeHref(item.href)} className="mt-8 inline-block border-b border-[var(--color-gold)] pb-2 text-sm font-bold">View event <Icon name="arrow-right" className="h-4 w-4" /></Link></article>;
}

function copyFromPage(page: ContentPage, fallback: HeadingCopy): HeadingCopy {
  const cta = page.blocks.find((block) => {
    return typeof block === "object" && block !== null && "type" in block && (block as { type?: unknown }).type === "cta";
  }) as { label?: unknown; href?: unknown } | undefined;

  return {
    eyebrow: page.eyebrow || fallback.eyebrow,
    title: page.title || fallback.title,
    summary: page.summary || fallback.summary,
    ctaLabel: typeof cta?.label === "string" ? cta.label : fallback.ctaLabel,
    ctaHref: typeof cta?.href === "string" ? cta.href : fallback.ctaHref,
  };
}

function toHeroSlides(items: HomepageItem[]): HeroSlide[] {
  const fallbackImages = ["/images/leadership-forum.png", "/images/leadership-director.png", "/images/board-meeting.png"];
  return items.map((item, index) => ({
    id: item.id,
    imageUrl: item.image_url || fallbackImages[index % fallbackImages.length],
    alt: readMeta(item.metadata, "alt_text", item.title),
    eyebrow: readMeta(item.metadata, "eyebrow", "Institute of Directors Ghana"),
    title: item.title,
    description: item.summary,
    primaryLabel: readMeta(item.metadata, "primary_label", "Learn more"),
    primaryHref: safeHref(readMeta(item.metadata, "primary_href", item.href)),
    secondaryLabel: readMeta(item.metadata, "secondary_label", "Explore IoD-Gh"),
    secondaryHref: safeHref(readMeta(item.metadata, "secondary_href", "/about")),
    feature: readMeta(item.metadata, "feature", item.title),
  }));
}

export function HomepageContent({ revision, initialKnowledgeItems = [], initialKnowledgeLoaded = false }: { revision?: CmsPageRevision; initialKnowledgeItems?: KnowledgeDocument[]; initialKnowledgeLoaded?: boolean }) {
  const [loadedItems, setItems] = useState<HomepageItems>(() => ({ ...fallbackItems, knowledge: asHomepageKnowledgeItems(initialKnowledgeItems) }));
  const [loadedHeadings, setHeadings] = useState<Record<string, HeadingCopy>>(fallbackHeadings);
  const [knowledgeLoaded, setKnowledgeLoaded] = useState(initialKnowledgeLoaded);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!revision) {
        const contentSections = sections.filter((section) => section !== "knowledge");
        void Promise.allSettled(contentSections.map((section) => getPublishedContentItems(section))).then((results) => {
          if (cancelled) return;
          setItems((current) => {
            const next = { ...current };
            results.forEach((result, index) => {
              if (result.status === "fulfilled") next[contentSections[index]] = result.value;
            });
            return next;
          });
        });
        void Promise.allSettled(Object.entries(fallbackHeadings).map(async ([slug, fallback]) => [slug, copyFromPage(await getPublishedContentPage(slug), fallback)] as const)).then((results) => {
          if (cancelled) return;
          setHeadings((current) => {
            const next = { ...current };
            results.forEach((result) => {
              if (result.status === "fulfilled") next[result.value[0]] = result.value[1];
            });
            return next;
          });
        });
      }
      void getPublishedCmsArticles("news").then((articles) => {
        if (!cancelled && articles.length) setItems((current) => ({ ...current, news: asHomepageNewsItems(articles).slice(0, 3) }));
      }).catch(() => undefined);
      void getPublishedCmsArticles("event").then((articles) => {
        if (cancelled) return;
        if (articles.length) { setItems((current) => ({ ...current, training: asHomepageEventItems(articles).slice(0, 3) })); return; }
        void getPublishedContentItems("events").then((events) => {
          if (!cancelled) setItems((current) => ({ ...current, training: events.slice(0, 3) }));
        }).catch(() => undefined);
      }).catch(() => undefined);
      void Promise.allSettled(knowledgeSources.map(async (source) => knowledgeDocumentsFromPage(source, await getPublishedCmsPage(source.slug)))).then((results) => {
        if (cancelled) return;
        const documents = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
        if (results.some((result) => result.status === "fulfilled")) setItems((current) => ({ ...current, knowledge: asHomepageKnowledgeItems(documents) }));
        setKnowledgeLoaded(true);
      });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [revision]);


  const items = { ...loadedItems };
  const headings = { ...loadedHeadings };
  for (const section of revision?.sections || []) {
    const name = String(section.data.home_section || "");
    const data = section.data;
    const entry = name as HomepageSection;
    if (entry !== "knowledge" && entry !== "news" && entry !== "training" && Array.isArray(data.items) && sections.includes(entry)) items[entry] = data.items.map((value, index) => {
      const item = value as Record<string, unknown>;
      return { id: String(item.id || index), title: String(item.title || ""), summary: String(item.description || ""), href: String(item.href || (name === "partners" ? "" : "/")), image_url: String(item.image_url || ""), sort_order: index, metadata: (item.metadata || {}) as Record<string, unknown> };
    });
    headings["home-" + name] = { eyebrow: String(data.eyebrow || ""), title: String(data.heading || ""), summary: String(data.description || ""), ctaLabel: String(data.button_label || ""), ctaHref: String(data.button_href || "") };
  }
  const introduction = revision?.sections.find((section) => section.data.home_section === "introduction")?.data;

  const membership = headings["home-membership"];
  const training = headings["home-training"];
  const knowledge = headings["home-knowledge"];
  const news = headings["home-news"];
  const partners = headings["home-partners"];
  const eventsHref = safeHref(training.ctaHref || "/events");
  const eventsCtaLabel = training.ctaLabel || "Explore all events";
  const knowledgeHref = safeHref(knowledge.ctaHref || "/knowledge");
  const knowledgeCtaLabel = knowledge.ctaLabel || "Explore all insights";
  const partnersHref = safeHref(partners.ctaHref || "/about/partners");
  const partnersCtaLabel = partners.ctaLabel || "Explore partnerships";
  const heroSlides = toHeroSlides(items.hero);
  const [featuredNews, ...secondaryNews] = items.news;

  const designedSections: Record<string, ReactNode> = {
    hero: (heroSlides.length > 0 && <HeroCarousel slides={heroSlides} />),
    introduction: (<HomeIntroduction override={introduction ? { eyebrow: String(introduction.eyebrow || ""), title: String(introduction.heading || ""), summary: String(introduction.description || ""), body: String(introduction.copy || ""), blocks: [{ type: "cta", label: introduction.button_label, href: introduction.button_href }] } : undefined} />),
    membership: (items.membership.length > 0 && <section className="border-y border-[var(--color-line)] bg-[var(--color-warm-white)] py-20 sm:py-28"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="lg:col-span-4"><SectionHeading eyebrow={membership.eyebrow} title={membership.title} description={membership.summary} />{membership.ctaLabel && membership.ctaHref && <Link href={safeHref(membership.ctaHref)} className="link-arrow mt-8">{membership.ctaLabel} <Icon name="arrow-right" className="h-4 w-4" /></Link>}</div><div className="border-t border-[var(--color-ink)] lg:col-span-8">{items.membership.map((item, index) => <Link href={safeHref(item.href)} key={item.id} className="group grid gap-4 border-b border-[var(--color-line)] py-6 sm:grid-cols-[54px_1fr_auto] sm:items-start sm:px-4"><span className="font-serif text-2xl text-[var(--color-accent-dark)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-serif text-3xl">{item.title}</h3><p className="mt-2 leading-7 text-[var(--color-slate)]">{item.summary}</p></div><span className="text-sm text-[var(--color-accent-dark)]">{readMeta(item.metadata, "display_meta")}</span></Link>)}</div></div></section>),
    training: (items.training.length > 0 && <section className="bg-[var(--color-ink)] py-20 text-white sm:py-28"><div className="site-container"><SectionHeading tone="dark" eyebrow={training.eyebrow} title={training.title} description={training.summary} eyebrowHref="/events" titleHref="/events" /><div className="mt-12 grid gap-px bg-white/20 lg:grid-cols-3">{items.training.map((item) => <HomeTrainingCard key={item.id} item={item} />)}</div><Link href={eventsHref} className="mt-8 inline-flex border-b border-[var(--color-gold)] pb-2 text-sm font-bold">{eventsCtaLabel} <Icon name="arrow-right" className="h-4 w-4" /></Link></div></section>),
    knowledge: (<section aria-label="Knowledge documents" className="bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container"><SectionHeading eyebrow={knowledge.eyebrow} title={knowledge.title} description={knowledge.summary} titleHref={knowledgeHref} />{items.knowledge.length ? <div className="mt-12 grid gap-5 lg:grid-cols-3">{items.knowledge.slice(0, 3).map((item) => <HomeKnowledgeDocumentCard key={item.id} item={item} />)}</div> : <p className="mt-12 text-sm text-[var(--color-slate)]">{knowledgeLoaded || revision ? "No downloadable insight documents are available yet." : "Loading insight documents…"}</p>}<div className="mt-8 flex flex-wrap gap-x-8 gap-y-4"><Link href="/knowledge/resources" className="link-arrow">Browse resources <Icon name="arrow-right" className="h-4 w-4" /></Link><Link href={knowledgeHref} className="link-arrow">{knowledgeCtaLabel} <Icon name="arrow-right" className="h-4 w-4" /></Link></div></div></section>),
    news: (featuredNews && <section className="bg-[var(--color-ink)] py-20 text-white sm:py-28"><div className="site-container"><div className="flex flex-wrap justify-between gap-5"><SectionHeading tone="dark" eyebrow={news.eyebrow} title={news.title} description={news.summary} />{news.ctaLabel && news.ctaHref && <Link href={safeHref(news.ctaHref)} className="border-b border-[var(--color-gold)] pb-2 text-sm font-bold">{news.ctaLabel} <Icon name="arrow-right" className="h-4 w-4" /></Link>}</div><div className="mt-12 grid gap-5 lg:grid-cols-2"><article className="overflow-hidden border border-white/20">{featuredNews.image_url && <div role="img" aria-label={readMeta(featuredNews.metadata, "alt_text", featuredNews.title)} className="h-64 w-full bg-cover bg-center" style={{ backgroundImage: `url("${featuredNews.image_url}")` }} />}<div className="p-7"><p className="text-xs font-bold text-[var(--color-gold-light)]">{readMeta(featuredNews.metadata, "display_meta")}</p><h3 className="mt-4 font-serif text-3xl">{featuredNews.title}</h3><p className="mt-4 text-[var(--color-mist)]">{featuredNews.summary}</p><Link href={safeHref(featuredNews.href)} className="mt-6 inline-block text-sm font-bold">Read story <Icon name="arrow-right" className="h-4 w-4" /></Link></div></article><div className="grid gap-5">{secondaryNews.map((item) => <article className="border-b border-white/20 py-5" key={item.id}><p className="text-xs font-bold text-[var(--color-gold-light)]">{readMeta(item.metadata, "display_meta")}</p><h3 className="mt-3 font-serif text-2xl">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--color-mist)]">{item.summary}</p><Link href={safeHref(item.href)} className="mt-4 inline-block text-sm font-bold">Read story <Icon name="arrow-right" className="h-4 w-4" /></Link></article>)}</div></div></div></section>),
    partners: (<section className="border-t border-[var(--color-line)] bg-white py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 border-y border-[var(--color-line)] py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16"><SectionHeading eyebrow={partners.eyebrow} title={partners.title} description={partners.summary} titleHref={partnersHref} /><div><HomepagePartnerLogos fallbackHref={partnersHref} /><Link href={partnersHref} className="link-arrow mt-7">{partnersCtaLabel} <Icon name="arrow-right" className="h-4 w-4" /></Link></div></div></div></section>),
  };
  const membershipPosition = revision?.sections.find((section) => section.data.home_section === "membership")?.position ?? 0;
  const visibleSections = revision?.sections.filter((section) => section.is_enabled).sort((a, b) => {
    const aPosition = a.data.home_section === "hero" ? -1 : a.section_type === "training_countdown" ? membershipPosition + 0.5 : a.position;
    const bPosition = b.data.home_section === "hero" ? -1 : b.section_type === "training_countdown" ? membershipPosition + 0.5 : b.position;
    return aPosition - bPosition;
  });
  return <main>{revision ? visibleSections?.map((section, index) => <div key={section.id || index}>{section.section_type === "training_countdown" ? <HomeTrainingCountdown data={section.data} /> : designedSections[String(section.data.home_section)] || <SectionRenderer section={section} />}</div>) : Object.entries(designedSections).map(([key, section]) => <div key={key}>{section}</div>)}<HomepageWhatsApp /></main>;
}
