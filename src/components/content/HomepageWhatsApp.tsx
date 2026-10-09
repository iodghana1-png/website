"use client";

import { useState } from "react";
import { useSiteSettings } from "@/components/cms/SiteSettings";
import { Icon } from "@/components/ui/Icon";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function HomepageWhatsApp() {
  const settings = useSiteSettings();
  const [open, setOpen] = useState(false);
  const whatsappDisplay = textValue(settings.whatsapp_number);
  const number = whatsappDisplay.replace(/\D/g, "");
  const message = textValue(settings.whatsapp_message);
  const email = textValue(settings.contact_email);
  const phones = Array.from(new Set([textValue(settings.phone), ...(Array.isArray(settings.phone_numbers) ? settings.phone_numbers.filter((value): value is string => typeof value === "string").map((value) => value.trim()) : [])].filter(Boolean)));
  const enabled = settings.show_homepage_contact_button !== false;
  if (!enabled || (number.length < 8 && !email && !phones.length)) return null;
  const href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return <div className="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7"><div className="relative">{open && <div role="dialog" aria-label="Contact IoD-Gh" className="absolute bottom-16 right-0 w-[min(19rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-xl"><div className="border-b border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3"><p className="font-serif text-xl text-[var(--color-ink)]">Contact IoD-Gh</p><p className="mt-1 text-xs text-[var(--color-slate)]">Choose how you would like to reach us.</p></div><div className="space-y-2 p-3">{phones.map((phone) => <a key={phone} href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-accent-dark)] text-white sm:h-8 sm:w-8" aria-hidden="true"><Icon name="phone" className="h-5 w-5 sm:h-4 sm:w-4" /></span><span><span className="block text-xs font-normal text-[var(--color-slate)]">Call us</span>{phone}</span></a>)}{email && <a href={`mailto:${email}`} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-accent-dark)] text-white sm:h-8 sm:w-8" aria-hidden="true"><Icon name="mail" className="h-5 w-5 sm:h-4 sm:w-4" /></span><span><span className="block text-xs font-normal text-[var(--color-slate)]">Email us</span>{email}</span></a>}{number.length >= 8 && <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white sm:h-8 sm:w-8" aria-hidden="true"><WhatsAppIcon className="h-5 w-5 sm:h-4 sm:w-4" /></span><span><span className="block text-xs font-normal text-[var(--color-slate)]">WhatsApp us</span>{whatsappDisplay}</span></a>}</div></div>}<button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={open ? "Close contact options" : "Open contact options"} title="Contact IoD-Gh" className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent-dark)] text-white shadow-lg transition hover:scale-105 hover:bg-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent-dark)]"><ContactIcon /><span className="sr-only">Open contact options</span></button></div></div>;
}

function ContactIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-[1.8]"><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 20l2-4.1A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeLinecap="round" strokeWidth="2.8" /></svg>;
}

function WhatsAppIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" className={`${className} fill-current`}><path d="M16 3.2a12.7 12.7 0 0 0-10.9 19.2L3.5 28.8l6.6-1.7A12.8 12.8 0 1 0 16 3.2Zm0 23.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.4 10.4 0 1 1 16 26.4Zm5.7-7.8c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-.9 1.2c-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.7.1-.2 0-.5-.1-.7-.1-.2-.7-1.6-.9-2.1-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.5-.3.4-1.2 1.2-1.2 3s1.2 3.5 1.4 3.8c.2.2 2.4 3.8 5.9 5.3 2.2 1 3 1.1 4.1.9.7-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z" /></svg>;
}
