"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api/auth";
import { Icon } from "@/components/ui/Icon";

const memberLinks = ["dashboard", "my-profile", "membership", "events", "training", "cpd", "documents", "notifications", "settings"];
const groups = [
  { title: "Content", links: [["Pages", "/admin/content"], ["News", "/admin/news"]] },
  { title: "Media", links: [["Media Library", "/admin/media"]] },
  { title: "Examinations", links: [["Examinations", "/admin/examinations"]] },
  { title: "Website", links: [["Navigation", "/admin/navigation"], ["Analytics", "/admin/analytics"], ["Settings", "/admin/settings"]] },
  { title: "Membership", links: [["Members", "/admin/members"], ["Applications", "/admin/applications"], ["Directory", "/admin/directory"]] },
];
export function PortalSidebar({ admin = false, active = "dashboard" }: { admin?: boolean; active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const link = (label: string, href: string) => {
    const selected = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return <Link key={href} href={href} aria-current={selected ? "page" : undefined} className={"block rounded-lg px-3 py-2 text-sm " + (selected ? "bg-[var(--color-accent-light)] font-semibold text-[var(--color-ink)]" : "text-[var(--color-mist)] hover:bg-white/10")}>{label}</Link>;
  };
  return <aside className="self-start border-r border-[var(--color-line)] bg-[var(--color-ink)] p-5 text-white md:sticky md:top-[72px] md:max-h-[calc(100dvh-72px)] md:overflow-y-auto">
    <p className="mb-5 text-base font-bold">{admin ? "IoD-Gh CMS" : "Member area"}</p>
    <nav aria-label="Portal navigation" className="space-y-4">
      {admin ? <>{link("Dashboard", "/admin")}{groups.map((group) => <div key={group.title}><p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent-light)]">{group.title}</p>{group.links.map(([label, href]) => link(label, href))}</div>)}</> : memberLinks.map((key) => <Link key={key} href={"/member/" + key} className={"block rounded px-3 py-2 text-sm " + (active === key ? "bg-[var(--color-accent-light)] text-[var(--color-ink)]" : "")}>{key.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase())}</Link>)}
    </nav>
    <div className="mt-5 border-t border-white/20 pt-4"><Link href="/" className="flex items-center gap-1.5 px-3 py-2 text-sm">View website <Icon name="external" className="h-3.5 w-3.5" /></Link><button type="button" className="px-3 py-2 text-sm" onClick={async () => { try { await logout(); router.push("/login"); router.refresh(); } catch { setError("Could not log out. Try again."); } }}>Logout</button>{error && <p role="alert" className="text-xs">{error}</p>}</div>
  </aside>;
}
