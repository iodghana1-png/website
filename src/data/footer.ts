export type FooterLink = { label: string; href: string; enabled: boolean; new_tab: boolean };
export type FooterColumn = { title: string; enabled: boolean; links: FooterLink[] };
export type FooterConfig = {
  enabled: boolean; show_logo: boolean; logo_id: string | null; logo_url: string;
  description: string; show_contact: boolean; show_social: boolean;
  columns: FooterColumn[]; bottom_links: FooterLink[]; copyright: string;
  newsletter_enabled: boolean; newsletter_heading: string; newsletter_description: string;
  newsletter_label: string; newsletter_href: string;
};
const link = (label: string, href: string): FooterLink => ({ label, href, enabled: true, new_tab: false });
export const defaultFooter: FooterConfig = {
  enabled: true, show_logo: true, logo_id: null, logo_url: "", show_contact: true, show_social: true,
  description: "Ghana’s community for principled, capable and connected directors.",
  columns: [
    { title: "The Institute", enabled: true, links: [link("About us", "/about"), link("Council", "/about/council"), link("Strategic partners", "/about/partners"), link("Contact", "/contact")] },
    { title: "For directors", enabled: true, links: [link("Membership", "/membership"), link("Professional development", "/training"), link("Events", "/events"), link("Resources", "/knowledge")] },
    { title: "Useful links", enabled: true, links: [link("Apply for membership", "/membership/apply"), link("Membership verification", "/membership/verify"), link("Board evaluation", "/services/board-evaluation"), link("Governance consultancy", "/services/consultancy"), link("Corporate meetings", "/services/corporate-meeting")] },
  ],
  bottom_links: [link("Privacy", "/privacy"), link("Terms", "/terms")],
  copyright: "© {year} Institute of Directors–Ghana. All rights reserved.",
  newsletter_enabled: true, newsletter_heading: "Stay informed",
  newsletter_description: "Governance insight and IoD-Gh news, delivered to your inbox.",
  newsletter_label: "Subscribe", newsletter_href: "/contact",
};

function stringValue(value: unknown, fallback: string) { return typeof value === "string" ? value : fallback; }
function booleanValue(value: unknown, fallback: boolean) { return typeof value === "boolean" ? value : fallback; }
function footerLink(value: unknown, fallback: FooterLink): FooterLink {
  const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { label: stringValue(item.label, fallback.label), href: stringValue(item.href, fallback.href), enabled: booleanValue(item.enabled, fallback.enabled), new_tab: booleanValue(item.new_tab, fallback.new_tab) };
}
function footerLinks(value: unknown, fallback: FooterLink[]) {
  return Array.isArray(value) ? value.map((item) => footerLink(item, link("", "/"))) : fallback.map((item) => ({ ...item }));
}
function footerColumns(value: unknown) {
  if (!Array.isArray(value)) return defaultFooter.columns.map((column) => ({ ...column, links: footerLinks(column.links, []) }));
  return value.map((item) => {
    const column = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return { title: stringValue(column.title, ""), enabled: booleanValue(column.enabled, true), links: footerLinks(column.links, []) };
  });
}
export function footerConfig(settings: Record<string, unknown>): FooterConfig {
  const stored = settings.footer && typeof settings.footer === "object" && !Array.isArray(settings.footer) ? settings.footer as Record<string, unknown> : {};
  return {
    enabled: booleanValue(stored.enabled, defaultFooter.enabled), show_logo: booleanValue(stored.show_logo, defaultFooter.show_logo), logo_id: typeof stored.logo_id === "string" ? stored.logo_id : null, logo_url: stringValue(stored.logo_url, defaultFooter.logo_url),
    description: stringValue(stored.description, typeof settings.footer_description === "string" ? settings.footer_description : defaultFooter.description), show_contact: booleanValue(stored.show_contact, defaultFooter.show_contact), show_social: booleanValue(stored.show_social, defaultFooter.show_social),
    columns: footerColumns(stored.columns), bottom_links: footerLinks(stored.bottom_links, defaultFooter.bottom_links), copyright: stringValue(stored.copyright, defaultFooter.copyright),
    newsletter_enabled: booleanValue(stored.newsletter_enabled, defaultFooter.newsletter_enabled), newsletter_heading: stringValue(stored.newsletter_heading, defaultFooter.newsletter_heading), newsletter_description: stringValue(stored.newsletter_description, defaultFooter.newsletter_description), newsletter_label: stringValue(stored.newsletter_label, defaultFooter.newsletter_label), newsletter_href: stringValue(stored.newsletter_href, defaultFooter.newsletter_href) || defaultFooter.newsletter_href,
  };
}
