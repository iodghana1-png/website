"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import Image from "next/image";

import { useCmsPage } from "@/components/content/useCmsContent";
import { Icon } from "@/components/ui/Icon";

type Seminar = { id: string; topic: string; speaker: string; date: string; description: string; registrationHref: string; imageUrl: string };
const safeUrl = (value: unknown) => typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : "";

export function CpdMonthlySeminars() {
  const page = useCmsPage("training-cpd", { eyebrow: "", title: "", summary: "", body: "", blocks: [] });
  const block = page.blocks.find((item) => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === "seminar_list") as { items?: unknown } | undefined;
  const seminars = (Array.isArray(block?.items) ? block.items : []).flatMap((item, index): Seminar[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    const topic = typeof entry.title === "string" ? entry.title.trim() : "";
    if (!topic) return [];
    const metadata = entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) ? entry.metadata as Record<string, unknown> : {};
    return [{ id: typeof entry.id === "string" ? entry.id : String(index), topic, speaker: typeof metadata.speaker === "string" ? metadata.speaker : "", date: typeof metadata.date === "string" ? metadata.date : "", description: typeof entry.description === "string" ? entry.description : "", registrationHref: safeUrl(entry.href), imageUrl: safeUrl(entry.image_url) }];
  });

  return <BuiltInSection sectionId="cpd-seminars" sectionType="seminar_list" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow">Monthly seminars</p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]">Focused learning, every month.</h2></div><p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9">Join practical conversations with directors, experts and peers.</p></div>{seminars.length ? <div className="mt-12 grid gap-5 lg:grid-cols-3">{seminars.map((seminar) => <article className="overflow-hidden border-t-4 border-[var(--color-ink)] bg-white" key={seminar.id}><div className="relative aspect-[1085/1350] bg-[var(--color-ink)]">{seminar.imageUrl ? <Image src={seminar.imageUrl} alt={`Flyer for ${seminar.topic}`} fill unoptimized sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" /> : <div className="flex h-full items-end p-6"><span className="text-xs font-bold tracking-[0.14em] text-[var(--color-accent-light)]">MONTHLY SEMINAR</span></div>}</div><div className="p-7"><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{seminar.date || "UPCOMING SEMINAR"}</p><h3 className="mt-6 font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]">{seminar.topic}</h3>{seminar.speaker && <p className="mt-3 text-sm font-semibold text-[var(--color-slate)]">With {seminar.speaker}</p>}{seminar.description && <p className="mt-4 leading-7 text-[var(--color-slate)]">{seminar.description}</p>}{seminar.registrationHref ? <a href={seminar.registrationHref} target={seminar.registrationHref.startsWith("http") ? "_blank" : undefined} rel={seminar.registrationHref.startsWith("http") ? "noreferrer" : undefined} className="link-arrow mt-8">Register now <Icon name="external" className="h-4 w-4" /></a> : <p className="mt-8 text-sm text-[var(--color-slate)]">Registration details coming soon.</p>}</div></article>)}</div> : <div className="mt-12 border border-dashed border-[var(--color-line)] bg-white p-8"><p className="font-serif text-2xl">New seminars will appear here.</p><p className="mt-3 max-w-xl leading-7 text-[var(--color-slate)]">Add a seminar&apos;s flyer, speaker, topic, date and registration link in the Monthly seminars section of the CPD page in the CMS.</p></div>}</div></BuiltInSection>;
}
