"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Account, api, ApiError, Attempt, Exam, ExamResult, mainSite } from "../lib/api";
import { ArrowRightIcon } from "./Icon";

export function SignIn() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { await api("/auth/login/", { identifier: form.get("identifier"), password: form.get("password") }); router.replace("/exams"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed."); }
    finally { setBusy(false); }
  }
  return <div className="login-wrap"><div className="eyebrow">Secure candidate access</div><h1>Ready to begin?</h1><p className="intro">Sign in with your existing IoD-Gh account to access your examination.</p><form className="panel" onSubmit={submit}><label>Email or membership number<input name="identifier" required autoComplete="username" autoCapitalize="none" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p className="error" role="alert">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><a className="text-link" href={`${mainSite}/forgot-password`}>Forgot password?</a></form><p className="small">Only examinations assigned to your account will be shown.</p></div>;
}

export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState("");
  return <div><button className="secondary" onClick={async () => { try { await api("/auth/logout/", {}); router.replace("/login"); } catch { setError("Could not sign out. Please retry."); } }}>Sign out</button>{error && <p role="alert">{error}</p>}</div>;
}

export function Available({ examId }: { examId?: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ exams: Exam[]; attempts: Attempt[] } | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    let live = true;
    api<Account>("/auth/me/").then((account) => { if (live) setUser(account); return api<{ exams: Exam[]; attempts: Attempt[] }>("/exams/available/"); }).then((result) => { if (live) setData(result); }).catch((reason) => { if (!live) return; if (reason instanceof ApiError && [401, 403].includes(reason.status)) router.replace("/login"); else setError("Could not load your examinations. Please refresh to retry."); });
    return () => { live = false; };
  }, [router]);
  async function start(exam: Exam) {
    if (!window.confirm("Start your examination now? Your time starts immediately and continues if you leave or disconnect.")) return;
    setBusy(exam.id); setError("");
    try { const attempt = await api<Attempt>(`/exams/${exam.id}/start/`, {}); router.push(`/attempt/${attempt.id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start this examination."); setBusy(""); }
  }
  const active = data?.attempts.filter((attempt) => attempt.status === "IN_PROGRESS") || [];
  const exams = data?.exams.filter((exam) => (!examId || exam.id === examId) && !active.some((attempt) => attempt.exam_id === exam.id)) || [];
  return <div className="container"><div className="page-heading"><div><p className="eyebrow">Examination portal</p><h1>Welcome{user ? `, ${user.first_name || user.email}` : ""}.</h1><p>Your examinations, in one place.</p></div><SignOut /></div>{error && <p role="alert" className="error">{error}</p>}{!data && !error && <p role="status">Loading your examinations…</p>}{active.map((attempt) => <article className="panel" key={attempt.id}><span className="badge">In progress</span><h2>{attempt.title}</h2><p>Your saved answers are safe. The examination timer continues while you are away.</p><Link className="primary" href={`/attempt/${attempt.id}`}>Resume examination</Link></article>)}{exams.map((exam) => <article className="panel" key={exam.id}><span className="eyebrow">Available examination</span><h2>{exam.title}</h2><p className="instructions">{exam.instructions}</p><div className="facts"><span>{exam.duration_minutes} minutes maximum</span><span>{exam.question_count} questions</span></div><p className="small">The exam closes at its scheduled end time, even if you start late. Your remaining time will be shown when you begin.</p><button className="primary" disabled={!!busy} onClick={() => void start(exam)}>{busy === exam.id ? "Starting…" : "Start examination"}</button></article>)}{data && !active.length && !exams.length && <div className="panel"><h2>No examination is available.</h2><p>This examination is currently unavailable to your account. Contact IoD-Gh if you expected access.</p></div>}{!!data?.attempts.some((a) => a.status !== "IN_PROGRESS") && <section className="results-list"><h2>Your results</h2>{data.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS").map((attempt) => <Link href={`/attempt/${attempt.id}/result`} key={attempt.id}>{attempt.title}<span className="inline-flex items-center gap-1">View result <ArrowRightIcon /></span></Link>)}</section>}</div>;
}

export function Result({ id }: { id: string }) {
  const router = useRouter();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const fetchResult = () => api<ExamResult>(`/exam-attempts/${id}/result/`).then((data) => { if (!live) return; setResult(data); setError(""); if (data.attempt.status === "IN_PROGRESS") router.replace(`/attempt/${id}`); }).catch((reason) => { if (live) setError(reason instanceof Error ? reason.message : "Could not load your result."); });
    void fetchResult(); const timer = window.setInterval(fetchResult, 30000);
    return () => { live = false; window.clearInterval(timer); };
  }, [id, router]);
  return <div className="container result"><p className="eyebrow">Examination result</p><h1>{result?.attempt.title || "Your result"}</h1>{error && <p className="error" role="alert">{error}</p>}{result ? <div className="panel">{result.released ? <><span className={`badge ${result.passed ? "passed" : ""}`}>{result.passed ? "PASSED" : "NOT PASSED"}</span><dl className="result-grid"><div><dt>Score</dt><dd>{result.score} <small>/ {result.total_marks}</small></dd></div><div><dt>Percentage</dt><dd>{result.percentage}%</dd></div><div><dt>Grade</dt><dd>{result.grade}</dd></div></dl></> : <><h2>{result.attempt.status === "CANCELLED" ? "Examination cancelled" : "Awaiting result"}</h2><p>{result.attempt.status === "CANCELLED" ? "Please contact IoD-Gh." : "Your examination has been recorded. Your result will appear here when released by IoD-Gh."}</p></>}{result.attempt.status === "EXPIRED" && <p>Time expired. Only answers saved before the deadline were assessed.</p>}</div> : <p>Loading result…</p>}<Link className="text-link" href="/exams">Return to examinations</Link></div>;
}
