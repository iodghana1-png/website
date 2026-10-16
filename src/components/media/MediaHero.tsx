"use client";

import { brandText } from "@/components/ui/BrandText";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { CmsHeroImage } from "@/components/cms/HeroImage";

import Link from "next/link";

import { useCmsPage } from "@/components/content/useCmsContent";

type MediaHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  active: "news" | "publications" | "gallery";
};

const links = [
  { label: "News", href: "/news", key: "news" },
  {
    label: "Publications",
    href: "/knowledge/publications",
    key: "publications",
  },
  { label: "Event gallery", href: "/media/event-gallery", key: "gallery" },
] as const;

export function MediaHero({
  eyebrow,
  title,
  description,
  active,
}: MediaHeroProps) {
  const contentSlug = active === "news" ? "news-page" : active === "publications" ? "knowledge-publications" : "media-event-gallery";
  const page = useCmsPage(contentSlug, { eyebrow, title, summary: description, body: "", blocks: [] });
  return (
    <BuiltInSection sectionId="hero" className="relative isolate relative isolate overflow-hidden bg-[var(--color-ink)] text-white"><CmsHeroImage />
      <div className="absolute inset-y-0 right-[12%] w-px bg-white/15" />
      <div className="absolute inset-y-0 right-[29%] w-px bg-white/10" />
      <p className="pointer-events-none absolute -bottom-20 -right-7 font-serif text-[clamp(12rem,27vw,29rem)] leading-none tracking-[-0.13em] text-white/[0.045]">
        IoD
      </p>
      <div className="site-container relative py-10 sm:py-14 lg:py-16">
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
              <span className="text-white">MEDIA</span>
            </li>
          </ol>
        </nav>
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow text-[var(--color-accent-light)]">
              {brandText(page.eyebrow)}
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,5.5vw,5.4rem)] leading-[0.94] tracking-[-0.06em]">
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
