"use client";

import { useContext } from "react";
import { CmsPageContext } from "@/components/cms/PageContext";

const defaults = {
  heading: "Cohort availability",
  cohort: "Registration is open for the next cohort.",
  spaces: "Places are limited",
  next_cohort: "If this cohort reaches capacity, we will contact you about the next available intake.",
  note: "Submitting an expression of interest does not confirm a place. Please wait for a confirmed place from the training team before making any payment.",
};

function value(data: Record<string, unknown> | undefined, key: keyof typeof defaults) {
  const saved = data?.[key];
  return typeof saved === "string" && saved.trim() ? saved : defaults[key];
}

export function CohortAvailability({ dark = false }: { dark?: boolean }) {
  const context = useContext(CmsPageContext);
  const data = context?.revision.sections.find((section) => section.section_type === "cohort_availability" && section.is_enabled)?.data;
  const muted = dark ? "text-[var(--color-mist)]" : "text-[var(--color-slate)]";
  const rule = dark ? "border-white/20" : "border-[var(--color-line)]";

  return <div className={`border-t ${rule} pt-6`}>
    <p className={`text-xs font-bold tracking-[0.1em] ${dark ? "text-[var(--color-accent-light)]" : "text-[var(--color-accent-dark)]"}`}>{value(data, "heading").toUpperCase()}</p>
    <p className="mt-4 font-serif text-3xl leading-tight tracking-[-0.035em]">{value(data, "cohort")}</p>
    <dl className={`mt-6 space-y-5 border-y ${rule} py-5`}>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>SPACES</dt><dd className="mt-2 text-lg font-semibold">{value(data, "spaces")}</dd></div>
      <div><dt className={`text-xs font-bold tracking-[0.1em] ${muted}`}>NEXT INTAKE</dt><dd className={`mt-2 leading-7 ${muted}`}>{value(data, "next_cohort")}</dd></div>
    </dl>
    <p className={`mt-5 text-sm leading-6 ${muted}`}>{value(data, "note")}</p>
  </div>;
}
