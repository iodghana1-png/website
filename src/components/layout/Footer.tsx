"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteContact, useSiteSettings } from "@/components/cms/SiteSettings";
import { linkUrl } from "@/components/cms/ContentRenderer";
import { footerConfig, type FooterLink } from "@/data/footer";
import { cmsMediaUrl } from "@/lib/cms/media";
import { Logo } from "./Logo";
import { Icon } from "@/components/ui/Icon";

function FooterLinks({ links }: { links: FooterLink[] }) {
  return <>{links.filter((item) => item.enabled && item.label && linkUrl(item.href)).map((item, index) => <li key={index}><Link href={linkUrl(item.href)} target={item.new_tab ? "_blank" : undefined} rel={item.new_tab ? "noopener noreferrer" : undefined} className="hover:text-white focus-visible:underline">{item.label}</Link></li>)}</>;
}

export function FooterContent({ settings }: { settings: Record<string, unknown> }) {
  const footer = footerConfig(settings);
  if (!footer.enabled) return null;
  const columns = footer.columns.filter((column) => column.enabled);
  const bottomLinks = [{ label: "Member login", href: "/login", enabled: true, new_tab: false }, ...footer.bottom_links.filter((item) => item.href !== "/login")];
  const logoUrl = cmsMediaUrl(footer, "logo");
  const count = 1 + columns.length + Number(footer.newsletter_enabled);
  const grid = count >= 4 ? "xl:grid-cols-4" : count === 3 ? "xl:grid-cols-3" : "";
  return <footer id="contact" className="bg-[var(--color-ink)] pb-8 pt-16 text-white sm:pt-20"><div className="site-container">
    <div className={`grid gap-12 border-b border-white/20 pb-14 md:grid-cols-2 ${grid} xl:gap-8`}>
      <div>{footer.show_logo && (logoUrl ? <Link href="/" aria-label="Home"><Image src={logoUrl} alt={typeof settings.website_name === "string" ? settings.website_name : "Institute of Directors Ghana"} width={240} height={96} unoptimized className="h-20 w-auto max-w-full object-contain" /></Link> : <Logo inverse />)}
        {footer.description && <p className="mt-7 max-w-xs whitespace-pre-line leading-7 text-[var(--color-mist)]">{footer.description}</p>}
        <SiteContact settings={settings} showContact={footer.show_contact} showSocial={footer.show_social} />
      </div>
      {columns.map((column, index) => <div key={index}><h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-gold-light)]">{column.title}</h2><ul className="mt-5 space-y-3 text-sm text-[var(--color-mist)]"><FooterLinks links={column.links} /></ul></div>)}
      {footer.newsletter_enabled && <div><h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-gold-light)]">{footer.newsletter_heading}</h2><p className="mt-5 whitespace-pre-line text-sm leading-6 text-[var(--color-mist)]">{footer.newsletter_description}</p>{footer.newsletter_label && linkUrl(footer.newsletter_href) && <Link href={linkUrl(footer.newsletter_href)} className="mt-5 inline-flex items-center border-b border-[var(--color-gold)] pb-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-gold-light)] hover:text-white">{footer.newsletter_label} <Icon name="arrow-right" className="ml-4 h-4 w-4" /></Link>}</div>}
    </div>
    <div className="flex flex-col justify-between gap-3 pt-7 text-xs text-[var(--color-mist)] sm:flex-row"><p>{footer.copyright.replaceAll("{year}", String(new Date().getFullYear()))}</p><ul className="flex flex-wrap gap-5"><FooterLinks links={bottomLinks} /></ul></div>
  </div></footer>;
}

export function Footer() {
  const pathname = usePathname();
  const settings = useSiteSettings();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <FooterContent settings={settings} />;
}
