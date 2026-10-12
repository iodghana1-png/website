
import { EditableCopy } from "@/components/cms/EditableCopy";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/ui/PageHero";
import { newsItems } from "@/data/site";
import { cmsMetadata, publishedArticle } from "@/lib/api/cms-server";
import { ArticlePage } from "@/components/cms/ArticlePage";

export async function generateMetadata({ params }: { params: Promise<{ article: string }> }) {
  const article = await publishedArticle((await params).article);
  return article ? { title: article.revision.seo_title || article.revision.title, description: article.revision.seo_description || article.revision.standfirst, authors: article.author_display_name ? [{ name: article.author_display_name }] : undefined, openGraph: { type: "article", publishedTime: article.published_at || undefined, authors: article.author_display_name ? [article.author_display_name] : [], images: article.revision.cover_media ? [article.revision.cover_media.file_url] : [] } } : cmsMetadata("/news/" + (await params).article);
}

export function generateStaticParams() {
  return newsItems.map((item) => ({ article: item.href.split("/").pop()! }));
}

export default async function NewsArticle({ params }: { params: Promise<{ article: string }> }) {
  const { article } = await params;
  const published = await publishedArticle(article);
  if (published && published.content_type === "news") return <ArticlePage article={published} />;
  const item = newsItems.find((entry) => entry.href.endsWith(article));
  if (!item) notFound();

  return <><PageHero contentSlug={`news-${article}`} eyebrow={[item.category, item.date].filter(Boolean).join(" · ")} title={item.title} description={item.description} breadcrumbs={[{ label: "News", href: "/news" }, { label: item.title }]} /><article className="bg-white py-20 sm:py-28"><div className="site-container max-w-3xl"><p className="font-serif text-3xl leading-snug"><EditableCopy label="Text" fallback={"Good governance is increasingly central to the long-term resilience and credibility of organisations. That was the focus of a recent IoD-Gh discussion with directors and governance leaders."} /></p><div className="mt-10 space-y-6 leading-8 text-[var(--color-slate)]"><p><EditableCopy label="Text" fallback={"The session explored the responsibility of boards to act with independence, clarity and a strong sense of purpose. Participants reflected on how boards can improve the quality of challenge while sustaining the trust that enables good decisions."} /></p><p><EditableCopy label="Text" fallback={"IoD-Gh will continue to create spaces for practical learning and thoughtful exchange. The Institute’s programmes and resources are designed to give directors the perspective needed to respond to an evolving environment."} /></p></div></div></article></>;
}
