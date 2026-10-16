"use client";

import { brandText } from "@/components/ui/BrandText";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { CmsHeroImage } from "@/components/cms/HeroImage";

import Link from "next/link";
import type { ReactNode } from "react";

import { useCmsPage } from "@/components/content/useCmsContent";

const details: Record<string, string> = {
  categories: "Find your membership pathway",
  benefits: "Recognition, learning and connection",
  fees: "An investment in better directorship",
  corporate: "Stronger governance within organisations",
  verify: "Confirm a member's standing",
  membership: "Your professional community",
};

type MembershipHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  slug?: string;
  children?: ReactNode;
};

export function MembershipHero({ eyebrow, title, description, slug = "membership", children }: MembershipHeroProps) {
  const isMain = slug === "membership";
  const page = useCmsPage(isMain ? "membership-page" : `membership-${slug}`, { eyebrow, title, summary: description, body: "", blocks: [] });

  return (
    <BuiltInSection sectionId="hero" className="relative isolate relative isolate overflow-hidden bg-[var(--color-ink)] text-white"><CmsHeroImage />
      <div className="absolute inset-y-0 right-[11%] w-px bg-white/15" />
      <div className="absolute inset-y-0 right-[30%] w-px bg-white/10" />
      <p className="pointer-events-none absolute -bottom-14 -right-8 font-serif text-[clamp(7rem,20vw,22rem)] leading-none tracking-[-0.1em] text-white/[0.045]">MEMBER</p>
      <div className="site-container relative py-12 sm:py-16 lg:py-20">
        <nav aria-label="Breadcrumb" className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"><ol className="flex flex-wrap gap-2"><li><Link href="/" className="hover:text-white">HOME</Link></li>{!isMain && <li className="flex gap-2"><span aria-hidden="true">/</span><Link href="/membership" className="hover:text-white">MEMBERSHIP</Link></li>}{!isMain && <li className="flex gap-2"><span aria-hidden="true">/</span><span className="text-white">{brandText(page.eyebrow.toUpperCase())}</span></li>}</ol></nav>
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8"><p className="eyebrow text-[var(--color-accent-light)]">{brandText(page.eyebrow)}</p><h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.2rem,6.4vw,6.2rem)] leading-[0.94] tracking-[-0.06em]">{brandText(page.title)}</h1></div>
          <div className="lg:col-span-4"><p className="max-w-md text-lg leading-8 text-[var(--color-mist)]">{brandText(page.summary)}</p><p className="mt-8 border-t border-[var(--color-accent)] pt-4 text-sm font-bold tracking-[0.06em] text-white">{details[slug] ?? "Institute of Directors-Ghana"}</p>{children && <div className="mt-7">{children}</div>}</div>
        </div>
      </div>
    </BuiltInSection>
  );
}
