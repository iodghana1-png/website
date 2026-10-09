
import { EditableCopy } from "@/components/cms/EditableCopy";
import { EditableLink as Link } from "@/components/cms/EditableCopy";
import type { ContentCard as ContentCardType } from "@/data/site";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export function ContentCard({ item, index = 0 }: { item: ContentCardType; index?: number }) {
  return <article className="group flex h-full flex-col border border-[var(--color-line)] bg-white p-6 transition-colors hover:border-[var(--color-gold)] sm:p-7"><div className="flex min-h-7 items-start justify-between gap-3">{item.category ? <Badge>{item.category}</Badge> : <span className="font-serif text-2xl text-[var(--color-gold-dark)]">0{index + 1}</span>}{item.date && <time className="text-right text-xs font-bold leading-5 text-[var(--color-gold-dark)]">{item.date}</time>}</div><h3 className="mt-9 font-serif text-3xl leading-tight tracking-[-0.03em]"><EditableCopy label="Heading" fallback={String(item.title ?? "")} /></h3><p className="mt-4 leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(item.description ?? "")} /></p>{item.meta && <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-sm font-medium text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(item.meta ?? "")} /></p>}<Link href={item.href} className="link-arrow mt-auto inline-flex items-center pt-8">Explore <Icon name="external" className="ml-2 h-4 w-4" /></Link></article>;
}
