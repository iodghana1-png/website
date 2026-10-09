import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Institute of Directors-Ghana",
  description: "Terms governing use of the Institute of Directors-Ghana website and online services.",
};

const sections = [
  {
    title: "Using this website",
    paragraphs: [
      "These Terms govern your use of the Institute of Directors-Ghana website and its online services. By accessing or using the website, you agree to use it lawfully and in a way that does not interfere with its security, availability or the rights of others.",
      "You must not attempt to gain unauthorised access to accounts, administrative systems, examination content or other restricted areas; introduce malicious code; or use the website to send unlawful, misleading or harmful material.",
    ],
  },
  {
    title: "Accounts and security",
    paragraphs: [
      "You are responsible for keeping your account credentials confidential and for activity carried out through your account. Tell us promptly if you believe your account has been accessed without permission.",
      "We may suspend or protect an account where we reasonably believe it is at risk, has been used improperly, or is required to protect members, applicants, candidates or the website.",
    ],
  },
  {
    title: "Membership, programmes and examinations",
    paragraphs: [
      "Submitting an application or expression of interest does not itself create membership, confirm programme enrolment, or guarantee examination eligibility. Membership applications are assessed by the appropriate IoD-Gh committee, and examination access is assigned by authorised administrators.",
      "Fees, schedules, eligibility criteria and service-specific requirements may be provided separately. Where a separate membership, programme or examination notice applies, that notice also forms part of the relevant arrangement.",
    ],
  },
  {
    title: "Content and intellectual property",
    paragraphs: [
      "Unless stated otherwise, the website’s content, branding, publications and design are owned by or licensed to IoD-Gh. You may view and download material made available for personal, professional and non-commercial use, but may not reproduce, modify, distribute or commercially exploit it without permission.",
      "Materials submitted by you remain yours. By submitting them, you give IoD-Gh permission to use them only as necessary to provide, assess or administer the requested service.",
    ],
  },
  {
    title: "Availability and third-party links",
    paragraphs: [
      "We aim to keep the website accurate and available, but content, services and links may change or be temporarily unavailable. We may correct errors, update content or withdraw features when needed.",
      "Links to external websites are provided for convenience. IoD-Gh does not control those websites and is not responsible for their content, availability or privacy practices.",
    ],
  },
  {
    title: "Liability and governing law",
    paragraphs: [
      "To the extent permitted by applicable law, IoD-Gh is not liable for indirect or consequential loss arising from use of, or inability to use, this website. Nothing in these Terms excludes liability that cannot lawfully be excluded.",
      "These Terms are governed by the laws of Ghana. Any dispute will be addressed in accordance with applicable Ghanaian law, subject to any mandatory rights you may have.",
    ],
  },
  {
    title: "Contact and changes",
    paragraphs: [
      "Questions about these Terms can be sent to info@iodghana.org. We may update these Terms from time to time by publishing a revised version on this page.",
    ],
  },
];

export default function TermsPage() {
  return <main className="bg-white"><header className="border-b border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container"><p className="eyebrow">Legal</p><h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,6vw,5.25rem)] leading-[0.96] tracking-[-0.055em]">Terms of Use.</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-slate)]">The conditions for using the IoD-Gh website and its online services.</p><p className="mt-6 text-sm font-semibold text-[var(--color-slate)]">Last updated: 9 October 2026</p></div></header><section className="py-16 sm:py-24"><div className="site-container grid gap-12 lg:grid-cols-12"><aside className="lg:col-span-3"><p className="eyebrow">Website terms</p><p className="mt-4 text-sm leading-6 text-[var(--color-slate)]">Please read these terms before using IoD-Gh online services.</p><Link href="/privacy" className="link-arrow mt-6">Read our Privacy Notice</Link></aside><article className="space-y-10 lg:col-span-8 lg:col-start-5">{sections.map((section) => <section key={section.title}><h2 className="font-serif text-3xl tracking-[-0.04em]">{section.title}</h2><div className="mt-4 space-y-4 text-justify leading-7 text-[var(--color-slate)] hyphens-auto">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}</article></div></section></main>;
}
