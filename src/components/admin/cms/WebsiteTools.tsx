"use client";

import Image from "next/image";

import { FormEvent, useEffect, useState } from "react";
import { apiRequestAt } from "@/lib/api/client";
import { CmsMedia, CmsNavigationItem, CmsNavigationMenu, CmsPage, createCmsMenu, getCmsSettings, listCmsMedia, listCmsMenus, listCmsPages, publishCmsMenu, publishCmsSettings, saveCmsMenuDraft, saveCmsSettingsDraft, updateCmsMedia, uploadCmsMedia } from "@/lib/api/cms";
import { CmsAccess } from "../CmsAdmin";
import { Area, buttonClass, Field, inputClass, primaryClass, safeHref } from "./Fields";
import { MediaPicker } from "./MediaPicker";
import { navigation as defaultNavigation } from "@/data/navigation";
import { defaultSiteSettings } from "@/data/siteSettings";
import { Icon } from "@/components/ui/Icon";
import { footerConfig, type FooterColumn, type FooterConfig, type FooterLink } from "@/data/footer";

function Feedback({ error, notice }: { error: string; notice: string }) { return <>{error && <p role="alert" className="my-4 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="my-4 text-sm text-emerald-800">{notice}</p>}</>; }
export function MediaAdmin({ access }: { access: CmsAccess }) {
  const [items, setItems] = useState<CmsMedia[]>([]);
  const [selected, setSelected] = useState<CmsMedia | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { listCmsMedia().then(setItems).catch(() => setError("Could not load media.")); }, []);
  async function upload(file?: File, replace?: string) {
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try { const form = new FormData(); form.append("file", file); const asset = replace ? await apiRequestAt<CmsMedia>("/api/v2/cms/staff/media/" + replace + "/", { method: "PATCH", body: form }) : await uploadCmsMedia(form); setSelected(asset); setItems(await listCmsMedia()); setNotice("Media saved successfully."); } catch { setError("Upload failed. Choose a supported file under 20 MB."); } finally { setBusy(false); }
  }
  return <div><div className="flex flex-wrap items-end gap-3"><label className="w-64 text-sm font-semibold">Search media<input className={inputClass + " mt-1"} type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="w-48 text-sm font-semibold">Type<select className={inputClass + " mt-1"} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All media</option><option value="image">Images</option><option value="document">Documents</option><option value="video">Videos</option><option value="audio">Audio</option></select></label>{access.manage && <label className={buttonClass + " cursor-pointer px-3 py-2"}>Upload media<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,video/*,audio/*" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>}</div>
    <Feedback error={error} notice={notice} />
    {selected && <form className="my-5 grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { const asset = await apiRequestAt<CmsMedia>("/api/v2/cms/staff/media/" + selected.id + "/", { method: "PATCH", body: JSON.stringify({ original_filename: selected.original_filename, alt_text: selected.alt_text, caption: selected.caption }) }); setSelected(asset); setItems(await listCmsMedia()); setNotice("Media details saved."); } catch { setError("Could not save media details."); } finally { setBusy(false); } }}>
      <div>{selected.kind === "image" ? <Image width={640} height={480} unoptimized src={selected.file_url} alt={selected.alt_text} className="h-32 w-full object-contain" /> : <a href={selected.file_url} target="_blank" rel="noreferrer" className="underline">Preview {selected.original_filename}</a>}<button type="button" className={buttonClass + " mt-4"} onClick={() => setSelected(null)}>Close details</button></div>
      <fieldset disabled={!access.manage || busy} className="space-y-3"><Field label="Title" value={selected.original_filename} onChange={(original_filename) => setSelected({ ...selected, original_filename })} /><Field label="Alt Text" value={selected.alt_text} onChange={(alt_text) => setSelected({ ...selected, alt_text })} /><Area label="Caption" value={selected.caption} onChange={(caption) => setSelected({ ...selected, caption })} />{access.manage && <><div className="flex flex-wrap gap-2"><button className={primaryClass}>Save details</button><button type="button" className={buttonClass} onClick={async () => { if (!window.confirm("Remove this file from the Media Library? Existing content will keep its image.")) return; setBusy(true); try { await updateCmsMedia(selected.id, { status: "archived" }); setItems(await listCmsMedia()); setSelected(null); setNotice("Removed from the library. Existing page images are preserved."); } catch { setError("Could not remove media."); } finally { setBusy(false); } }}>Delete</button></div><label className="block text-sm">Replace file<input type="file" className="mt-2 block w-full" onChange={(e) => void upload(e.target.files?.[0], selected.id)} /></label></>}</fieldset>
    </form>}
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{items.filter((item) => item.status === "ready" && (!kind || item.kind === kind) && (item.original_filename + item.alt_text).toLowerCase().includes(query.toLowerCase())).map((item) => <button key={item.id} className="overflow-hidden rounded-lg border bg-white p-2 text-left hover:border-[var(--color-accent)]" onClick={() => setSelected(item)}>{item.kind === "image" ? <Image width={640} height={480} unoptimized src={item.file_url} alt={item.alt_text || item.original_filename} className="h-20 w-full object-contain" /> : <div className="grid h-20 place-items-center rounded bg-[var(--color-paper)] text-xs">{item.kind}</div>}<span className="mt-2 block truncate text-xs font-semibold">{item.original_filename}</span></button>)}</div>
  </div>;
}

type MenuItem = CmsNavigationItem & { id: string };
function initialNavigation(): MenuItem[] {
  return defaultNavigation.flatMap((item, index) => {
    const parent = "menu-" + index;
    return [{ id: parent, label: item.label, href: item.href, position: index, parent_id: null, link_type: "internal" as const, open_in_new_tab: false, is_enabled: true }, ...(item.children || []).map((child, childIndex) => ({ id: parent + "-" + childIndex, label: child.label, href: child.href, position: childIndex, parent_id: parent, link_type: "internal" as const, open_in_new_tab: false, is_enabled: true }))];
  });
}
function editableMenu(menu: CmsNavigationMenu): MenuItem[] { return (menu.current_draft_revision || menu.published_revision)?.items.map((item) => ({ ...item, id: item.id || crypto.randomUUID(), page: item.page_id })) || []; }
export function NavigationAdmin({ access }: { access: CmsAccess }) {
  const [menus, setMenus] = useState<CmsNavigationMenu[]>([]);
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState<CmsNavigationMenu | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { Promise.all([listCmsMenus(), listCmsPages()]).then(([menus, pages]) => { setMenus(menus); setPages(pages); if (menus[0]) { setMenu(menus[0]); setItems(editableMenu(menus[0])); } else setItems(initialNavigation()); setReady(true); }).catch(() => setError("Could not load navigation.")); }, []);
  const update = (index: number, patch: Partial<MenuItem>) => setItems(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  function move(index: number, step: number) { const siblings = items.map((item, i) => ({ item, i })).filter(({ item }) => item.parent_id === items[index].parent_id); const sibling = siblings[siblings.findIndex(({ i }) => i === index) + step]; if (!sibling) return; const copy = [...items]; [copy[index], copy[sibling.i]] = [copy[sibling.i], copy[index]]; setItems(copy); }
  async function save(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); setNotice(""); try {
    const target = menu || await createCmsMenu({ key: "header-primary", label: "Header" }); setMenu(target);
    const ordered: CmsNavigationItem[] = [];
    const visit = (parent: string | null, parentIndex: number | null) => items.filter((item) => (item.parent_id || null) === parent).forEach((item) => { const index = ordered.length; ordered.push({ ...item, parent_index: parentIndex, position: index, page: item.link_type === "page" ? item.page : null }); visit(item.id, index); });
    visit(null, null);
    if (ordered.length !== items.length) throw new Error("Check that every menu item has a valid parent.");
    const saved = await saveCmsMenuDraft(target.id, { items: ordered, change_summary: "" }); await publishCmsMenu(target.id, saved.current_draft_revision!.number); const next = await listCmsMenus(); setMenus(next); const current = next.find((m) => m.id === target.id)!; setMenu(current); setItems(editableMenu(current)); setNotice("Navigation saved successfully.");
  } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save navigation."); } finally { setBusy(false); } }
  return <form onSubmit={save} className="max-w-5xl"><Feedback error={error} notice={notice} />{menus.length > 1 && <label className="mb-4 block text-sm">Menu<select value={menu?.id || ""} className={inputClass} onChange={(e) => { const selected = menus.find((m) => m.id === e.target.value)!; setMenu(selected); setItems(editableMenu(selected)); }}>{menus.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
    <fieldset disabled={busy || !access.manage || !ready} className="space-y-3"><h2 className="mb-4 text-lg">{menu?.label || "Header"}</h2>{items.map((item, index) => <details key={item.id} className={"rounded-xl border bg-white " + (item.parent_id ? "ml-5" : "")}><summary className="cursor-pointer px-5 py-4 font-semibold">{item.label || "New item"}</summary><div className="space-y-4 border-t p-5"><Field label="Name" required value={item.label} onChange={(label) => update(index, { label })} /><label className="block text-sm">Link to<select className={inputClass} value={item.link_type === "page" ? item.page || "" : "custom"} onChange={(e) => update(index, e.target.value === "custom" ? { link_type: "internal", page: null } : { link_type: "page", page: e.target.value })}><option value="custom">Website address</option>{pages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>{item.link_type !== "page" && <Field label="Link address" required value={item.href} onChange={(href) => update(index, { href, link_type: href.startsWith("/") ? "internal" : "external" })} />}
      <label className="block text-sm">Under<select className={inputClass} value={item.parent_id || ""} onChange={(e) => update(index, { parent_id: e.target.value || null })}><option value="">Top level</option>{items.filter((p) => !p.parent_id && p.id !== item.id && !items.some((child) => child.parent_id === item.id)).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={item.open_in_new_tab} onChange={(e) => update(index, { open_in_new_tab: e.target.checked })} />Open in a new tab</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={item.is_enabled} onChange={(e) => update(index, { is_enabled: e.target.checked })} />Show item</label>
      <div className="flex gap-2"><button type="button" className={buttonClass} onClick={() => move(index, -1)}><Icon name="arrow-up" className="h-4 w-4" /> Move up</button><button type="button" className={buttonClass} onClick={() => move(index, 1)}><Icon name="arrow-down" className="h-4 w-4" /> Move down</button><button type="button" className={buttonClass} onClick={() => setItems(items.filter((entry) => entry.id !== item.id).map((entry) => entry.parent_id === item.id ? { ...entry, parent_id: item.parent_id } : entry))}>Remove</button></div></div></details>)}
    {access.manage && <div className="sticky bottom-0 flex flex-wrap justify-between gap-3 rounded-xl bg-[var(--color-warm-white)] py-4"><button type="button" className={buttonClass} onClick={() => setItems([...items, { id: crypto.randomUUID(), parent_id: null, position: items.length, label: "", link_type: "internal", href: "/", is_enabled: true, open_in_new_tab: false }])}>+ Add Item</button><button className={primaryClass}>Save Navigation</button></div>}</fieldset></form>;
}

function footerLink(): FooterLink {
  return { label: "", href: "/", enabled: true, new_tab: false };
}

function FooterLinksEditor({ links, onChange }: { links: FooterLink[]; onChange: (links: FooterLink[]) => void }) {
  const update = (index: number, patch: Partial<FooterLink>) => onChange(links.map((link, current) => current === index ? { ...link, ...patch } : link));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return <div className="space-y-3">{links.map((link, index) => <div key={index} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Link label" value={link.label} onChange={(label) => update(index, { label })} /><Field label="Link address" value={link.href} onChange={(href) => update(index, { href })} /></div>{link.href && !safeHref(link.href) && <p className="mt-2 text-sm text-red-700">Use a full https URL, site-relative path, mailto, tel, or anchor link.</p>}<div className="mt-3 flex flex-wrap gap-x-5 gap-y-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={link.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} />Show link</label><label className="flex items-center gap-2"><input type="checkbox" checked={link.new_tab} onChange={(event) => update(index, { new_tab: event.target.checked })} />Open in a new tab</label><button type="button" className={buttonClass} onClick={() => move(index, -1)}>Move up</button><button type="button" className={buttonClass} onClick={() => move(index, 1)}>Move down</button><button type="button" className={buttonClass} onClick={() => onChange(links.filter((_, current) => current !== index))}>Remove</button></div></div>)}<button type="button" className={buttonClass} onClick={() => onChange([...links, footerLink()])}>+ Add link</button></div>;
}

function footerPhones(data: Record<string, unknown>) {
  const stored = Array.isArray(data.phone_numbers) ? data.phone_numbers.filter((value): value is string => typeof value === "string") : [];
  const legacy = typeof data.phone === "string" ? data.phone.trim() : "";
  if (!stored.length) return legacy ? [legacy] : [];
  return legacy && stored[0]?.trim() !== legacy ? [legacy, ...stored] : stored;
}

function PhoneNumbersEditor({ phones, onChange }: { phones: string[]; onChange: (phones: string[]) => void }) {
  const update = (index: number, phone: string) => onChange(phones.map((value, current) => current === index ? phone : value));
  return <div><h2 className="text-lg font-semibold">Footer phone numbers</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Each number is shown as a tap-to-call link in the footer.</p><div className="mt-4 space-y-3">{phones.map((phone, index) => <div key={index} className="flex flex-wrap items-end gap-2"><div className="min-w-56 flex-1"><Field label={index === 0 ? "Primary phone number" : "Additional phone number"} value={phone} onChange={(value) => update(index, value)} /></div><button type="button" className={buttonClass} onClick={() => onChange(phones.filter((_, current) => current !== index))}>Remove</button></div>)}</div><button type="button" className={buttonClass + " mt-3"} onClick={() => onChange([...phones, ""])}>+ Add phone number</button></div>;
}

function FooterSettings({ data, onChange, onChangePhones }: { data: Record<string, unknown>; onChange: (footer: FooterConfig) => void; onChangePhones: (phones: string[]) => void }) {
  const footer = footerConfig(data);
  const change = (patch: Partial<FooterConfig>) => onChange({ ...footer, ...patch });
  const changeColumn = (index: number, patch: Partial<FooterColumn>) => change({ columns: footer.columns.map((column, current) => current === index ? { ...column, ...patch } : column) });
  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= footer.columns.length) return;
    const columns = [...footer.columns];
    [columns[index], columns[target]] = [columns[target], columns[index]];
    change({ columns });
  };
  return <details className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]" open><summary className="cursor-pointer px-5 py-4 text-lg font-semibold">Footer</summary><div className="space-y-6 border-t border-[var(--color-line)] p-5"><p className="text-sm text-[var(--color-muted)]">These settings control the footer on every public page. Save publishes the entire site-settings revision.</p><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={footer.enabled} onChange={(event) => change({ enabled: event.target.checked })} />Show footer</label><div className="grid gap-5 sm:grid-cols-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={footer.show_logo} onChange={(event) => change({ show_logo: event.target.checked })} />Show logo</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={footer.show_contact} onChange={(event) => change({ show_contact: event.target.checked })} />Show contact details</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={footer.show_social} onChange={(event) => change({ show_social: event.target.checked })} />Show social links</label></div><MediaPicker label="Footer logo" value={footer.logo_id} fallback={footer.logo_url} onChange={(logo_id, logo_url) => change({ logo_id, logo_url })} /><Area label="Footer description" value={footer.description} onChange={(description) => change({ description })} /><PhoneNumbersEditor phones={footerPhones(data)} onChange={onChangePhones} /><div><h2 className="text-lg font-semibold">Link columns</h2><div className="mt-4 space-y-4">{footer.columns.map((column, index) => <details key={index} className="rounded-lg border border-[var(--color-line)] bg-white"><summary className="cursor-pointer px-4 py-3 font-semibold">{column.title || "Untitled column"}</summary><div className="space-y-4 border-t border-[var(--color-line)] p-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Column heading" value={column.title} onChange={(title) => changeColumn(index, { title })} /><label className="flex items-end gap-2 pb-3 text-sm font-semibold"><input type="checkbox" checked={column.enabled} onChange={(event) => changeColumn(index, { enabled: event.target.checked })} />Show column</label></div><FooterLinksEditor links={column.links} onChange={(links) => changeColumn(index, { links })} /><div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => moveColumn(index, -1)}>Move column up</button><button type="button" className={buttonClass} onClick={() => moveColumn(index, 1)}>Move column down</button><button type="button" className={buttonClass} onClick={() => change({ columns: footer.columns.filter((_, current) => current !== index) })}>Remove column</button></div></div></details>)}</div><button type="button" className={buttonClass + " mt-4"} onClick={() => change({ columns: [...footer.columns, { title: "New column", enabled: true, links: [footerLink()] }] })}>+ Add column</button></div><div><h2 className="text-lg font-semibold">Bottom links</h2><div className="mt-4"><FooterLinksEditor links={footer.bottom_links} onChange={(bottom_links) => change({ bottom_links })} /></div></div><div className="space-y-5 rounded-lg border border-[var(--color-line)] bg-white p-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={footer.newsletter_enabled} onChange={(event) => change({ newsletter_enabled: event.target.checked })} />Show newsletter call to action</label><div className="grid gap-5 sm:grid-cols-2"><Field label="Newsletter heading" value={footer.newsletter_heading} onChange={(newsletter_heading) => change({ newsletter_heading })} /><Field label="Button label" value={footer.newsletter_label} onChange={(newsletter_label) => change({ newsletter_label })} /></div><Area label="Newsletter description" value={footer.newsletter_description} onChange={(newsletter_description) => change({ newsletter_description })} /><Field label="Button link" value={footer.newsletter_href} onChange={(newsletter_href) => change({ newsletter_href })} />{footer.newsletter_href && !safeHref(footer.newsletter_href) && <p className="text-sm text-red-700">Use a full https URL, site-relative path, mailto, tel, or anchor link.</p>}</div><Field label="Copyright notice" value={footer.copyright} onChange={(copyright) => change({ copyright })} /><p className="text-sm text-[var(--color-muted)]">Use <code>{"{year}"}</code> to insert the current year automatically.</p></div></details>;
}

export function SettingsAdmin({ access }: { access: CmsAccess }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { getCmsSettings().then((settings) => setData({ ...defaultSiteSettings, ...(settings.current_draft_revision || settings.published_revision)?.data })).catch(() => { setLoadFailed(true); setError("Could not load settings. Refresh before editing."); }).finally(() => setLoading(false)); }, []);
  const value = (key: string) => typeof data[key] === "string" ? data[key] as string : "";
  const change = (key: string, value: string | null) => setData((d) => ({ ...d, [key]: value }));
  if (loading) return <p>Loading settings…</p>;
  return <form className="max-w-4xl" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); setNotice(""); try { const settings = await saveCmsSettingsDraft({ data, change_summary: "" }); await publishCmsSettings(settings.current_draft_revision!.number); window.dispatchEvent(new Event("cms:settings-published")); setNotice("Settings saved successfully."); } catch { setError("Could not save settings. Please try again."); } finally { setBusy(false); } }}><Feedback error={error} notice={notice} /><fieldset disabled={busy || !access.manage || loadFailed} className="space-y-5 rounded-xl border bg-white p-5"><Field label="Website Name (navbar)" value={value("website_name")} onChange={(v) => change("website_name", v)} />
    <div className="grid gap-5 sm:grid-cols-2">{["logo", "favicon"].map((key) => <MediaPicker key={key} label={key === "logo" ? "Logo (navbar)" : "Favicon"} value={value(key + "_id")} fallback={value(key + "_url")} canUpload={access.manage} onChange={(id, url) => setData((d) => ({ ...d, [key + "_id"]: id, [key + "_url"]: url }))} />)}</div>
    <Field label="Contact Email" type="email" value={value("contact_email")} onChange={(v) => change("contact_email", v)} /><Area label="Address" value={value("address")} onChange={(v) => change("address", v)} /><div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4"><h2 className="text-lg font-semibold">Homepage contact button</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Enter a WhatsApp number with its country code. On the homepage, the button opens call, email and WhatsApp options using these website contact settings.</p><label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={data.show_homepage_contact_button !== false} onChange={(event) => setData((current) => ({ ...current, show_homepage_contact_button: event.target.checked }))} />Show homepage contact button</label><div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="WhatsApp number" type="tel" value={value("whatsapp_number")} onChange={(v) => change("whatsapp_number", v)} /><Field label="Opening message" value={value("whatsapp_message")} onChange={(v) => change("whatsapp_message", v)} /></div></div><h2 className="text-lg">Social Media</h2><div className="grid gap-5 sm:grid-cols-2">{["Facebook", "Instagram", "LinkedIn", "X", "YouTube"].map((label) => <Field key={label} label={label} type="url" value={value(label.toLowerCase())} onChange={(v) => change(label.toLowerCase(), v)} />)}</div><FooterSettings data={data} onChange={(footer) => setData((current) => ({ ...current, footer }))} onChangePhones={(phone_numbers) => setData((current) => ({ ...current, phone: phone_numbers[0] || "", phone_numbers }))} />{access.manage && <button className={primaryClass}>Save Settings</button>}</fieldset></form>;
}
