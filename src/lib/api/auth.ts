import { apiRequest } from "./client";

export type CurrentUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  email_verified_at: string | null;
  roles: string[];
};

export function canAccessAdmin(user: CurrentUser) {
  return user.is_staff || user.is_superuser;
}

type Credentials = { email: string; password: string };
type Registration = Credentials & { firstName: string; lastName: string; phoneNumber: string };

export function login(credentials: Credentials) {
  return apiRequest<CurrentUser>("/auth/login/", { method: "POST", body: JSON.stringify(credentials) });
}

export function logout() {
  return apiRequest<void>("/auth/logout/", { method: "POST" });
}

export function registerAccount(data: Registration) {
  return apiRequest<CurrentUser>("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ email: data.email, password: data.password, first_name: data.firstName, last_name: data.lastName, phone_number: data.phoneNumber }),
  });
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/auth/me/");
}

export function confirmEmailVerification(uid: string, token: string) {
  return apiRequest<CurrentUser>("/auth/email-verification/confirm/", { method: "POST", body: JSON.stringify({ uid, token }) });
}

export function resendVerification(email: string) {
  return apiRequest<void>("/auth/email-verification/resend/", { method: "POST", body: JSON.stringify({ email }) });
}

export function requestPasswordReset(email: string) {
  return apiRequest<void>("/auth/password-reset/", { method: "POST", body: JSON.stringify({ email }) });
}

export function confirmPasswordReset(uid: string, token: string, password: string) {
  return apiRequest<void>("/auth/password-reset/confirm/", { method: "POST", body: JSON.stringify({ uid, token, password }) });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<void>("/auth/password-change/", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
}

export function requestEmailChange(currentPassword: string, newEmail: string) {
  return apiRequest<void>("/auth/email-change/", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_email: newEmail }) });
}

export function confirmEmailChange(token: string) {
  return apiRequest<CurrentUser>("/auth/email-change/confirm/", { method: "POST", body: JSON.stringify({ token }) });
}
