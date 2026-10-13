"use client";

import { useContext } from "react";
import { CmsPageContext } from "@/components/cms/PageContext";

export const applicationCohortDefaults = {
  heading: "Cohort availability",
  cohort: "The training team will confirm your cohort after reviewing your application.",
  current_date: "Date to be confirmed",
  spaces: "Availability will be confirmed by the training team.",
  next_date: "Date to be confirmed",
  next_cohort: "If the upcoming cohort is full, we will contact you with the next available cohort date.",
  note: "Your application does not reserve a training place. Please wait for confirmation of your place and cohort date before making any payment. Payment instructions will be sent directly to you.",
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
    <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-accent-dark)]">{value(data, "heading")}</h2>
    <p className="mt-4 font-serif text-3xl leading-tight tracking-[-0.035em]">{value(data, "cohort")}</p>
    <dl className={`mt-6 space-y-5 border-y ${rule} py-5`}>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>UPCOMING COHORT</dt><dd className="mt-2 text-lg font-semibold">{value(data, "current_date")}</dd></div>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>SPACES</dt><dd className="mt-2 text-lg font-semibold">{value(data, "spaces")}</dd></div>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>FOLLOWING COHORT</dt><dd className="mt-2 text-lg font-semibold">{value(data, "next_date")}</dd><dd className={`mt-2 leading-7 ${muted}`}>{value(data, "next_cohort")}</dd></div>
    </dl>
    <p className={`mt-5 text-sm leading-6 ${muted}`}>{value(data, "note")}</p>
  </section>;
}
