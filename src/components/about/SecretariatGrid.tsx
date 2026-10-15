"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";
import { EditableCopy } from "@/components/cms/EditableCopy";
import { ProfilePhoto, ProfilePhotosProvider, useProfileGallery } from "@/components/about/ProfilePhotos";

const profileSlots = ["Executive leadership", "Member experience", "Professional development", "Operations and finance", "Communications", "Administration"];

function SecretariatProfiles() {
  const cmsProfiles = useProfileGallery();
  const profiles = cmsProfiles.length ? cmsProfiles.map((profile) => ({ ...profile, displayName: profile.displayName || "Team profile", role: profile.role || profile.key })) : profileSlots.map((role) => ({ id: role, key: role, url: "", alt: "", displayName: "Team profile", role }));

  return <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{profiles.map((profile) => <article className="overflow-hidden border border-[var(--color-line)] bg-white" key={profile.id}>
    <ProfilePhoto profileKey={profile.key} alt={profile.alt || `Portrait of ${profile.displayName}`} className="h-72 w-full object-cover object-top">
      <div className="relative h-72 overflow-hidden bg-[var(--color-ink)]"><span className="absolute -bottom-8 -right-2 font-serif text-8xl leading-none tracking-[-0.12em] text-white/[0.08]">IoD</span><p className="absolute inset-x-5 bottom-5 border-t border-white/25 pt-3 text-xs font-bold tracking-[0.1em] text-[var(--color-accent-light)]">PHOTO</p></div>
    </ProfilePhoto>
    <div className="p-6"><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{profile.role}</p><h3 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.035em] text-[var(--color-ink)]">{profile.displayName}</h3></div>
  </article>)}</div>;
}

export function SecretariatGrid() {
  return <ProfilePhotosProvider pageSlug="about-secretariat"><BuiltInSection sectionId="secretariat-profiles" sectionType="profile_gallery" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-28"><div className="site-container"><div className="grid gap-8 border-b border-[var(--color-line)] pb-12 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback="The Secretariat" /></p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]">The people who make the Institute&apos;s work possible.</h2></div><p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback="Meet the team responsible for the day-to-day delivery of IoD-Gh programmes, member services and institutional partnerships." /></p></div><SecretariatProfiles /></div></BuiltInSection></ProfilePhotosProvider>;
}
