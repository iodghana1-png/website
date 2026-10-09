"use client";

import { useState } from "react";

import { FormInput } from "@/components/ui/FormFields";
import { MembershipApplicationResult, submitMembershipApplication } from "@/lib/api/membership";

const steps = ["Application", "Personal information", "Professional profile", "Curriculum vitae", "Review", "Confirmation"];

type ApplicationKind = "new_membership" | "upgrade";
type FormState = { applicationKind: ApplicationKind | ""; membershipNumber: string; firstName: string; lastName: string; email: string; phoneNumber: string; organisation: string; currentRole: string; recommendingAgent: string; cv: File | null; cvConfirmed: boolean };

const initialForm: FormState = { applicationKind: "", membershipNumber: "", firstName: "", lastName: "", email: "", phoneNumber: "", organisation: "", currentRole: "", recommendingAgent: "", cv: null, cvConfirmed: false };

const paymentAccounts = [
  { provider: "Fidelity Bank", accountName: "Institute of Directors-Ghana", accountNumber: "1050406378412", branch: "Dzorwulu Branch" },
  { provider: "National Investment Bank", accountName: "Institute of Directors-Ghana", accountNumber: "1122092871801", branch: "Spintex Road Branch" },
  { provider: "MTN Mobile Money", accountName: "Institute of Directors-Ghana", accountNumber: "0244309058", branch: "" },
];

