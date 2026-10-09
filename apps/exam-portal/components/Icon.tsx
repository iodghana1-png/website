import type { SVGProps } from "react";

export function ArrowRightIcon({ className = "h-4 w-4", ...props }: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" className={className} focusable={false} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
