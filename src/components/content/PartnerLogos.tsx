"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CmsPublicPage, getPublishedCmsPage } from "@/lib/api/cms";
import { Icon } from "@/components/ui/Icon";

type Partner = { id: string; title: string; image_url: string; href: string; metadata: Record<string, unknown> };
const webUrl = (value: string) => /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : "";

function PartnerCarousel({ title, partners, fallbackHref = "" }: { title: string; partners: Partner[]; fallbackHref?: string }) {
  const carousel = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const move = (direction: -1 | 1) => {
    const element = carousel.current;
    if (!element) return;
    const end = element.scrollWidth - element.clientWidth;
    const next = direction === 1 ? (element.scrollLeft >= end - 4 ? 0 : Math.min(end, element.scrollLeft + element.clientWidth)) : (element.scrollLeft <= 4 ? end : Math.max(0, element.scrollLeft - element.clientWidth));
    element.scrollTo({ left: next, behavior: "smooth" });
  };
  useEffect(() => {
    if (paused || partners.length < 3 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(timer);
  }, [paused, partners.length]);
  return <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}><div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-dark)]">{title}</p>{partners.length > 2 && <div className="flex gap-2"><button type="button" aria-label={`Previous ${title.toLowerCase()}`} onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"><Icon name="arrow-left" className="h-4 w-4" /></button><button type="button" aria-label={`Next ${title.toLowerCase()}`} onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"><Icon name="arrow-right" className="h-4 w-4" /></button></div>}</div><ul ref={carousel} aria-label={title} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {partners.map((item) => {
      const alt = typeof item.metadata.alt_text === "string" && item.metadata.alt_text.trim() ? item.metadata.alt_text : item.title || "Partner logo";
      const logo = <Image src={webUrl(item.image_url)} alt={alt} width={240} height={120} unoptimized className="h-20 w-full object-contain" />;
      const href = webUrl(item.href) || webUrl(fallbackHref);
      const tile = "flex min-h-32 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white p-5";
      return <li key={item.id} className="w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)]">{href ? <Link href={href} aria-label={item.title || alt} className={tile + " transition-colors hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]"}>{logo}</Link> : <div className={tile}>{logo}</div>}</li>;
    })}
  </ul></div>;
}

export function PartnerLogos({ items, fallbackHref }: { items: Partner[]; fallbackHref?: string }) {
  const partners = items.filter((item) => webUrl(item.image_url));
  if (!partners.length) return null;
  return <PartnerCarousel title="Our partners" partners={partners} fallbackHref={fallbackHref} />;
}

function PartnerGrid({ title, partners }: { title: string; partners: Partner[] }) {
  return <section className="mx-auto max-w-5xl"><h2 className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-dark)]">{title}</h2><ul aria-label={title} className="mx-auto mt-5 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3">{partners.map((item) => {
    const alt = typeof item.metadata.alt_text === "string" && item.metadata.alt_text.trim() ? item.metadata.alt_text : item.title || "Partner logo";
    const logo = <Image src={webUrl(item.image_url)} alt={alt} width={240} height={120} unoptimized className="h-20 w-full object-contain" />;
    const href = webUrl(item.href);
    const tile = "flex min-h-32 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white p-5";
    return <li key={item.id}>{href ? <Link href={href} aria-label={item.title || alt} className={tile + " transition-colors hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]"}>{logo}</Link> : <div className={tile}>{logo}</div>}</li>;
  })}</ul></section>;
}

function partnerPageEntries(page: CmsPublicPage): Partner[] {
  return page.revision.sections.filter((section) => section.section_type === "partner_logos" && section.is_enabled && Array.isArray(section.data.items)).flatMap((section) => (section.data.items as unknown[]).filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)).map((item, index) => ({
    id: String(item.id || `${section.id}-${index}`), title: typeof item.title === "string" ? item.title : "", image_url: typeof item.image_url === "string" ? item.image_url : "", href: typeof item.href === "string" ? item.href : "",
    metadata: item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {},
  })));
}

export function HomepagePartnerLogos({ fallbackHref }: { fallbackHref: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => { let active = true; getPublishedCmsPage("about-partners").then((page) => { if (active) setPartners(partnerPageEntries(page)); }).catch(() => {}); return () => { active = false; }; }, []);
  const logos = partners.filter((item) => webUrl(item.image_url));
  const strategic = logos.filter((item) => item.metadata.partner_type === "strategic");
  const corporate = logos.filter((item) => item.metadata.partner_type !== "strategic");
  if (!logos.length) return null;
  const pages = (title: string, entries: Partner[]) => Array.from({ length: Math.ceil(entries.length / 4) }, (_, index) => ({ title: entries.length > 4 ? `${title} · ${index + 1} of ${Math.ceil(entries.length / 4)}` : title, partners: entries.slice(index * 4, index * 4 + 4) }));
  const groups = [...pages("Strategic partners", strategic), ...pages("Corporate partners", corporate)];
  return <PartnerGroupSlider groups={groups} fallbackHref={fallbackHref} />;
}

function PartnerGroupSlider({ groups, fallbackHref }: { groups: Array<{ title: string; partners: Partner[] }>; fallbackHref: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const changeGroup = (direction: -1 | 1) => setActive((current) => (current + direction + groups.length) % groups.length);
  useEffect(() => {
    if (paused || groups.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % groups.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, groups.length]);
  return <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}><div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-dark)]" aria-live="polite">{groups[active]?.title}</p>{groups.length > 1 && <div className="flex gap-2"><button type="button" aria-label="Show previous partner group" onClick={() => changeGroup(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white"><Icon name="arrow-left" className="h-4 w-4" /></button><button type="button" aria-label="Show next partner group" onClick={() => changeGroup(1)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white"><Icon name="arrow-right" className="h-4 w-4" /></button></div>}</div><div className="overflow-hidden"><div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${active * 100}%)` }}>{groups.map((group, index) => <ul key={`${group.title}-${index}`} aria-label={group.title} className="grid w-full shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">{group.partners.map((item) => { const alt = typeof item.metadata.alt_text === "string" && item.metadata.alt_text.trim() ? item.metadata.alt_text : item.title || "Partner logo"; const href = webUrl(item.href) || webUrl(fallbackHref); const logo = <Image src={webUrl(item.image_url)} alt={alt} width={240} height={120} unoptimized className="h-16 w-full object-contain sm:h-20" />; const tile = "flex min-h-24 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white p-4"; return <li key={item.id}>{href ? <Link href={href} aria-label={item.title || alt} className={tile + " transition-colors hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]"}>{logo}</Link> : <div className={tile}>{logo}</div>}</li>; })}</ul>)}</div></div></div>;
}

export function PartnersShowcase() {
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => { let active = true; getPublishedCmsPage("about-partners").then((page) => { if (active) setPartners(partnerPageEntries(page)); }).catch(() => {}); return () => { active = false; }; }, []);
  const logos = partners.filter((item) => webUrl(item.image_url));
  const strategic = logos.filter((item) => item.metadata.partner_type === "strategic");
  const corporate = logos.filter((item) => item.metadata.partner_type !== "strategic");
  return <div className="space-y-10"><PartnerGrid title="Strategic partners" partners={strategic} /><PartnerGrid title="Corporate partners" partners={corporate} /></div>;
}
