"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteSettings } from "@/components/cms/SiteSettings";
import { cmsMediaUrl } from "@/lib/cms/media";

export function Logo({ inverse = false, showName = true, markClassName = "h-11 w-11", decorative = false }: { inverse?: boolean; showName?: boolean; markClassName?: string; decorative?: boolean }) {
  const settings = useSiteSettings();
  const logo = cmsMediaUrl(settings, "logo");
  const name = typeof settings.website_name === "string" ? settings.website_name.trim() : "";
  // The standalone mark is used in page layouts before client-side settings
  // have loaded; the CMS logo takes over as soon as it is available.
  const mark = logo || (!showName ? "/images/iod-logo-white.png" : "");
  if (!mark && !name) return null;
  const content = <>{mark && <Image src={mark} unoptimized alt="" width={96} height={96} priority className={`${markClassName} object-contain`} style={inverse ? undefined : { filter: "brightness(0) saturate(100%) invert(12%) sepia(26%) saturate(3710%) hue-rotate(223deg) brightness(84%) contrast(101%)" }} />}
      {showName && name && <span className={`leading-tight ${inverse ? "text-white" : "text-[var(--color-ink)]"}`}><span className="block text-sm font-bold">{name}</span></span>}</>;
  if (decorative) return <span aria-hidden="true" className="flex items-center gap-3">{content}</span>;
  return (
    <Link href="/" className="flex items-center gap-3" aria-label={name || "Home"}>
      {content}
    </Link>
  );
}
