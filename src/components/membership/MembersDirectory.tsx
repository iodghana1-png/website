"use client";

import { useEffect, useMemo, useState } from "react";

import { DIRECTORY_DESIGNATIONS, DirectoryEntry, getPublicDirectory } from "@/lib/api/membership";

const labels: Record<DirectoryEntry["designation"], string> = { HFIoD: "Honorary Fellows", FIoD: "Fellows", MIoD: "Members", AIoD: "Associates" };
const designations = DIRECTORY_DESIGNATIONS;
const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const pageSize = 150;

export function MembersDirectory() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]); const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [pages, setPages] = useState<Record<string, number>>({}); const [letters, setLetters] = useState<Record<string, string>>({});
  useEffect(() => { const requestId = window.setTimeout(() => { getPublicDirectory().then(setEntries).catch(() => setError("The register is temporarily unavailable.")).finally(() => setLoading(false)); }, 0); return () => window.clearTimeout(requestId); }, []);
  const filtered = useMemo(() => entries.filter((entry) => entry.full_name.toLowerCase().includes(query.trim().toLowerCase())), [entries, query]);
  if (loading) return <p className="py-10 text-sm text-[var(--color-slate)]">Loading the member register…</p>;
  if (error) return <p role="alert" className="border-l-2 border-[var(--color-error)] bg-red-50 p-5 text-sm">{error}</p>;
  return <div className="border-t border-[var(--color-ink)]"><div className="border-b border-[var(--color-line)] py-7"><label className="block max-w-xl"><span className="eyebrow mb-3 block">Search published members in good standing</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPages({}); }} type="search" placeholder="Search by member name" className="h-12 w-full border border-[var(--color-line)] bg-white px-4 text-sm outline-none focus:border-[var(--color-ink)]" /></label></div>{designations.map((designation) => <DirectoryCategory key={designation} designation={designation} entries={filtered.filter((entry) => entry.designation === designation)} activeLetter={letters[designation] || "All"} page={pages[designation] || 1} onLetter={(letter) => { setLetters({ ...letters, [designation]: letter }); setPages({ ...pages, [designation]: 1 }); }} onPage={(page) => setPages({ ...pages, [designation]: page })} />)}</div>;
}

function DirectoryCategory({ designation, entries, activeLetter, page, onLetter, onPage }: { designation: DirectoryEntry["designation"]; entries: DirectoryEntry[]; activeLetter: string; page: number; onLetter: (letter: string) => void; onPage: (page: number) => void }) {
  const group = entries.filter((entry) => activeLetter === "All" || entry.full_name.toUpperCase().startsWith(activeLetter));
  const pageCount = Math.max(1, Math.ceil(group.length / pageSize)); const activePage = Math.min(page, pageCount); const visible = group.slice((activePage - 1) * pageSize, activePage * pageSize);
  return <section className="border-b border-[var(--color-line)] py-10"><div className="flex items-baseline justify-between gap-4"><div><p className="eyebrow member-designation">{designation}</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.04em]">{labels[designation]}</h2></div><p className="text-sm text-[var(--color-slate)]">{group.length} published</p></div><div className="mt-6 flex flex-wrap gap-1" aria-label={`Filter ${labels[designation]} by surname letter`}>{alphabet.map((letter) => <button type="button" key={letter} onClick={() => onLetter(letter)} className={`min-w-8 px-2 py-1.5 text-xs font-bold transition-colors ${activeLetter === letter ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-paper)] text-[var(--color-slate)] hover:bg-[var(--color-mist)] hover:text-[var(--color-ink)]"}`}>{letter}</button>)}</div>{group.length ? <><ol className="mt-8 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">{visible.map((entry, index) => <li key={entry.id} className="border-t border-[var(--color-line)] py-3 text-[0.9375rem] leading-6 text-[var(--color-slate)]"><span className="mr-3 inline-block w-8 text-right text-[0.8125rem] font-bold text-[var(--color-accent-dark)]">{String((activePage - 1) * pageSize + index + 1).padStart(3, "0")}</span>{entry.full_name}</li>)}</ol>{pageCount > 1 && <div className="mt-7 flex items-center justify-between border-t border-[var(--color-line)] pt-5"><button type="button" disabled={activePage === 1} onClick={() => onPage(activePage - 1)} className="text-sm font-bold disabled:text-[var(--color-line)]">Previous</button><p className="text-sm text-[var(--color-slate)]">Page {activePage} of {pageCount}</p><button type="button" disabled={activePage === pageCount} onClick={() => onPage(activePage + 1)} className="text-sm font-bold disabled:text-[var(--color-line)]">Next</button></div>}</> : <p className="mt-6 text-sm text-[var(--color-slate)]">No published entries in this category.</p>}</section>;
}
