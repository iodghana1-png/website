import { brandText } from "@/components/ui/BrandText";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { CmsHeroImage } from "@/components/cms/HeroImage";
import { EditableCopy } from "@/components/cms/EditableCopy";
import { EditableLink as Link } from "@/components/cms/EditableCopy";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CmsPageText } from "@/components/content/useCmsContent";
import { serviceItems } from "@/data/site";

const serviceDetail = {
  consultancy: {
    focus: "Clearer governance, built for your context.",
    introduction:
      "Governance consultancy helps organisations diagnose their priorities, strengthen their frameworks and make governance an active source of confidence.",
    includes: [
      "Governance diagnostic and advisory",
      "Board and committee terms of reference",
      "Policy and governance framework review",
    ],
  },
  "board-evaluation": {
    focus: "A more effective board starts with an honest view.",
    introduction:
      "Our board evaluation service gives boards a structured and independent view of how they are working, where they are strong and where focused improvement can make a difference.",
    includes: [
      "Board, committee and chair evaluation",
      "Confidential director feedback",
      "Practical recommendations and follow-through",
    ],
  },
  "corporate-meeting": {
    focus: "Better conditions for better decisions.",
    introduction:
      "IoD-Gh supports the design and delivery of focused corporate meetings, helping boards and leadership teams create the space for purposeful dialogue and decisive action.",
    includes: [
      "Meeting planning and agenda support",
      "Independent meeting facilitation",
      "Action-focused documentation and follow-up",
    ],
  },
} as const;

export function generateStaticParams() {
  return serviceItems.map((item) => ({ slug: item.href.split("/").pop()! }));
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = serviceItems.find((entry) => entry.href.endsWith(slug));
  const detail = serviceDetail[slug as keyof typeof serviceDetail];
  if (!item || !detail) notFound();
  return (
    <>
      <BuiltInSection sectionId="hero" className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white"><CmsHeroImage />
        <div className="absolute inset-y-0 right-[17%] w-px bg-white/15" />
        <div className="absolute inset-y-0 right-[34%] w-px bg-white/10" />
        <p className="pointer-events-none absolute -bottom-20 -right-4 font-serif text-[clamp(11rem,24vw,25rem)] leading-none tracking-[-0.13em] text-white/[0.045]"><EditableCopy label="Text" fallback={"IoD"} /></p>
        <div className="site-container relative py-10 sm:py-14 lg:py-16">
          <nav
            aria-label="Breadcrumb"
            className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"
          >
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/" className="hover:text-white"><EditableCopy label="Link text" fallback={"HOME"} /></Link>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">/</span>
                <Link href="/services" className="hover:text-white"><EditableCopy label="Link text" fallback={"SERVICES"} /></Link>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">/</span>
                <span className="text-white">{brandText(item.title.toUpperCase())}</span>
              </li>
            </ol>
          </nav>
          <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="eyebrow text-[var(--color-accent-light)]"><CmsPageText slug={`services-${slug}`} field="eyebrow" fallback="IoD-Gh services" /></p>
              <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,5.5vw,5.4rem)] leading-[0.94] tracking-[-0.06em]">
                <CmsPageText slug={`services-${slug}`} field="title" fallback={item.title} />
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="max-w-md text-lg leading-8 text-[var(--color-mist)]">
                <CmsPageText slug={`services-${slug}`} field="summary" fallback={item.description} />
              </p>
            </div>
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="service-overview" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-4 lg:self-start lg:py-2">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Our approach"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={String(detail.focus ?? "")} /></h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-3xl font-serif text-[clamp(1.8rem,2.7vw,2.75rem)] leading-[1.2] tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={String(detail.introduction ?? "")} /></p>
            <p className="mt-7 max-w-2xl leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Every engagement begins with the realities of your organisation. We listen closely, provide considered challenge and shape a practical response around the issues that matter."} /></p>
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="service-outcomes" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"What the service includes"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Thoughtful support at every stage."} /></h2>
          </div>
          <div className="border-t border-[var(--color-ink)] lg:col-span-7 lg:col-start-6">
            {detail.includes.map((entry, index) => (
              <div
                className="grid gap-4 border-b border-[var(--color-line)] py-7 sm:grid-cols-[64px_1fr]"
                key={entry}
              >
                <span className="font-serif text-2xl text-[var(--color-accent-dark)]">
                  0{index + 1}
                </span>
                <p className="font-serif text-2xl leading-snug tracking-[-0.025em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={String(entry ?? "")} /></p>
              </div>
            ))}
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="service-contact" className="bg-[var(--color-ink)] py-16 text-white sm:py-20">
        <div className="site-container grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback={"Start a conversation"} /></p>
            <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2.4rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]">
              Discuss your organisation&apos;s needs with IoD-Gh.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <Button
              href="/contact"
              variant="secondary"
              className="w-full border-white text-white hover:bg-white hover:text-[var(--color-ink)]"
            ><EditableCopy label="Link text" fallback={"Talk to IoD-Gh"} /></Button>
          </div>
        </div>
      </BuiltInSection>
    </>
  );
}
