import { cmsMetadata, publishedArticle } from "@/lib/api/cms-server";

export async function generateMetadata({ params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  const article = await publishedArticle(event);
  if (!article || article.content_type !== "event") return cmsMetadata("/events/" + event);
  const revision = article.revision;
  const title = revision.seo_title || revision.title;
  const description = revision.seo_description || revision.standfirst;
  return { title, description, openGraph: { title, description, images: revision.cover_media ? [revision.cover_media.file_url] : [] } };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
