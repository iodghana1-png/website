import { MembershipAdmin } from "@/components/admin/MembershipAdmin";
import { DirectoryAdmin } from "@/components/admin/DirectoryAdmin";
import { CmsAdmin } from "@/components/admin/CmsAdmin";
import { AnalyticsAdmin } from "@/components/admin/AnalyticsAdmin";
import { ExaminationsAdmin } from "@/components/admin/ExaminationsAdmin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { redirect } from "next/navigation";

const titles: Record<string, string> = {
  overview: "Dashboard",
  members: "Members",
  applications: "Membership applications",
  directory: "Members in good standing",
  content: "Pages",
  media: "Media Library",
  navigation: "Navigation",
  events: "Events",
  training: "Training",
  cpd: "CPD",
  news: "News",
  resources: "Resources",
  staff: "Staff",
  roles: "Roles",
  "audit-logs": "Audit logs",
  analytics: "Website analytics",
  examinations: "Examinations",
  settings: "Settings",
};

export function generateStaticParams() {
  return [{ section: [] }, ...Object.keys(titles).map((section) => ({ section: [section] }))];
}

export default async function AdminPage({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ application?: string }> }) {
  const { section } = await params;
  const { application } = await searchParams;
  const key = section?.[0] ?? "overview";
  const pageSlug = key === "content" ? section?.[1] : undefined;
  if (pageSlug === "training-exams") redirect("/admin/examinations");
  if (pageSlug?.startsWith("home-")) redirect("/admin/content/home");
  if (pageSlug?.startsWith("news-") && pageSlug !== "news-page") redirect("/admin/news");
  const title = pageSlug === "footer" ? "Site footer" : pageSlug ? "Edit Page" : titles[key] ?? "Admin";
  const cmsView = key === "content" ? "pages" : ["news", "media", "navigation", "settings"].includes(key) ? key : null;

  return <main className="grid min-h-[calc(100dvh-72px)] bg-[var(--color-paper)] md:grid-cols-[230px_minmax(0,1fr)]"><PortalSidebar admin active={key} /><section id="admin-workspace" className="min-w-0 px-4 py-6 sm:p-7 lg:p-8"><div className={key === "overview" ? "mx-auto max-w-[1440px]" : ""}><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-slate)]"><span className="brand-name">IoD-Gh</span> / Website management</p><h1 className="text-2xl tracking-tight sm:text-3xl">{title}</h1>{key === "overview" ? <AdminDashboard /> : key === "examinations" ? <ExaminationsAdmin /> : key === "analytics" ? <AnalyticsAdmin /> : key === "directory" ? <DirectoryAdmin /> : cmsView ? <CmsAdmin key={cmsView + (pageSlug || "")} view={cmsView} pageSlug={pageSlug} /> : <MembershipAdmin key={key + (application || "")} section={key} title={title} initialReference={application} />}</div></section></main>;
}
