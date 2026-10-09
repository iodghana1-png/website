import type { SVGProps } from "react";

export type IconName =
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "download"
  | "external"
  | "menu"
  | "minus"
  | "play"
  | "plus"
  | "x"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x-social"
  | "youtube";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
  title?: string;
};

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

/** A small, dependency-free icon set used across the public site and CMS. */
export function Icon({ name, title, className = "h-5 w-5", ...props }: IconProps) {
  const labelled = Boolean(title);
  const svgProps = {
    "aria-hidden": labelled ? undefined : true,
    "aria-label": title,
    className: `shrink-0 ${className}`,
    focusable: false,
    role: labelled ? "img" : undefined,
    viewBox: "0 0 24 24",
    ...props,
  };

  if (name === "arrow-right") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  if (name === "arrow-left") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M19 12H5m6 6-6-6 6-6" /></svg>;
  if (name === "arrow-up") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M12 19V5m-6 6 6-6 6 6" /></svg>;
  if (name === "arrow-down") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M12 5v14m6-6-6 6-6-6" /></svg>;
  if (name === "chevron-down") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="m6 9 6 6 6-6" /></svg>;
  if (name === "chevron-left") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="m15 18-6-6 6-6" /></svg>;
  if (name === "chevron-right") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="m9 18 6-6-6-6" /></svg>;
  if (name === "external") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M14 5h5v5M19 5l-9 9" /><path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" /></svg>;
  if (name === "download") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M12 4v11m-4-4 4 4 4-4" /><path d="M5 19h14" /></svg>;
  if (name === "menu") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  if (name === "x") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "plus") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M12 5v14M5 12h14" /></svg>;
  if (name === "minus") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<path d="M5 12h14" /></svg>;
  if (name === "play") return <svg {...svgProps} viewBox="0 0 24 24" fill="currentColor">{title && <title>{title}</title>}<path d="m8 5 11 7-11 7V5Z" /></svg>;
  if (name === "facebook") return <svg {...svgProps} fill="currentColor">{title && <title>{title}</title>}<path d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.9.2-1.5 1.5-1.5H17V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H8v3h2.7v8h3.1Z" /></svg>;
  if (name === "instagram") return <svg {...svgProps} {...strokeProps}>{title && <title>{title}</title>}<rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>;
  if (name === "linkedin") return <svg {...svgProps} fill="currentColor">{title && <title>{title}</title>}<path d="M5.3 3.5A1.8 1.8 0 1 1 5.3 7a1.8 1.8 0 0 1 0-3.5ZM3.8 8.4h3v12.1h-3V8.4Zm4.9 0h2.9V10h.1c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.2v7.2h-3v-6.4c0-1.5 0-3.5-2.1-3.5s-2.5 1.7-2.5 3.4v6.5h-3V8.4Z" /></svg>;
  if (name === "x-social") return <svg {...svgProps} fill="currentColor">{title && <title>{title}</title>}<path d="M18.9 3h2.9l-6.3 7.2 7.4 10.8h-5.8l-4.5-6.4L7 21H4.1l6.7-7.6L3.7 3h5.9l4.1 5.8L18.9 3Zm-1 16.3h1.6L8.7 4.6H7l10.9 14.7Z" /></svg>;
  return <svg {...svgProps} fill="currentColor">{title && <title>{title}</title>}<path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1C2 9 2 12 2 12s0 3 .4 4.8a3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM10.1 15V9l5.2 3-5.2 3Z" /></svg>;
}
