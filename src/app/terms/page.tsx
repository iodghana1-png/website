import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Institute of Directors-Ghana",
  description: "Terms governing use of the Institute of Directors-Ghana website and online services.",
};

const sections = [
  {
    title: "Accepting these terms",
    paragraphs: [
      "These Terms of Use govern your use of the Institute of Directors-Ghana (IoD-Gh) website and its online services. By accessing or using them, you agree to these Terms and to use the services lawfully and responsibly.",
      "If you use a service on behalf of an organisation, you confirm that you have authority to do so. Additional terms, notices, eligibility criteria or fees may apply to a membership, programme or examination. Where they do, they form part of the relevant arrangement.",
    ],
  },
  {
    title: "Using the website responsibly",
    paragraphs: [
      "You must not interfere with the security, availability or normal operation of the website, attempt to gain unauthorised access to an account or restricted system, introduce malicious code, scrape restricted content, or use the service to submit unlawful, misleading or harmful material.",
      "We may take reasonable steps to protect the website and its users, including limiting access, removing material or suspending a service where we reasonably believe these Terms have been breached or there is a security risk.",
    ],
  },
  {
    title: "Accounts and access",
    paragraphs: [
      "You are responsible for keeping your account details, passwords and other access information confidential. You must tell us promptly if you believe your account has been accessed without permission or any credentials have been lost, disclosed or compromised.",
      "We may suspend, reset or protect access where this is reasonably necessary to keep an account, a member, an applicant, an examination candidate or the wider service secure.",
    ],
  },
  {
    title: "Membership and programmes",
    paragraphs: [
      "Submitting an application or expression of interest does not itself create membership, confirm programme enrolment or guarantee eligibility. Membership applications are assessed by the appropriate IoD-Gh committee, and any decision will be communicated through the relevant process.",
      "Programme information, dates, fees, availability and requirements may change. We will make reasonable efforts to keep published information current, but a separate programme communication may contain the final details for a particular event or course.",
    ],
  },
  {
    title: "Examination Portal",
    paragraphs: [
      "Examination access is assigned by authorised administrators. Access codes are personal to the eligible cohort and must not be shared. Candidates must enter their own name and email address, provide accurate information and complete assessments independently unless the examination instructions expressly allow otherwise.",
      "We may invalidate, pause or review an examination attempt where there is a reasonable concern about eligibility, identity, integrity, misuse or a technical or security issue. Results are calculated from submitted answers and may be reviewed by authorised IoD-Gh staff before they are treated as final.",
    ],
  },
  {
    title: "Content and intellectual property",
    paragraphs: [
      "Unless stated otherwise, the website’s content, branding, publications, examination materials and design are owned by or licensed to IoD-Gh. You may view or download material made available for personal, professional and non-commercial use, but may not reproduce, modify, distribute or commercially exploit it without permission.",
      "Materials you submit remain yours. By submitting them, you give IoD-Gh permission to use them only as necessary to provide, assess or administer the requested service and to meet related record-keeping obligations.",
    ],
  },
  {
    title: "Availability and external links",
    paragraphs: [
      "We aim to keep the website accurate, secure and available, but content, services and links may change or be temporarily unavailable. We may correct errors, update content, maintain systems or withdraw a feature when reasonably needed.",
      "Links to external websites are provided for convenience. IoD-Gh does not control those sites and is not responsible for their content, availability, security or privacy practices.",
    ],
  },
  {
    title: "Disclaimers and liability",
    paragraphs: [
      "Website content is provided for general information. Unless we explicitly agree otherwise in writing, it is not professional, legal, financial or other advice and should not be relied on as a substitute for advice tailored to your circumstances.",
      "To the extent permitted by applicable law, IoD-Gh is not liable for indirect or consequential loss arising from use of, or inability to use, this website. Nothing in these Terms excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    title: "Privacy, law and changes",
    paragraphs: [
      "Our handling of personal information is explained in our Privacy Notice. These Terms are governed by the laws of Ghana. Any dispute will be addressed in accordance with applicable Ghanaian law, subject to any mandatory rights you may have.",
      "We may update these Terms from time to time by publishing a revised version on this page. Continuing to use the website after an update means you accept the updated Terms.",
    ],
  },
  {
    title: "Contact us",
    paragraphs: [
      "Questions about these Terms can be sent to info@iodghana.org.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="bg-white">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20">
        <div className="site-container">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,6vw,5.25rem)] leading-[0.96] tracking-[-0.055em]">Terms of Use.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-slate)]">The conditions for using the IoD-Gh website, member services and Examination Portal.</p>
          <p className="mt-6 text-sm font-semibold text-[var(--color-slate)]">Last updated: 11 October 2026</p>
        </div>
      </header>

      <section className="py-16 sm:py-24">
        <div className="site-container grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <p className="eyebrow">Website terms</p>
            <p className="mt-4 text-sm leading-6 text-[var(--color-slate)]">The rules for using IoD-Gh online services safely and responsibly.</p>
            <Link href="/privacy" className="link-arrow mt-6">Read our Privacy Notice</Link>
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
          </article>
        </div>
      </section>
    </main>
  );
}
