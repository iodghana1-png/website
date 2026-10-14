import { EditableCopy } from "@/components/cms/EditableCopy";
import { ArticlePage } from "@/components/cms/ArticlePage";
import { EventsHero } from "@/components/events/EventsHero";
import { Button } from "@/components/ui/Button";
import { events } from "@/data/site";
import { publishedArticle } from "@/lib/api/cms-server";
import { eventRegistrationHref, getPublishedEventCards, type EventCard } from "@/lib/cms/events";
import { notFound } from "next/navigation";

export function generateStaticParams() { return events.map((item) => ({ event: item.href.split("/").pop()! })); }

function cardMeta(card: EventCard, key: string) {
  const value = card.metadata[key];
  return typeof value === "string" ? value : "";
}

function CmsEventCardDetail({ card }: { card: EventCard }) {
  const registrationHref = eventRegistrationHref(card);
  const actionLabel = registrationHref ? "Register interest" : "Enquire about this event";

  return <><EventsHero contentSlug="" eyebrow="IoD-Gh event" title={card.title} description={card.summary} date={cardMeta(card, "display_meta")} meta={cardMeta(card, "detail")}><Button href={registrationHref || "/contact"} variant="secondary" className="border-white text-white hover:bg-white hover:text-[var(--color-ink)]">{actionLabel}</Button></EventsHero><section className="bg-white py-20 sm:py-28"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="lg:col-span-7"><p className="eyebrow">Event overview</p><h2 className="mt-5 font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]">About this event.</h2><p className="mt-7 text-lg leading-8 text-[var(--color-slate)]">{card.summary}</p></div><aside className="self-start border-t-4 border-[var(--color-ink)] bg-[var(--color-paper)] p-7 lg:col-span-4 lg:col-start-9"><p className="eyebrow">Registration</p><h2 className="mt-4 font-serif text-3xl tracking-[-0.04em]">Join the conversation.</h2><p className="mt-4 leading-7 text-[var(--color-slate)]">{registrationHref ? "Use the registration link below to register your interest for this event." : "Contact the IoD-Gh team to register your interest for this event."}</p><Button href={registrationHref || "/contact"} className="mt-7 w-full">{actionLabel}</Button></aside></div></section></>;
}

export default async function EventDetail({ params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  const eventCards = await getPublishedEventCards().catch(() => []);
  const card = eventCards.find((entry) => entry.id === event);
  if (card) return <CmsEventCardDetail card={card} />;

  const published = await publishedArticle(event);
  if (published && published.content_type === "event") return <ArticlePage article={published} />;
  const item = events.find((entry) => entry.href.endsWith(event));
  if (!item) notFound();

  return <><EventsHero contentSlug={`events-${event}`} eyebrow="IoD-Gh event" title={item.title} description={item.description} date={item.date} meta={item.meta}><Button href="#registration" variant="secondary" className="border-white text-white hover:bg-white hover:text-[var(--color-ink)]"><EditableCopy label="Link text" fallback="Register interest" /></Button></EventsHero><section className="bg-white py-20 sm:py-28"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback="Event overview" /></p><h2 className="mt-5 font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback="A focused conversation for directors." /></h2><p className="mt-7 text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback="Join fellow directors, executives and governance leaders for a timely examination of the issues that shape better organisations. The programme combines expert perspective, peer dialogue and practical takeaways." /></p><h3 className="mt-12 font-serif text-3xl tracking-[-0.035em]"><EditableCopy label="Heading" fallback="Programme highlights" /></h3><ol className="mt-6 border-t border-[var(--color-line)]">{["Welcome and keynote perspective", "Director panel and moderated discussion", "Peer exchange and networking reception"].map((entry, index) => <li className="grid gap-4 border-b border-[var(--color-line)] py-5 sm:grid-cols-[54px_1fr]" key={entry}><span className="font-serif text-2xl text-[var(--color-accent-dark)]">0{index + 1}</span><span className="pt-1 text-lg text-[var(--color-ink)]">{entry}</span></li>)}</ol></div><aside id="registration" className="self-start border-t-4 border-[var(--color-ink)] bg-[var(--color-paper)] p-7 lg:col-span-4 lg:col-start-9"><p className="eyebrow"><EditableCopy label="Text" fallback="Registration" /></p><h2 className="mt-4 font-serif text-3xl tracking-[-0.04em]"><EditableCopy label="Heading" fallback="Join the conversation." /></h2><p className="mt-4 leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback="Register your interest for this event. Registration will be connected in a future phase." /></p><Button href="#" className="mt-7 w-full"><EditableCopy label="Link text" fallback="Register interest" /></Button></aside></div></section></>;
}
