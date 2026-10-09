"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import Image from "next/image";

import { useCmsPage } from "@/components/content/useCmsContent";
import { Icon } from "@/components/ui/Icon";

type VideoItem = { id: string; title: string; description: string; date: string; href: string; videoId: string };

function youtubeVideoId(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const videoId = hostname === "youtu.be" ? url.pathname.split("/")[1] : hostname.endsWith("youtube.com") ? url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] : "";
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
  } catch {
    return "";
  }
}

export function CpdVideoLibrary() {
  const page = useCmsPage("training-cpd", { eyebrow: "", title: "", summary: "", body: "", blocks: [] });
  const block = page.blocks.find((item) => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === "video_list") as { items?: unknown } | undefined;
  const videos = (Array.isArray(block?.items) ? block.items : []).flatMap((item, index): VideoItem[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    const videoId = youtubeVideoId(entry.href);
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    if (!title || !videoId || typeof entry.href !== "string") return [];
    const metadata = entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) ? entry.metadata as Record<string, unknown> : {};
    return [{ id: typeof entry.id === "string" ? entry.id : String(index), title, description: typeof entry.description === "string" ? entry.description : "", date: typeof metadata.date === "string" ? metadata.date : "", href: entry.href, videoId }];
  });

  return <BuiltInSection sectionId="cpd-videos" sectionType="video_list" className="bg-[var(--color-ink)] py-20 text-white sm:py-28"><div className="site-container"><div className="grid gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow text-[var(--color-accent-light)]">Seminar library</p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]">Previous seminar recordings.</h2></div><p className="max-w-md leading-7 text-[var(--color-mist)] lg:col-span-4 lg:col-start-9">Revisit ideas and conversations from past IoD-Gh seminars.</p></div>{videos.length ? <div className="mt-12 grid gap-px overflow-hidden border border-white/20 bg-white/20 lg:grid-cols-3">{videos.map((video) => <article className="bg-[var(--color-ink)] p-6 sm:p-7" key={video.id}><a href={video.href} target="_blank" rel="noreferrer" className="group block"><div className="relative aspect-video overflow-hidden border border-white/20 bg-white/5"><Image src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`} alt={`Thumbnail for ${video.title}`} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" /><span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid h-14 w-14 place-items-center rounded-full border border-white/80 bg-black/25 text-lg" aria-hidden="true"><Icon name="play" className="h-5 w-5" /></span></span></div><p className="mt-7 text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]">{video.date || "SEMINAR RECORDING"}</p><h3 className="mt-3 font-serif text-2xl leading-tight tracking-[-0.03em]">{video.title}</h3>{video.description && <p className="mt-4 leading-7 text-[var(--color-mist)]">{video.description}</p>}<span className="link-arrow mt-7 text-white">Watch on YouTube <span aria-hidden="true"><Icon name="play" className="h-5 w-5" /></span></span></a></article>)}</div> : <div className="mt-12 border border-dashed border-white/30 p-8"><p className="font-serif text-2xl">Recordings will appear here.</p><p className="mt-3 max-w-xl leading-7 text-[var(--color-mist)]">Add a YouTube link in the Seminar recordings section of the CPD page in the CMS.</p></div>}</div></BuiltInSection>;
}
