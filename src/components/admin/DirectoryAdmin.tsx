"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { createDirectoryEntry, deleteDirectoryEntry, DIRECTORY_DESIGNATIONS, DirectoryEntry, getStaffDirectory, updateDirectoryEntry, updateDirectoryPublication } from "@/lib/api/membership";

const categories: Array<DirectoryEntry["designation"] | "all"> = ["all", ...DIRECTORY_DESIGNATIONS];

export function DirectoryAdmin() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [publication, setPublication] = useState<"all" | "published" | "draft">("all");
  const [category, setCategory] = useState<DirectoryEntry["designation"] | "all">("all");
  const [sort, setSort] = useState<"name" | "category">("name");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryEntry | null>(null);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ full_name: "", designation: "MIoD" as DirectoryEntry["designation"], as_of_date: "2026-09-30", sort_order: 0 });
  const deleteDialog = useRef<HTMLDialogElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await getStaffDirectory());
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't load the directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(requestId);
  }, []);

  const visible = useMemo(() => entries
    .filter((entry) => entry.full_name.toLowerCase().includes(query.toLowerCase()) && (category === "all" || entry.designation === category) && (publication === "all" || entry.is_published === (publication === "published")))
    .sort((a, b) => sort === "name" ? a.full_name.localeCompare(b.full_name) : a.designation.localeCompare(b.designation) || a.full_name.localeCompare(b.full_name)), [entries, query, category, publication, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / 50));
  const activePage = Math.min(page, pageCount);
  const displayEntries = visible.slice((activePage - 1) * 50, activePage * 50);

  const save = async (entry: DirectoryEntry, changes: Partial<DirectoryEntry>) => {
    try {
      const updated = await updateDirectoryEntry(entry.id, changes);
      setEntries((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't update this entry.");
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const entry = await createDirectoryEntry({ ...draft, is_published: false });
      setEntries((items) => [...items, entry]);
      setDraft({ ...draft, full_name: "" });
      setNotice("Directory entry added as a draft.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't add this entry.");
    }
  };

  const bulkUpdate = async (isPublished: boolean) => {
    const action = isPublished ? "publish" : "unpublish";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} all ${visible.length} currently filtered entries?`)) return;
    setBulkBusy(true);
    setError("");
    setNotice("");
    try {
      await updateDirectoryPublication({ is_published: isPublished, designation: category === "all" ? undefined : category, current_state: publication === "all" ? undefined : publication === "published" });
      await load();
      setNotice(`Filtered entries ${isPublished ? "published" : "unpublished"}.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't update publication status.");
    } finally {
      setBulkBusy(false);
    }
  };

  const openDeleteDialog = (entry: DirectoryEntry) => {
    setDeleteTarget(entry);
    deleteDialog.current?.showModal();
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    deleteDialog.current?.close();
    setDeleteTarget(null);
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError("");
    setNotice("");
    try {
      await deleteDirectoryEntry(deleteTarget.id);
      setEntries((items) => items.filter((item) => item.id !== deleteTarget.id));
      setNotice(`${deleteTarget.full_name} was removed from the register.`);
      deleteDialog.current?.close();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't delete this entry.");
    } finally {
      setDeletingId(null);
    }
  };

  return <section className="mt-10">
    <div className="border-l-2 border-[var(--color-accent)] bg-[var(--color-paper)] p-5">
      <p className="font-bold">Publication control</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Filter the register, then publish or unpublish every matching entry in one action. Deleting an entry removes it permanently from the register.</p>
    </div>
    {error && <p role="alert" className="mt-5 border-l-2 border-[var(--color-error)] bg-red-50 p-4 text-sm">{error}</p>}
    {notice && <p role="status" className="mt-5 border-l-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    <form className="mt-6 grid gap-3 border border-[var(--color-line)] bg-white p-5 sm:grid-cols-[1fr_130px_160px_auto]" onSubmit={add}>
      <input required value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} placeholder="Surname, First name" className="h-11 border border-[var(--color-line)] px-3 text-sm" />
      <select value={draft.designation} onChange={(event) => setDraft({ ...draft, designation: event.target.value as DirectoryEntry["designation"] })} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm">{categories.slice(1).map((value) => <option key={value}>{value}</option>)}</select>
      <input required type="date" value={draft.as_of_date} onChange={(event) => setDraft({ ...draft, as_of_date: event.target.value })} className="h-11 border border-[var(--color-line)] px-3 text-sm" />
      <button className="bg-[var(--color-ink)] px-5 text-sm font-bold text-white">Add draft</button>
    </form>
    <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_160px_150px_150px]">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search directory entries" className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm" />
      <select value={publication} onChange={(event) => { setPublication(event.target.value as typeof publication); setPage(1); }} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm"><option value="all">All statuses</option><option value="draft">Drafts only</option><option value="published">Published only</option></select>
      <select value={category} onChange={(event) => { setCategory(event.target.value as typeof category); setPage(1); }} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm">{categories.map((value) => <option key={value} value={value}>{value === "all" ? "All categories" : value}</option>)}</select>
      <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm"><option value="name">Sort: name</option><option value="category">Sort: category</option></select>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-[var(--color-slate)]">Showing {displayEntries.length} of {visible.length} filtered entries · {entries.filter((item) => item.is_published).length} published</p>
      <div className="flex gap-3">
        <button type="button" disabled={bulkBusy || !visible.length} onClick={() => void bulkUpdate(true)} className="border border-[var(--color-ink)] px-4 py-2 text-sm font-bold disabled:opacity-50">Publish filtered</button>
        <button type="button" disabled={bulkBusy || !visible.length} onClick={() => void bulkUpdate(false)} className="border border-[var(--color-line)] px-4 py-2 text-sm font-bold disabled:opacity-50">Unpublish filtered</button>
      </div>
    </div>
    {loading ? <p className="mt-6 text-sm">Loading directory…</p> : <>
      <div className="mt-5 overflow-x-auto border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[var(--color-paper)] text-xs tracking-[0.08em] text-[var(--color-slate)]"><tr><th className="p-4">MEMBER</th><th className="p-4">CATEGORY</th><th className="p-4">AS OF</th><th className="p-4">PUBLICATION</th><th className="p-4"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{displayEntries.map((entry) => <tr key={entry.id} className="border-t border-[var(--color-line)]">
            <td className="p-4"><input value={entry.full_name} onChange={(event) => setEntries((items) => items.map((item) => item.id === entry.id ? { ...item, full_name: event.target.value } : item))} onBlur={(event) => void save(entry, { full_name: event.target.value })} className="w-full border-0 bg-transparent font-bold outline-none" /></td>
            <td className="p-4"><select value={entry.designation} onChange={(event) => void save(entry, { designation: event.target.value as DirectoryEntry["designation"] })} className="bg-transparent">{DIRECTORY_DESIGNATIONS.map((designation) => <option key={designation}>{designation}</option>)}</select></td>
            <td className="p-4">{entry.as_of_date}</td>
            <td className="p-4"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={entry.is_published} onChange={(event) => void save(entry, { is_published: event.target.checked })} /> {entry.is_published ? "Published" : "Draft"}</label></td>
            <td className="p-4 text-right"><button type="button" disabled={deletingId === entry.id} onClick={() => openDeleteDialog(entry)} className="font-bold text-[var(--color-error)] underline underline-offset-4 disabled:opacity-50">{deletingId === entry.id ? "Deleting…" : "Delete"}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mt-5 flex items-center justify-between"><button type="button" disabled={activePage === 1} onClick={() => setPage(activePage - 1)} className="text-sm font-bold disabled:text-[var(--color-line)]">Previous</button><p className="text-sm text-[var(--color-slate)]">Page {activePage} of {pageCount}</p><button type="button" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)} className="text-sm font-bold disabled:text-[var(--color-line)]">Next</button></div>
    </>}
    <dialog ref={deleteDialog} aria-labelledby="delete-directory-entry-title" className="m-auto w-[min(31rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-line)] bg-white p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-[rgba(17,12,42,0.62)]" onCancel={(event) => { if (deletingId) event.preventDefault(); }} onClose={() => setDeleteTarget(null)}>
      {deleteTarget && <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div><p className="eyebrow text-[var(--color-error)]">Permanent action</p><h2 id="delete-directory-entry-title" className="mt-3 font-serif text-3xl tracking-[-0.04em]">Delete this member?</h2></div>
          <button type="button" onClick={closeDeleteDialog} disabled={Boolean(deletingId)} aria-label="Close delete confirmation" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-line)] text-xl leading-none transition hover:border-[var(--color-ink)] disabled:opacity-50">×</button>
        </div>
        <div className="mt-6 border-l-4 border-[var(--color-error)] bg-red-50 px-4 py-4 text-sm leading-6">
          <p><strong>{deleteTarget.full_name}</strong> will be removed from Members in Good Standing and will no longer appear in the public register.</p>
          <p className="mt-2">This cannot be undone.</p>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeDeleteDialog} disabled={Boolean(deletingId)} className="min-h-11 border border-[var(--color-line)] px-5 text-sm font-bold disabled:opacity-50">Keep member</button>
          <button type="button" onClick={() => void remove()} disabled={Boolean(deletingId)} className="min-h-11 bg-[var(--color-error)] px-5 text-sm font-bold text-white transition hover:brightness-90 disabled:opacity-50">{deletingId ? "Deleting…" : "Yes, permanently delete"}</button>
        </div>
      </div>}
    </dialog>
  </section>;
}
