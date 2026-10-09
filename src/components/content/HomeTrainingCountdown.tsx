"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type CountdownData = { title?: unknown; description?: unknown; start_at?: unknown; button_label?: unknown; button_href?: unknown };

function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function toDate(value: string) {
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
function timeRemaining(target: Date, now: number) {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now) / 1000));
  return { days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), seconds: totalSeconds % 60 };
}

export function HomeTrainingCountdown({ data }: { data: CountdownData }) {
  const startAt = asText(data.start_at);
  const target = startAt ? toDate(startAt) : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!target || target.getTime() <= now) return null;
  const title = asText(data.title) || "Next training programme";
  const description = asText(data.description);
  const buttonLabel = asText(data.button_label) || "Register now";
  const buttonHref = asText(data.button_href) || "/training";
  const dateLabel = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Accra" }).format(target);
  const remaining = timeRemaining(target, now);

  return <section aria-label="Next training programme" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-14 text-[var(--color-ink)] sm:py-16"><div className="site-container text-center"><p className="eyebrow text-[var(--color-accent-dark)]">Next training</p><h2 className="mx-auto mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">{title}</h2><p className="mt-4 font-semibold text-[var(--color-accent-dark)]">{dateLabel} GMT</p>{description && <p className="mx-auto mt-3 max-w-2xl leading-7 text-[var(--color-slate)]">{description}</p>}<div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 text-center sm:grid-cols-4"><TimeUnit label="Days" value={remaining.days} /><TimeUnit label="Hours" value={remaining.hours} /><TimeUnit label="Minutes" value={remaining.minutes} /><TimeUnit label="Seconds" value={remaining.seconds} /></div><Link href={buttonHref} className="mt-8 inline-flex bg-[var(--color-accent-dark)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--color-ink)]">{buttonLabel} <Icon name="arrow-right" className="h-4 w-4" /></Link></div></section>;
}

function TimeUnit({ label, value }: { label: string; value: number }) {
  return <div className="border border-[var(--color-line)] bg-white px-3 py-4"><strong className="block font-serif text-3xl tabular-nums text-[var(--color-accent-dark)]">{String(value).padStart(2, "0")}</strong><span className="mt-1 block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--color-slate)]">{label}</span></div>;
}
