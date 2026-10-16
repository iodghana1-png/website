import { brandText } from "@/components/ui/BrandText";

import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  if (!items.length) return null;
  return <nav aria-label="Breadcrumb" className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]"><ol className="flex flex-wrap gap-2"><li><Link href="/" className="hover:text-[var(--color-ink)]">HOME</Link></li>{items.map((item) => <li className="flex gap-2" key={item.label}><span aria-hidden="true">/</span>{item.href ? <Link href={item.href} className="hover:text-[var(--color-ink)]">{brandText(item.label.toUpperCase())}</Link> : <span className="text-[var(--color-ink)]">{brandText(item.label.toUpperCase())}</span>}</li>)}</ol></nav>;
}
