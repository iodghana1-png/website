import { BuiltInSection } from "@/components/cms/BuiltInSection";
import { redirect } from "next/navigation";
import { examinationPortalUrl } from "@/lib/examinationPortal";


import { EditableCopy } from "@/components/cms/EditableCopy";
import { notFound } from "next/navigation";
import { EditableImage as Image } from "@/components/cms/EditableCopy";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CpdVideoLibrary } from "@/components/training/CpdVideoLibrary";
import { CpdMonthlySeminars } from "@/components/training/CpdMonthlySeminars";
import { TrainingHero } from "@/components/training/TrainingHero";
import { trainingProgrammes } from "@/data/site";

const categoryCopy: Record<string, { title: string; description: string }> = {
  professional: {
    title: "Professional training in Corporate Governance.",
    description:
      "A rigorous course for directors and leaders who want to strengthen governance practice and professional directorship.",
  },
  cpd: {
    title: "CPD and Seminars.",
    description:
      "Focused learning to support your continuing professional development as a director.",
  },
  exams: {
    title: "Exams Portal.",
    description:
      "Examination information, guidance and important notices for IoD-Gh candidates.",
  },
  customized: {
    title: "Learning built around your organisation.",
    description:
      "Bespoke governance and leadership programmes designed for your context.",
  },
};

const objectives = [
  "Add value to corporate activities",
  "Gain admission into membership of the Institute",
  "Improve skills and competencies",
  "Introduce professionalism into directorship practice",
];
const courseFacts = [
  ["CREDIT HOURS", "42 hours"],
  ["FORMAT", "Weekday evenings · 21 days"],
  ["TIME", "1800hrs GMT to 2000hrs GMT"],
  ["VENUE", "Online (Zoom)"],
];
export function generateStaticParams() {
  return [
    ...Object.keys(categoryCopy),
    ...trainingProgrammes.map((item) => item.href.split("/").pop()!),
  ].map((slug) => ({ slug }));
}

