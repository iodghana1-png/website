import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { EditableLink } from "@/components/cms/EditableCopy";

type ButtonProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: "primary" | "secondary" | "dark";
  /** Makes this specific button destination editable in the CMS. */
  cmsKey?: string;
  cmsLabel?: string;
};

const variants = {
  primary: "border border-[var(--color-ink)] bg-[var(--color-ink)] text-white hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)]",
  secondary: "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:bg-[var(--color-paper)]",
  dark: "border border-[var(--color-ink)] bg-[var(--color-ink)] text-white hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)]",
};

export function Button({ variant = "primary", className = "", children, cmsKey, cmsLabel, ...props }: ButtonProps) {
  const classes = `inline-flex min-h-12 items-center justify-center px-6 text-sm font-bold transition-[background-color,border-color,color] duration-200 ${variants[variant]} ${className}`;
  if (cmsKey) return <EditableLink className={classes} cmsKey={cmsKey} cmsLabel={cmsLabel} {...props}>{children}</EditableLink>;
  return <Link className={classes} {...props}>{children}</Link>;
}
