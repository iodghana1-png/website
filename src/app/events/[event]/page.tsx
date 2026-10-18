import { EditableCopy } from "@/components/cms/EditableCopy";
import { ArticlePage } from "@/components/cms/ArticlePage";
import { EventsHero } from "@/components/events/EventsHero";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { events } from "@/data/site";
import { publishedArticle } from "@/lib/api/cms-server";
import { eventRegistrationHref, getPublishedEventCards, type EventCard } from "@/lib/cms/events";
import { notFound } from "next/navigation";

export function generateStaticParams() { return events.map((item) => ({ event: item.href.split("/").pop()! })); }

function cardMeta(card: EventCard, key: string) {
  const value = card.metadata[key];
  return typeof value === "string" ? value : "";
}

function cardLines(card: EventCard, key: string) {
  return cardMeta(card, key).split("\n").map((line) => line.trim()).filter(Boolean);
}

function CmsEventCardDetail({ card }: { card: EventCard }) {
  const registrationHref = eventRegistrationHref(card);
  const actionLabel = registrationHref ? "Register interest" : "Enquire about this event";
  const overviewHeading = cardMeta(card, "page_heading") || "About this event.";
  const overview = cardLines(card, "full_description");
  const programme = cardLines(card, "programme");
  const speakers = cardLines(card, "speakers");
  const registrationInfo = cardMeta(card, "registration_info");
  const imageUrl = /^https?:\/\//i.test(card.image_url) || /^\/(?!\/)/.test(card.image_url) ? card.image_url : "";

  return <><EventsHero contentSlug="" eyebrow="IoD-Gh event" title={card.title} description={card.summary} date={cardMeta(card, "display_meta")} meta={cardMeta(card, "detail")}><Button href={registrationHref || "/contact"} variant="secondary" className="border-white text-white hover:bg-white hover:text-[var(--color-ink)]">{actionLabel}</Button></EventsHero><section className="bg-white py-20 sm:py-28"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="space-y-12 lg:col-span-7"><div><p className="eyebrow">Event overview</p><h2 className="mt-5 font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]">{overviewHeading}</h2>{imageUrl && <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-[var(--color-paper)]"><Image src={imageUrl} alt={cardMeta(card, "alt_text") || `Event image for ${card.title}`} fill sizes="(min-width: 1024px) 58vw, 100vw" unoptimized className="object-cover" /></div>}<div className="mt-7 space-y-5 text-lg leading-8 text-[var(--color-slate)]">{(overview.length ? overview : [card.summary]).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></div>{programme.length > 0 && <div><p className="eyebrow">Programme</p><h2 className="mt-5 font-serif text-3xl tracking-[-0.035em]">What to expect.</h2><ol className="mt-6 border-t border-[var(--color-line)]">{programme.map((entry, index) => <li className="grid gap-4 border-b border-[var(--color-line)] py-5 sm:grid-cols-[54px_1fr]" key={entry}><span className="font-serif text-2xl text-[var(--color-accent-dark)]">{String(index + 1).padStart(2, "0")}</span><span className="pt-1 text-lg text-[var(--color-ink)]">{entry}</span></li>)}</ol></div>}</div><aside className="space-y-8 self-start lg:col-span-4 lg:col-start-9"><div id="registration" className="border-t-4 border-[var(--color-ink)] bg-[var(--color-paper)] p-7"><p className="eyebrow">Registration</p><h2 className="mt-4 font-serif text-3xl tracking-[-0.04em]">Join the conversation.</h2><p className="mt-4 leading-7 text-[var(--color-slate)]">{registrationInfo || (registrationHref ? "Use the registration link below to register your interest for this event." : "Contact the IoD-Gh team to register your interest for this event.")}</p><Button href={registrationHref || "/contact"} className="mt-7 w-full">{actionLabel}</Button></div>{speakers.length > 0 && <div className="border border-[var(--color-line)] bg-white p-7"><p className="eyebrow">Speakers and facilitators</p><ul className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-4 text-lg leading-7 text-[var(--color-ink)]">{speakers.map((speaker) => <li key={speaker}>{speaker}</li>)}</ul></div>}</aside></div></section></>;
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
