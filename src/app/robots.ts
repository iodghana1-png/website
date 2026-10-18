import type { MetadataRoute } from "next";

import { absoluteSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/member/", "/cms-preview/", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/verify-email-change"],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
