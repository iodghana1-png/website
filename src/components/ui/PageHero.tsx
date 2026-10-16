"use client";

import { brandText } from "@/components/ui/BrandText";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { CmsHeroImage } from "@/components/cms/HeroImage";

import type { ReactNode } from "react";

import { useCmsPage } from "@/components/content/useCmsContent";
import { Breadcrumbs } from "./Breadcrumbs";

type PageHeroProps = { eyebrow: string; title: string; description: string; children?: ReactNode; breadcrumbs?: { label: string; href?: string }[]; contentSlug?: string };

export function PageHero({ eyebrow, title, description, children, breadcrumbs, contentSlug }: PageHeroProps) {
  const page = useCmsPage(contentSlug, { eyebrow, title, summary: description, body: "", blocks: [] });
  return <BuiltInSection sectionId="hero" className="relative isolate bg-[var(--color-paper)] py-16 sm:py-20 lg:py-28"><CmsHeroImage /><div className="site-container"><Breadcrumbs items={breadcrumbs ?? []} /><div className="mt-10 grid gap-8 lg:grid-cols-12"><div className="lg:col-span-8"><p className="eyebrow">{brandText(page.eyebrow)}</p><h1 className="mt-6 max-w-4xl font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[0.96] tracking-[-0.055em]">{brandText(page.title)}</h1></div><div className="self-end lg:col-span-4"><p className="max-w-md text-lg leading-8 text-[var(--color-slate)]">{brandText(page.summary)}</p>{children && <div className="mt-7">{children}</div>}</div></div></div></BuiltInSection>;
}
