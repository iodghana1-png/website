"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api/client";
import { linkUrl } from "./ContentRenderer";
import { Icon, IconName } from "@/components/ui/Icon";

const SettingsContext = createContext<Record<string, unknown>>({});
export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  useEffect(() => {
    let controller: AbortController;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      fetch(apiBaseUrl + "/api/v2/cms/site/", { signal, cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((result) => { if (result && !signal.aborted) setData(result.settings); }).catch(() => {});
    };
    refresh();
    window.addEventListener("cms:settings-published", refresh);
    window.addEventListener("focus", refresh);
    return () => { controller?.abort(); window.removeEventListener("cms:settings-published", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  return <SettingsContext.Provider value={data}>{children}</SettingsContext.Provider>;
}
export function useSiteSettings() { return useContext(SettingsContext); }

const socialNetworks = ["Facebook", "Instagram", "LinkedIn", "X", "YouTube"] as const;
type SocialNetwork = typeof socialNetworks[number];

const socialIcons: Record<SocialNetwork, IconName> = { Facebook: "facebook", Instagram: "instagram", LinkedIn: "linkedin", X: "x-social", YouTube: "youtube" };
function SocialIcon({ name }: { name: SocialNetwork }) { return <Icon name={socialIcons[name]} className="h-4 w-4" />; }

export function SiteContact({ settings, showContact = true, showSocial = true }: { settings?: Record<string, unknown>; showContact?: boolean; showSocial?: boolean } = {}) {
  const shared = useSiteSettings();
  const data = settings || shared;
  const text = (key: string) => typeof data[key] === "string" ? data[key] as string : "";
  const phones = Array.from(new Set([text("phone"), ...(Array.isArray(data.phone_numbers) ? data.phone_numbers.filter((value): value is string => typeof value === "string") : [])].map((value) => value.trim()).filter(Boolean)));
  if (!showContact && !showSocial) return null;
  return <div className="mt-5 space-y-2 text-sm">{showContact && <>{text("contact_email") && <p><a href={"mailto:" + text("contact_email")}>{text("contact_email")}</a></p>}{phones.map((phone) => <p key={phone}><a href={"tel:" + phone}>{phone}</a></p>)}{text("address") && <p className="whitespace-pre-line">{text("address")}</p>}</>}{showSocial && <div className="flex flex-wrap gap-2 pt-2">{socialNetworks.map((name) => linkUrl(text(name.toLowerCase())) && <a key={name} href={linkUrl(text(name.toLowerCase()))} target="_blank" rel="noreferrer" aria-label={name} className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-[var(--color-gold-light)] transition hover:border-[var(--color-gold-light)] hover:bg-white hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><SocialIcon name={name} /></a>)}</div>}</div>;
}
