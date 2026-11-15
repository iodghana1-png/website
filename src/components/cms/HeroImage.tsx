"use client";

import { CmsImage as Image } from "@/components/cms/CmsImage";

import { useContext } from "react";
import { CmsPageContext } from "./PageContext";
import { linkUrl } from "./ContentRenderer";

export function useHeroImage() {
  const context = useContext(CmsPageContext);
  const image = context?.revision.sections.find((section) => section.slot === "hero_image");
  return image ? { url: image.is_enabled ? image.primary_media?.file_url || String(image.data.image_url || "") : "", alt: image.primary_media?.alt_text || "" } : null;
}
export function CmsHeroImage() {
  const image = useHeroImage();
  return image?.url && linkUrl(image.url) ? <Image fill sizes="100vw" src={image.url} alt={image.alt} className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-25" /> : null;
}
