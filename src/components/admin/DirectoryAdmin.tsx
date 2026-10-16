"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { createDirectoryEntry, deleteDirectoryEntry, deleteDirectoryEntries, DIRECTORY_DESIGNATIONS, DirectoryEntry, getStaffDirectory, importDirectoryEntries, updateDirectoryEntry, updateDirectoryPublication } from "@/lib/api/membership";

const categories: Array<DirectoryEntry["designation"] | "all"> = ["all", ...DIRECTORY_DESIGNATIONS];
const csvTemplate = "data:text/csv;charset=utf-8,full_name%2Cdesignation%2Cas_of_date%2Cis_published%2Csort_order%0AAma%20Mensah%2CMIoD%2C2026-10-16%2Ctrue%2C0%0AKojo%20Owusu%2CFIoD%2C2026-10-16%2Ctrue%2C1%0A";

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
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importAsOfDate, setImportAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [importPublished, setImportPublished] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<DirectoryEntry[]>([]);
  const [deleteError, setDeleteError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const selectedEntries = visible.filter((entry) => selectedIds.has(entry.id));
  const allPageSelected = displayEntries.length > 0 && displayEntries.every((entry) => selectedIds.has(entry.id));
  const toggleSelection = (ids: string[], checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
      return next;
    });
  };

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

  const importCsv = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!importFile || importing) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const result = await importDirectoryEntries(importFile, { defaultAsOfDate: importAsOfDate, publish: importPublished });
      await load();
      setImportFile(null);
      event.currentTarget.reset();
      const count = result.imported;
      const publication = result.published ? (result.published === count ? " and published" : " with " + result.published + " published") : " as drafts";
      setNotice(count + " directory " + (count === 1 ? "entry was" : "entries were") + " imported" + publication + ".");
    } catch (reason) {
      setError(apiErrorMessage(reason, "We couldn't import this CSV. Please check the file and try again."));
    } finally {
      setImporting(false);
    }
  };

  const openDeleteDialog = (targets: DirectoryEntry[]) => {
    if (!targets.length || deleting) return;
    setDeleteTargets(targets);
    setDeleteError("");
    deleteDialog.current?.showModal();
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    deleteDialog.current?.close();
    setDeleteTargets([]);
  };

  const remove = async () => {
    if (!deleteTargets.length || deleting) return;
    setDeleting(true);
    setDeleteError("");
    setError("");
    setNotice("");
    try {
      if (deleteTargets.length === 1) await deleteDirectoryEntry(deleteTargets[0].id);
      else await deleteDirectoryEntries(deleteTargets.map((entry) => entry.id));
      const removedIds = new Set(deleteTargets.map((entry) => entry.id));
      setEntries((items) => items.filter((item) => !removedIds.has(item.id)));
      setSelectedIds((current) => new Set([...current].filter((id) => !removedIds.has(id))));
      setNotice(deleteTargets.length === 1 ? `${deleteTargets[0].full_name} was removed from the register.` : `${deleteTargets.length} directory entries were removed from the register.`);
      deleteDialog.current?.close();
    } catch (reason) {
      setDeleteError(apiErrorMessage(reason, "We couldn't delete the selected entries. Please try again."));
    } finally {
      setDeleting(false);
    }
  };

  return <section className="mt-10">
    <div className="border-l-2 border-[var(--color-accent)] bg-[var(--color-paper)] p-5">
      <p className="font-bold">Directory controls</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Filter by member category, then select individual entries or all matching entries to delete them together. Deletion permanently removes directory listings. Member accounts and applications are unaffected.</p>
    </div>
    {error && <p role="alert" className="mt-5 border-l-2 border-[var(--color-error)] bg-red-50 p-4 text-sm">{error}</p>}
    {notice && <p role="status" className="mt-5 border-l-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    <details className="mt-6 border border-[var(--color-line)] bg-white">
      <summary className="cursor-pointer px-5 py-4 text-sm font-bold marker:text-[var(--color-accent-dark)]">Import directory from CSV</summary>
      <div className="border-t border-[var(--color-line)] p-5">
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-slate)]">Upload a CSV to add members in one go. Required columns are <code>full_name</code> and <code>designation</code>. You can optionally include <code>as_of_date</code>, <code>is_published</code>, and <code>sort_order</code>. Every row is checked before the import is saved, and existing duplicate listings are rejected.</p>
        <a href={csvTemplate} download="iod-member-directory-template.csv" className="mt-3 inline-block text-sm font-bold text-[var(--color-accent-dark)] underline underline-offset-4">Download CSV template</a>
        <form onSubmit={(event) => void importCsv(event)} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_180px_auto] lg:items-end">
          <label className="text-sm font-bold">Directory CSV<input required type="file" accept=".csv,text/csv" onChange={(event) => setImportFile(event.target.files?.[0] || null)} className="mt-2 block w-full border border-[var(--color-line)] bg-white p-2 text-sm font-normal" /></label>
          <label className="text-sm font-bold">Default as of<input required type="date" value={importAsOfDate} onChange={(event) => setImportAsOfDate(event.target.value)} className="mt-2 h-11 w-full border border-[var(--color-line)] px-3 text-sm font-normal" /></label>
          <label className="flex min-h-11 items-center gap-2 border border-[var(--color-line)] px-3 text-sm"><input type="checkbox" checked={importPublished} onChange={(event) => setImportPublished(event.target.checked)} /> Publish rows by default</label>
          <button disabled={!importFile || importing} className="min-h-11 bg-[var(--color-ink)] px-5 text-sm font-bold text-white disabled:opacity-50">{importing ? "Importing…" : "Import CSV"}</button>
        </form>
        <p className="mt-4 text-xs leading-5 text-[var(--color-slate)]">This adds directory listings only. It does not create member login accounts or change membership applications.</p>
      </div>
    </details>
    <form className="mt-6 grid gap-3 border border-[var(--color-line)] bg-white p-5 sm:grid-cols-[1fr_130px_160px_auto]" onSubmit={add}>
      <input required value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} placeholder="Surname, First name" className="h-11 border border-[var(--color-line)] px-3 text-sm" />
      <select value={draft.designation} onChange={(event) => setDraft({ ...draft, designation: event.target.value as DirectoryEntry["designation"] })} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm">{categories.slice(1).map((value) => <option key={value}>{value}</option>)}</select>
      <input required type="date" value={draft.as_of_date} onChange={(event) => setDraft({ ...draft, as_of_date: event.target.value })} className="h-11 border border-[var(--color-line)] px-3 text-sm" />
      <button className="bg-[var(--color-ink)] px-5 text-sm font-bold text-white">Add draft</button>
    </form>
    <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_160px_150px_150px]">
      <input aria-label="Search directory entries" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setSelectedIds(new Set()); }} placeholder="Search directory entries" className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm" />
      <select aria-label="Filter publication status" value={publication} onChange={(event) => { setPublication(event.target.value as typeof publication); setPage(1); setSelectedIds(new Set()); }} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm"><option value="all">All statuses</option><option value="draft">Drafts only</option><option value="published">Published only</option></select>
      <select aria-label="Filter member category" value={category} onChange={(event) => { setCategory(event.target.value as typeof category); setPage(1); setSelectedIds(new Set()); }} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm">{categories.map((value) => <option key={value} value={value}>{value === "all" ? "All categories" : value}</option>)}</select>
      <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} className="h-11 border border-[var(--color-line)] bg-white px-3 text-sm"><option value="name">Sort: name</option><option value="category">Sort: category</option></select>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-[var(--color-slate)]">Showing {displayEntries.length} of {visible.length} filtered entries · {entries.filter((item) => item.is_published).length} published</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={bulkBusy || !visible.length} onClick={() => void bulkUpdate(true)} className="border border-[var(--color-ink)] px-4 py-2 text-sm font-bold disabled:opacity-50">Publish filtered</button>
        <button type="button" disabled={bulkBusy || !visible.length} onClick={() => void bulkUpdate(false)} className="border border-[var(--color-line)] px-4 py-2 text-sm font-bold disabled:opacity-50">Unpublish filtered</button>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
      <p role="status" className="mr-auto text-sm font-bold">{selectedEntries.length} selected</p>
      <button type="button" disabled={loading || bulkBusy || deleting || !visible.length} onClick={() => setSelectedIds(new Set(visible.map((entry) => entry.id)))} className="px-3 py-2 text-sm font-bold underline underline-offset-4 disabled:opacity-50">Select all {visible.length} matching entries</button>
      <button type="button" disabled={!selectedIds.size || deleting} onClick={() => setSelectedIds(new Set())} className="px-3 py-2 text-sm disabled:opacity-50">Clear selection</button>
      <button type="button" disabled={loading || bulkBusy || deleting || !selectedEntries.length} onClick={() => openDeleteDialog(selectedEntries)} className="border border-[var(--color-error)] px-4 py-2 text-sm font-bold text-[var(--color-error)] disabled:opacity-50">Delete selected ({selectedEntries.length})</button>
    </div>
    {loading ? <p className="mt-6 text-sm">Loading directory…</p> : <>
      <div className="mt-5 overflow-x-auto border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[var(--color-paper)] text-xs tracking-[0.08em] text-[var(--color-slate)]"><tr><th className="w-12 p-4"><input type="checkbox" aria-label="Select all entries on this page" checked={allPageSelected} ref={(input) => { if (input) input.indeterminate = !allPageSelected && displayEntries.some((entry) => selectedIds.has(entry.id)); }} onChange={(event) => toggleSelection(displayEntries.map((entry) => entry.id), event.target.checked)} /></th><th className="p-4">MEMBER</th><th className="p-4">CATEGORY</th><th className="p-4">AS OF</th><th className="p-4">PUBLICATION</th><th className="p-4"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{displayEntries.map((entry) => <tr key={entry.id} className="border-t border-[var(--color-line)]">
            <td className="p-4"><input type="checkbox" aria-label={`Select ${entry.full_name}`} checked={selectedIds.has(entry.id)} onChange={(event) => toggleSelection([entry.id], event.target.checked)} /></td>
            <td className="p-4"><input value={entry.full_name} onChange={(event) => setEntries((items) => items.map((item) => item.id === entry.id ? { ...item, full_name: event.target.value } : item))} onBlur={(event) => void save(entry, { full_name: event.target.value })} className="w-full border-0 bg-transparent font-bold outline-none" /></td>
            <td className="p-4"><select value={entry.designation} onChange={(event) => void save(entry, { designation: event.target.value as DirectoryEntry["designation"] })} className="bg-transparent">{DIRECTORY_DESIGNATIONS.map((designation) => <option key={designation}>{designation}</option>)}</select></td>
            <td className="p-4">{entry.as_of_date}</td>
            <td className="p-4"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={entry.is_published} onChange={(event) => void save(entry, { is_published: event.target.checked })} /> {entry.is_published ? "Published" : "Draft"}</label></td>
            <td className="p-4 text-right"><button type="button" disabled={deleting || bulkBusy} onClick={() => openDeleteDialog([entry])} className="font-bold text-[var(--color-error)] underline underline-offset-4 disabled:opacity-50">Delete</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mt-5 flex items-center justify-between"><button type="button" disabled={activePage === 1} onClick={() => setPage(activePage - 1)} className="text-sm font-bold disabled:text-[var(--color-line)]">Previous</button><p className="text-sm text-[var(--color-slate)]">Page {activePage} of {pageCount}</p><button type="button" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)} className="text-sm font-bold disabled:text-[var(--color-line)]">Next</button></div>
    </>}
    <dialog ref={deleteDialog} aria-labelledby="delete-directory-entry-title" className="m-auto w-[min(31rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-line)] bg-white p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-[rgba(17,12,42,0.62)]" onCancel={(event) => { if (deleting) event.preventDefault(); }} onClose={() => setDeleteTargets([])}>
      {deleteTargets.length > 0 && <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div><p className="eyebrow text-[var(--color-error)]">Permanent action</p><h2 id="delete-directory-entry-title" className="mt-3 font-serif text-3xl tracking-[-0.04em]">{deleteTargets.length === 1 ? "Delete this member?" : `Delete ${deleteTargets.length} directory entries?`}</h2></div>
          <button type="button" onClick={closeDeleteDialog} disabled={deleting} aria-label="Close delete confirmation" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-line)] text-xl leading-none transition hover:border-[var(--color-ink)] disabled:opacity-50">×</button>
        </div>
        <div className="mt-6 border-l-4 border-[var(--color-error)] bg-red-50 px-4 py-4 text-sm leading-6">
          <p><strong>{deleteTargets.length === 1 ? deleteTargets[0].full_name : `${deleteTargets.length} selected directory entries`}</strong> will be removed from Members in Good Standing and will no longer appear in the public register.</p>
          <p className="mt-2">Categories: {[...new Set(deleteTargets.map((entry) => entry.designation))].join(", ")}.</p>
          <p className="mt-2">Member accounts and applications will not be deleted.</p>
          <p className="mt-2">This cannot be undone.</p>
        </div>
        {deleteError && <p role="alert" className="mt-4 text-sm text-[var(--color-error)]">{deleteError}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeDeleteDialog} disabled={deleting} className="min-h-11 border border-[var(--color-line)] px-5 text-sm font-bold disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void remove()} disabled={deleting} className="min-h-11 bg-[var(--color-error)] px-5 text-sm font-bold text-white transition hover:brightness-90 disabled:opacity-50">{deleting ? "Deleting…" : "Yes, permanently delete"}</button>
        </div>
      </div>}
    </dialog>
  </section>;
}
