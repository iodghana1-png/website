"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { confirmEmailChange } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function VerifyEmailChangePage() {
  return <Suspense fallback={<PageLoading />}><VerifyEmailChangeForm /></Suspense>;
}

function VerifyEmailChangeForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = params.get("token") || "";

  async function confirm() {
    if (!token) return setError("This confirmation link is incomplete. Request another email change from Settings.");
    setError(""); setSubmitting(true);
    try {
      const user = await confirmEmailChange(token);
      setEmail(user.email);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We could not confirm your email change. Please try again.");
    } finally { setSubmitting(false); }
  }

  return <main className="bg-[var(--color-paper)] py-20"><section className="site-container max-w-2xl"><div className="border-t-4 border-[var(--color-ink)] bg-white p-8 sm:p-10"><p className="eyebrow">Account security</p><h1 className="mt-4 font-serif text-5xl tracking-[-0.05em]">Confirm your new email.</h1>{email ? <div className="mt-7 border-l-2 border-[var(--color-accent)] bg-[var(--color-warm-white)] p-6"><p className="leading-7"><strong>{email}</strong> is now your IoD-Gh administrator email. Future examination access codes will be sent there.</p><Link href="/login" className="mt-5 inline-block font-bold underline">Sign in with your new email</Link></div> : <><p className="mt-5 leading-7 text-[var(--color-slate)]">Confirm this change to use the new address for your IoD-Gh account and examination access codes.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}<button type="button" onClick={confirm} disabled={submitting} className="mt-8 min-h-12 bg-[var(--color-ink)] px-6 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Confirming…" : "Confirm email change"}</button></>}</div></section></main>;
}

function PageLoading() {
  return <main className="grid min-h-[50vh] place-items-center bg-[var(--color-paper)]"><p className="text-sm font-bold text-[var(--color-slate)]">Loading confirmation…</p></main>;
}
