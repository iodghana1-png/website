export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010").replace(/\/$/, "");

type ApiErrorPayload = { error?: { message?: string; details?: Record<string, string[] | string> } };

export class ApiError extends Error {
  details?: Record<string, string[] | string>;
  status: number;

  constructor(message: string, details?: Record<string, string[] | string>, status = 0) {
    super(message);
    this.name = "ApiError";
    this.details = details;
    this.status = status;
  }
}

export function apiErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiError)) return fallback;
  const detail = Object.values(reason.details || {}).flatMap((value) => Array.isArray(value) ? value : [value]).find((value) => value.trim());
  return detail || reason.message || fallback;
}

export async function initialiseCsrf() {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf/`, { credentials: "include" });
  if (!response.ok) throw new ApiError("We could not start a secure session. Please try again.");
  const payload = await response.json() as { csrfToken: string };
  return payload.csrfToken;
}

export async function apiRequestAt<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() || "GET";
  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  const csrfToken = needsCsrf ? await initialiseCsrf() : "";

  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (needsCsrf) headers.set("X-CSRFToken", csrfToken);

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, method, headers, credentials: "include" });
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    throw new ApiError(errorPayload?.error?.message || "We could not complete your request. Please try again.", errorPayload?.error?.details, response.status);
  }
  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequestAt<T>(`/api/v1${path}`, options);
}
