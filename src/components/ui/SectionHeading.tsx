import { brandText } from "@/components/ui/BrandText";

import Link from "next/link";

type SectionHeadingProps = { eyebrow: string; title: string; description?: string; tone?: "light" | "dark"; titleClassName?: string; className?: string; titleHref?: string; eyebrowHref?: string };

export function SectionHeading({ eyebrow, title, description, tone = "light", titleClassName = "", className = "", titleHref, eyebrowHref }: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <p className={`eyebrow ${tone === "dark" ? "text-[var(--color-gold-light)]" : ""}`}>{eyebrowHref ? <Link href={eyebrowHref} className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">{brandText(eyebrow)}</Link> : brandText(eyebrow)}</p>
      <h2 className={`mt-5 font-serif text-[clamp(2.3rem,4vw,3.7rem)] leading-[1.02] tracking-[-0.045em] ${tone === "dark" ? "text-white" : "text-[var(--color-ink)]"} ${titleClassName}`}>{titleHref ? <Link href={titleHref} className="transition-colors hover:text-[var(--color-accent-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">{brandText(title)}</Link> : brandText(title)}</h2>
      {description && <p className={`mt-5 max-w-xl text-lg leading-8 ${tone === "dark" ? "text-[var(--color-mist)]" : "text-[var(--color-slate)]"}`}>{brandText(description)}</p>}
    </div>
  );
}
