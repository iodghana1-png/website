"use client";

import { brandText } from "@/components/ui/BrandText";

import { useContext } from "react";
import { CmsPageContext } from "@/components/cms/PageContext";

export const applicationCohortDefaults = {
  heading: "Cohort availability",
  cohort: "The training team will confirm your cohort after reviewing your application.",
  current_date: "Date to be confirmed",
  availability_label: "Places remaining",
  spaces: "Availability will be confirmed by the training team.",
  next_date: "Date to be confirmed",
  next_cohort: "If the upcoming cohort is full, we will contact you with the next available cohort date.",
  payment_heading: "Please wait for confirmation before making any payment.",
  note: "Your application does not reserve a training place. We will confirm your place and cohort date, then send payment instructions directly to you.",
};

function value(data: Record<string, unknown> | undefined, key: keyof typeof applicationCohortDefaults) {
  const saved = data?.[key];
  return typeof saved === "string" && saved.trim() ? saved : applicationCohortDefaults[key];
}

export function ApplicationCohortStatus({ complete, applicationKind }: { complete: boolean; applicationKind: string }) {
  const context = useContext(CmsPageContext);
  const section = context?.revision.sections.find((section) => section.section_type === "cohort_availability");
  if (!complete) return null;
  const data = section?.is_enabled ? section.data : undefined;
  const muted = "text-[var(--color-slate)]";
  const rule = "border-[var(--color-line)]";
  if (applicationKind === "upgrade") return <section className="mt-10 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-10"><h2 className="font-serif text-3xl">What happens next?</h2><p className={`mt-4 leading-7 ${muted}`}>The membership committee will review your upgrade request and contact you with the next steps. Please wait for confirmation and payment instructions from IoD-Gh before making any payment.</p></section>;

  return <section className={`mt-10 border ${rule} bg-[var(--color-paper)] p-6 sm:p-10`}>
    <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-accent-dark)]">{brandText(value(data, "heading"))}</h2>
    <p className="mt-4 font-serif text-2xl font-bold leading-snug tracking-[-0.035em] sm:text-3xl">{brandText(value(data, "cohort"))}</p>
    <dl className={`mt-6 space-y-5 border-y ${rule} py-5`}>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>UPCOMING COHORT</dt><dd className="mt-2 text-lg font-semibold">{brandText(value(data, "current_date"))}</dd></div>
      <div><dt className={`text-xs font-bold uppercase tracking-[0.1em] ${muted}`}>{brandText(value(data, "availability_label"))}</dt><dd className="mt-2 text-lg font-semibold">{brandText(value(data, "spaces"))}</dd></div>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>NEXT AVAILABLE COHORT</dt><dd className="mt-2 text-lg font-semibold">{brandText(value(data, "next_date"))}</dd><dd className={`mt-2 leading-7 ${muted}`}>{brandText(value(data, "next_cohort"))}</dd></div>
    </dl>
    <aside className="mt-6 border-l-4 border-[var(--color-accent-dark)] bg-white p-5 sm:p-6">
      <p className="text-base leading-7 text-[var(--color-ink)] sm:text-lg"><strong className="font-bold">{brandText(value(data, "payment_heading"))}</strong></p>
      <p className={`mt-3 leading-7 ${muted}`}>{brandText(value(data, "note"))}</p>
    </aside>
  </section>;
}
