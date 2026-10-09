"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";


import { EditableImage as Image } from "@/components/cms/EditableCopy";
import { EditableLink as Link } from "@/components/cms/EditableCopy";
import { useHeroImage } from "@/components/cms/HeroImage";

import { useCmsPage } from "@/components/content/useCmsContent";
import { Icon } from "@/components/ui/Icon";

const links = [
  ["Our history", "/about/history", "The story of a professional community committed to better leadership."],
  ["Vision & mission", "/about/vision-mission", "The principles and aspirations that guide our work."],
  ["Council", "/about/council", "The Institute's elected leadership and strategic stewards."],
  ["Secretariat", "/about/secretariat", "The team that delivers IoD-Gh's work every day."],
  ["Strategic partners", "/about/partners", "Collaborating for wider influence and stronger governance."],
];

const purposePillars = [
  ["01", "Competence", "Developing the knowledge, judgement and confidence directors need to serve effectively."],
  ["02", "Integrity", "Promoting ethical leadership, accountability and principled decision-making in every boardroom."],
  ["03", "Professionalism", "Championing the highest standards in the practice of corporate directorship."],
];

export default function AboutPage() {
  const image = useHeroImage();
  const page = useCmsPage("about-page", { eyebrow: "About IoD-Gh", title: "Professional directorship. Stronger Ghana.", summary: "IoD-Gh is Ghana's professional institute for directors, championing better boards, better leadership and better governance.", body: "", blocks: [] });
  return (
    <>
      <BuiltInSection sectionId="hero" className="relative isolate min-h-[390px] overflow-hidden bg-[var(--color-ink)] text-white sm:min-h-[465px]">
        {(!image || image.url) && <Image src={image?.url || "/images/leadership-forum.png"} alt={image?.alt || "Ghanaian leaders in discussion at an IoD-Gh forum"} unoptimized={!!image} fill priority sizes="100vw" className="object-cover object-center" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(39,27,84,0.94)_0%,rgba(39,27,84,0.78)_48%,rgba(39,27,84,0.36)_100%)]" />
        <div className="site-container relative flex min-h-[390px] items-end py-12 sm:min-h-[465px] sm:py-16 lg:py-20">
          <div className="grid w-full gap-7 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="eyebrow text-[var(--color-accent-light)]">{page.eyebrow}</p>
              <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[0.96] tracking-[-0.055em]">{page.title}</h1>
            </div>
            <p className="max-w-md text-lg leading-8 text-[var(--color-mist)] lg:col-span-4">{page.summary}</p>
          </div>
        </div>
      </BuiltInSection>

      <BuiltInSection sectionId="about-introduction" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-4 lg:self-start lg:py-2">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Who we are"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.5rem,3.7vw,4.25rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"A professional home for directors."} /></h2>
            <p className="mt-6 max-w-xs text-sm leading-6 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"A national community for those committed to the work and responsibility of the boardroom."} /></p>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-3xl font-serif text-[clamp(1.8rem,2.7vw,2.75rem)] leading-[1.2] tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={"Institute of Directors Ghana is a professional organization committed to the professional practice of Corporate Directorship."} /></p>
            <div className="mt-9 max-w-2xl border-t border-[var(--color-line)] pt-7">
              <p className="text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Our purpose is to champion director professionalism and development through good corporate governance for the benefit of organizations, stakeholders and the prosperity of Ghana."} /></p>
              <p className="mt-5 text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"We recognise and unlock member potential through world-class learning opportunities, knowledge sharing, networking, mentorship and the promotion of world-class standards in Corporate Governance."} /></p>
            </div>
          </div>
        </div>
      </BuiltInSection>

      <BuiltInSection sectionId="about-principles" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Our purpose"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Competence, integrity and professionalism."} /></h2>
          </div>
          <div className="border-t border-[var(--color-ink)] lg:col-span-8">
            {purposePillars.map(([number, title, description]) => (
              <article className="grid gap-4 border-b border-[var(--color-line)] py-7 sm:grid-cols-[72px_1fr]" key={title}>
                <p className="font-serif text-2xl text-[var(--color-accent-dark)]">{number}</p>
                <div>
                  <h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={String(title ?? "")} /></h3>
                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(description ?? "")} /></p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </BuiltInSection>

      <BuiltInSection sectionId="about-explore" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Explore the Institute"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"The people and purpose behind IoD-Gh."} /></h2>
          </div>
          <div className="border-t border-[var(--color-ink)] lg:col-span-8">
            {links.map(([title, href, description]) => (
              <Link href={href} key={href} className="group grid gap-4 border-b border-[var(--color-line)] py-6 transition-colors hover:bg-[var(--color-warm-white)] sm:grid-cols-[1fr_auto] sm:items-center sm:px-4">
                <div>
                  <h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={String(title ?? "")} /></h3>
                  <p className="mt-2 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(description ?? "")} /></p>
                </div>
                <Icon name="arrow-right" className="h-5 w-5 text-[var(--color-ink)] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </BuiltInSection>
    </>
  );
}
