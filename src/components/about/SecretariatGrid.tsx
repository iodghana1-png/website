"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";


import { EditableCopy } from "@/components/cms/EditableCopy";
import { ProfilePhoto, ProfilePhotosProvider, useProfileGallery } from "@/components/about/ProfilePhotos";
import { Icon } from "@/components/ui/Icon";

const profileSlots = ["Executive leadership", "Member experience", "Professional development", "Operations and finance", "Communications", "Administration"];

function SecretariatProfiles() {
  const cmsProfiles = useProfileGallery();
  const profiles = cmsProfiles.length ? cmsProfiles.map((profile) => ({ ...profile, displayName: profile.displayName || "Team profile", role: profile.role || profile.key, summary: profile.summary || "Name, role and profile will appear here." })) : profileSlots.map((role) => ({ id: role, key: role, url: "", alt: "", displayName: "Team profile", role, summary: "Name, role and profile will appear here.", biography: "" }));
  return <div className="mt-12 grid gap-5 md:grid-cols-2">{profiles.map((profile, index) => <details className={`group border border-[var(--color-line)] bg-white ${index === 0 ? "md:col-span-2 border-t-4 border-t-[var(--color-ink)]" : ""}`} key={profile.id}>
    <summary className="list-none cursor-pointer p-6 [&::-webkit-details-marker]:hidden sm:p-7">
      <div className="flex items-start justify-between gap-5"><div className="flex min-w-0 items-start gap-4">
        <ProfilePhoto profileKey={profile.key} alt={profile.alt || `Portrait of ${profile.displayName}`} className="h-[95px] w-[76px] shrink-0 object-cover object-top">
          <div className="relative h-[95px] w-[76px] shrink-0 overflow-hidden bg-[var(--color-ink)]"><span className="absolute -bottom-5 -right-2 font-serif text-6xl leading-none tracking-[-0.12em] text-white/[0.08]">IoD</span><p className="absolute inset-x-3 bottom-3 border-t border-white/25 pt-2 text-[10px] font-bold tracking-[0.08em] text-[var(--color-accent-light)]">PHOTO</p></div>
        </ProfilePhoto>
        <div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{profile.role}</p><h3 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.035em] text-[var(--color-ink)]">{profile.displayName}</h3></div>
      </div><Icon name="plus" className="mt-1 h-5 w-5 text-[var(--color-ink)] transition-transform group-open:rotate-45" /></div>
      <p className="mt-6 max-w-xl leading-7 text-[var(--color-slate)]">{profile.summary}</p><span className="mt-6 inline-flex border-b border-[var(--color-accent)] pb-1 text-sm font-bold text-[var(--color-ink)] group-open:hidden">Read profile</span>
    </summary>
    <div className="border-t border-[var(--color-line)] px-6 pb-7 pt-6 sm:px-7"><p className="text-sm leading-7 text-[var(--color-slate)]">{profile.biography || "A full profile will appear here once it has been added in the CMS."}</p></div>
  </details>)}</div>;
}

export function SecretariatGrid() {
  return <ProfilePhotosProvider pageSlug="about-secretariat"><BuiltInSection sectionId="secretariat-profiles" sectionType="profile_gallery" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 border-b border-[var(--color-line)] pb-12 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback="The Secretariat" /></p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]">The people who make the Institute&apos;s work possible.</h2></div><p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback="Meet the team responsible for the day-to-day delivery of IoD-Gh programmes, member services and institutional partnerships." /></p></div><SecretariatProfiles /></div></BuiltInSection></ProfilePhotosProvider>;
}
