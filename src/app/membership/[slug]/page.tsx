import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { EditableCopy } from "@/components/cms/EditableCopy";
import { CmsPageText } from "@/components/content/useCmsContent";
import { CmsHeroImage } from "@/components/cms/HeroImage";
import { notFound } from "next/navigation";
import { EditableLink as Link } from "@/components/cms/EditableCopy";
import { MembersDirectory } from "@/components/membership/MembersDirectory";
import { MembershipHero } from "@/components/membership/MembershipHero";
import { MemberVerification } from "@/components/membership/MemberVerification";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { membershipCategories } from "@/data/site";
import {
  corporateMembershipFees,
  individualMembershipFees,
} from "@/data/membershipFees";

const memberBenefits = [
  { title: "Be Part of a New Culture", description: "Accelerate your professional development with visionary and astute business leaders just like you. Our growing community of experienced directors and committed mentors from across Ghana are changing the Ghanaian business landscape. Become a part of something bigger with Institute of Directors-Ghana!" },
  { title: "Be up to Speed", description: "Designed to expand your horizon, our networking events allow you to broaden your network capacity while increasing your knowledge on key issues in business. As a member, you are entitled to use our expansive resource library and receive expert Director advice in all fields of operation." },
  { title: "Be the Best You", description: "Your profile gets better with internationally recognised qualifications and certificates at the end of our training packages. Enrol in courses and training events organised for leaders by leaders in an interactive, flexible learning environment." },
  { title: "Beyond your Boundaries", description: "Today’s business world demands leaders who are ready to take extraordinary steps for extraordinary results. We are committed to helping your business grow, while your membership offers national and international recognition as a director." },
  { title: "Be Found!", description: "Break your boundaries and expand your reach with valuable connections to new clients when you join IoD-Gh. Members are included in the Directors’ register and can access our search service for independent director placements." },
  { title: "Be in the Know", description: "Knowledge is power. Our newsletters, blogs and updates put expert advice, inspirational ideas and the latest news directly in your hands, so you are among the first to know." },
];

const content: Record<
  string,
  { title: string; description: string; eyebrow: string }
> = {
  categories: {
    eyebrow: "Membership",
    title: "A community shaped by contribution.",
    description:
      "Discover the membership category aligned to your experience, ambition and organisational role.",
  },
  benefits: {
    eyebrow: "Membership benefits",
    title: "More confidence in every boardroom.",
    description:
      "Professional recognition, purposeful learning and meaningful peer connection - all in one membership.",
  },
  fees: {
    eyebrow: "Membership fees",
    title: "A clear investment in your directorship.",
    description:
      "Explore indicative annual membership fees and programme options for individuals and organisations.",
  },
  corporate: {
    eyebrow: "Corporate membership",
    title: "Stronger governance begins inside the organisation.",
    description:
      "Equip your leadership community with the insight, development and connection to lead responsibly.",
  },
  verify: {
    eyebrow: "Member verification",
    title: "Verify an IoD-Gh member.",
    description:
      "Use a member's name or membership number to check their standing. This Phase 1 form is non-functional.",
  },
  "members-in-good-standing": {
    eyebrow: "Membership register",
    title: "Members in good standing.",
    description:
      "A public register for recognising IoD-Gh members whose membership standing is current.",
  },
};

export function generateStaticParams() {
  return Object.keys(content).map((slug) => ({ slug }));
}