function CorporateGovernanceTraining() {
  return (
    <>
      <BuiltInSection sectionId="course-overview" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-4 lg:self-start lg:py-2">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Overview"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Governance is good business."} /></h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-3xl font-serif text-[clamp(1.8rem,2.7vw,2.75rem)] leading-[1.2] tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={"Corporate governance has evolved into a discipline in its own right and is now linked to national governance."} /></p>
            <div className="mt-9 max-w-2xl border-t border-[var(--color-line)] pt-7">
              <p className="text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Sound corporate governance cannot be regarded as a luxury or an option for businesses in the 21st century. For investors, clear evidence of sound corporate governance assures a better climate for investment."} /></p>
              <p className="mt-5 text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"To fill the vacuum of systemic training for Corporate Directors, IoD-Gh has developed this professional course on corporate governance. Its content covers the competencies Directors require for effective and efficient practice."} /></p>
            </div>
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="course-objectives" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Objectives"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"What the course enables."} /></h2>
          </div>
          <div className="border-t border-[var(--color-ink)] lg:col-span-8">
            {objectives.map((objective, index) => (
              <div
                className="grid gap-4 border-b border-[var(--color-line)] py-7 sm:grid-cols-[72px_1fr]"
                key={objective}
              >
                <span className="font-serif text-2xl text-[var(--color-accent-dark)]">
                  0{index + 1}
                </span>
                <p className="font-serif text-2xl leading-snug tracking-[-0.025em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={String(objective ?? "")} /></p>
              </div>
            ))}
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="course-audience" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Duration and flexibility"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Designed around working lives."} /></h2>
          </div>
          <div className="grid border-t border-[var(--color-ink)] sm:grid-cols-2 lg:col-span-8">
            {courseFacts.map(([label, value]) => (
              <div
                className="border-b border-r border-[var(--color-line)] p-6 last:border-r-0 sm:p-7"
                key={label}
              >
                <p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(label ?? "")} /></p>
                <p className="mt-4 font-serif text-2xl leading-tight text-[var(--color-ink)]"><EditableCopy label="Text" fallback={String(value ?? "")} /></p>
              </div>
            ))}
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="course-modules" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Faculty and target group"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Built on practice and perspective."} /></h2>
          </div>
          <div className="space-y-8 lg:col-span-7 lg:col-start-6">
            <div>
              <h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={"Experienced faculty"} /></h3>
              <p className="mt-4 leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"IoD-Gh professional training is facilitated by talented and broadly experienced professionals, including Lawyers, Accountants, Bankers, Cyber Crime Experts, Engineers, Lecturers and other industry experts from both the private and public sectors. They bring excellent teaching skills and a deep passion for good corporate governance."} /></p>
            </div>
            <div className="border-t border-[var(--color-line)] pt-8">
              <h3 className="font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={"Who should attend"} /></h3>
              <p className="mt-4 leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Board and Council Members, Board Secretaries, Chief Executives, Senior Managers, Partners, Entrepreneurs, Engineers, Lecturers, Professionals, Academicians, Clergy and Civil Society leaders."} /></p>
            </div>
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="course-fees" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Completion and certification"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.4rem,3.6vw,4rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Learning that carries forward."} /></h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Each participant receives comprehensive course materials containing lecture notes, articles, case studies and essential documents for use during the training programme. The toolkit also serves as a reference manual thereafter, and the programme concludes with a competence assessment."} /></p>
            <p className="mt-6 text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"A certificate of completion is issued to candidates who successfully complete the course and are admitted into membership of IoD-Gh based on individual experience. Candidates may use the designation AIoD or MIoD after their names, depending on their membership admission category, following the Induction Ceremony."} /></p>
          </div>
        </div>
      </BuiltInSection>
      <BuiltInSection sectionId="course-registration"
        id="register"
        className="bg-[var(--color-ink)] py-20 text-white sm:py-24"
      >
        <div className="site-container grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback={"Training schedules and fees · 2026"} /></p>
            <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.6rem,4vw,4.4rem)] leading-[0.98] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Weekday evening sessions."} /></h2>
            <p className="mt-5 max-w-2xl leading-7 text-[var(--color-mist)]"><EditableCopy label="Text" fallback={"Dates are tentative. Commencement is based on the required minimum number of participants."} /></p>
          </div>
          <div className="border-l border-white/20 pl-6 lg:col-span-4 lg:col-start-9">
            <p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback={"TRAINING FEE PER PARTICIPANT"} /></p>
            <p className="mt-4 font-serif text-5xl tracking-[-0.05em]"><EditableCopy label="Text" fallback={"GHS 5,700"} /></p>
            <Button
              href="#"
              variant="secondary"
              className="mt-7 border-white text-white hover:bg-white hover:text-[var(--color-ink)]"
            ><EditableCopy label="Link text" fallback={"Register interest"} /></Button>
          </div>
        </div>
      </BuiltInSection>
    </>
  );
}

