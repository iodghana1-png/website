"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/auth/PortalGuard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { listCmsPages, listCmsArticles, type CmsPage, type CmsArticle } from "@/lib/api/cms";
import { getStaffApplications, getStaffDirectory, type MembershipApplication, type DirectoryEntry } from "@/lib/api/membership";

type DashboardData = {
  pages: CmsPage[] | null;
  articles: CmsArticle[] | null;
  applications: MembershipApplication[] | null;
  directory: DirectoryEntry[] | null;
};

const panel = "rounded-2xl border border-[var(--color-line)] bg-white";
const date = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", timeZone: "Africa/Accra" });
const dateLabel = (value: string) => Number.isNaN(Date.parse(value)) ? "Date unavailable" : date.format(new Date(value));
const hasDraft = (page: CmsPage) => page.current_draft_revision_number !== null && (page.published_revision_number === null || page.current_draft_revision_number > page.published_revision_number);
const isEditablePage = (page: CmsPage) => !page.path.startsWith("/_cms/") && page.slug !== "site-assistant" && !page.slug.startsWith("home-") && !(page.slug.startsWith("news-") && page.slug !== "news-page");
const shortcuts: { label: string; description: string; href: string; icon: IconName }[] = [
  { label: "Website pages", description: "Update text, images and sections", href: "/admin/content", icon: "file" },
  { label: "News & updates", description: "Write and publish your latest stories", href: "/admin/news", icon: "edit" },
  { label: "Media library", description: "Manage images and documents", href: "/admin/media", icon: "image" },
  { label: "Member directory", description: "Manage listings and publication", href: "/admin/directory", icon: "users" },
];

