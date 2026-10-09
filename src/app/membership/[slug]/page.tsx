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
      ) : (
        <BuiltInSection sectionId="membership-details" className="bg-white py-20 sm:py-28">
          <div className="site-container max-w-4xl">
            {verify ? <MemberVerification /> : categories ? (
              <div className="space-y-0">
                {membershipCategories.map((category, index) => (
                  <article
                    key={category.title}
                    className="grid gap-5 border-t border-[var(--color-line)] py-8 sm:grid-cols-[100px_1fr]"
                  >
                    <span className="font-serif text-3xl text-[var(--color-accent-dark)]">
                      0{index + 1}
                    </span>
                    <div>
                      <h2 className="font-serif text-3xl"><EditableCopy label="Heading" fallback={String(category.title ?? "")} /></h2>
                      <p className="mt-4 max-w-2xl leading-8 text-[var(--color-slate)]">
                        {category.longDescription ?? category.description}
                      </p>
                      <p className="mt-4 text-sm font-bold text-[var(--color-accent-dark)]"><EditableCopy label="Text" fallback={String(category.meta ?? "")} /></p>
                    </div>
                  </article>
                ))}
                <Button href="/membership/apply" className="mt-8"><EditableCopy label="Link text" fallback={"Begin your application"} /></Button>
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