function MembershipFees() {
  return (
    <>
      <BuiltInSection sectionId="membership-fees" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Individual membership"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"A clear investment in your directorship."} /></h2>
            <p className="mt-6 max-w-sm leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Explore admission fees, annual subscriptions and the requirements for each individual membership pathway."} /></p>
          </div>
          <div className="border-t border-[var(--color-ink)] lg:col-span-8">
            {individualMembershipFees.map((plan, index) => (
              <article
                className="grid gap-5 border-b border-[var(--color-line)] py-8 sm:grid-cols-[60px_1fr_auto] sm:py-10"
                key={plan.title}
              >
                <p className="font-serif text-2xl text-[var(--color-accent-dark)]">
                  0{index + 1}
                </p>
                <div>
                  <h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={String(plan.title ?? "")} /></h3>
                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(plan.description ?? "")} /></p>
                  <details className="group mt-6">
                    <summary className="cursor-pointer list-none border-b border-[var(--color-accent)] pb-2 text-sm font-bold text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">
                        View benefits and eligibility
                      </span>
                      <span className="hidden group-open:inline">
                        Hide benefits and eligibility
                      </span>
                    </summary>
                    <div className="mt-5 grid gap-6 md:grid-cols-2">
                      <div>
                        <p className="eyebrow"><EditableCopy label="Text" fallback={"Benefits"} /></p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-slate)]">
                          {plan.benefits.map((item) => (
                            <li
                              className="border-l border-[var(--color-accent)] pl-3"
                              key={item}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {plan.eligibility.length > 0 && (
                        <div>
                          <p className="eyebrow"><EditableCopy label="Text" fallback={"Eligibility"} /></p>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-slate)]">
                            {plan.eligibility.map((item) => (
                              <li
                                className="border-l border-[var(--color-accent)] pl-3"
                                key={item}
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
                <dl className="min-w-44 border-l border-[var(--color-line)] pl-5 sm:self-start">
                  <div>
                    <dt className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">
                      ADMISSION FEE
                    </dt>
                    <dd className="mt-2 font-serif text-2xl text-[var(--color-ink)]">
                      {plan.admission}
                    </dd>
                  </div>
                  <div className="mt-5">
                    <dt className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">
                      SUBSCRIPTION
                    </dt>
                    <dd className="mt-2 text-sm font-bold leading-5 text-[var(--color-ink)]">
                      {plan.renewal}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="membership-payment" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="site-container">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow"><EditableCopy label="Text" fallback={"Membership for corporate entities"} /></p>
              <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Invest in stronger boards."} /></h2>
            </div>
            <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"Corporate membership offers tailored visibility, development and governance support for organisations."} /></p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {corporateMembershipFees.map((plan) => (
              <article
                className="border-t-4 border-[var(--color-ink)] bg-white p-7 sm:p-8"
                key={plan.title}
              >
                <p className="eyebrow"><EditableCopy label="Text" fallback={"Corporate membership"} /></p>
                <h3 className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={String(plan.title ?? "")} /></h3>
                <p className="mt-5 font-serif text-3xl text-[var(--color-accent-dark)]"><EditableCopy label="Text" fallback={String(plan.subscription ?? "")} /></p>
                <details className="group mt-7">
                  <summary className="cursor-pointer list-none border-b border-[var(--color-accent)] pb-2 text-sm font-bold text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">
                      View membership benefits
                    </span>
                    <span className="hidden group-open:inline">
                      Hide membership benefits
                    </span>
                  </summary>
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-slate)]">
                    {plan.benefits.map((benefit) => (
                      <li
                        className="border-l border-[var(--color-accent)] pl-3"
                        key={benefit}
                      >
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </details>
                <Button href="/contact" variant="secondary" className="mt-8"><EditableCopy label="Link text" fallback={"Talk to IoD-Gh"} /></Button>
              </article>
            ))}
          </div>
        </div>
      </BuiltInSection>
    </>
  );
}

function MembershipBenefitsCms() {
  return <>
    <BuiltInSection sectionId="benefits-introduction" className="bg-white py-20 sm:py-28"><div className="site-container max-w-4xl"><p className="eyebrow"><EditableCopy label="Text" fallback="Why join IoD-Gh" /></p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.6rem,4.6vw,5rem)] leading-[0.98] tracking-[-0.06em]"><EditableCopy label="Heading" fallback="Boosting your career as a director has never been easier." /></h2><p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback="Our community of like-minded, highly diversified directors is here to offer the support that both you and your organisation need to grow." /></p><Button href="/membership/apply" cmsKey="membership-benefits-introduction-cta" cmsLabel="Join us link" className="mt-8"><EditableCopy label="Link text" fallback="Join us" /></Button></div></BuiltInSection>
    <BuiltInSection sectionId="benefit-stories" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container"><div className="max-w-3xl"><p className="eyebrow"><EditableCopy label="Text" fallback="More than membership" /></p><h2 className="mt-5 font-serif text-[clamp(2.6rem,4.6vw,5rem)] leading-[0.98] tracking-[-0.06em]"><EditableCopy label="Heading" fallback="Unlock your potential as a transformational business leader." /></h2></div><div className="mt-14 border-t border-[var(--color-ink)]">{memberBenefits.map((benefit, index) => <article key={benefit.title} className="grid gap-6 border-b border-[var(--color-line)] py-8 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:py-10"><span className="font-serif text-3xl tracking-[-0.06em] text-[var(--color-accent-dark)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-serif text-[clamp(2rem,3.4vw,3.4rem)] leading-[0.98] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={benefit.title} /></h3><p className="mt-5 max-w-3xl leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={benefit.description} /></p></div><Button href="/membership/apply" cmsKey={`membership-benefits-${index + 1}-cta`} cmsLabel={`Join now link for ${benefit.title}`} variant="secondary" className="w-fit whitespace-nowrap"><EditableCopy label="Link text" fallback="Join us now" /></Button></article>)}</div></div></BuiltInSection>
    <BuiltInSection sectionId="membership-documents" className="bg-white py-20 sm:py-28"><div className="site-container grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-5"><p className="eyebrow"><EditableCopy label="Text" fallback="Membership resources" /></p><h2 className="mt-5 font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback="Everything you need to get started." /></h2></div><div className="grid gap-5 lg:col-span-6 lg:col-start-7"><div className="border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)] p-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-dark)]"><EditableCopy label="Text" fallback="PDF guide" /></p><h3 className="mt-2 font-serif text-2xl leading-tight"><EditableCopy label="Heading" fallback="Membership requirements and benefits" /></h3><Button href="https://iodghana.org/wp-content/uploads/2025/01/IoD-Gh-Individual-and-Corporate-Membership-Requirement-and-Benefits-.pdf" cmsKey="membership-benefits-requirements-document" cmsLabel="Requirements PDF link" target="_blank" rel="noopener noreferrer" variant="secondary" className="mt-6"><EditableCopy label="Link text" fallback="Download now" /></Button></div><div className="border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)] p-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-dark)]"><EditableCopy label="Text" fallback="PDF brochure" /></p><h3 className="mt-2 font-serif text-2xl leading-tight"><EditableCopy label="Heading" fallback="Member-Get-Member scheme" /></h3><Button href="https://iodghana.org/wp-content/uploads/2025/03/IoD-Gh-Member-Get-Member-Scheme-Brochure-1-1.pdf" cmsKey="membership-benefits-member-get-member-document" cmsLabel="Member-Get-Member PDF link" target="_blank" rel="noopener noreferrer" variant="secondary" className="mt-6"><EditableCopy label="Link text" fallback="Download now" /></Button></div></div></div></BuiltInSection>
  </>;
}

