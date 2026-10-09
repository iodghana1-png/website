"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import Link from "next/link";

import { cmsHref, cmsMeta, useCmsItems, useCmsPage } from "@/components/content/useCmsContent";
import { EventsHero } from "@/components/events/EventsHero";
import { Icon } from "@/components/ui/Icon";
import { events } from "@/data/site";

const fallbackItems = events.map((item, index) => ({ id: `event-${index}`, title: item.title, summary: item.description, href: item.href, metadata: { display_meta: item.date || "", detail: item.meta || "" }, image_url: "", sort_order: index + 1 }));
const fallbackPage = { eyebrow: "IoD-Gh events", title: "Where Ghana's director community meets.", summary: "Events that bring directors together for practical learning, considered debate and meaningful connection.", body: "", blocks: [] };

export default function EventsPage() {
  const page = useCmsPage("events-page", fallbackPage);
  const items = useCmsItems("events", fallbackItems);

  return <><EventsHero eyebrow={page.eyebrow} title={page.title} description={page.summary} /><BuiltInSection sectionId="events-list" className="bg-white py-20 sm:py-28"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="lg:col-span-4"><p className="eyebrow">Upcoming events</p><h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]">Conversations that move governance forward.</h2></div><div className="border-t border-[var(--color-ink)] lg:col-span-8">{items.map((item) => <Link href={cmsHref(item.href)} className="group grid gap-5 border-b border-[var(--color-line)] py-7 transition-colors hover:bg-[var(--color-warm-white)] sm:grid-cols-[160px_1fr_auto] sm:items-center sm:px-4" key={item.id}><div><p className="font-serif text-2xl leading-none text-[var(--color-ink)]">{cmsMeta(item, "display_meta")}</p></div><div><h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]">{item.title}</h3><p className="mt-3 max-w-xl leading-7 text-[var(--color-slate)]">{item.summary}</p><p className="mt-3 text-sm font-bold text-[var(--color-accent-dark)]">{cmsMeta(item, "detail")}</p></div><Icon name="arrow-right" className="h-5 w-5 text-[var(--color-ink)] transition-transform group-hover:translate-x-1" /></Link>)}</div></div></BuiltInSection></>;
}
