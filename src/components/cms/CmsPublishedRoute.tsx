"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { apiBaseUrl } from "@/lib/api/client";
import { CmsPageRevision } from "@/lib/api/cms";
import { PageContent } from "./ContentRenderer";
import { HomepageContent } from "@/components/content/HomepageContent";
import { CmsPageContext } from "./PageContext";
import { nativeSectionTypes } from "@/lib/cms/builtInSections";

type PublishedPage = { id: string; path: string; slug: string; template_key: string; revision: CmsPageRevision };

export function CmsRevisionRenderer({ revision, templateKey }: { revision: CmsPageRevision; templateKey?: string }) {
  if (templateKey === "home" || revision.sections.some((section) => section.data.home_section)) return <HomepageContent revision={revision} />;
  return <main className="bg-[var(--color-warm-white)]"><PageContent revision={revision} /></main>;
}

export function CmsPublishedRoute({ path, fallback }: { path: string; fallback: ReactNode }) {
  const [page, setPage] = useState<PublishedPage | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/api/v2/cms/pages/resolve/?path=${encodeURIComponent(path)}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<PublishedPage> : null)
      .then((result) => setPage(result))
      .catch(() => setPage(null))
      .finally(() => setResolved(true));
    return () => controller.abort();
  }, [path]);

  if (!resolved || !page) return <>{fallback}</>;
  return <CmsRevisionRenderer revision={page.revision} templateKey={page.template_key} />;
}

export function CmsRouteSwitch({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [page, setPage] = useState<PublishedPage | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const excluded = pathname.startsWith("/admin") || (pathname === "/member" || pathname.startsWith("/member/")) || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password") || pathname.startsWith("/verify-email") || pathname.startsWith("/cms-preview") || pathname.startsWith("/api/");

  useEffect(() => {
    if (excluded) return;
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const revision = params.get("cmsPreview");
    const token = params.get("token");
    const endpoint = revision && token ? `${apiBaseUrl}/api/v2/cms/pages/preview/${encodeURIComponent(revision)}/?token=${encodeURIComponent(token)}` : `${apiBaseUrl}/api/v2/cms/pages/resolve/?path=${encodeURIComponent(pathname)}`;
    void fetch(endpoint, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<PublishedPage> : null)
      .then((result) => { if (controller.signal.aborted) return; setPage(result); setPreviewing(!!revision); setPreviewError(revision && !result ? "This preview has expired. Return to the editor and preview again." : ""); })
      .catch(() => { if (!controller.signal.aborted) { setPage(null); setPreviewError(revision ? "Could not load this preview. Please try again." : ""); } });
    return () => controller.abort();
  }, [excluded, pathname]);

  if (!excluded && previewError) return <p role="alert" className="p-8">{previewError}</p>;
  // Keep the form mounted while CMS content loads, preserving entered application data.
  if (pathname === "/membership/apply") {
    const applicationPage = page?.path === pathname ? page : null;
    return <CmsPageContext.Provider value={applicationPage ? { slug: applicationPage.slug, revision: applicationPage.revision } : null}>
      {applicationPage && previewing && <p className="bg-amber-100 p-3 text-center text-sm">Private preview</p>}
      {children}
      {applicationPage && <PageContent revision={applicationPage.revision} sectionsOnly omitSectionTypes={nativeSectionTypes(pathname)} />}
    </CmsPageContext.Provider>;
  }
  if (!excluded && page?.path === pathname) {
    if (page.template_key === "legacy") return <CmsPageContext.Provider value={{ slug: page.slug, revision: page.revision }}>{previewing && <p className="bg-amber-100 p-3 text-center text-sm">Private preview</p>}{children}<PageContent revision={page.revision} sectionsOnly omitSectionTypes={nativeSectionTypes(page.path)} /></CmsPageContext.Provider>;
    return <CmsRevisionRenderer revision={page.revision} templateKey={page.template_key} />;
  }
  return <>{children}</>;
}
