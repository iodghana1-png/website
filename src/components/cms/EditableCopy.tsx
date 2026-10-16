"use client";

import { useContext } from "react";
import type { ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { CmsPageContext } from "./PageContext";
import { linkUrl } from "./ContentRenderer";
import { brandText } from "@/components/ui/BrandText";

// Stable content keys keep the layout and its styling in source control.
// Staff see the field label and its text, never this key.
export function copyKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}
export function EditableCopy({ fallback, label = "Text" }: { fallback: string; label?: string }) {
  const context = useContext(CmsPageContext);
  const key = copyKey(fallback);
  const section = context?.revision.sections.find((section) => section.slot === "page_copy");
  const fields = section?.data.fields as Array<{ key: string; value: string }> | undefined;
  const field = fields?.find((field) => field.key === key);
  return <span data-cms-copy={key} data-cms-label={label}>{brandText(field?.value ?? fallback)}</span>;
}

export function EditableImage(props: ComponentProps<typeof Image>) {
  const context = useContext(CmsPageContext);
  const fallback = typeof props.src === "string" ? props.src : "";
  const key = copyKey("image:" + fallback);
  const fields = context?.revision.sections.find((s) => s.slot === "page_copy")?.data.fields as Array<{ key: string; value: string }> | undefined;
  const field = fields?.find((f) => f.key === key);
  if (field && !field.value) return null;
  return <Image {...props} alt={props.alt} src={field && linkUrl(field.value) ? field.value : props.src} unoptimized={!!field || props.unoptimized} data-cms-image={key} data-cms-src={fallback} />;
}

export function EditableLink({ cmsKey, cmsLabel, ...props }: ComponentProps<typeof Link> & { cmsKey?: string; cmsLabel?: string }) {
  const context = useContext(CmsPageContext);
  const fallback = typeof props.href === "string" ? props.href : "";
  // Some pages contain several links with the same fallback destination (for
  // example, multiple registration actions). A caller-supplied key keeps each
  // CMS field independent while preserving the old href-based key for links
  // that do not need that distinction.
  const key = copyKey("link:" + (cmsKey || fallback));
  const fields = context?.revision.sections.find((s) => s.slot === "page_copy")?.data.fields as Array<{ key: string; value: string }> | undefined;
  const field = fields?.find((f) => f.key === key);
  return <Link {...props} href={field && linkUrl(field.value) ? field.value : props.href} data-cms-link={key} data-cms-href={fallback} data-cms-link-label={cmsLabel} />;
}
