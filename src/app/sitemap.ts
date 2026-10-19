import type { MetadataRoute } from "next";

import { getPublishedCmsArticles } from "@/lib/api/cms";
import { eventCardHref, getPublishedEventCards } from "@/lib/cms/events";
import { absoluteSiteUrl } from "@/lib/site-url";

const publicPaths: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about/history", changeFrequency: "yearly", priority: 0.5 },
  { path: "/about/council", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about/secretariat", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about/partners", changeFrequency: "monthly", priority: 0.6 },
  { path: "/membership", changeFrequency: "monthly", priority: 0.9 },
  { path: "/membership/categories", changeFrequency: "monthly", priority: 0.8 },
  { path: "/membership/benefits", changeFrequency: "monthly", priority: 0.7 },
  { path: "/membership/fees", changeFrequency: "monthly", priority: 0.7 },
  { path: "/membership/corporate", changeFrequency: "monthly", priority: 0.7 },
  { path: "/membership/members-in-good-standing", changeFrequency: "weekly", priority: 0.7 },
  { path: "/document-requests", changeFrequency: "monthly", priority: 0.7 },
  { path: "/training", changeFrequency: "weekly", priority: 0.9 },
  { path: "/training/professional", changeFrequency: "monthly", priority: 0.8 },
  { path: "/training/cpd", changeFrequency: "weekly", priority: 0.8 },
  { path: "/training/customized", changeFrequency: "monthly", priority: 0.7 },
  { path: "/training/board-leadership-programme", changeFrequency: "monthly", priority: 0.7 },
  { path: "/training/corporate-governance-for-directors", changeFrequency: "monthly", priority: 0.7 },
  { path: "/training/effective-chair", changeFrequency: "monthly", priority: 0.7 },
  { path: "/services", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services/consultancy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/services/board-evaluation", changeFrequency: "monthly", priority: 0.7 },
  { path: "/services/corporate-meeting", changeFrequency: "monthly", priority: 0.7 },
  { path: "/events", changeFrequency: "weekly", priority: 0.8 },
  { path: "/news", changeFrequency: "weekly", priority: 0.8 },
  { path: "/knowledge", changeFrequency: "weekly", priority: 0.8 },
  { path: "/knowledge/publications", changeFrequency: "monthly", priority: 0.7 },
  { path: "/knowledge/reports", changeFrequency: "monthly", priority: 0.7 },
  { path: "/knowledge/research", changeFrequency: "monthly", priority: 0.7 },
  { path: "/knowledge/resources", changeFrequency: "weekly", priority: 0.7 },
  { path: "/media/event-gallery", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, events] = await Promise.all([
    getPublishedCmsArticles("news").catch(() => []),
    getPublishedEventCards().catch(() => []),
  ]);

  return [
    ...publicPaths.map((entry) => ({ url: absoluteSiteUrl(entry.path), changeFrequency: entry.changeFrequency, priority: entry.priority })),
    ...news.map((article) => ({ url: absoluteSiteUrl(`/news/${article.slug}`), lastModified: article.published_at || article.revision.published_at || undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...events.map((event) => ({ url: absoluteSiteUrl(eventCardHref(event)), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
