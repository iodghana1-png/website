"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";


import { ContentCard } from "@/components/cards/ContentCard";
import { cmsHref, cmsMeta, useCmsItems, useCmsPage } from "@/components/content/useCmsContent";
import { TrainingHero } from "@/components/training/TrainingHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { trainingProgrammes } from "@/data/site";

const fallbackItems = trainingProgrammes.map((item, index) => ({ id: `training-${index}`, title: item.title, summary: item.description, href: item.href, metadata: { display_meta: item.date || "", detail: item.meta || "" }, image_url: "", sort_order: index + 1 }));
const fallbackPage = { eyebrow: "Professional development", title: "Develop your directorship.", summary: "Practical programmes for directors who want to lead boards with greater confidence, judgement and impact.", body: "", blocks: [] };
const pathways = [["Professional training", "Core programmes for directors and aspiring directors.", "/training/professional"], ["Continuous professional development", "Focused learning that keeps your governance knowledge current.", "/training/cpd"], ["Customised programmes", "Bespoke learning for boards, leaders and organisations.", "/training/customized"]] as const;

export default function TrainingPage() {
  const page = useCmsPage("training-page", fallbackPage);
  const items = useCmsItems("training", fallbackItems);

  return <><TrainingHero eyebrow={page.eyebrow} title={page.title} description={page.summary} /><BuiltInSection sectionId="training-programmes" className="bg-white py-20 sm:py-28"><div className="site-container"><SectionHeading eyebrow="Upcoming programmes" title="Learning for the work that matters." titleClassName="font-bold" /><div className="mt-12 grid gap-5 lg:grid-cols-3">{items.map((item, index) => <ContentCard item={{ title: item.title, description: item.summary, href: cmsHref(item.href), date: cmsMeta(item, "display_meta"), meta: cmsMeta(item, "detail") }} index={index} key={item.id} />)}</div></div></BuiltInSection><BuiltInSection sectionId="training-pathways" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-24"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="lg:col-span-4"><p className="eyebrow"><EditableCopy label="Text" fallback={"Learning pathways"} /></p><h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Development that meets the moment."} /></h2></div><div className="border-t border-[var(--color-ink)] lg:col-span-8">{pathways.map(([title, description, href], index) => <a href={href} className="group grid gap-4 border-b border-[var(--color-line)] py-7 transition-colors hover:bg-white sm:grid-cols-[54px_1fr_auto] sm:items-start sm:px-4" key={title}><span className="font-serif text-2xl text-[var(--color-accent-dark)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={String(title ?? "")} /></h3><p className="mt-2 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(description ?? "")} /></p></div><Icon name="arrow-right" className="h-5 w-5 text-[var(--color-ink)] transition-transform group-hover:translate-x-1" /></a>)}</div></div></BuiltInSection></>;
}
