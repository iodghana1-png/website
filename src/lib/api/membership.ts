import { apiRequest } from "./client";

export type MembershipType = { id: string; name: string; slug: string; description: string; eligibility: string; fee: string | null; currency: string; renewal_period_months: number | null; is_active: boolean };

export type MemberProfile = {
  id: string; membership_number: string; membership_type: MembershipType;
  status: "pending" | "active" | "suspended" | "expired" | "resigned";
  full_name: string; first_name: string; last_name: string; email: string;
  phone_number: string; organisation: string; current_role: string;
  joined_date: string; membership_start_date: string; membership_end_date: string | null;
  is_publicly_listed: boolean;
};

export type MembershipRenewal = { id: string; period_start: string; period_end: string; amount: string; currency: string; status: "pending" | "paid" | "overdue" | "cancelled"; due_date: string; paid_date: string | null };
export type MembershipApplicationResult = { reference: string; tracking_token: string; status: string };
export type MembershipApplication = {
  reference: string; application_kind: "new_membership" | "upgrade"; current_membership_number: string;
  assigned_membership_type: MembershipType | null; applicant_name: string;
  first_name: string; last_name: string; email: string; phone_number: string; organisation: string;
  current_role: string; recommending_agent: string; status: "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
  internal_notes: string; decision_reason: string; reviewer_email: string | null; reviewed_at: string | null;
  submitted_at: string; updated_at: string;
};
export type MembershipStatusHistory = { previous_status: string; new_status: string; reason: string; changed_by_email: string | null; created_at: string };
export type ApprovalData = { membership_type: string; membership_start_date: string; membership_end_date?: string | null; public_listing: boolean; reason?: string };
export type RenewalData = { period_start: string; period_end: string; amount: string; currency: string; due_date: string };
// Preserve the established directory layout while keeping the post-nominal's "o" lowercase.
export const DIRECTORY_DESIGNATIONS = ["HFIoD", "FIoD", "MIoD", "AIoD"] as const;

export type DirectoryEntry = { id: string; full_name: string; designation: (typeof DIRECTORY_DESIGNATIONS)[number]; as_of_date: string; is_published: boolean; sort_order: number };
export type PublicMemberVerification = Pick<DirectoryEntry, "full_name" | "designation" | "as_of_date">;

export const getMyMemberProfile = () => apiRequest<MemberProfile>("/membership/members/me/");
export const getMyRenewals = () => apiRequest<MembershipRenewal[]>("/membership/members/me/renewals/");
export const updateMyMemberProfile = (data: Pick<MemberProfile, "phone_number" | "organisation" | "current_role">) => apiRequest<MemberProfile>("/membership/members/me/", { method: "PATCH", body: JSON.stringify(data) });
export const submitMembershipApplication = (data: FormData) => apiRequest<MembershipApplicationResult>("/membership/applications/", { method: "POST", body: data });
export const getMembershipTypes = () => apiRequest<MembershipType[]>("/membership/types/");
export const getStaffApplications = () => apiRequest<MembershipApplication[]>("/membership/staff/applications/");
export const getStaffMembers = () => apiRequest<MemberProfile[]>("/membership/staff/members/");
export const getPublicDirectory = (query = "") => apiRequest<DirectoryEntry[]>(`/membership/directory/${query ? `?q=${encodeURIComponent(query)}` : ""}`);
export const verifyPublicMember = (memberName: string) => apiRequest<PublicMemberVerification[]>(`/membership/members/verify/?member_name=${encodeURIComponent(memberName.trim())}`);
export const getStaffDirectory = () => apiRequest<DirectoryEntry[]>("/membership/staff/directory/");
export const createDirectoryEntry = (data: Omit<DirectoryEntry, "id">) => apiRequest<DirectoryEntry>("/membership/staff/directory/", { method: "POST", body: JSON.stringify(data) });
export const updateDirectoryEntry = (id: string, data: Partial<Omit<DirectoryEntry, "id">>) => apiRequest<DirectoryEntry>(`/membership/staff/directory/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
export const updateDirectoryPublication = (data: { is_published: boolean; designation?: DirectoryEntry["designation"]; current_state?: boolean }) => apiRequest<{ updated: number }>("/membership/staff/directory/bulk-publication/", { method: "PATCH", body: JSON.stringify(data) });
export const reviewApplication = (reference: string, internal_notes: string) => apiRequest<MembershipApplication>(`/membership/staff/applications/${encodeURIComponent(reference)}/review/`, { method: "POST", body: JSON.stringify({ internal_notes }) });
export const resendApplicationReceipt = (reference: string) => apiRequest<void>(`/membership/staff/applications/${encodeURIComponent(reference)}/receipt-email/`, { method: "POST" });
export const approveApplication = (reference: string, data: ApprovalData) => apiRequest<MemberProfile>(`/membership/staff/applications/${encodeURIComponent(reference)}/approve/`, { method: "POST", body: JSON.stringify(data) });
export const rejectApplication = (reference: string, reason: string) => apiRequest<MembershipApplication>(`/membership/staff/applications/${encodeURIComponent(reference)}/reject/`, { method: "POST", body: JSON.stringify({ reason }) });
export const updateMemberStatus = (membershipNumber: string, data: { status: MemberProfile["status"]; is_publicly_listed: boolean; reason?: string }) => apiRequest<MemberProfile>(`/membership/staff/members/${encodeURIComponent(membershipNumber)}/status/`, { method: "PATCH", body: JSON.stringify(data) });
export const getMemberStatusHistory = (membershipNumber: string) => apiRequest<MembershipStatusHistory[]>(`/membership/staff/members/${encodeURIComponent(membershipNumber)}/status-history/`);
export const getMemberRenewals = (membershipNumber: string) => apiRequest<MembershipRenewal[]>(`/membership/staff/members/${encodeURIComponent(membershipNumber)}/renewals/`);
export const createMemberRenewal = (membershipNumber: string, data: RenewalData) => apiRequest<MembershipRenewal>(`/membership/staff/members/${encodeURIComponent(membershipNumber)}/renewals/`, { method: "POST", body: JSON.stringify(data) });
