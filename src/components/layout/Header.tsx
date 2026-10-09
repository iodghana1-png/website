"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { navigation as defaultNavigation } from "@/data/navigation";
import { CmsNavigationItem, getPublishedCmsMenu } from "@/lib/api/cms";
import { examinationHref } from "@/lib/examinationPortal";
import { Logo } from "./Logo";

type HeaderLink = { label: string; href: string; newTab?: boolean; children?: Array<{ label: string; href: string; description?: string; newTab?: boolean }> };
const homeLink: HeaderLink = { label: "Home", href: "/" };

function withHomeLink(items: HeaderLink[]) { return [homeLink, ...items.filter((item) => item.href !== "/" && item.label.toLowerCase() !== "home")]; }
function hasMenuBeyondHome(items: HeaderLink[]) { return items.some((item) => item.href !== "/" && item.label.trim().toLowerCase() !== "home"); }
function isVisibleNavigationItem(item: CmsNavigationItem) { return item.href.replace(/\/$/, "") !== "/training/customized"; }
function asHeaderLinks(items: CmsNavigationItem[]): HeaderLink[] {
  const enabled = items.filter((item) => item.is_enabled && isVisibleNavigationItem(item));
  return enabled.filter((item) => !item.parent_id).map((item) => ({ label: item.label, href: examinationHref(item.href || "/"), newTab: item.open_in_new_tab, children: enabled.filter((child) => child.parent_id === item.id).map((child) => ({ label: child.label, href: examinationHref(child.href || "/"), newTab: child.open_in_new_tab })) }));
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopMenuDismissed, setDesktopMenuDismissed] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [menu, setMenu] = useState<HeaderLink[]>(() => withHomeLink(defaultNavigation));
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const mobileMenu = menu.length > 1 ? menu : withHomeLink(defaultNavigation);
  const closeNavigation = () => { setMenuOpen(false); setDesktopMenuDismissed(true); (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur(); };

  useEffect(() => {
    const updateScroll = () => setHasScrolled(window.scrollY > 24);
    updateScroll(); window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => { getPublishedCmsMenu("header-primary").then((cmsMenu) => { const links = asHeaderLinks(cmsMenu.published_revision?.items || []); if (!cancelled && cmsMenu.published_revision && hasMenuBeyondHome(links)) setMenu(withHomeLink(links)); }).catch(() => undefined); }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[var(--color-line)] bg-white px-5"><Logo /><Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold">View website <Icon name="external" className="h-3.5 w-3.5" /></Link></header>;

  return <header className={`${isHomepage ? "fixed" : "sticky"} inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${isHomepage ? hasScrolled ? "border-white/15 bg-[rgb(39_27_84_/_0.82)] text-white backdrop-blur-md" : "border-white/10 bg-[var(--color-ink)] text-white" : "border-[var(--color-line)] bg-[rgb(252_251_254_/_0.97)] text-[var(--color-ink)] backdrop-blur"}`}>
    <div className="site-container flex h-[72px] items-center justify-between">
      <Logo inverse={isHomepage} />
      <nav className="hidden h-full xl:block" aria-label="Main navigation"><ul className="flex h-full items-center gap-7">{menu.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        const hasChildren = !!item.children?.length;
        return <li key={item.label} className="group relative flex h-full items-center" onMouseEnter={() => setDesktopMenuDismissed(false)} onMouseLeave={() => setDesktopMenuDismissed(false)} onFocusCapture={() => setDesktopMenuDismissed(false)}>
          <Link onClick={closeNavigation} href={item.href} target={item.newTab ? "_blank" : undefined} rel={item.newTab ? "noopener noreferrer" : undefined} aria-current={active ? "page" : undefined} className={`flex items-center gap-1 border-b-2 py-7 text-[0.9375rem] font-semibold transition-colors ${isHomepage ? "border-transparent text-white hover:text-[var(--color-accent-light)] focus:text-[var(--color-accent-light)]" : active ? "border-[var(--color-accent)] text-[var(--color-accent-dark)] hover:text-[var(--color-accent-dark)] focus:text-[var(--color-accent-dark)]" : "border-transparent text-[var(--color-ink)] hover:text-[var(--color-accent-dark)] focus:text-[var(--color-accent-dark)]"}`}>{item.label}{hasChildren && <Icon name="chevron-down" className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />}</Link>
          {hasChildren && <div className={`absolute left-0 top-[calc(100%-1px)] z-50 w-72 border-t-2 border-[var(--color-accent)] bg-white p-3 shadow-[var(--shadow-elevated)] transition-all duration-150 ${desktopMenuDismissed ? "pointer-events-none invisible translate-y-2 opacity-0" : "invisible translate-y-2 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"}`}><div className="border-b border-[var(--color-line)] px-3 pb-3 pt-1"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-accent-dark)]">{item.label.toUpperCase()}</p></div><ul className="pt-2">{item.children?.map((child, index) => <li key={child.href}><Link onClick={closeNavigation} href={child.href} target={child.newTab ? "_blank" : undefined} rel={child.newTab ? "noopener noreferrer" : undefined} className="block px-3 py-3 transition-colors hover:bg-[var(--color-paper)] focus:bg-[var(--color-paper)]"><span className="block text-sm font-bold text-[var(--color-ink)]">{child.label}</span>{index === 0 && child.description && <span className="mt-1 block text-xs leading-5 text-[var(--color-slate)]">{child.description}</span>}</Link></li>)}</ul></div>}
        </li>;
      })}</ul></nav>
      <div className="hidden items-center md:flex"><Link href="/membership/apply" className={`px-6 py-3.5 text-[0.6875rem] font-bold tracking-[0.05em] transition-colors ${isHomepage ? "border border-white text-white hover:bg-white hover:text-[var(--color-ink)]" : "bg-[#2c1972] text-white hover:bg-[#211454]"}`}>JOIN IoD-Gh</Link></div>
      <button className="grid h-10 w-10 place-items-center xl:hidden" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}><span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span><Icon name={menuOpen ? "x" : "menu"} className={`h-7 w-7 ${isHomepage ? "text-white" : "text-[var(--color-ink)]"}`} /></button>
    </div>
    {menuOpen && <nav id="mobile-navigation" className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-[var(--color-line)] bg-[var(--color-warm-white)] px-6 py-5 text-[var(--color-ink)] shadow-[var(--shadow-elevated)] xl:hidden" aria-label="Mobile navigation"><div className="site-container flex flex-col">{mobileMenu.map((item) => item.children?.length ? <details key={item.label} className="group border-b border-[var(--color-line)]"><summary className="flex cursor-pointer list-none items-center justify-between py-4 font-serif text-2xl"><span>{item.label}</span><Icon name="plus" className="h-5 w-5 transition-transform group-open:rotate-45" /></summary><ul className="-mt-1 space-y-1 pb-4 pl-3"><li><Link onClick={() => setMenuOpen(false)} href={item.href} target={item.newTab ? "_blank" : undefined} rel={item.newTab ? "noopener noreferrer" : undefined} className="block py-2 text-sm font-semibold text-[var(--color-ink)]">{item.label}</Link></li>{item.children.map((child) => <li key={child.href}><Link onClick={() => setMenuOpen(false)} href={child.href} target={child.newTab ? "_blank" : undefined} rel={child.newTab ? "noopener noreferrer" : undefined} className="block py-2 text-sm text-[var(--color-slate)] hover:text-[var(--color-ink)]">{child.label}</Link></li>)}</ul></details> : <Link key={item.label} onClick={() => setMenuOpen(false)} href={item.href} target={item.newTab ? "_blank" : undefined} rel={item.newTab ? "noopener noreferrer" : undefined} className="border-b border-[var(--color-line)] py-4 font-serif text-2xl text-[var(--color-ink)]">{item.label}</Link>)}<div className="mt-6"><Link onClick={() => setMenuOpen(false)} href="/membership/apply" className="bg-[var(--color-ink)] px-4 py-3 text-xs font-bold tracking-[0.05em] text-white">JOIN IoD-Gh</Link></div></div></nav>}
  </header>;
}
