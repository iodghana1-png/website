"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/components/auth/PortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FormInput } from "@/components/ui/FormFields";
import { ApiError } from "@/lib/api/client";
import { getMyMemberProfile, getMyRenewals, MemberProfile, MembershipRenewal, updateMyMemberProfile } from "@/lib/api/membership";

type Props = { section: string; title: string };
type EditableProfile = Pick<MemberProfile, "phone_number" | "organisation" | "current_role">;

const dateFormatter = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });
const formatDate = (value: string | null) => value ? dateFormatter.format(new Date(`${value}T00:00:00`)) : "Not set";
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function MemberPortal({ section, title }: Props) {
  const user = useCurrentUser();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [renewals, setRenewals] = useState<MembershipRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const member = await getMyMemberProfile();
      setProfile(member);
      setRenewals(await getMyRenewals());
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 404) {
        setProfile(null);
        setRenewals([]);
      } else {
        setError(reason instanceof ApiError ? reason.message : "We couldn't load your membership right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(requestId);
  }, [load]);

  if (loading) return <Loading section={section} />;
  if (error) return <section className="mt-10 border-l-2 border-[var(--color-error)] bg-red-50 p-6" role="alert"><h2 className="font-serif text-2xl">We couldn&apos;t load your membership.</h2><p className="mt-3">{error}</p><button type="button" onClick={load} className="mt-5 border border-[var(--color-ink)] px-5 py-3 text-sm font-bold">Try again</button></section>;
  if (!profile) return <section className="mt-10 border border-[var(--color-line)] bg-white p-7 sm:p-10"><p className="eyebrow">Membership</p><h2 className="mt-4 font-serif text-4xl tracking-[-0.04em]">Welcome, {user.first_name || "there"}.</h2><p className="mt-4 max-w-2xl leading-7 text-[var(--color-slate)]">Your account is active, but it is not yet linked to an IoD-Gh membership record. Apply for membership and our committee will review your application.</p><Link href="/membership/apply" className="mt-7 inline-flex min-h-12 items-center bg-[var(--color-ink)] px-6 text-sm font-bold text-white">Apply for membership</Link></section>;
  if (section === "dashboard") return <Dashboard profile={profile} renewals={renewals} />;
  if (section === "membership") return <Membership profile={profile} renewals={renewals} />;
  if (section === "profile") return <Profile profile={profile} onSaved={setProfile} />;
  return <section className="mt-10 border border-[var(--color-line)] bg-white p-7"><h2 className="font-serif text-3xl font-semibold tracking-[-0.04em]">{title}</h2><p className="mt-4 max-w-2xl leading-7 text-[var(--color-slate)]">This part of the member portal will be connected as its platform module becomes available. Your membership record is up to date.</p></section>;
}

function Loading({ section }: { section: string }) {
  return <section className="mt-10" aria-live="polite" aria-busy="true"><p className="sr-only">Loading your membership information.</p><div className="h-64 animate-pulse bg-[var(--color-paper)]" />{section === "dashboard" && <div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="h-36 animate-pulse bg-[var(--color-paper)]" /><div className="h-36 animate-pulse bg-[var(--color-paper)]" /></div>}</section>;
}

function Dashboard({ profile, renewals }: { profile: MemberProfile; renewals: MembershipRenewal[] }) {
  const latestRenewal = renewals[0];
  return <><section className="mt-10 grid gap-5 xl:grid-cols-12"><Link href="/member/membership" className="group relative overflow-hidden bg-[var(--color-ink)] p-7 text-white sm:p-8 xl:col-span-6"><div className="absolute right-[-2.5rem] top-[-2.5rem] h-36 w-36 border border-[var(--color-accent)] opacity-60" /><p className="relative text-xs font-bold tracking-[0.13em] text-[var(--color-accent-light)]">YOUR MEMBERSHIP</p><div className="relative mt-8 flex items-end justify-between gap-4"><div><p className="font-serif text-4xl font-semibold tracking-[-0.05em]">{profile.membership_type.name}</p><p className="mt-2 text-sm text-[var(--color-mist)]">{profile.membership_number}</p></div><span className="border border-[var(--color-accent-light)] px-3 py-1 text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]">{label(profile.status)}</span></div><div className="relative mt-9 flex items-center justify-between border-t border-white/20 pt-5 text-sm"><span className="text-[var(--color-mist)]">Valid until {formatDate(profile.membership_end_date)}</span><span className="font-bold group-hover:text-[var(--color-accent-light)]">View membership <Icon name="arrow-right" className="h-4 w-4" /></span></div></Link><article className="border border-[var(--color-line)] bg-white p-6 xl:col-span-3"><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">MEMBERSHIP START</p><p className="mt-5 font-serif text-2xl tracking-[-0.04em]">{formatDate(profile.membership_start_date)}</p><p className="mt-3 text-sm text-[var(--color-slate)]">Joined {formatDate(profile.joined_date)}</p></article><article className="border border-[var(--color-line)] bg-white p-6 xl:col-span-3"><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">LATEST RENEWAL</p><p className="mt-5 font-serif text-2xl tracking-[-0.04em]">{latestRenewal ? label(latestRenewal.status) : "None"}</p><p className="mt-3 text-sm text-[var(--color-slate)]">{latestRenewal ? `Due ${formatDate(latestRenewal.due_date)}` : "No renewal records yet"}</p></article></section><section className="mt-10 border border-[var(--color-line)] bg-white p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="eyebrow">Your membership</p><h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em]">Your current record.</h2></div><Badge>{label(profile.status)}</Badge></div><p className="mt-4 leading-7 text-[var(--color-slate)]">Keep your contact and professional details current so IoD-Gh can support your membership.</p><Link href="/member/profile" className="mt-6 inline-block text-sm font-bold underline underline-offset-4">Update my profile</Link></section></>;
}

