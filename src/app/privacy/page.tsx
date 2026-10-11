import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice | Institute of Directors-Ghana",
  description: "How the Institute of Directors-Ghana handles personal information collected through this website.",
};

const sections = [
  {
    title: "Who this notice covers",
    paragraphs: [
      "This Privacy Notice explains how the Institute of Directors-Ghana (IoD-Gh, we, us or our) handles personal information collected through iodghana.org, its member and CMS services, and the IoD-Gh Examination Portal. It applies when you browse the site, contact us, apply for membership, use an account, register interest in a programme or sit an examination.",
      "Please read this notice together with any service-specific information shown when you provide your details. If another notice applies to a particular programme or service, that notice will explain any additional handling of your information.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "We collect the information you choose to give us, such as your name, email address, telephone number, organisation, professional role, membership details, enquiry messages and information included in a membership application.",
      "For a membership application, your CV is sent as an email attachment directly to authorised IoD-Gh membership staff for assessment. The website does not retain the uploaded CV after that delivery.",
      "When you use an account or the Examination Portal, we collect the information needed to provide that service. This can include account and sign-in details, your name and email address, examination access and session records, answers, submitted work, results and relevant security logs.",
    ],
  },
  {
    title: "Why we use information",
    paragraphs: [
      "We use personal information to respond to enquiries, assess and administer membership applications, provide member, programme and examination services, send the updates or results you ask us to send, and communicate with you about your relationship with IoD-Gh.",
      "We also use information to protect our services, prevent misuse, maintain records, improve the website and meet legal, regulatory and governance responsibilities. Membership decisions are made by authorised IoD-Gh staff. Examination results are calculated from answers submitted in the portal and are available for authorised staff review.",
    ],
  },
  {
    title: "Cookies and site analytics",
    paragraphs: [
      "We use essential cookies only where they are needed to keep sign-in, security and examination sessions working. These cookies are not used for advertising or cross-site tracking. You can manage cookies through your browser, but blocking essential cookies may prevent some secure services from working properly.",
      "The public website uses first-party, cookie-free analytics to understand aggregate visits and improve our pages. It records the page viewed, referral host and broad device type. A one-way visitor marker is rotated daily for aggregate counts; we do not store raw IP addresses or a persistent analytics identifier.",
    ],
  },
  {
    title: "Who receives information",
    paragraphs: [
      "Access is limited to authorised IoD-Gh staff and trusted service providers that help us operate the website, hosting, email delivery, security and related services. They may process personal information only as needed to provide services to us and in line with appropriate instructions.",
      "We may also share information when required by law, to protect the rights, safety or security of IoD-Gh and others, or as part of a lawful organisational process. Where information is processed outside Ghana, we will take reasonable steps to ensure that it is handled with appropriate safeguards.",
    ],
  },
  {
    title: "How long we keep it",
    paragraphs: [
      "We keep personal information only for as long as reasonably necessary for the purpose for which it was collected. This includes membership administration, examination records, programme delivery, security, record-keeping and any legal or regulatory obligations.",
      "Retention periods vary according to the type of information and the service involved. When information is no longer needed, we will securely delete it or make it anonymous where appropriate.",
    ],
  },
  {
    title: "Your choices and rights",
    paragraphs: [
      "Subject to applicable law, you may ask about the personal information we hold about you, request correction of inaccurate information, object to certain processing, ask for restriction or deletion in appropriate circumstances, or withdraw consent where our use of information depends on consent.",
      "To make a request, please contact us using the details below. We may need to confirm your identity before responding. You may also raise a concern with Ghana’s Data Protection Commission if you believe your privacy rights have been affected.",
    ],
  },
  {
    title: "Keeping information secure",
    paragraphs: [
      "We use reasonable organisational and technical measures designed to protect personal information from unauthorised access, loss, misuse or alteration. No online service can be completely risk-free, so please protect your account credentials and do not share examination access codes or other confidential information.",
    ],
  },
  {
    title: "Contact and updates",
    paragraphs: [
      "For a privacy request or question, contact IoD-Gh at info@iodghana.org. We may update this notice when our services or legal obligations change. The latest version will always be published on this page with its revision date.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="bg-white">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20">
        <div className="site-container">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,6vw,5.25rem)] leading-[0.96] tracking-[-0.055em]">Privacy Notice.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-slate)]">How Institute of Directors-Ghana handles personal information across our website and online services.</p>
          <p className="mt-6 text-sm font-semibold text-[var(--color-slate)]">Last updated: 11 October 2026</p>
        </div>
      </header>

      <section className="py-16 sm:py-24">
        <div className="site-container grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <p className="eyebrow">Your privacy</p>
            <p className="mt-4 text-sm leading-6 text-[var(--color-slate)]">A clear explanation of the information we collect, why we need it and the choices available to you.</p>
            <Link href="/terms" className="link-arrow mt-6">Read our Terms of Use</Link>
          </aside>

          <article className="space-y-10 lg:col-span-8 lg:col-start-5">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-3xl tracking-[-0.04em]">{section.title}</h2>
                <div className="mt-4 space-y-4 leading-7 text-[var(--color-slate)]">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
            <p className="border-t border-[var(--color-line)] pt-8 text-sm leading-6 text-[var(--color-slate)]">
              For independent information about data-protection rights in Ghana, visit the{" "}
              <a className="font-semibold text-[var(--color-ink)] underline underline-offset-4" href="https://dpc.gov.gh/for-individuals/" target="_blank" rel="noreferrer">Data Protection Commission</a>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
