"use client";

import { EditableImage as Image } from "@/components/cms/EditableCopy";
import { ProfilePhoto, useProfileGalleryState } from "./ProfilePhotos";
import { councilMembers, type CouncilMember } from "@/data/council";
import { Icon } from "@/components/ui/Icon";

function CouncilMemberCard({ member, featured = false }: { member: CouncilMember; featured?: boolean }) {
  return (
    <details className={`group border border-[var(--color-line)] bg-[var(--color-warm-white)] ${featured ? "border-t-4 border-t-[var(--color-ink)]" : ""}`}>
      <summary className="list-none cursor-pointer p-6 [&::-webkit-details-marker]:hidden sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <ProfilePhoto profileKey={[member.name, member.role]} alt={`Portrait of ${member.name}`} className="h-[95px] w-[76px] shrink-0 object-cover object-top">
              {member.image ? (
                <Image src={member.image} alt={`Portrait of ${member.name}`} width={152} height={190} className="h-[95px] w-[76px] shrink-0 object-cover object-top" />
              ) : (
                <span className="grid h-[95px] w-[76px] shrink-0 place-items-center bg-[var(--color-ink)] text-sm font-bold text-white">
                  {member.name.split(" ").filter((part) => part.length > 2).slice(-2).map((part) => part[0]).join("")}
                </span>
              )}
            </ProfilePhoto>
            <div>
              <p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">{member.role}</p>
              <h3 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.035em] text-[var(--color-ink)]">
                {member.name}{member.credentials && <span className="text-[0.65em]">, {member.credentials}</span>}
              </h3>
            </div>
          </div>
          <Icon name="plus" className="mt-1 h-5 w-5 text-[var(--color-ink)] transition-transform group-open:rotate-45" />
        </div>
        <p className="mt-6 max-w-xl leading-7 text-[var(--color-slate)]">{member.summary}</p>
        <span className="mt-6 inline-flex border-b border-[var(--color-accent)] pb-1 text-sm font-bold text-[var(--color-ink)] group-open:hidden">Read profile</span>
      </summary>
      <div className="border-t border-[var(--color-line)] px-6 pb-7 pt-6 sm:px-7">
        <div className="space-y-4 text-sm leading-7 text-[var(--color-slate)]">
          {member.profile.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </div>
    </details>
  );
}


export function CouncilProfiles() {
  const gallery = useProfileGalleryState();
  const members: CouncilMember[] = gallery.loaded ? gallery.entries.map((entry) => ({ name: entry.displayName || entry.key, credentials: entry.credentials, role: entry.role, summary: entry.summary, image: entry.url, profile: entry.biography.split(/\n\s*\n/).filter(Boolean) })) : councilMembers;
  if (!members.length) return null;
  return <div className="mt-12 grid gap-10"><div className="grid gap-5 border-b border-[var(--color-line)] pb-10">{members.slice(0, 2).map((member, index) => <CouncilMemberCard key={index} member={member} featured />)}</div><div className="grid gap-5 md:grid-cols-2">{members.slice(2).map((member, index) => <CouncilMemberCard key={index} member={member} />)}</div></div>;
}
