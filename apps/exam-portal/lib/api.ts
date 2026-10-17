export const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010").replace(/\/$/, "");
export const mainSite = (process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://iodghana.org").replace(/\/$/, "");
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    const csrf = await fetch(`${apiBase}/api/v1/auth/csrf/`, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!csrf.ok) throw new ApiError("Could not establish a secure session. Please retry.", csrf.status);
    const token = await csrf.json() as { csrfToken: string };
    headers["X-CSRFToken"] = token.csrfToken;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${apiBase}/api/v1${path}`, { method: body === undefined ? "GET" : "POST", credentials: "include", cache: "no-store", headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.detail || data?.error?.message || "We could not complete this request. Please retry.", response.status);
  return data as T;
}
export type Account = { first_name: string; last_name: string; email: string };
export type Attempt = { id: string; exam_id: string; candidate_name?: string; title: string; instructions: string; status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "CANCELLED"; started_at: string; expires_at: string; server_time: string; question_count: number };
export type Exam = { id: string; title: string; instructions: string; duration_minutes: number; question_count: number };
export type Question = { id: string; text: string; marks: string; options: { id: string; text: string }[]; selected_option: string | null; answer_revision: number };
export type ExamResult = { attempt: Attempt; released: boolean; score?: string; total_marks?: string; percentage?: string; grade?: string; passed?: boolean };
