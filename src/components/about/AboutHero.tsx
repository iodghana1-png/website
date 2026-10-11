"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";


import { CmsHeroImage } from "@/components/cms/HeroImage";

import { EditableLink as Link } from "@/components/cms/EditableCopy";

import { useCmsPage } from "@/components/content/useCmsContent";

const details: Record<string, { display: string; detail: string }> = {
  history: { display: "HERITAGE", detail: "History · Vision · Mission" },
  "vision-mission": { display: "PURPOSE", detail: "Competence · Integrity · Professionalism" },
  council: { display: "STEWARDSHIP", detail: "11th Governing Council · 2025–2027" },
  secretariat: { display: "PEOPLE", detail: "Purpose in practice" },
  partners: { display: "PARTNERSHIP", detail: "Stronger governance, together" },
};

type AboutHeroProps = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
};

export function AboutHero({ slug, eyebrow, title, description }: AboutHeroProps) {
  const detail = details[slug] ?? { display: "ABOUT", detail: "Institute of Directors-Ghana" };
  const page = useCmsPage(`about-${slug}`, { eyebrow, title, summary: description, body: "", blocks: [] });
  const isHistoryPage = slug === "history";

  return (
    <BuiltInSection sectionId="hero" className="relative isolate relative isolate overflow-hidden bg-[var(--color-ink)] text-white"><CmsHeroImage />
      <div className="absolute inset-y-0 right-[10%] w-px bg-white/15" />
      <div className="absolute inset-y-0 right-[29%] w-px bg-white/10" />
      <p className="pointer-events-none absolute -bottom-14 -right-9 font-serif text-[clamp(7rem,20vw,22rem)] leading-none tracking-[-0.1em] text-white/[0.045]"><EditableCopy label="Text" fallback={String(detail.display ?? "")} /></p>
      <div className="site-container relative py-12 sm:py-16 lg:py-20">
        <nav aria-label="Breadcrumb" className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"><ol className="flex flex-wrap gap-2"><li><Link href="/" className="hover:text-white"><EditableCopy label="Link text" fallback={"HOME"} /></Link></li><li className="flex gap-2"><span aria-hidden="true">/</span><Link href="/about" className="hover:text-white"><EditableCopy label="Link text" fallback={"ABOUT"} /></Link></li><li className="flex gap-2"><span aria-hidden="true">/</span><span className="text-white">{page.eyebrow.toUpperCase()}</span></li></ol></nav>
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8"><p className="eyebrow text-[var(--color-accent-light)]">{page.eyebrow}</p><h1 className={isHistoryPage ? "mt-5 max-w-4xl font-serif text-[clamp(2.6rem,5vw,4.6rem)] leading-[0.98] tracking-[-0.05em]" : "mt-6 max-w-4xl font-serif text-[clamp(3.2rem,6.4vw,6.2rem)] leading-[0.94] tracking-[-0.06em]"}>{page.title}</h1></div>
          <div className="lg:col-span-4"><p className={isHistoryPage ? "max-w-md leading-7 text-[var(--color-mist)]" : "max-w-md text-lg leading-8 text-[var(--color-mist)]"}>{page.summary}</p><p className="mt-8 border-t border-[var(--color-accent)] pt-4 text-sm font-bold tracking-[0.06em] text-white"><EditableCopy label="Text" fallback={String(detail.detail ?? "")} /></p></div>
        </div>
      </div>
    </BuiltInSection>
  );
}
