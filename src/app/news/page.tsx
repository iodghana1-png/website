"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import Image from "next/image";
import Link from "next/link";

import { EditableCopy } from "@/components/cms/EditableCopy";
import { cmsHref, cmsMeta, type CmsItem, useCmsItems, useCmsPage } from "@/components/content/useCmsContent";
import { MediaHero } from "@/components/media/MediaHero";
import { Icon } from "@/components/ui/Icon";
import { newsItems } from "@/data/site";

const fallbackItems = newsItems.map((item, index) => ({ id: `news-${index}`, title: item.title, summary: item.description, href: item.href, metadata: { display_meta: [item.category, item.date].filter(Boolean).join(" · "), alt_text: "Ghanaian executives at a professional leadership forum" }, image_url: index === 0 ? "/images/leadership-forum.png" : "", sort_order: index + 1 }));
const fallbackPage = { eyebrow: "IoD-Gh news", title: "The conversation on governance.", summary: "News, perspectives and practical insight from the Institute and Ghana's director community.", body: "", blocks: [] };

function NewsCard({ item }: { item: CmsItem }) {
  const imageUrl = item.image_url && /^(https?:\/\/|\/(?!\/))/i.test(item.image_url) ? item.image_url : "";

  return <article className="group overflow-hidden border border-[var(--color-line)] bg-white transition-colors hover:border-[var(--color-gold)]">
    <Link href={cmsHref(item.href)} className="flex h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent-dark)]">
      <div className="relative w-32 shrink-0 bg-[var(--color-paper)] sm:w-36">
        {imageUrl ? <Image src={imageUrl} alt={cmsMeta(item, "alt_text", item.title)} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center p-3 text-center text-[0.6rem] font-bold tracking-[0.1em] text-[var(--color-slate)]">IoD-Gh<br />NEWS</div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <p className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{cmsMeta(item, "display_meta")}</p>
        <h3 className="mt-3 font-serif text-xl leading-tight tracking-[-0.03em] group-hover:underline">{item.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-slate)]">{item.summary}</p>
        <span className="link-arrow mt-5 text-sm">Read story <Icon name="arrow-right" className="h-4 w-4" /></span>
      </div>
    </Link>
  </article>;
}

export default function NewsPage() {
  const page = useCmsPage("news-page", fallbackPage);
  const items = useCmsItems("news", fallbackItems);
  const [featured, ...rest] = items;

  return <>
    <MediaHero active="news" eyebrow={page.eyebrow} title={page.title} description={page.summary} />
    {featured && <BuiltInSection sectionId="news-list" className="bg-white py-20 sm:py-28"><div className="site-container">
      <article className="overflow-hidden bg-[var(--color-ink)] text-white">
        <Link href={cmsHref(featured.href)} className="group grid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-gold)] lg:grid-cols-2">
          {featured.image_url ? <div role="img" aria-label={cmsMeta(featured, "alt_text", featured.title)} className="min-h-80 h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${featured.image_url}")` }} /> : <div className="grid min-h-80 place-items-center bg-[var(--color-paper)] text-xs font-bold tracking-[0.12em] text-[var(--color-slate)]">IoD-Gh NEWS</div>}
          <div className="p-8 sm:p-12"><p className="eyebrow text-[var(--color-gold-light)]">{cmsMeta(featured, "display_meta")}</p><h2 className="mt-6 font-serif text-4xl leading-tight group-hover:underline"><EditableCopy label="Heading" fallback={String(featured.title ?? "")} /></h2><p className="mt-5 leading-7 text-[var(--color-mist)]"><EditableCopy label="Text" fallback={String(featured.summary ?? "")} /></p><span className="mt-8 inline-flex border-b border-[var(--color-gold)] pb-2 text-sm font-bold">Read story <Icon name="arrow-right" className="h-4 w-4" /></span></div>
        </Link>
      </article>
      <div className="mt-12 grid gap-5 lg:grid-cols-3">{rest.map((item) => <NewsCard item={item} key={item.id} />)}</div>
    </div></BuiltInSection>}
  </>;
}
