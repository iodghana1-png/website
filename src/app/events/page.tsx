"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";

import { useCmsItems, useCmsPage } from "@/components/content/useCmsContent";
import { EventsCalendar } from "@/components/events/EventsCalendar";
import { EventsHero } from "@/components/events/EventsHero";
const fallbackPage = { eyebrow: "IoD-Gh events", title: "Where Ghana's director community meets.", summary: "Events that bring directors together for practical learning, considered debate and meaningful connection.", body: "", blocks: [] };

export default function EventsPage() {
  const page = useCmsPage("events-page", fallbackPage);
  const items = useCmsItems("events", []);

  return <><EventsHero eyebrow={page.eyebrow} title={page.title} description={page.summary} /><BuiltInSection sectionId="events-list" className="bg-[var(--color-ink)] py-20 text-white sm:py-28"><div className="site-container"><p className="eyebrow text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback="Upcoming events" /></p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback="Conversations that move governance forward." /></h2><EventsCalendar events={items} /></div></BuiltInSection></>;
}