function MembershipPaymentDetails() {
  return (
    <section className="mt-10 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-10">
      <p className="eyebrow">Payment information</p>
      <h2 className="mt-4 font-serif text-4xl">Pay with the following account details.</h2>
      <p className="mt-7 border-l-2 border-[var(--color-accent)] pl-5 text-lg font-semibold leading-8 text-[var(--color-ink)]">Confirm participation by making full payment of the training fees to any of the account details below.</p>
      <p className="mt-6 leading-7 text-[var(--color-slate)]">For further enquiries, contact us on <a className="font-semibold text-[var(--color-ink)] underline" href="tel:+233240714798">+233 24 071 4798</a>, <a className="font-semibold text-[var(--color-ink)] underline" href="tel:+233593999503">+233 59 399 9503</a>, or email <a className="font-semibold text-[var(--color-ink)] underline" href="mailto:training@iodghana.org">training@iodghana.org</a>.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        {paymentAccounts.map((account) => (
          <article className="border border-[var(--color-line)] bg-white p-5" key={account.provider}>
            <p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{account.provider.toUpperCase()}</p>
            <p className="mt-5 text-sm font-semibold text-[var(--color-ink)]">{account.accountName}</p>
            <p className="mt-3 break-all font-mono text-lg font-bold text-[var(--color-ink)]">{account.accountNumber}</p>
            {account.branch && <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-sm text-[var(--color-slate)]">{account.branch}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<MembershipApplicationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const complete = step === steps.length - 1;

  const update = <Field extends keyof FormState>(field: Field, value: FormState[Field]) => setForm((current) => ({ ...current, [field]: value }));
  const applicationLabel = form.applicationKind === "upgrade" ? "Membership upgrade" : "New membership";

  function validateCurrentStep() {
    if (step === 0 && !form.applicationKind) return "Choose whether this is a new membership application or an upgrade request.";
    if (step === 0 && form.applicationKind === "upgrade" && !form.membershipNumber.trim()) return "Enter your existing IoD-Gh membership number.";
    if (step === 1 && (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim())) return "Please complete your name and email address.";
    if (step === 2 && (!form.organisation.trim() || !form.currentRole.trim())) return "Please complete your organisation and current role.";
    if (step === 3 && !form.cv) return "Please attach your CV in PDF, DOC, or DOCX format.";
    if (step === 3 && !form.cvConfirmed) return "Please confirm that your CV is current and includes your board-service years and managerial positions.";
    return "";
  }

  function next() {
    const message = validateCurrentStep();
    if (message) return setError(message);
    setError("");
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  async function submitApplication() {
    const message = validateCurrentStep();
    if (message || !form.cv || !form.applicationKind) return setError(message || "Please attach your CV.");
    setSubmitting(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("application_kind", form.applicationKind);
      payload.append("current_membership_number", form.membershipNumber);
      payload.append("first_name", form.firstName);
      payload.append("last_name", form.lastName);
      payload.append("email", form.email);
      payload.append("phone_number", form.phoneNumber);
      payload.append("organisation", form.organisation);
      payload.append("current_role", form.currentRole);
      payload.append("recommending_agent", form.recommendingAgent);
      payload.append("cv", form.cv);

      setResult(await submitMembershipApplication(payload));
      setStep(steps.length - 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your application could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-[var(--color-warm-white)] py-12 sm:py-20">
      <div className="site-container max-w-5xl">
        <p className="eyebrow">Membership application</p>
        <h1 className="mt-5 font-serif text-[clamp(2.8rem,5vw,4.8rem)] leading-none tracking-[-0.05em]">Begin your IoD-Gh journey.</h1>
        <div className="mt-12">
          <ol aria-label="Membership application progress" className="grid grid-cols-6">
            {steps.map((label, index) => (
              <li className="relative flex min-w-0 flex-col items-center text-center" key={label}>
                {index > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-5 -z-0 h-px w-full ${index <= step ? "bg-[var(--color-accent)]" : "bg-[var(--color-line)]"}`} />}
                <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${index === step ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : index < step ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white" : "border-[var(--color-line)] bg-[var(--color-warm-white)] text-[var(--color-slate)]"}`}>{index + 1}</span>
                <span className={`mt-3 hidden max-w-24 text-xs leading-4 sm:block ${index === step ? "font-bold text-[var(--color-ink)]" : "text-[var(--color-slate)]"}`}>{label}</span>
                <span className="sr-only">{label}{index === step ? ", current step" : index < step ? ", completed" : ""}</span>
              </li>
            ))}
          </ol>
          <section className="mt-10 border border-[var(--color-line)] bg-white p-6 sm:p-10">
            <p className="eyebrow">Step {step + 1} of {steps.length}</p>
            <h2 className="mt-4 font-serif text-4xl">{steps[step]}</h2>
            {error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm text-[var(--color-ink)]">{error}</p>}
            {complete ? <div className="mt-7 border-l-2 border-[var(--color-gold)] bg-[var(--color-warm-white)] p-6"><h3 className="font-serif text-2xl">Your application has been received.</h3><p className="mt-3 leading-7 text-[var(--color-slate)]">We have sent a receipt to <strong>{form.email}</strong>. The membership committee will review your CV and assign the appropriate membership category.</p>{result && <div className="mt-6 space-y-3 border-t border-[var(--color-line)] pt-5 text-sm"><p><strong>Application reference:</strong> {result.reference}</p><p><strong>Tracking token:</strong> <span className="break-all font-mono text-xs">{result.tracking_token}</span></p><p className="text-[var(--color-slate)]">For your privacy, this tracking token is shown only once. Save it in a secure place.</p></div>}</div> : <><div className="mt-8 grid gap-5 sm:grid-cols-2">
              {step === 0 && <div className="sm:col-span-2"><p className="max-w-2xl leading-7 text-[var(--color-slate)]">The membership committee determines the appropriate membership category after assessing your application and CV.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => update("applicationKind", "new_membership")} className={`border p-5 text-left transition-colors ${form.applicationKind === "new_membership" ? "border-[var(--color-ink)] bg-[var(--color-paper)]" : "border-[var(--color-line)] hover:border-[var(--color-ink)]"}`}><strong className="block">New membership</strong><span className="mt-2 block text-sm leading-6 text-[var(--color-slate)]">I am applying to join IoD-Gh.</span></button><button type="button" onClick={() => update("applicationKind", "upgrade")} className={`border p-5 text-left transition-colors ${form.applicationKind === "upgrade" ? "border-[var(--color-ink)] bg-[var(--color-paper)]" : "border-[var(--color-line)] hover:border-[var(--color-ink)]"}`}><strong className="block">Membership upgrade</strong><span className="mt-2 block text-sm leading-6 text-[var(--color-slate)]">I am an existing member applying for an upgrade.</span></button></div>{form.applicationKind === "upgrade" && <div className="mt-5 max-w-md"><FormInput label="Existing membership number" required value={form.membershipNumber} onChange={(event) => update("membershipNumber", event.target.value)} /></div>}</div>}
              {step === 1 && <><FormInput label="First name" required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /><FormInput label="Last name" required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /><FormInput label="Email address" type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /><FormInput label="Phone number" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} /></>}
              {step === 2 && <><FormInput label="Organisation" required value={form.organisation} onChange={(event) => update("organisation", event.target.value)} /><FormInput label="Current role" required value={form.currentRole} onChange={(event) => update("currentRole", event.target.value)} /><div className="sm:col-span-2"><FormInput label="Recommending agent" value={form.recommendingAgent} onChange={(event) => update("recommendingAgent", event.target.value)} /><p className="mt-2 text-sm text-[var(--color-slate)]">Optional — enter the name of the person, organisation, or agent who recommended IoD-Gh to you.</p></div></>}
              {step === 3 && <div className="space-y-5 sm:col-span-2"><aside className="border-l-4 border-[var(--color-accent-dark)] bg-[var(--color-paper)] p-6"><p className="eyebrow">Before you upload</p><h3 className="mt-3 font-serif text-2xl">Prepare your CV for assessment.</h3><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--color-slate)]"><li>Make sure your CV is current and reflects your latest professional experience.</li><li>Include the years you have served in managerial positions.</li><li>Include the years you have served on boards, committees, or in comparable governance roles.</li><li>Your membership category will be assessed from the information in your CV.</li></ul></aside><label className="block border border-dashed border-[var(--color-line)] p-6"><span className="font-bold">Curriculum vitae <span className="text-[var(--color-error)]">*</span></span><span className="mt-2 block text-sm leading-6 text-[var(--color-slate)]">Upload a PDF, DOC, or DOCX file up to 10 MB. It is delivered as an attachment directly to authorised IoD-Gh membership staff and is not retained on this website.</span><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => update("cv", event.target.files?.[0] || null)} className="mt-5 block w-full text-sm" />{form.cv && <p className="mt-3 text-sm font-bold">Attached: {form.cv.name}</p>}</label><label className="flex gap-3 border border-[var(--color-line)] bg-white p-5 text-sm leading-6"><input type="checkbox" checked={form.cvConfirmed} onChange={(event) => update("cvConfirmed", event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm that my CV is up to date, includes my years in managerial positions and board or governance service, and will be used to assess my membership category.</span></label></div>}
              {step === 4 && <div className="sm:col-span-2"><p className="leading-7 text-[var(--color-slate)]">Please confirm your details. The membership committee will assess your CV and assign the appropriate category.</p><dl className="mt-5 divide-y border-y border-[var(--color-line)] text-sm"><div className="flex justify-between gap-5 py-4"><dt className="font-bold">Application</dt><dd>{applicationLabel}</dd></div>{form.applicationKind === "upgrade" && <div className="flex justify-between gap-5 py-4"><dt className="font-bold">Membership number</dt><dd>{form.membershipNumber}</dd></div>}<div className="flex justify-between gap-5 py-4"><dt className="font-bold">Applicant</dt><dd>{form.firstName} {form.lastName}</dd></div>{form.recommendingAgent && <div className="flex justify-between gap-5 py-4"><dt className="font-bold">Recommending agent</dt><dd>{form.recommendingAgent}</dd></div>}<div className="flex justify-between gap-5 py-4"><dt className="font-bold">CV</dt><dd>{form.cv?.name}</dd></div></dl></div>}
            </div><div className="mt-10 flex justify-between border-t border-[var(--color-line)] pt-6">{step > 0 ? <button type="button" onClick={() => { setError(""); setStep((value) => Math.max(value - 1, 0)); }} className="text-sm font-bold">← Back</button> : <span />}<button type="button" onClick={step === 4 ? submitApplication : next} disabled={submitting} className="bg-[var(--color-ink)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#3f2d83] disabled:cursor-not-allowed disabled:opacity-60">{step === 4 ? (submitting ? "Submitting…" : "Submit application") : "Continue"} →</button></div></>}
          </section>
        </div>
        <MembershipPaymentDetails />
      </div>
    </main>
  );
}
