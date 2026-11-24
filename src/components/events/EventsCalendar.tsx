"use client";

import Link from "next/link";
import { useState } from "react";
import { eventCardHref, type EventCard } from "@/lib/cms/events";

function calendarDate(event: EventCard): string {
  let value = event.metadata.calendar_date;
  if (!value && typeof event.metadata.display_meta === "string") {
    // Older events only have a display label. Accept an unambiguous single
    // date, but leave ranges and informal labels for an editor to date.
    const match = event.metadata.display_meta.trim().match(/^(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/i);
    if (match) {
      const index = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(match[2].toLowerCase()) + 1;
      value = `${match[3]}-${String(index).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    }
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}

export function EventsCalendar({ events }: { events: EventCard[] }) {
  // Ghana uses UTC year-round. Keep calendar arithmetic independent of the visitor's timezone.
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return { year: today.getUTCFullYear(), month: today.getUTCMonth() };
  });
  const first = new Date(Date.UTC(month.year, month.month, 1));
  const monthName = new Intl.DateTimeFormat("en-GH", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const prefix = `${month.year}-${String(month.month + 1).padStart(2, "0")}-`;
  const monthEvents = events.filter((event) => calendarDate(event).startsWith(prefix)).sort((a, b) => calendarDate(a).localeCompare(calendarDate(b)));
  const undated = events.filter((event) => !calendarDate(event));
  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const blankDays = (first.getUTCDay() + 6) % 7;
  const changeMonth = (step: number) => {
    const next = new Date(Date.UTC(month.year, month.month + step, 1));
    setMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };
  return <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
    <div className="border border-white/25 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-3xl" aria-live="polite">{monthName}</h3><div className="flex gap-2"><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="grid h-11 w-11 place-items-center border border-white/40 text-xl hover:bg-white/10">‹</button><button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="grid h-11 w-11 place-items-center border border-white/40 text-xl hover:bg-white/10">›</button></div></div>
      <div className="mt-6 grid grid-cols-7 gap-1 text-center" aria-label={`${monthName} calendar`}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="pb-2 text-xs font-semibold text-[var(--color-mist)]">{day}</span>)}
        {Array.from({ length: blankDays }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: days }, (_, index) => { const day = index + 1; const count = monthEvents.filter((event) => calendarDate(event) === prefix + String(day).padStart(2, "0")).length; return <span key={day} className={`flex min-h-11 flex-col items-center justify-center border text-sm ${count ? "border-[var(--color-accent-light)] bg-white/15 font-bold" : "border-white/10"}`} aria-label={`${day} ${monthName}${count ? `, ${count} ${count === 1 ? "event" : "events"}` : ""}`}>{day}{count > 0 && <span aria-hidden="true" className="mt-0.5 h-1 w-1 rounded-full bg-[var(--color-accent-light)]" />}</span>; })}
      </div>
    </div>
    <div aria-live="polite"><h3 className="font-serif text-3xl">Events in {monthName}</h3>{monthEvents.length ? <div className="mt-5 border-t border-white/25">{monthEvents.map((event) => <EventRow event={event} key={event.id} />)}</div> : <p className="mt-5 text-[var(--color-mist)]">No events are scheduled for this month.</p>}{undated.length > 0 && <div className="mt-8"><h4 className="text-sm font-bold">More events</h4><div className="mt-3 border-t border-white/25">{undated.map((event) => <EventRow event={event} key={event.id} />)}</div></div>}</div>
  </div>;
}

function EventRow({ event }: { event: EventCard }) {
  const label = typeof event.metadata.display_meta === "string" ? event.metadata.display_meta : "";
  const date = calendarDate(event);
  const dateLabel = date ? new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) : "";
  return <Link href={eventCardHref(event)} className="block border-b border-white/25 py-4 hover:bg-white/5"><span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-light)]">{label || dateLabel || "Date to be announced"}</span><span className="mt-2 block font-serif text-2xl">{event.title}</span>{event.summary && <span className="mt-2 block text-sm leading-6 text-[var(--color-mist)]">{event.summary}</span>}</Link>;
}
