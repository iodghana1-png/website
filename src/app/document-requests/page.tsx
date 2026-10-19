import type { Metadata } from "next";
import Link from "next/link";

import { DocumentRequestForm } from "@/components/documents/DocumentRequestForm";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Request a document | Institute of Directors-Ghana",
  description: "Request an IoD-Gh admission letter or attestation online.",
};

const documentTypes = [
  { title: "Admission letter", description: "Request a letter confirming your admission to an IoD-Gh programme or membership pathway." },
  { title: "Attestation", description: "Request a document that verifies your IoD-Gh training, participation or membership record." },
];

export default function DocumentRequestsPage() {
  return <>
    <section className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
      <div className="absolute inset-y-0 right-[12%] w-px bg-white/15" />
      <div className="absolute inset-y-0 right-[30%] w-px bg-white/10" />
      <p className="pointer-events-none absolute -bottom-12 -right-5 font-serif text-[clamp(8rem,23vw,24rem)] leading-none tracking-[-0.1em] text-white/[0.045]">IoD</p>
      <div className="site-container relative py-12 sm:py-16 lg:py-20">
        <nav aria-label="Breadcrumb" className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"><ol className="flex flex-wrap gap-2"><li><Link href="/" className="hover:text-white">HOME</Link></li><li className="flex gap-2"><span aria-hidden="true">/</span><span className="text-white">DOCUMENT REQUESTS</span></li></ol></nav>
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="eyebrow text-[var(--color-accent-light)]">Client services</p><h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.2rem,6.4vw,6.2rem)] leading-[0.94] tracking-[-0.06em]">Request an admission letter or attestation.</h1></div><p className="max-w-md text-lg leading-8 text-[var(--color-mist)] lg:col-span-4">Send your request online and our team will verify your details before preparing the document.</p></div>
      </div>
    </section>

    <section className="border-b border-[var(--color-line)] bg-white py-14 sm:py-20"><div className="site-container grid gap-8 lg:grid-cols-12"><div className="lg:col-span-4"><p className="eyebrow">How it works</p><h2 className="mt-4 max-w-sm font-serif text-4xl leading-[1.03] tracking-[-0.045em]">A simple, verified request.</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">{documentTypes.map((document) => <article key={document.title} className="border border-[var(--color-line)] p-6"><Icon name="file" className="h-6 w-6 text-[var(--color-accent-dark)]" /><h3 className="mt-6 font-serif text-2xl tracking-[-0.03em]">{document.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">{document.description}</p></article>)}</div></div></section>

    <section className="bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container grid gap-14 lg:grid-cols-12"><aside className="lg:col-span-4"><p className="eyebrow">Before you begin</p><h2 className="mt-4 font-serif text-4xl leading-[1.03] tracking-[-0.045em]">Have your details ready.</h2><ul className="mt-7 space-y-4 border-t border-[var(--color-line)] pt-5 text-sm leading-6 text-[var(--color-slate)]"><li>• The programme, course or membership you need the document for.</li><li>• Your IoD-Gh membership number, if you have one.</li><li>• The name of the person or organisation the document should be addressed to.</li></ul><p className="mt-7 text-sm leading-6 text-[var(--color-slate)]">Documents are issued only after IoD-Gh verifies the information supplied. If you need help with another matter, <Link href="/contact" className="font-bold text-[var(--color-ink)] underline underline-offset-4">contact us</Link>.</p></aside><div className="lg:col-span-7 lg:col-start-6"><DocumentRequestForm /></div></div></section>
  </>;
}
