"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ContentPage, getPublishedContentPage } from "@/lib/api/content";
import { RichContent } from "@/components/cms/ContentRenderer";
import { Icon } from "@/components/ui/Icon";

const fallback = {
  eyebrow: "Who we are",
  title: "A professional home for directors.",
  summary: "Championing director professionalism and development through good corporate governance.",
  body: "Institute of Directors Ghana is a professional organization committed to the professional practice of Corporate Directorship.\n\nOur purpose is to champion director professionalism and development through good corporate governance for the benefit of organizations, stakeholders and the prosperity of Ghana.\n\nWe recognize and unlock member potential through world-class learning opportunities, knowledge sharing, networking, mentorship and the promotion of world-class standards in Corporate Governance.",
  blocks: [{ type: "cta", label: "Discover IoD-Gh", href: "/about" }],
};

function getCta(blocks: unknown[]) {
  const cta = blocks.find((block) => typeof block === "object" && block !== null && "type" in block && (block as { type?: unknown }).type === "cta") as { label?: unknown; href?: unknown } | undefined;
  return {
    label: typeof cta?.label === "string" && cta.label.trim() ? cta.label : "Discover IoD-Gh",
    href: typeof cta?.href === "string" && (cta.href.startsWith("/") || /^https?:\/\//i.test(cta.href)) ? cta.href : "/about",
  };
}

export function HomeIntroduction({ override }: { override?: Pick<ContentPage, "eyebrow" | "title" | "summary" | "body" | "blocks"> }) {
  const [loadedContent, setContent] = useState<Pick<ContentPage, "eyebrow" | "title" | "summary" | "body" | "blocks">>(fallback);
  const content = override || loadedContent;

  useEffect(() => {
    if (override) return;
    const timer = window.setTimeout(() => {
      getPublishedContentPage("home-introduction").then(setContent).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [override]);

  const paragraphs = content.body.split("\n").filter(Boolean);
  const cta = getCta(content.blocks);

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-4 lg:self-start lg:py-2">
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.5rem,3.7vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.05em]">{content.title}</h2>
          <p className="mt-6 max-w-xs text-sm leading-6 text-[var(--color-slate)]">{content.summary}</p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <div className="max-w-3xl font-serif text-[clamp(1.8rem,2.7vw,2.75rem)] font-medium leading-[1.2] tracking-[-0.035em] text-[var(--color-ink)]"><RichContent value={paragraphs[0] || ""} /></div>
          <div className="mt-9 max-w-2xl border-t border-[var(--color-line)] pt-7">
            {paragraphs.slice(1).map((paragraph) => <div className="mt-5 text-lg leading-8 text-[var(--color-slate)] first:mt-0" key={paragraph}><RichContent value={paragraph} /></div>)}
          </div>
          <Link href={cta.href} className="link-arrow mt-9">{cta.label} <Icon name="arrow-right" className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}
