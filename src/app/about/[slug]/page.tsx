import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { EditableCopy } from "@/components/cms/EditableCopy";
import { notFound, permanentRedirect } from "next/navigation";
import { AboutHero } from "@/components/about/AboutHero";
import { SecretariatGrid } from "@/components/about/SecretariatGrid";
import { PartnersShowcase } from "@/components/content/PartnerLogos";
import { ProfilePhotosProvider } from "@/components/about/ProfilePhotos";
import { CouncilProfiles } from "@/components/about/CouncilProfiles";
import { Logo } from "@/components/layout/Logo";
import { pageCopy } from "@/data/site";

export function generateStaticParams() {
  return Object.keys(pageCopy)
    .filter((slug) => slug !== "about")
    .map((slug) => ({ slug }));
}

const sections: Record<string, string[]> = {
  history: [
    "The initiative to establish the Institute started in June 1998 by the Commonwealth Secretariat, the Commonwealth Association for Corporate Governance and the State Enterprises Commission of Ghana. They organized a three-day workshop in Accra and, at the end of the workshop, participants unanimously agreed on the need for the formation of an Institute of Directors-Ghana. A task force was subsequently set up to prepare the grounds for its establishment, leading to the registration of the Institute on 21st May 1999 with an eleven-member Council.",
    "After 20 years of operations under the Company's Code, the Institute is now registered as a Professional Body under the Professional Bodies Registration Act 1973 (NRCD 143), with registration number PB-71, effective 31st August 2020.",
  ],
  council: [
    "The Council brings together experienced leaders from across Ghana's business, public and professional communities.",
    "Their stewardship ensures the Institute remains relevant, independent and firmly focused on the public value of good governance.",
  ],
  secretariat: [
    "Our team works with members, faculty, partners and stakeholders to create high-quality experiences at every point of contact.",
    "Together, we make the Institute's purpose tangible through programmes, convening and service.",
  ],
  partners: [
    "Our partners help us bring international perspective, sector insight and practical reach to the director community.",
    "We welcome collaboration with organisations that believe governance is a foundation for sustainable progress.",
  ],
};

const visionMission = [
  [
    "Our Vision",
    "To be the leading institution for Directorship and best practices in Corporate Governance in Ghana.",
  ],
  [
    "Our Mission",
    "The mission of the Institute is to promote good Corporate Governance for the benefit of all Stakeholders.",
  ],
];

const coreValues = [
  ["01", "Competence", "Adding value continuously to corporate activity."],
  [
    "02",
    "Professionalism",
    "Excellent qualities demonstrated through training.",
  ],
  ["03", "Integrity", "Providing leadership with honesty and integrity."],
];

