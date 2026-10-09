"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";


import { EditableLink as Link } from "@/components/cms/EditableCopy";
import { FormEvent, useState } from "react";

import { FormInput, SelectField } from "@/components/ui/FormFields";
import { useCmsPage } from "@/components/content/useCmsContent";
import { useSiteSettings, SiteContact } from "@/components/cms/SiteSettings";
import { CmsHeroImage } from "@/components/cms/HeroImage";
import { Icon } from "@/components/ui/Icon";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010").replace(/\/$/, "");
const enquiryOptions = ["Membership", "Training", "Governance services", "General enquiry", "Other"];

type ContactForm = { firstName: string; lastName: string; email: string; phoneNumber: string; enquiryType: string; message: string };
const initialForm: ContactForm = { firstName: "", lastName: "", email: "", phoneNumber: "", enquiryType: "", message: "" };

function csrfToken() {
  return document.cookie.split("; ").find((item) => item.startsWith("csrftoken="))?.split("=")[1] || "";
}

export default function ContactPage() {
  const siteSettings = useSiteSettings();
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const page = useCmsPage("contact-page", { eyebrow: "Contact IoD-Gh", title: "Let's start a conversation.", summary: "Whether you are exploring membership, professional development or governance support, our team is ready to help.", body: "", blocks: [] });

  function update<Field extends keyof ContactForm>(field: Field, value: ContactForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const csrfResponse = await fetch(`${apiBaseUrl}/api/v1/auth/csrf/`, { credentials: "include" });
      if (!csrfResponse.ok) throw new Error("We could not start a secure contact session. Please try again.");
      const response = await fetch(`${apiBaseUrl}/api/v1/contact/enquiries/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken() },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone_number: form.phoneNumber,
          enquiry_type: form.enquiryType,
          message: form.message,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Your enquiry could not be sent. Please try again.");
      setSubmitted(true);
      setForm(initialForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your enquiry could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <BuiltInSection sectionId="hero" className="relative isolate overflow-hidden bg-[var(--color-ink)] text-white">
        <CmsHeroImage />
        <div className="absolute inset-y-0 right-[11%] w-px bg-white/15" />
        <div className="absolute inset-y-0 right-[30%] w-px bg-white/10" />
        <p className="pointer-events-none absolute -bottom-12 -right-5 font-serif text-[clamp(8rem,23vw,24rem)] leading-none tracking-[-0.1em] text-white/[0.045]"><EditableCopy label="Text" fallback={"HELLO"} /></p>
        <div className="site-container relative py-12 sm:py-16 lg:py-20">
          <nav aria-label="Breadcrumb" className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]"><ol className="flex flex-wrap gap-2"><li><Link href="/" className="hover:text-white"><EditableCopy label="Link text" fallback={"HOME"} /></Link></li><li className="flex gap-2"><span aria-hidden="true">/</span><span className="text-white">CONTACT</span></li></ol></nav>
          <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="eyebrow text-[var(--color-accent-light)]">{page.eyebrow}</p><h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.2rem,6.4vw,6.2rem)] leading-[0.94] tracking-[-0.06em]">{page.title}</h1></div><div className="lg:col-span-4"><p className="max-w-md text-lg leading-8 text-[var(--color-mist)]">{page.summary}</p><p className="mt-8 border-t border-[var(--color-accent)] pt-4 text-sm font-bold tracking-[0.06em] text-white">ACCRA, GHANA &middot; MONDAY-FRIDAY</p></div></div>
        </div>
      </BuiltInSection>

      <BuiltInSection sectionId="contact-form" className="bg-white py-20 sm:py-28">
        <div className="site-container grid gap-14 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Visit or contact us"} /></p>
            {siteSettings.contact_email || siteSettings.phone || siteSettings.address ? <SiteContact /> : <div className="mt-7 space-y-7 text-[var(--color-slate)]">
              <p><strong className="mb-1 block text-[var(--color-ink)]">Institute of Directors-Ghana</strong>Third Floor, SSNIT Emporium<br />Airport City Enclave<br />Accra, Ghana</p>
              <p><strong className="mb-1 block text-[var(--color-ink)]">Contact</strong><a href="tel:+233302732269" className="block hover:text-[var(--color-ink)]">+233 30 273 2269</a><a href="tel:+233240714798" className="block hover:text-[var(--color-ink)]">+233 24 071 4798</a><a href="mailto:info@iodghana.org" className="block hover:text-[var(--color-ink)]">info@iodghana.org</a></p>
              <p><strong className="mb-1 block text-[var(--color-ink)]">Opening hours</strong>Monday-Friday<br />8:00am-5:00pm</p>
            </div>}
            <div className="mt-10 overflow-hidden border border-[var(--color-line)] bg-[var(--color-paper)]"><iframe title="Map to Institute of Directors-Ghana" src="https://www.google.com/maps?q=Institute%20of%20Directors%20Ghana%2C%20SSNIT%20Emporium%2C%20Airport%20City%2C%20Accra&output=embed" className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
            <a href="https://www.google.com/maps/search/?api=1&query=Institute%20of%20Directors%20Ghana%2C%20SSNIT%20Emporium%2C%20Airport%20City%2C%20Accra" target="_blank" rel="noreferrer" className="link-arrow mt-5">Open in Google Maps <Icon name="external" className="h-4 w-4" /></a>
          </aside>

          <form onSubmit={submitEnquiry} className="border-t-4 border-[var(--color-ink)] bg-[var(--color-warm-white)] p-7 sm:p-10 lg:col-span-7 lg:col-start-6">
            <p className="eyebrow"><EditableCopy label="Text" fallback={"Send an enquiry"} /></p>
            <h2 className="mt-4 font-serif text-[clamp(2.3rem,3.5vw,3.6rem)] leading-none tracking-[-0.045em]"><EditableCopy label="Heading" fallback={"How can we help?"} /></h2>
            <p className="mt-4 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Tell us what you need and the right IoD-Gh team will be in touch."} /></p>
            {error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm text-[var(--color-ink)]">{error}</p>}
            {submitted ? <div className="mt-8 border-l-2 border-[var(--color-accent)] bg-white p-6"><h3 className="font-serif text-2xl text-[var(--color-ink)]"><EditableCopy label="Heading" fallback={"Your enquiry has been sent."} /></h3><p className="mt-3 leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Thank you. We have emailed a receipt to you and an IoD-Gh team member will be in touch."} /></p><button type="button" onClick={() => setSubmitted(false)} className="mt-5 text-sm font-bold text-[var(--color-ink)] underline underline-offset-4">Send another enquiry</button></div> : <><div className="mt-9 grid gap-5 sm:grid-cols-2"><FormInput label="First name" required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /><FormInput label="Last name" required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /><FormInput label="Email address" type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /><FormInput label="Phone number" type="tel" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} /><SelectField label="How can we help?" required options={enquiryOptions} value={form.enquiryType} onChange={(event) => update("enquiryType", event.target.value)} /><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Your message <span className="text-[var(--color-error)]">*</span></span><textarea required value={form.message} onChange={(event) => update("message", event.target.value)} className="min-h-36 w-full border border-[var(--color-line)] bg-white p-4 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-slate)] focus:border-[var(--color-ink)]" placeholder="Tell us a little more" /></label></div><button type="submit" disabled={submitting} className="mt-8 inline-flex min-h-12 items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-colors hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Sending…" : "Send enquiry"}</button></>}
          </form>
        </div>
      </BuiltInSection>
    </>
  );
}
