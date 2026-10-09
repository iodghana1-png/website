import Image from "next/image";
import Link from "next/link";
import type { CmsPublicArticle } from "@/lib/api/cms";
import { RichContent } from "./ContentRenderer";
import { Icon } from "@/components/ui/Icon";

export function ArticlePage({ article }: { article: CmsPublicArticle }) {
  const r = article.revision;
  const date = article.published_at || r.published_at;
  const news = article.content_type === "news";
  return <main className="bg-[var(--color-warm-white)]">
    <header className="border-b border-[var(--color-line)] bg-white py-12 sm:py-16"><div className="site-container">
      <Link href={news ? "/news" : "/events"} className="inline-flex items-center gap-2 text-sm font-semibold"><Icon name="arrow-left" className="h-4 w-4" />{news ? "News" : "Events"}</Link>
      <p className="eyebrow mt-8">{article.category?.name || (news ? "News" : "Events")}</p>
      <h1 className="mt-4 max-w-5xl font-serif text-[clamp(2.5rem,5vw,4.5rem)] leading-tight tracking-tight">{r.title}</h1>
      {r.standfirst && <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-slate)]">{r.standfirst}</p>}
      {(article.author_display_name || date) && <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-slate)]">
        {article.author_display_name && <p>By <span className="font-semibold">{article.author_display_name}</span></p>}
        {date && <time dateTime={date}>{new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>}
      </div>}
    </div></header>
    <article className="site-container max-w-4xl py-10 sm:py-14">
      {r.cover_media && <figure className="mb-10"><Image src={r.cover_media.file_url} alt={r.cover_media.alt_text || r.title} width={1200} height={750} unoptimized className="max-h-[560px] w-full object-contain" />{(r.cover_media.caption || r.cover_media.credit) && <figcaption className="mt-3 text-sm text-[var(--color-slate)]">{[r.cover_media.caption, r.cover_media.credit].filter(Boolean).join(" · ")}</figcaption>}</figure>}
      <div className="text-lg leading-8"><RichContent value={r.body} /></div>
      {!!r.gallery_media?.length && <section className="mt-10 border-t border-[var(--color-line)] pt-8" aria-label="Article photo gallery"><h2 className="font-serif text-2xl">Photo gallery</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{r.gallery_media.map((media, index) => <figure key={media.id}><Image src={media.file_url} alt={media.alt_text || `${r.title} gallery image ${index + 1}`} width={1000} height={750} unoptimized className="aspect-[4/3] w-full rounded-lg bg-[var(--color-paper)] object-cover" />{(media.caption || media.credit) && <figcaption className="mt-2 text-sm text-[var(--color-slate)]">{[media.caption, media.credit].filter(Boolean).join(" · ")}</figcaption>}</figure>)}</div></section>}
    </article>
  </main>;
}
