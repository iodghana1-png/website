"use client";

import { FormEvent, useState } from "react";

import { FormInput, SelectField } from "@/components/ui/FormFields";
import { apiErrorMessage } from "@/lib/api/client";
import { submitDocumentRequest, type DocumentRequestInput } from "@/lib/api/document-requests";

const requestOptions = ["Admission letter", "Attestation"];
type FormState = {
  requestType: "" | "admission_letter" | "attestation";
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  membershipNumber: string;
  programme: string;
  addressee: string;
  purpose: string;
  confirmation: boolean;
};

const initialForm: FormState = {
  requestType: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  membershipNumber: "",
  programme: "",
  addressee: "",
  purpose: "",
  confirmation: false,
};

export function DocumentRequestForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<Field extends keyof FormState>(field: Field, value: FormState[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.requestType) return setError("Please select the document you need.");
    if (!form.confirmation) return setError("Please confirm that the information you have provided is accurate.");
    setSubmitting(true);
    try {
      const payload: DocumentRequestInput = {
        request_type: form.requestType,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone_number: form.phoneNumber.trim(),
        membership_number: form.membershipNumber.trim(),
        programme: form.programme.trim(),
        addressee: form.addressee.trim(),
        purpose: form.purpose.trim(),
      };
      await submitDocumentRequest(payload);
      setSubmitted(true);
      setForm(initialForm);
    } catch (reason) {
      setError(apiErrorMessage(reason, "Your request could not be sent. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <div className="border-l-4 border-[var(--color-accent)] bg-white p-7 sm:p-9">
      <p className="eyebrow">Request received</p>
      <h2 className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[var(--color-ink)]">Your request is with us.</h2>
      <p className="mt-4 max-w-xl leading-7 text-[var(--color-slate)]">We have emailed a receipt to you. The IoD-Gh team will verify the details and contact you if anything further is needed.</p>
      <button type="button" onClick={() => setSubmitted(false)} className="mt-6 text-sm font-bold text-[var(--color-ink)] underline underline-offset-4">Make another request</button>
    </div>;
  }

  return <form onSubmit={submitRequest} className="border-t-4 border-[var(--color-ink)] bg-[var(--color-warm-white)] p-7 sm:p-10">
    <p className="eyebrow">Request a document</p>
    <h2 className="mt-4 font-serif text-[clamp(2.25rem,3.5vw,3.6rem)] leading-none tracking-[-0.045em]">Tell us what you need.</h2>
    <p className="mt-4 max-w-2xl leading-7 text-[var(--color-slate)]">Provide the information below so our team can locate your record and prepare the right document.</p>
    {error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm text-[var(--color-ink)]">{error}</p>}
    <div className="mt-9 grid gap-5 sm:grid-cols-2">
      <SelectField label="Document required" required options={requestOptions} value={form.requestType === "admission_letter" ? "Admission letter" : form.requestType === "attestation" ? "Attestation" : ""} onChange={(event) => update("requestType", event.target.value === "Admission letter" ? "admission_letter" : event.target.value === "Attestation" ? "attestation" : "")} />
      <FormInput label="Membership number" value={form.membershipNumber} onChange={(event) => update("membershipNumber", event.target.value)} placeholder="If available" />
      <FormInput label="First name" required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
      <FormInput label="Last name" required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
      <FormInput label="Email address" type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} />
      <FormInput label="Phone number" type="tel" required value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} />
      <div className="sm:col-span-2"><FormInput label="Programme, course or membership" required value={form.programme} onChange={(event) => update("programme", event.target.value)} placeholder="For example, Corporate Governance for Directors" /></div>
      <div className="sm:col-span-2"><FormInput label="Address the document to" value={form.addressee} onChange={(event) => update("addressee", event.target.value)} placeholder="Person or organisation, if applicable" /></div>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[var(--color-ink)]">Purpose or request details <span className="text-[var(--color-error)]">*</span></span><textarea required value={form.purpose} onChange={(event) => update("purpose", event.target.value)} className="min-h-36 w-full border border-[var(--color-line)] bg-white p-4 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold-dark)]" placeholder="Tell us how the document will be used and any relevant deadline." /></label>
      <label className="sm:col-span-2 flex gap-3 border border-[var(--color-line)] bg-white p-5 text-sm leading-6 text-[var(--color-slate)]"><input required type="checkbox" checked={form.confirmation} onChange={(event) => update("confirmation", event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm that the information I have provided is accurate and that IoD-Gh may use it to process this document request.</span></label>
    </div>
    <button type="submit" disabled={submitting} className="mt-8 inline-flex min-h-12 items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-colors hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Sending…" : "Submit request"}</button>
  </form>;
}
