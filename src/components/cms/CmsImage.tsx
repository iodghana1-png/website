import Image, { type ImageProps } from "next/image";
import { apiBaseUrl } from "@/lib/api/client";

// Only send public CMS files and local assets through the image optimizer.
// Other external URLs retain direct delivery instead of failing the allowlist.
export function CmsImage(props: ImageProps) {
  const source = props.src;
  let supported = typeof source !== "string" || (source.startsWith("/") && !source.startsWith("//"));
  if (typeof source === "string" && /^https?:\/\//.test(source)) {
    try {
      const url = new URL(source);
      supported = url.origin === new URL(apiBaseUrl).origin &&
        (url.pathname.startsWith("/api/v2/cms/media/") || url.pathname.startsWith("/media/"));
    } catch { supported = false; }
  }
  return <Image {...props} alt={props.alt} unoptimized={props.unoptimized || !supported} />;
}
