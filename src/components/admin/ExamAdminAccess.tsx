"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { apiRequest, apiErrorMessage } from "@/lib/api/client";
import { buttonClass, inputClass, primaryClass } from "./cms/Fields";

type Access = { verified: boolean; verified_until: string | null; email_hint: string };

export function ExamAdminAccess({ children }: { children: (expired: () => void) => ReactNode }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const expired = useCallback(() => {
    setAccess((current) => current ? { ...current, verified: false } : current);
    setSent(false);
    setCode("");
  }, []);

  useEffect(() => {
    let live = true;
    apiRequest<Access>("/exams/staff/access/").then((value) => {
      if (live) setAccess(value);
    }).catch((reason) => {
      if (live) setError(apiErrorMessage(reason, "Could not check examination access. Refresh to try again."));
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!access?.verified || !access.verified_until) return;
    const timer = window.setTimeout(expired, Math.max(0, Date.parse(access.verified_until) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [access, expired]);

  async function send() {
    setBusy(true); setError("");
    try {
      await apiRequest("/exams/staff/access/send/", { method: "POST", body: "{}" });
      setSent(true); setCode("");
    } catch (reason) {
      setError(apiErrorMessage(reason, "Could not send the code. Please retry."));
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      setAccess(await apiRequest<Access>("/exams/staff/access/verify/", { method: "POST", body: JSON.stringify({ code }) }));
      setCode("");
    } catch (reason) {
      setError(apiErrorMessage(reason, "Could not verify the code. Please retry."));
    } finally { setBusy(false); }
  }

  if (access?.verified) return children(expired);
  return <section className="mt-6 max-w-lg rounded-xl border border-[var(--color-line)] bg-white p-6 sm:p-8">
    <h2 className="text-xl">Verify examination access</h2>
    {access ? <>
      <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">We’ll send a six-digit code to {access.email_hint}. Enter it once to access examination management for up to eight hours in this signed-in session.</p>
      {sent && <form onSubmit={verify} className="mt-5 space-y-4">
        <p role="status" className="text-sm">Code sent. Check your inbox or spam folder. It expires in 10 minutes.</p>
        <label className="block text-sm font-semibold">Verification code<input autoFocus required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={inputClass} /></label>
        <button className={primaryClass} disabled={busy || code.length !== 6}>{busy ? "Please wait…" : "Verify and continue"}</button>
      </form>}
      <button type="button" className={`${sent ? buttonClass : primaryClass} mt-5`} disabled={busy} onClick={() => void send()}>{sent ? "Send a new code" : busy ? "Sending…" : "Send verification code"}</button>
    </> : !error && <p role="status" className="mt-3 text-sm">Checking access…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
  </section>;
}
