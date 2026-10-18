import { getPublishedCmsPage, type CmsPageRevision } from "@/lib/api/cms";
import { getPublishedContentItems, type ContentItem } from "@/lib/api/content";
import { sectionState } from "./sectionVisibility";

export type EventCard = Pick<ContentItem, "id" | "title" | "summary" | "href" | "metadata" | "image_url" | "sort_order">;
export const eventCardsSlot = "event_cards";

/**
 * Event cards own their detail URL. This prevents a copied or stale CMS link
 * from making one event's card open the details for a different event.
 */
export function eventCardHref(card: Pick<EventCard, "id" | "href" | "metadata">) {
  if (card.metadata.link_type === "registration") return safeEventHref(card.href);
  // Server-rendered fallback cards have static IDs before CMS data loads. Use
  // their supplied public URL instead of creating a temporary 404 URL.
  if (/^(?:fallback-)?event-\d+$/.test(card.id)) return safeEventHref(card.href);
  return `/events/${encodeURIComponent(card.id)}`;
}

export function eventRegistrationHref(card: Pick<EventCard, "href" | "metadata">) {
  const value = card.metadata.link_type === "registration" ? card.href : card.metadata.registration_href;
  return typeof value === "string" ? safeEventHref(value, "") : "";
}

function safeEventHref(value: string, fallback = "/events") {
  const href = value.trim();
  return href.startsWith("/") || /^https?:\/\//i.test(href) ? href : fallback;
}

export function eventCardsFromRevision(revision: CmsPageRevision): EventCard[] {
  if (sectionState(revision, "events-list")) return [];
  return revision.sections.filter((section) => section.slot === eventCardsSlot && section.is_enabled)
    .sort((a, b) => a.position - b.position)
    .flatMap((section) => Array.isArray(section.data.items) ? section.data.items : [])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id || index), title: String(item.title || ""), summary: String(item.description || ""),
      href: String(item.href || "/events"), image_url: String(item.image_url || ""), sort_order: index,
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {},
    }));
}

export async function getPublishedEventCards(): Promise<EventCard[]> {
  const page = await getPublishedCmsPage("events-page").catch(() => null);
  return page ? eventCardsFromRevision(page.revision) : getPublishedContentItems("events");
}
