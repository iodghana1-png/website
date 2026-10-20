"use client";

import Image from "next/image";
import { useContext } from "react";
import { BuiltInSection } from "@/components/cms/BuiltInSection";
import { CmsPageContext } from "@/components/cms/PageContext";
import { CmsPageText } from "@/components/content/useCmsContent";

type Spotlight = {
  id?: string;
  title?: string;
  image_url?: string;
  metadata?: Record<string, unknown>;
};

const value = (item: Spotlight, key: string) => {
  const field = item.metadata?.[key];
  return typeof field === "string" ? field.trim() : "";
};

const imageUrl = (item: Spotlight) => {
  const url = typeof item.image_url === "string" ? item.image_url.trim() : "";
  return /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : "";
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "IoD";

function Portrait({ spotlight, priority = false }: { spotlight: Spotlight; priority?: boolean }) {
  const name = value(spotlight, "display_name") || spotlight.title || "IoD-Gh member";
  const src = imageUrl(spotlight);
  if (!src) return <div aria-label={`${name} portrait placeholder`} role="img" className="grid aspect-[4/5] place-items-center bg-[var(--color-accent-dark)] font-serif text-5xl tracking-[-0.08em] text-white">{initials(name)}</div>;
  return <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-paper)]"><Image src={src} alt={value(spotlight, "alt_text") || `Portrait of ${name}`} fill priority={priority} unoptimized className="object-cover" /></div>;
}

export default function MemberSpotlightPage() {
  const context = useContext(CmsPageContext);
  const section = context?.revision.sections.find((entry) => entry.slot === "member_spotlights" && entry.is_enabled);
  const spotlights = Array.isArray(section?.data.items) ? section.data.items.filter((item): item is Spotlight => !!item && typeof item === "object") : [];
  const [featured, ...archive] = spotlights;

  return <main className="bg-white">
    <BuiltInSection sectionId="hero" className="relative isolate overflow-hidden bg-[var(--color-ink)] py-20 text-white sm:py-28">
      <div className="absolute inset-y-0 right-[12%] w-px bg-white/10" />
      <p aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-4 font-serif text-[clamp(7rem,22vw,22rem)] leading-none tracking-[-0.12em] text-white/[0.045]">MEMBER</p>
      <div className="site-container relative max-w-5xl">
        <p className="eyebrow text-[var(--color-accent-light)]"><CmsPageText slug="member-spotlight" field="eyebrow" fallback="Member spotlight" /></p>
        <h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.5rem,7vw,7rem)] leading-[0.91] tracking-[-0.07em]"><CmsPageText slug="member-spotlight" field="title" fallback="Celebrating the people who lead." /></h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-mist)]"><CmsPageText slug="member-spotlight" field="summary" fallback="Each month, we recognise a member whose leadership, service and commitment strengthen the IoD-Gh community." /></p>
      </div>
    </BuiltInSection>

    <BuiltInSection sectionId="member-spotlights" sectionType="profile_gallery" className="py-20 sm:py-28">
      <div className="site-container">
        <div className="grid gap-8 border-b border-[var(--color-line)] pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7"><p className="eyebrow">Our members</p><h2 className="mt-5 font-serif text-[clamp(2.6rem,4.8vw,5rem)] leading-[0.96] tracking-[-0.06em]">Stories of purpose, leadership and contribution.</h2></div>
          <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9">Explore the people helping to shape stronger boards, organisations and communities across Ghana.</p>
        </div>

        {!featured ? <div className="border-b border-[var(--color-line)] py-16"><p className="font-serif text-3xl tracking-[-0.04em]">Our first member story will be shared soon.</p><p className="mt-3 max-w-xl leading-7 text-[var(--color-slate)]">Check back for monthly profiles from the IoD-Gh community.</p></div> : <>
          <article className="mt-12 grid overflow-hidden bg-[var(--color-ink)] text-white lg:grid-cols-12">
            <div className="lg:col-span-5"><Portrait spotlight={featured} priority /></div>
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-7 lg:p-16">
              <p className="eyebrow text-[var(--color-accent-light)]">{value(featured, "feature_month") || "Featured member"}</p>
              <h2 className="mt-6 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.07em]">{value(featured, "display_name") || featured.title || "IoD-Gh member"}</h2>
              {value(featured, "credentials") && <p className="mt-3 text-sm font-semibold text-[var(--color-accent-light)]">{value(featured, "credentials")}</p>}
              {value(featured, "role") && <p className="mt-5 text-lg text-[var(--color-mist)]">{value(featured, "role")}</p>}
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-mist)]">{value(featured, "summary") || value(featured, "biography")}</p>
              {value(featured, "biography") && value(featured, "biography") !== value(featured, "summary") && <p className="mt-5 max-w-2xl leading-7 text-white/80">{value(featured, "biography")}</p>}
            </div>
          </article>

          {archive.length > 0 && <div className="mt-16"><p className="eyebrow">Previous spotlights</p><div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{archive.map((spotlight, index) => <article key={spotlight.id || `${spotlight.title}-${index}`} className="overflow-hidden border border-[var(--color-line)] bg-white"><Portrait spotlight={spotlight} /><div className="p-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-dark)]">{value(spotlight, "feature_month") || "Member spotlight"}</p><h3 className="mt-4 font-serif text-3xl leading-[0.95] tracking-[-0.05em]">{value(spotlight, "display_name") || spotlight.title || "IoD-Gh member"}</h3>{value(spotlight, "credentials") && <p className="mt-2 text-sm font-semibold text-[var(--color-accent-dark)]">{value(spotlight, "credentials")}</p>}{value(spotlight, "role") && <p className="mt-4 text-sm font-semibold text-[var(--color-slate)]">{value(spotlight, "role")}</p>}<p className="mt-4 leading-7 text-[var(--color-slate)]">{value(spotlight, "summary") || value(spotlight, "biography")}</p></div></article>)}</div></div>}
        </>}
      </div>
    </BuiltInSection>
  </main>;
}