export default async function MembershipDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const copy = content[slug];
  if (!copy) notFound();

  const verify = slug === "verify";
  const directory = slug === "members-in-good-standing";
  const categories = slug === "categories";
  const fees = slug === "fees";
  const benefits = slug === "benefits";

  return (
    <>
      {directory ? (
        <BuiltInSection sectionId="hero" className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
          <CmsHeroImage />
          <div className="absolute inset-y-0 right-[12%] w-px bg-white/15" />
          <div className="absolute inset-y-0 right-[28%] w-px bg-white/10" />
          <p className="pointer-events-none absolute -bottom-20 -right-10 font-serif text-[clamp(12rem,27vw,29rem)] leading-none tracking-[-0.12em] text-white/[0.045]"><EditableCopy label="Text" fallback={"IoD"} /></p>
          <div className="site-container relative py-12 sm:py-16 lg:py-20">
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
                  <Link href="/membership" className="hover:text-white"><EditableCopy label="Link text" fallback={"MEMBERSHIP"} /></Link>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true">/</span>
                  <span className="text-white">MEMBERS IN GOOD STANDING</span>
                </li>
              </ol>
            </nav>
            <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="eyebrow text-[var(--color-accent-light)]"><CmsPageText slug="membership-members-in-good-standing" field="eyebrow" fallback={copy.eyebrow} /></p>
                <h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.2rem,6.4vw,6.2rem)] leading-[0.94] tracking-[-0.06em]">
                  <CmsPageText slug="membership-members-in-good-standing" field="title" fallback={copy.title} />
                </h1>
              </div>
              <div className="lg:col-span-4">
                <p className="max-w-md text-lg leading-8 text-[var(--color-mist)]"><CmsPageText slug="membership-members-in-good-standing" field="summary" fallback={copy.description} /></p>
                <p className="mt-8 border-t border-[var(--color-accent)] pt-4 text-lg font-bold text-white"><EditableCopy label="Text" fallback={"Last updated: 15 September 2026"} /></p>
              </div>
            </div>
          </div>
        </BuiltInSection>
      ) : (
        <MembershipHero {...copy} slug={slug} />
      )}

      {directory ? (
        <>
          <BuiltInSection sectionId="member-directory" className="bg-white py-20 sm:py-28">
            <div className="site-container">
              <MembersDirectory />
            </div>
          </BuiltInSection>
          <BuiltInSection sectionId="previous-register" className="border-t border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20">
            <div className="site-container grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <p className="eyebrow"><EditableCopy label="Text" fallback={"Previous register"} /></p>
                <h2 className="mt-4 max-w-2xl font-serif text-[clamp(2.25rem,3.5vw,3.75rem)] leading-[1.04] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Members in Good Standing — 2025."} /></h2>
                <p className="mt-5 max-w-xl leading-7 text-[var(--color-slate)]">
                  <EditableCopy label="Text" fallback="Download the previous year's register of IoD-Gh members in good standing." />
                </p>
              </div>
              <div className="lg:col-span-4 lg:col-start-9">
                <Link
                  href="/documents/iod-gh-members-in-good-standing-2025.pdf"
                  className="inline-flex w-full items-center justify-between bg-[var(--color-ink)] px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-[var(--color-accent-dark)]"
                  download
                >
                  <EditableCopy label="Link text" fallback="Download 2025 register" /> <span aria-hidden="true">PDF <Icon name="download" className="h-4 w-4" /></span>
                </Link>
                <p className="mt-3 text-xs leading-5 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"The approved PDF register will be uploaded here."} /></p>
              </div>
            </div>
          </BuiltInSection>
        </>
      ) : fees ? (
        <MembershipFees />
      ) : benefits ? (
        <MembershipBenefitsCms />
      ) : (
        <BuiltInSection sectionId="membership-details" className="bg-white py-20 sm:py-28">
          <div className={`site-container ${categories ? "" : "max-w-4xl"}`}>
            {verify ? <MemberVerification /> : categories ? (
              <div>
                <div className="mb-10 grid gap-6 border-b border-[var(--color-line)] pb-8 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-7">
                    <p className="eyebrow"><EditableCopy label="Text" fallback={"Find your pathway"} /></p>
                    <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2.35rem,4vw,4.1rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"A category for every stage of your leadership journey."} /></h2>
                  </div>
                  <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"Explore the category that best reflects your experience, ambition and contribution to better governance."} /></p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {membershipCategories.map((category, index) => {
                    const featured = index === 0;
                    return <article
                      key={category.title}
                      className={`relative flex min-h-80 flex-col overflow-hidden border p-7 sm:p-9 ${featured ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white md:col-span-2" : "border-[var(--color-line)] bg-[var(--color-warm-white)] text-[var(--color-ink)]"}`}
                    >
                      <div className="flex items-start justify-between gap-5">
                        <span className={`font-serif text-4xl tracking-[-0.06em] ${featured ? "text-[var(--color-accent-light)]" : "text-[var(--color-accent-dark)]"}`}>0{index + 1}</span>
                        <span className={`border px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.12em] ${featured ? "border-white/30 text-white" : "border-[var(--color-line)] text-[var(--color-slate)]"}`}><EditableCopy label="Text" fallback={String(category.meta ?? "")} /></span>
                      </div>
                      <div className="mt-auto pt-12">
                        <h3 className={`font-serif text-[clamp(2.2rem,3vw,3.35rem)] leading-none tracking-[-0.05em] ${featured ? "text-white" : "text-[var(--color-ink)]"}`}><EditableCopy label="Heading" fallback={String(category.title ?? "")} /></h3>
                        <p className={`mt-5 max-w-2xl leading-7 ${featured ? "text-[var(--color-mist)]" : "text-[var(--color-slate)]"}`}>{category.longDescription ?? category.description}</p>
                        <span className={`mt-7 inline-flex items-center gap-3 text-sm font-bold ${featured ? "text-white" : "text-[var(--color-ink)]"}`}>Membership pathway <Icon name="arrow-right" className="h-4 w-4" /></span>
                      </div>
                      {featured && <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-5 font-serif text-[15rem] leading-none tracking-[-0.13em] text-white/[0.04]">IoD</span>}
                    </article>;
                  })}
                </div>
                <div className="mt-10 flex flex-col justify-between gap-6 border-t border-[var(--color-line)] pt-8 sm:flex-row sm:items-center">
                  <p className="max-w-xl text-sm leading-6 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Not sure which category is right for you? Begin an application and our membership committee will assess the appropriate pathway."} /></p>
                  <Button href="/membership/apply" className="shrink-0"><EditableCopy label="Link text" fallback={"Begin your application"} /></Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {[
                  "Professional recognition that signals your commitment to rigorous governance.",
                  "Exclusive development programmes, thought leadership and a powerful peer network.",
                  "A trusted platform to contribute to the future of directorship in Ghana.",
                ].map((text, index) => (
                  <div
                    className="border-t border-[var(--color-line)] pt-6"
                    key={text}
                  >
                    <span className="text-sm font-bold text-[var(--color-gold-dark)]">
                      0{index + 1}
                    </span>
                    <p className="mt-3 font-serif text-3xl leading-snug"><EditableCopy label="Text" fallback={String(text ?? "")} /></p>
                  </div>
                ))}
                <Button href="/membership/apply"><EditableCopy label="Link text" fallback={"Become a member"} /></Button>
              </div>
            )}
          </div>
        </BuiltInSection>
      )}
    </>
  );
}