function Membership({ profile, renewals }: { profile: MemberProfile; renewals: MembershipRenewal[] }) {
  return <section className="mt-10 grid gap-5 lg:grid-cols-12"><div className="relative overflow-hidden bg-[var(--color-ink)] p-8 text-white sm:p-10 lg:col-span-8"><div className="absolute bottom-[-5rem] right-[-4rem] h-64 w-64 border border-[var(--color-accent)] opacity-50" /><p className="relative text-xs font-bold tracking-[0.14em] text-[var(--color-accent-light)]">MEMBERSHIP STATUS</p><div className="relative mt-10 flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><p className="font-serif text-5xl font-semibold tracking-[-0.06em]">{profile.membership_type.name}</p><p className="mt-3 text-lg text-[var(--color-mist)]">Member of the Institute of Directors-Ghana</p></div><span className="w-fit border border-[var(--color-accent-light)] px-4 py-2 text-xs font-bold tracking-[0.11em] text-[var(--color-accent-light)]">{label(profile.status)}</span></div><div className="relative mt-12 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2"><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]">MEMBERSHIP NUMBER</p><p className="mt-2 text-lg">{profile.membership_number}</p></div><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]">EXPIRY DATE</p><p className="mt-2 text-lg">{formatDate(profile.membership_end_date)}</p></div></div></div><aside className="border border-[var(--color-line)] bg-white p-7 lg:col-span-4"><p className="eyebrow">Your membership</p><h2 className="mt-4 font-serif text-3xl font-semibold tracking-[-0.04em]">{label(profile.status)}.</h2><p className="mt-4 leading-7 text-[var(--color-slate)]">Your membership gives you access to professional development, member events, governance resources and the IoD-Gh network.</p></aside><RenewalHistory renewals={renewals} /></section>;
}

function RenewalHistory({ renewals }: { renewals: MembershipRenewal[] }) {
  return <section className="border border-[var(--color-line)] bg-white p-7 lg:col-span-12"><p className="eyebrow">Membership activity</p><h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em]">Renewal history.</h2>{renewals.length === 0 ? <p className="mt-6 border-t border-[var(--color-line)] pt-6 text-[var(--color-slate)]">There are no renewal records yet.</p> : <ul className="mt-6 divide-y border-t border-[var(--color-line)]">{renewals.map((renewal) => <li key={renewal.id} className="grid gap-3 py-5 sm:grid-cols-4"><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">PERIOD</p><p className="mt-2 text-sm">{formatDate(renewal.period_start)} – {formatDate(renewal.period_end)}</p></div><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">AMOUNT</p><p className="mt-2 text-sm">{renewal.currency} {renewal.amount}</p></div><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">DUE DATE</p><p className="mt-2 text-sm">{formatDate(renewal.due_date)}</p></div><div><Badge>{label(renewal.status)}</Badge></div></li>)}</ul>}</section>;
}

function Profile({ profile, onSaved }: { profile: MemberProfile; onSaved: (profile: MemberProfile) => void }) {
  const [form, setForm] = useState<EditableProfile>({ phone_number: profile.phone_number, organisation: profile.organisation, current_role: profile.current_role });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (field: keyof EditableProfile, value: string) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setSuccess(""); setSubmitting(true); try { const updated = await updateMyMemberProfile(form); onSaved(updated); setSuccess("Your profile has been updated."); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "We couldn't update your profile. Please try again."); } finally { setSubmitting(false); } }
  return <section className="mt-10 max-w-3xl border border-[var(--color-line)] bg-white p-7 sm:p-10"><p className="eyebrow">Member profile</p><h2 className="mt-4 font-serif text-3xl tracking-[-0.04em]">Keep your details current.</h2><p className="mt-3 leading-7 text-[var(--color-slate)]">Your name and email are verified membership records. Contact IoD-Gh to change them.</p><dl className="mt-7 grid gap-5 border-y border-[var(--color-line)] py-6 text-sm sm:grid-cols-2"><div><dt className="font-bold text-[var(--color-slate)]">NAME</dt><dd className="mt-2">{profile.full_name}</dd></div><div><dt className="font-bold text-[var(--color-slate)]">EMAIL</dt><dd className="mt-2">{profile.email}</dd></div></dl><form onSubmit={submit} className="mt-7"><div className="grid gap-5 sm:grid-cols-2"><FormInput label="Phone number" type="tel" value={form.phone_number} onChange={(event) => update("phone_number", event.target.value)} /><FormInput label="Organisation" value={form.organisation} onChange={(event) => update("organisation", event.target.value)} /><div className="sm:col-span-2"><FormInput label="Current role" value={form.current_role} onChange={(event) => update("current_role", event.target.value)} /></div></div>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}{success && <p role="status" className="mt-6 border-l-2 border-[var(--color-accent)] bg-[var(--color-warm-white)] px-4 py-3 text-sm">{success}</p>}<button type="submit" disabled={submitting} className="mt-7 min-h-12 bg-[var(--color-ink)] px-6 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Saving…" : "Save changes"}</button></form></section>;
}
