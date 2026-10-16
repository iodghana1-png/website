"use client";

import { brandText } from "@/components/ui/BrandText";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { CmsHeroImage } from "@/components/cms/HeroImage";

import Link from "next/link";

import { useCmsPage } from "@/components/content/useCmsContent";

type KnowledgeHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  active?: "all" | "reports" | "research" | "resources";
};

const links = [
  { label: "All insight", href: "/knowledge", key: "all" },
  { label: "Reports", href: "/knowledge/reports", key: "reports" },
  { label: "Research", href: "/knowledge/research", key: "research" },
  { label: "Resources", href: "/knowledge/resources", key: "resources" },
] as const;

export function KnowledgeHero({
  eyebrow,
  title,
  description,
  active,
}: KnowledgeHeroProps) {
  const page = useCmsPage(active === "all" ? "knowledge-page" : `knowledge-${active}`, { eyebrow, title, summary: description, body: "", blocks: [] });
  return (
    <BuiltInSection sectionId="hero" className="relative isolate relative overflow-hidden bg-[var(--color-ink)] text-white"><CmsHeroImage />
      <div className="absolute inset-y-0 right-[12%] w-px bg-white/15" />
      <div className="absolute inset-y-0 right-[29%] w-px bg-white/10" />
      <p className="pointer-events-none absolute -bottom-16 -right-4 font-serif text-[clamp(11rem,25vw,27rem)] leading-none tracking-[-0.13em] text-white/[0.045]">
        IoD
      </p>
      <div className="site-container relative py-12 sm:py-16 lg:py-20">
        <nav
          aria-label="Breadcrumb"
          className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"
        >
          <ol className="flex gap-2">
            <li>
              <Link href="/" className="hover:text-white">
                HOME
              </Link>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">/</span>
              <span className="text-white">KNOWLEDGE</span>
            </li>
          </ol>
        </nav>
        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-8">
            <p className="eyebrow text-[var(--color-accent-light)]">{brandText(page.eyebrow)}</p>
            <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,5.6vw,5.5rem)] leading-[0.94] tracking-[-0.06em]">
              {brandText(page.title)}
            </h1>
          </div>
          <p className="max-w-md text-lg leading-8 text-[var(--color-mist)] lg:col-span-4">
            {brandText(page.summary)}
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/20 pt-5">
          {links.map((link) => (
            <Link
              className={`border-b pb-1 text-sm font-bold transition-colors ${active === link.key ? "border-[var(--color-accent-light)] text-white" : "border-transparent text-[var(--color-mist)] hover:border-white/50 hover:text-white"}`}
              href={link.href}
              key={link.key}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </BuiltInSection>
  );
}
