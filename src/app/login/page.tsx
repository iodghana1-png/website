"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { canAccessAdmin, login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { FormInput } from "@/components/ui/FormFields";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      if (!canAccessAdmin(user)) {
        setError("Sign in with an administrator account.");
        return;
      }
      router.replace("/admin");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We could not sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="bg-[var(--color-paper)] px-6 py-16 sm:py-24">
    <section className="mx-auto w-full max-w-lg border-t-4 border-[var(--color-ink)] bg-white p-7 sm:p-10">
      <p className="eyebrow">Administrator login</p>
      <h1 className="mt-5 font-serif text-4xl tracking-[-0.05em]">Welcome back.</h1>
      <p className="mt-4 leading-7 text-[var(--color-slate)]">Sign in to manage the IoD-Gh website.</p>
      <form onSubmit={submit}>
        {error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}
        <div className="mt-8 space-y-5">
          <FormInput label="Email address" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <FormInput label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <button type="submit" disabled={submitting} className="mt-7 inline-flex min-h-12 w-full items-center justify-center bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Signing in…" : "Sign in"}</button>
        <div className="mt-6 flex justify-between gap-4 text-sm">
          <Link href="/forgot-password" className="underline">Forgot password?</Link>
          <Link href="/" className="underline">Return to website</Link>
        </div>
      </form>
    </section>
  </main>;
}
