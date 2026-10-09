"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteSettings } from "@/components/cms/SiteSettings";
import { cmsMediaUrl } from "@/lib/cms/media";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  const settings = useSiteSettings();
  const logo = cmsMediaUrl(settings, "logo");
  const name = typeof settings.website_name === "string" ? settings.website_name.trim() : "";
  if (!logo && !name) return null;
  return (
    <Link href="/" className="flex items-center gap-3" aria-label={name || "Home"}>
      {logo && <Image src={logo} unoptimized alt="" width={48} height={48} priority className="h-11 w-11 object-contain" style={inverse ? undefined : { filter: "brightness(0) saturate(100%) invert(12%) sepia(26%) saturate(3710%) hue-rotate(223deg) brightness(84%) contrast(101%)" }} />}
      {name && <span className={`leading-tight ${inverse ? "text-white" : "text-[var(--color-ink)]"}`}><span className="block text-sm font-bold">{name}</span></span>}
    </Link>
  );
}
