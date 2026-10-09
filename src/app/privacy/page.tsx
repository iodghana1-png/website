import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice | Institute of Directors-Ghana",
  description: "How the Institute of Directors-Ghana handles personal information collected through this website.",
};

const sections = [
  {
    title: "Information we collect",
    paragraphs: [
      "We collect the information you choose to provide when you create an account, apply for membership, submit an enquiry, register interest in a programme, or contact us. This may include your name, email address, telephone number, organisation, professional role and the information included in a membership application.",
      "When you submit a membership application, your CV is sent as an email attachment directly to authorised IoD-Gh membership staff for assessment. The website does not retain the uploaded CV after that delivery.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use personal information to provide and administer membership, respond to enquiries, assess applications, communicate service updates, protect the website and meet our legal and regulatory responsibilities.",
      "Membership and examination decisions are made by authorised IoD-Gh staff. We do not use solely automated decision-making to determine membership eligibility or examination outcomes.",
    ],
  },
  {
    title: "Analytics and cookies",
    paragraphs: [
      "This website uses first-party, cookie-free analytics to understand aggregate visits and improve our public pages. It records page views, referral host and broad device type. A one-way visitor marker rotates daily; raw IP addresses and persistent browser identifiers are not stored for analytics.",
      "Functional session and security cookies are used only where needed for sign-in, CMS administration and fraud protection. We do not use advertising or cross-site tracking cookies, and no cookie-acceptance banner is required for the cookie-free analytics described above.",
    ],
  },
  {
    title: "Sharing and retention",
    paragraphs: [
      "We share information only with authorised staff and service providers that support our website, hosting, email delivery and operations, or where disclosure is required by law. Service providers may process information only to provide their services to us.",
      "We retain information for no longer than reasonably necessary for the purpose for which it was collected, including membership administration, records management, security and legal obligations.",
    ],
  },
  {
    title: "Your choices and rights",
    paragraphs: [
      "You may ask us about the personal information we hold about you, request correction of inaccurate information, object to certain processing, withdraw consent where processing depends on consent, or raise a concern about our handling of your information.",
      "Ghana’s Data Protection Commission explains data-subject rights under the Data Protection Act, 2012 (Act 843). You may also contact the Commission if you believe your privacy rights have been affected.",
    ],
  },
  {
    title: "Contact and updates",
    paragraphs: [
      "For a privacy request or question, contact IoD-Gh at info@iodghana.org. We may update this notice when our services or legal obligations change, and will publish the revised version on this page.",
    ],
  },
];

export default function PrivacyPage() {
  return <main className="bg-white"><header className="border-b border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container"><p className="eyebrow">Legal</p><h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,6vw,5.25rem)] leading-[0.96] tracking-[-0.055em]">Privacy Notice.</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-slate)]">How Institute of Directors-Ghana handles personal information collected through this website.</p><p className="mt-6 text-sm font-semibold text-[var(--color-slate)]">Last updated: 9 October 2026</p></div></header><section className="py-16 sm:py-24"><div className="site-container grid gap-12 lg:grid-cols-12"><aside className="lg:col-span-3"><p className="eyebrow">Your privacy</p><p className="mt-4 text-sm leading-6 text-[var(--color-slate)]">This notice applies to iodghana.org and the IoD-Gh services linked from it.</p><Link href="/terms" className="link-arrow mt-6">Read our Terms</Link></aside><article className="space-y-10 lg:col-span-8 lg:col-start-5">{sections.map((section) => <section key={section.title}><h2 className="font-serif text-3xl tracking-[-0.04em]">{section.title}</h2><div className="mt-4 space-y-4 text-justify leading-7 text-[var(--color-slate)] hyphens-auto">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}<p className="border-t border-[var(--color-line)] pt-8 text-sm leading-6 text-[var(--color-slate)]">For independent information about data-protection rights in Ghana, visit the <a className="font-semibold text-[var(--color-ink)] underline" href="https://dpc.gov.gh/for-individuals/" target="_blank" rel="noreferrer">Data Protection Commission</a>.</p></article></div></section></main>;
}