export default async function AboutDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "vision-mission") permanentRedirect("/about/history");
  const copy = pageCopy[slug];
  if (!copy) notFound();

  const isHistory = slug === "history";
  const isCouncil = slug === "council";
  const isSecretariat = slug === "secretariat";
  const isPartners = slug === "partners";

  return (
    <>
      <AboutHero slug={slug} {...copy} />

      {isHistory ? (
        <>
          <BuiltInSection sectionId="about-story" className="bg-white py-14 sm:py-18">
            <div className="site-container grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="relative min-h-48 lg:col-span-4 lg:min-h-0">
                <p className="relative z-10 eyebrow">Our history</p>
                <div className="pointer-events-none absolute -left-4 top-2 opacity-[0.16] sm:-left-8 lg:-left-10 lg:top-8">
                  <Logo decorative showName={false} markClassName="h-48 w-48 sm:h-60 sm:w-60 lg:h-72 lg:w-72" />
                </div>
              </div>
              <div className="space-y-5 lg:col-span-7 lg:col-start-6">
                {sections.history.map((text) => (
                  <p className="text-sm leading-6 text-[var(--color-slate)] sm:text-base sm:leading-7" key={text}><EditableCopy label="Text" fallback={String(text ?? "")} /></p>
                ))}
              </div>
            </div>
          </BuiltInSection>

          <BuiltInSection sectionId="vision-mission" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-14 sm:py-18">
            <div className="site-container grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <p className="eyebrow"><EditableCopy label="Text" fallback={"Our direction"} /></p>
                <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"The purpose behind our work."} /></p>
              </div>
              <div className="border-t border-[var(--color-ink)] lg:col-span-7 lg:col-start-6">
                {visionMission.map(([label, statement]) => (
                  <article
                    className="border-b border-[var(--color-line)] py-6 sm:py-7"
                    key={label}
                  >
                    <p className="eyebrow"><EditableCopy label="Text" fallback={String(label ?? "")} /></p>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-ink)] sm:text-lg"><EditableCopy label="Text" fallback={String(statement ?? "")} /></p>
                  </article>
                ))}
              </div>
            </div>
          </BuiltInSection>

          <BuiltInSection sectionId="values" className="border-b border-[var(--color-line)] bg-white py-14 sm:py-18">
            <div className="site-container grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <p className="eyebrow"><EditableCopy label="Text" fallback={"Our core values"} /></p>
                <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"How we lead."} /></p>
              </div>
              <div className="border-t border-[var(--color-ink)] lg:col-span-8">
                {coreValues.map(([number, title, description]) => (
                  <article
                    className="grid gap-3 border-b border-[var(--color-line)] py-5 sm:grid-cols-[56px_1fr] sm:py-6"
                    key={title}
                  >
                    <p className="text-sm font-semibold text-[var(--color-accent-dark)]">
                      {number}
                    </p>
                    <div>
                      <p className="text-base font-semibold text-[var(--color-ink)]"><EditableCopy label="Text" fallback={String(title ?? "")} /></p>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(description ?? "")} /></p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </BuiltInSection>
        </>
      ) : isCouncil ? (
        <ProfilePhotosProvider pageSlug="about-council">
        <BuiltInSection sectionId="council" sectionType="profile_gallery" className="bg-white py-20 sm:py-28">
          <div className="site-container">
            <div className="grid gap-8 border-b border-[var(--color-line)] pb-12 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="eyebrow"><EditableCopy label="Text" fallback={"11th Governing Council · 2025–2027"} /></p>
                <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.35rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Leadership in service of the Institute and the profession."} /></h2>
              </div>
              <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"The Council provides stewardship, strategic direction and oversight for IoD-Gh and the standards of professional directorship in Ghana."} /></p>
            </div>

            <CouncilProfiles />
          </div>
        </BuiltInSection>
        </ProfilePhotosProvider>
      ) : isSecretariat ? (
        <>
          <BuiltInSection sectionId="secretariat-introduction" className="bg-white py-20 sm:py-28">
            <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-4 lg:self-start lg:py-2">
                <p className="eyebrow"><EditableCopy label="Text" fallback={"How we work"} /></p>
                <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"A team built around service and delivery."} /></h2>
              </div>
              <div className="space-y-7 lg:col-span-7 lg:col-start-6">
                {sections.secretariat.map((text) => (
                  <p
                    className="font-serif text-3xl leading-snug tracking-[-0.025em]"
                    key={text}
                  ><EditableCopy label="Text" fallback={String(text ?? "")} /></p>
                ))}
              </div>
            </div>
          </BuiltInSection>
          <SecretariatGrid />
        </>
      ) : isPartners ? (
        <>
          <BuiltInSection sectionId="partners-introduction" className="bg-white py-20 sm:py-28">
            <div className="site-container"><div className="mx-auto max-w-3xl text-center"><p className="eyebrow"><EditableCopy label="Text" fallback={"Our partners"} /></p><h2 className="mt-5 font-serif text-[clamp(2.5rem,4vw,4.35rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Partnerships that strengthen our impact."} /></h2><div className="mt-8 space-y-5 text-lg leading-8 text-[var(--color-slate)]">{sections.partners.map((text) => <p key={text}><EditableCopy label="Text" fallback={text} /></p>)}</div></div></div>
          </BuiltInSection>
          <BuiltInSection sectionId="partner-logos" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container"><PartnersShowcase /></div></BuiltInSection>
        </>
      ) : (
        <BuiltInSection sectionId="about-story" className="bg-white py-20 sm:py-28">
          <div className="site-container grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">
                {isHistory ? "Our Story" : "The Institute"}
              </p>
            </div>
            <div className="space-y-7 lg:col-span-7 lg:col-start-6">
              {(sections[slug] ?? []).map((text) => (
                <p
                  className={
                    isHistory
                      ? "text-lg leading-8 text-[var(--color-slate)]"
                      : "font-serif text-3xl leading-snug tracking-[-0.025em]"
                  }
                  key={text}
                ><EditableCopy label="Text" fallback={String(text ?? "")} /></p>
              ))}
              {!isHistory && (
                <div className="border-l-2 border-[var(--color-gold)] bg-[var(--color-warm-white)] p-7">
                  <p className="leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"This is representative Phase 1 content. Confirmed Institute leadership biographies and partner information will replace it before publication."} /></p>
                </div>
              )}
            </div>
          </div>
        </BuiltInSection>
      )}
    </>
  );
}