function CPDContent() {
  const seminars = [
    {
      title: "Monthly seminar",
      description: "Seminar details and date to be announced.",
      registrationLabel: "Registration link",
      registrationHref: "/contact",
      flyer: "",
    },
    {
      title: "Monthly seminar",
      description: "Seminar details and date to be announced.",
      registrationLabel: "Registration link",
      registrationHref: "/contact",
      flyer: "",
    },
    {
      title: "Monthly seminar",
      description: "Seminar details and date to be announced.",
      registrationLabel: "Registration link",
      registrationHref: "/contact",
      flyer: "",
    },
  ];
  const recordings = [
    {
      title: "Board effectiveness: questions that improve decisions",
      date: "Previous seminar",
      duration: "48 min",
      videoUrl: "",
    },
    {
      title: "Leading with integrity in complex environments",
      date: "Previous seminar",
      duration: "56 min",
      videoUrl: "",
    },
    {
      title: "The director's role in sustainable growth",
      date: "Previous seminar",
      duration: "42 min",
      videoUrl: "",
    },
  ];
  return (
    <>
      <BuiltInSection sectionId="cpd-introduction" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-4 lg:self-start lg:py-2">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"IoD-Gh CPD Policy"} /></p>
            <h2 className="mt-5 max-w-sm font-serif text-[clamp(2.5rem,3.7vw,4.25rem)] leading-[1.03] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Keep your professional development current."} /></h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-3xl font-serif text-[clamp(1.8rem,2.7vw,2.75rem)] leading-[1.2] tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={"Read the IoD-Gh Continuing Professional Development Policy."} /></p>
            <div className="mt-9 border-t border-[var(--color-line)] pt-7">
              <p className="max-w-2xl text-lg leading-8 text-[var(--color-slate)]">
                The policy outlines the Institute&apos;s approach to Continuing
                Professional Development for its members.
              </p>
              <Button
                href="https://iodghana.org/wp-content/uploads/2022/03/IoD-Gh-Continuing-Professional-Development-CPD-Policy.pdf"
                target="_blank"
                rel="noreferrer"
                className="mt-8"
              >
                Download CPD Policy <Icon name="external" className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </BuiltInSection>
      {false && <BuiltInSection sectionId="unused-cpd-seminars" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28">
        <div className="site-container">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow"><EditableCopy label="Text" fallback={"Monthly seminars"} /></p>
              <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Focused learning, every month."} /></h2>
            </div>
            <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"New CPD seminars will be posted here with their dates, details and a direct registration link."} /></p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {seminars.map((seminar, index) => (
              <article
                className="overflow-hidden border-t-4 border-[var(--color-ink)] bg-white"
                key={`${seminar.title}-${index}`}
              >
                <div className="relative aspect-[1085/1350] bg-[var(--color-ink)]">
                  {seminar.flyer ? (
                    <Image
                      src={seminar.flyer}
                      alt={`${seminar.title} flyer`}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-end p-6">
                      <span className="text-xs font-bold tracking-[0.14em] text-[var(--color-accent-light)]">
                        SEMINAR FLYER
                      </span>
                      <span className="absolute -right-2 -top-8 font-serif text-[8rem] leading-none tracking-[-0.1em] text-white/10">
                        0{index + 1}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-7">
                  <p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">
                    UPCOMING SEMINAR · 0{index + 1}
                  </p>
                  <h3 className="mt-6 font-serif text-3xl tracking-[-0.035em] text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={String(seminar.title ?? "")} /></h3>
                  <p className="mt-4 leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={String(seminar.description ?? "")} /></p>
                  <a
                    href={seminar.registrationHref}
                    className="link-arrow mt-8"
                  >
                    {seminar.registrationLabel} <Icon name="external" className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </BuiltInSection>}
      <CpdMonthlySeminars />
      {false && <BuiltInSection sectionId="unused-cpd-videos" className="bg-[var(--color-ink)] py-20 text-white sm:py-28">
        <div className="site-container">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback={"Seminar library"} /></p>
              <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Previous seminar recordings."} /></h2>
            </div>
            <p className="max-w-md leading-7 text-[var(--color-mist)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"Revisit ideas and conversations from past IoD-Gh seminars. Recorded videos will be added here as they become available."} /></p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden border border-white/20 bg-white/20 lg:grid-cols-3">
            {recordings.map((recording, index) => (
              <article
                className="bg-[var(--color-ink)] p-6 sm:p-7"
                key={recording.title}
              >
                <div className="relative flex aspect-video items-center justify-center border border-white/20 bg-white/5">
                  <span className="absolute left-4 top-4 text-[10px] font-bold tracking-[0.14em] text-[var(--color-accent-light)]">
                    RECORDING 0{index + 1}
                  </span>
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 text-lg"
                    aria-hidden="true"
                  >
                    <Icon name="play" className="h-5 w-5" />
                  </span>
                  <span className="absolute bottom-4 right-4 text-xs text-[var(--color-mist)]">
                    {recording.duration}
                  </span>
                </div>
                <p className="mt-7 text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback={String(recording.date ?? "")} /></p>
                <h3 className="mt-3 font-serif text-2xl leading-tight tracking-[-0.03em]"><EditableCopy label="Heading" fallback={String(recording.title ?? "")} /></h3>
                {recording.videoUrl ? (
                  <a
                    href={recording.videoUrl}
                    className="link-arrow mt-7 text-white"
                  >
                    Watch recording <Icon name="external" className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-7 text-sm text-[var(--color-mist)]"><EditableCopy label="Text" fallback={"Video link to be added"} /></p>
                )}
              </article>
            ))}
          </div>
        </div>
      </BuiltInSection>}
      <CpdVideoLibrary />
    </>
  );
}

export default async function TrainingDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "exams") redirect(examinationPortalUrl);
  const programme = trainingProgrammes.find((item) => item.href.endsWith(slug));
  const category = categoryCopy[slug];
  if (!programme && !category) notFound();
  const title = programme?.title ?? category.title;
  const description = programme?.description ?? category.description;
  const corporateGovernance =
    slug === "professional" || slug === "corporate-governance-for-directors";
  const cpd = slug === "cpd";

  return (
    <>
      <TrainingHero
        eyebrow={programme ? "Director programme" : "Professional development"}
        title={title}
        description={description}
        slug={slug}
      >
        {!cpd && (
          <Button
            href="#register"
            variant="secondary"
            className="border-white text-white hover:bg-white hover:text-[var(--color-ink)]"
          ><EditableCopy label="Link text" fallback={"Register interest"} /></Button>
        )}
      </TrainingHero>
      {corporateGovernance ? (
        <CorporateGovernanceTraining />
      ) : cpd ? (
        <CPDContent />
      ) : (
        <BuiltInSection sectionId="programme-overview" className="bg-white py-20 sm:py-28">
          <div className="site-container grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="font-serif text-4xl"><EditableCopy label="Heading" fallback={"Programme overview"} /></h2>
              <p className="mt-6 text-lg leading-8 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"This programme is designed for people who carry the responsibility of leadership. Through expert facilitation, considered discussion and practical tools, participants build the confidence to make better decisions in complex boardroom settings."} /></p>
              <h2 className="mt-12 font-serif text-4xl"><EditableCopy label="Heading" fallback={"What you will explore"} /></h2>
              <ul className="mt-6 space-y-4 border-t border-[var(--color-line)]">
                {[
                  "The duties and mindset of an effective director",
                  "Governance practice that earns stakeholder confidence",
                  "Better challenge, dialogue and decision-making",
                  "Leading with independence, ethics and purpose",
                ].map((item) => (
                  <li
                    className="border-b border-[var(--color-line)] py-4"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <aside
              id="register"
              className="self-start border-t-4 border-[var(--color-gold)] bg-[var(--color-paper)] p-7 lg:col-span-4 lg:col-start-9"
            >
              <p className="eyebrow"><EditableCopy label="Text" fallback={"Programme details"} /></p>
              <p className="mt-6 font-serif text-3xl">
                {programme?.date ?? "Dates to be announced"}
              </p>
              <p className="mt-4 leading-7 text-[var(--color-slate)]">
                {programme?.meta ?? "Available online and in person"}
              </p>
              <p className="mt-7 text-sm font-bold"><EditableCopy label="Text" fallback={"Indicative fee: GHS 4,500"} /></p>
              <Button href="#" className="mt-6 w-full"><EditableCopy label="Link text" fallback={"Register interest"} /></Button>
              <p className="mt-4 text-xs leading-5 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Registration is a static interface in Phase 1."} /></p>
            </aside>
          </div>
        </BuiltInSection>
      )}
    </>
  );
}
