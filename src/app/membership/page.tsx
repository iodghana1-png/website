"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";


import { brandText } from "@/components/ui/BrandText";
import { cmsCta, cmsHref, useCmsItems, useCmsPage } from "@/components/content/useCmsContent";
import { MembershipHero } from "@/components/membership/MembershipHero";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { membershipCategories } from "@/data/site";
import Link from "next/link";

const fallbackItems = membershipCategories.map((item, index) => ({ id: `membership-${index}`, title: item.title, summary: item.description, href: item.href, metadata: { display_meta: item.meta || "" }, image_url: "", sort_order: index + 1 }));
const fallbackPage = { eyebrow: "Membership", title: "Find your place in Ghana's director community.", summary: "Membership is a commitment to professional growth, better governance and the confidence to lead with purpose.", body: "", blocks: [{ type: "cta", label: "Begin your application", href: "/membership/apply" }] };

export default function MembershipPage() {
  const page = useCmsPage("membership-page", fallbackPage);
  const items = useCmsItems("membership", fallbackItems);
  const cta = cmsCta(page.blocks, { label: "Begin your application", href: "/membership/apply" });

  return <><MembershipHero eyebrow={page.eyebrow} title={page.title} description={page.summary}><Button href={cta.href} variant="secondary" className="border-white text-white hover:bg-white hover:text-[var(--color-ink)]"><EditableCopy label="Link text" fallback={String(cta.label ?? "")} /></Button></MembershipHero><BuiltInSection sectionId="membership-pathways" className="bg-white py-20 sm:py-28"><div className="site-container"><SectionHeading eyebrow="Choose your pathway" title="Membership that meets you where you are." /><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-2">{items.map((item, index) => {
    const featured = index === 0;
    const meta = typeof item.metadata.display_meta === "string" ? item.metadata.display_meta : "";
    return <Link href={cmsHref(item.href)} key={item.id} className={`group relative flex min-h-64 flex-col overflow-hidden border p-7 transition-all duration-300 sm:p-8 ${featured ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white md:col-span-2 xl:row-span-2 xl:min-h-[544px]" : "border-[var(--color-line)] bg-[var(--color-warm-white)] text-[var(--color-ink)] hover:-translate-y-1 hover:border-[var(--color-accent-dark)] hover:shadow-[var(--shadow-elevated)]"}`}>
      <div className="flex items-start justify-between gap-4"><span className={`font-serif text-4xl tracking-[-0.06em] ${featured ? "text-[var(--color-accent-light)]" : "text-[var(--color-accent-dark)]"}`}>{String(index + 1).padStart(2, "0")}</span>{meta && <span className={`max-w-40 border px-3 py-1.5 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] ${featured ? "border-white/25 text-white/90" : "border-[var(--color-line)] text-[var(--color-slate)]"}`}>{brandText(meta)}</span>}</div>
      <div className="mt-auto pt-12"><h3 className={`font-serif text-[clamp(2.15rem,3.2vw,3.4rem)] leading-[0.95] tracking-[-0.05em] ${featured ? "text-white" : "text-[var(--color-ink)]"}`}>{brandText(item.title)}</h3><p className={`mt-4 max-w-xl text-sm leading-6 ${featured ? "text-[var(--color-mist)] sm:text-base sm:leading-7" : "text-[var(--color-slate)]"}`}>{brandText(item.summary)}</p><span className={`mt-7 inline-flex items-center gap-3 text-sm font-bold ${featured ? "text-white" : "text-[var(--color-ink)]"}`}>Explore pathway <Icon name="arrow-right" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span></div>
      {featured && <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-7 font-serif text-[17rem] leading-none tracking-[-0.13em] text-white/[0.04]">IoD</span>}
    </Link>;
  })}</div><div className="mt-8 flex flex-col justify-between gap-5 border-t border-[var(--color-line)] pt-7 sm:flex-row sm:items-center"><p className="max-w-xl text-sm leading-6 text-[var(--color-slate)]">Not sure where to begin? Start an application and our membership committee will help determine the appropriate category.</p><Button href={cta.href} className="shrink-0">{String(cta.label ?? "Begin your application")}</Button></div></div></BuiltInSection><BuiltInSection sectionId="membership-register" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-24"><div className="site-container grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback={"Membership register"} /></p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Members in good standing."} /></h2><p className="mt-5 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"A public register recognising IoD-Gh members whose membership standing is current."} /></p></div><div className="lg:col-span-4 lg:col-start-9"><Button href="/membership/members-in-good-standing" className="w-full"><EditableCopy label="Link text" fallback={"View members in good standing"} /></Button></div></div></BuiltInSection></>;
}