export function AdminDashboard() {
  const user = useCurrentUser();
  const [data, setData] = useState<DashboardData>({ pages: null, articles: null, applications: null, directory: null });
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([listCmsPages(), listCmsArticles(), getStaffApplications(), getStaffDirectory()]).then(([pages, articles, applications, directory]) => {
      if (!active) return;
      setData({
        pages: pages.status === "fulfilled" ? pages.value.filter(isEditablePage) : null,
        articles: articles.status === "fulfilled" ? articles.value : null,
        applications: applications.status === "fulfilled" ? applications.value : null,
        directory: directory.status === "fulfilled" ? directory.value : null,
      });
      setFailures([pages.status === "rejected" ? "pages" : "", articles.status === "rejected" ? "articles" : "", applications.status === "rejected" ? "applications" : "", directory.status === "rejected" ? "directory" : ""].filter(Boolean));
      setUpdatedAt(new Date());
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  const pages = useMemo(() => (data.pages || [])
    .filter((page) => (!draftsOnly || hasDraft(page) || page.published_revision_number === null) && `${page.label} ${page.path}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [data.pages, query, draftsOnly]);
  const pending = data.applications?.filter((application) => ["submitted", "under_review"].includes(application.status));
  const recentApplications = [...(pending || [])].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).slice(0, 4);
  const draftCount = data.pages?.filter((page) => hasDraft(page) || page.published_revision_number === null).length;
  const cards: { label: string; value: number | undefined; detail: string; href: string; icon: IconName }[] = [
    { label: "Website pages", value: data.pages?.length, detail: data.pages ? `${data.pages.filter((page) => page.published_revision_number !== null).length} published · ${draftCount} with unpublished content` : "Page information unavailable", href: "/admin/content", icon: "file" },
    { label: "News & articles", value: data.articles?.length, detail: data.articles ? `${data.articles.filter((article) => article.published_revision_number !== null).length} published articles` : "Article information unavailable", href: "/admin/news", icon: "edit" },
    { label: "Applications to review", value: pending?.length, detail: "Submitted or currently under review", href: "/admin/applications", icon: "mail" },
    { label: "Directory listings", value: data.directory?.length, detail: data.directory ? `${data.directory.filter((entry) => entry.is_published).length} visible in the public register` : "Directory information unavailable", href: "/admin/directory", icon: "users" },
  ];

  return <div className="mt-6 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--color-slate)]">Welcome back{user.first_name ? `, ${user.first_name}` : ""}. Here is your website at a glance.</p>
      <div className="flex items-center gap-3">
        <span role="status" className="text-xs text-[var(--color-slate)]">{loading ? "Updating overview…" : updatedAt ? `Checked at ${updatedAt.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" })} GMT` : ""}</span>
        <button type="button" disabled={loading} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold hover:bg-[var(--color-paper)] disabled:opacity-50"><Icon name="refresh" className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} />Refresh</button>
      </div>
    </div>

    {failures.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Could not load {failures.join(", ")}. Available sections are shown below. Use Refresh to try again.</div>}

    <section aria-label="Website overview" aria-busy={loading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => <Link key={card.label} href={card.href} className={`${panel} group p-5 transition-colors hover:border-[var(--color-accent)]`}>
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[var(--color-slate)]">{card.label}</span><span className="rounded-lg bg-[var(--color-paper)] p-2 text-[var(--color-accent-dark)]"><Icon name={card.icon} className="h-4 w-4" /></span></div>
        <p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? <span className="inline-block h-9 w-16 animate-pulse rounded bg-[var(--color-paper)]" /> : card.value === undefined ? <span aria-label="Unavailable">—</span> : card.value.toLocaleString()}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--color-slate)]">{loading ? "Loading…" : card.detail}</p>
      </Link>)}
    </section>

    <section aria-labelledby="dashboard-quick-actions">
      <h2 id="dashboard-quick-actions" className="mb-3 text-sm">Quick access</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{shortcuts.map((item) => <Link key={item.href} href={item.href} className={`${panel} group flex items-start gap-3 p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-paper)]`}><Icon name={item.icon} className="mt-0.5 h-5 w-5 text-[var(--color-accent-dark)]" /><div className="min-w-0"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-5 text-[var(--color-slate)]">{item.description}</p></div></Link>)}</div>
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className={panel} aria-labelledby="dashboard-pages">
        <div className="border-b border-[var(--color-line)] p-5">
          <div className="flex items-center justify-between gap-3"><h2 id="dashboard-pages" className="text-base">Continue editing</h2><Link href="/admin/content" className="text-xs font-semibold text-[var(--color-accent-dark)] hover:underline">All pages</Link></div>
          <p className="mt-1 text-xs text-[var(--color-slate)]">Your most recently updated pages.</p>
          <label className="relative mt-4 block"><span className="sr-only">Search dashboard pages</span><Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-[var(--color-slate)]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a page…" className="h-10 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-warm-white)] pl-9 pr-3 text-sm" /></label>
          <div className="mt-3 flex flex-wrap gap-2">{[{ label: "All pages", value: false }, { label: "Unpublished content", value: true }].map((filter) => <button key={filter.label} type="button" aria-pressed={draftsOnly === filter.value} onClick={() => setDraftsOnly(filter.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${draftsOnly === filter.value ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-paper)] text-[var(--color-slate)] hover:text-[var(--color-ink)]"}`}>{filter.label}</button>)}</div>
        </div>
        {loading ? <LoadingRows /> : data.pages === null ? <Empty copy="Page information is unavailable. Try refreshing the overview." /> : !pages.length ? <Empty copy={query ? "No pages match your search." : draftsOnly ? "No unpublished page content to review." : "No pages have been added yet."} /> :
          <ul className="divide-y divide-[var(--color-line)]">{pages.slice(0, 6).map((page) => <li key={page.id}><Link href={`/admin/content/${encodeURIComponent(page.slug)}`} className="group flex items-center gap-3 px-5 py-4 hover:bg-[var(--color-paper)]"><span className="hidden rounded-lg bg-[var(--color-paper)] p-2 sm:block"><Icon name="file" className="h-4 w-4 text-[var(--color-slate)]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{page.label}</p><p className="mt-1 truncate text-xs text-[var(--color-slate)]">{page.path === "/" ? "Homepage" : page.path}</p></div><div className="shrink-0 text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${hasDraft(page) || page.published_revision_number === null ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{page.published_revision_number === null ? "Unpublished" : hasDraft(page) ? "Draft changes" : "Published"}</span><p className="mt-2 text-[10px] text-[var(--color-slate)]">{dateLabel(page.updated_at)}</p></div><Icon name="chevron-right" className="h-4 w-4 text-[var(--color-slate)]" /></Link></li>)}</ul>}
        {!loading && pages.length > 6 && <p className="border-t border-[var(--color-line)] px-5 py-3 text-xs text-[var(--color-slate)]">Showing the 6 most recently updated of {pages.length} matching pages.</p>}
      </section>

      <div className="space-y-5">
        <section className={panel} aria-labelledby="dashboard-applications">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] p-5"><h2 id="dashboard-applications" className="text-base">Needs your attention</h2>{!loading && pending && <span className="rounded-full bg-[var(--color-paper)] px-2.5 py-1 text-xs font-semibold">{pending.length}</span>}</div>
          {loading ? <LoadingRows /> : data.applications === null ? <Empty copy="Application information is unavailable for this account." /> : !recentApplications.length ? <div className="p-6"><span className="inline-flex rounded-full bg-emerald-50 p-2 text-emerald-700"><Icon name="check" className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold">You’re up to date.</p><p className="mt-1 text-xs leading-5 text-[var(--color-slate)]">No membership applications are waiting for review.</p></div> :
            <ul className="divide-y divide-[var(--color-line)]">{recentApplications.map((application) => <li key={application.reference}><Link href={`/admin/applications?application=${encodeURIComponent(application.reference)}`} className="flex items-center gap-3 p-5 hover:bg-[var(--color-paper)]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-paper)] text-xs font-bold">{application.applicant_name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{application.applicant_name}</p><p className="mt-1 text-xs text-[var(--color-slate)]">{application.status === "submitted" ? "Awaiting review" : "Under review"} · {dateLabel(application.submitted_at)}</p></div><Icon name="chevron-right" className="h-4 w-4" /></Link></li>)}</ul>}
          <Link href="/admin/applications" className="flex items-center justify-between border-t border-[var(--color-line)] px-5 py-4 text-xs font-semibold text-[var(--color-accent-dark)]">View all applications<Icon name="arrow-right" className="h-4 w-4" /></Link>
        </section>
        <section className={`${panel} p-5`}><h2 className="text-sm">Website tools</h2><div className="mt-3 space-y-1">{[{ label: "Website analytics", href: "/admin/analytics", icon: "chart" as const }, { label: "Menus & navigation", href: "/admin/navigation", icon: "menu" as const }, { label: "Contact details & footer", href: "/admin/settings", icon: "settings" as const }].map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg py-3 text-xs font-semibold hover:bg-[var(--color-paper)]"><Icon name={item.icon} className="h-4 w-4 text-[var(--color-slate)]" /><span className="flex-1">{item.label}</span><Icon name="chevron-right" className="h-3.5 w-3.5" /></Link>)}</div></section>
      </div>
    </div>
  </div>;
}

function LoadingRows() {
  return <div aria-busy="true" aria-label="Loading" className="space-y-4 p-5">{[1, 2, 3].map((row) => <div key={row} className="h-12 motion-safe:animate-pulse rounded-lg bg-[var(--color-paper)]" />)}</div>;
}

function Empty({ copy }: { copy: string }) {
  return <p className="px-5 py-8 text-sm leading-6 text-[var(--color-slate)]">{copy}</p>;
}
