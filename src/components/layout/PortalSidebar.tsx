"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api/auth";
import { Icon, type IconName } from "@/components/ui/Icon";

const memberLinks = ["dashboard", "my-profile", "membership", "events", "training", "cpd", "documents", "notifications", "settings"];
const groups: { title: string; links: { label: string; href: string; icon: IconName }[] }[] = [
  { title: "Publishing", links: [
    { label: "Website pages", href: "/admin/content", icon: "file" },
    { label: "News & articles", href: "/admin/news", icon: "edit" },
    { label: "Media library", href: "/admin/media", icon: "image" },
  ] },
  { title: "Membership & learning", links: [
    { label: "Applications", href: "/admin/applications", icon: "mail" },
    { label: "Member directory", href: "/admin/directory", icon: "users" },
    { label: "Membership records", href: "/admin/members", icon: "file" },
    { label: "Examinations", href: "/admin/examinations", icon: "check" },
  ] },
  { title: "Website", links: [
    { label: "Analytics", href: "/admin/analytics", icon: "chart" },
    { label: "Navigation", href: "/admin/navigation", icon: "menu" },
    { label: "Settings", href: "/admin/settings", icon: "settings" },
  ] },
];

export function PortalSidebar({ admin = false, active = "dashboard" }: { admin?: boolean; active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const link = (label: string, href: string, icon: IconName) => {
    const selected = href === "/admin" ? pathname === href || pathname === "/admin/overview" : pathname === href || pathname.startsWith(href + "/");
    return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={selected ? "page" : undefined} className={"flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors " + (selected ? "bg-white font-semibold text-[var(--color-ink)] shadow-sm" : "text-[var(--color-mist)] hover:bg-white/10 hover:text-white")}><Icon name={icon} className={"h-4 w-4 " + (selected ? "text-[var(--color-accent-dark)]" : "text-[var(--color-accent-light)]")} />{label}</Link>;
  };

  async function signOut() {
    setSigningOut(true);
    setError("");
    try { await logout(); router.push("/login"); router.refresh(); }
    catch { setError("Could not sign out. Try again."); setSigningOut(false); }
  }

  return <aside className="self-start bg-[var(--color-ink)] p-4 text-white md:sticky md:top-[72px] md:flex md:h-[calc(100dvh-72px)] md:flex-col md:overflow-y-auto">
    <div className="flex items-center justify-between gap-4 px-2 py-2 md:mb-5">
      <div><p className="text-sm font-bold">{admin ? "IoD-Gh CMS" : "Member area"}</p><p className="mt-1 text-[10px] text-[var(--color-accent-light)]">{admin ? "Website administration" : "Your membership"}</p></div>
      <button type="button" aria-expanded={mobileOpen} aria-controls="portal-navigation" onClick={() => setMobileOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/25 px-3 text-xs md:hidden"><Icon name={mobileOpen ? "x" : "menu"} className="h-4 w-4" />{mobileOpen ? "Close" : "Menu"}</button>
    </div>
    <div id="portal-navigation" className={`${mobileOpen ? "block" : "hidden"} mt-4 md:mt-0 md:flex md:flex-1 md:flex-col`}>
      <nav aria-label="Portal navigation" className="space-y-5">
        {admin ? <>{link("Dashboard", "/admin", "dashboard")}{groups.map((group) => <div key={group.title}><p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent-light)]">{group.title}</p><div className="space-y-1">{group.links.map((item) => link(item.label, item.href, item.icon))}</div></div>)}</> : memberLinks.map((key) => <Link key={key} href={"/member/" + key} className={"block rounded px-3 py-2 text-sm " + (active === key ? "bg-[var(--color-accent-light)] text-[var(--color-ink)]" : "")}>{key.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase())}</Link>)}
      </nav>
      <div className="mt-6 border-t border-white/15 pt-4 md:mt-auto md:pt-4">
        <Link href="/" target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-xs text-[var(--color-mist)] hover:bg-white/10"><Icon name="external" className="h-4 w-4" />View website<span className="sr-only"> (opens in a new tab)</span></Link>
        <button type="button" disabled={signingOut} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-[var(--color-mist)] hover:bg-white/10 disabled:opacity-50" onClick={() => void signOut()}><Icon name="arrow-left" className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</button>
        {error && <p role="alert" className="mt-2 px-3 text-xs text-red-200">{error}</p>}
      </div>
    </div>
  </aside>;
}
