"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, Attempt, Question } from "../lib/api";
import { deadlineLabel } from "../lib/time";

export function AttemptWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const confirmation = useRef<HTMLDialogElement>(null);
  const deadline = useRef(0);
  const pending = useRef<Record<string, string>>({});
  const revisions = useRef<Record<string, number>>({});
  const draining = useRef(false);
  const closed = useRef(false);
  useEffect(() => { if (confirm) confirmation.current?.showModal(); }, [confirm]);

  useEffect(() => {
    // Questions must be delivered to the browser to be displayed, so no web
    // page can stop a determined user with developer tools or a camera. These
    // capture-phase guards do stop normal keyboard, mouse and touch copying.
    const blockClipboard = (event: ClipboardEvent) => { event.preventDefault(); event.clipboardData?.clearData(); };
    const blockShortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["a", "c", "x", "v", "p", "s"].includes(event.key.toLowerCase())) event.preventDefault();
    };
    const blockSelection = (event: Event) => event.preventDefault();
    document.addEventListener("copy", blockClipboard, true);
    document.addEventListener("cut", blockClipboard, true);
    document.addEventListener("paste", blockClipboard, true);
    document.addEventListener("selectstart", blockSelection, true);
    window.addEventListener("keydown", blockShortcuts, true);
    return () => {
      document.removeEventListener("copy", blockClipboard, true);
      document.removeEventListener("cut", blockClipboard, true);
      document.removeEventListener("paste", blockClipboard, true);
      document.removeEventListener("selectstart", blockSelection, true);
      window.removeEventListener("keydown", blockShortcuts, true);
    };
  }, []);

  const sync = useCallback((value: Attempt) => {
    setAttempt(value);
    // Countdown uses elapsed monotonic time, not the candidate's wall clock.
    const milliseconds = Math.max(0, Date.parse(value.expires_at) - Date.parse(value.server_time));
    deadline.current = performance.now() + milliseconds;
    setRemaining(Math.ceil(milliseconds / 1000));
    if (value.status !== "IN_PROGRESS") { closed.current = true; router.replace(`/attempt/${id}/result`); }
  }, [id, router]);

  const flush = useCallback(async () => {
    if (draining.current || closed.current) return;
    draining.current = true; setSaving(true);
    try {
      while (Object.keys(pending.current).length && !closed.current) {
        const questionId = Object.keys(pending.current)[0];
        const option = pending.current[questionId];
        const saved = await api<{ revision: number }>(`/exam-attempts/${id}/answers/`, { question_id: questionId, option_id: option, base_revision: revisions.current[questionId] || 0 });
        revisions.current[questionId] = saved.revision;
        if (pending.current[questionId] === option) delete pending.current[questionId];
        setPendingCount(Object.keys(pending.current).length);
        setConnection("");
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setError(reason.message);
        try { sync(await api<Attempt>(`/exam-attempts/${id}/`)); } catch { /* Retry when connectivity returns. */ }
      } else if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
        setError("Your session needs attention. Sign in again in another tab, then retry saving here. The examination timer continues.");
      } else setConnection("Connection interrupted. Unsaved choices will retry automatically. Keep this page open; the timer continues.");
    } finally { draining.current = false; setSaving(false); }
  }, [id, sync]);

  useEffect(() => {
    let live = true;
    api<{ attempt: Attempt; questions: Question[] }>(`/exam-attempts/${id}/questions/`).then((data) => {
      if (!live) return;
      sync(data.attempt); setQuestions(data.questions);
      setIndex(Math.max(0, data.questions.findIndex((question) => !question.selected_option)));
      setChoices(Object.fromEntries(data.questions.filter((q) => q.selected_option).map((q) => [q.id, q.selected_option!])));
      revisions.current = Object.fromEntries(data.questions.map((q) => [q.id, q.answer_revision]));
    }).catch(async (reason) => {
      if (!live) return;
      if (reason instanceof ApiError && reason.status === 409) { router.replace(`/attempt/${id}/result`); return; }
      setError(reason instanceof Error ? reason.message : "Could not load the examination.");
    });
    return () => { live = false; };
  }, [id, router, sync]);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)));
    const refresh = () => { if (!closed.current) void api<Attempt>(`/exam-attempts/${id}/`).then(sync).catch(() => setConnection("Connection interrupted. Saved answers remain safe; the timer continues.")); };
    const resume = () => { refresh(); void flush(); };
    const warn = (event: BeforeUnloadEvent) => { if (Object.keys(pending.current).length) { event.preventDefault(); event.returnValue = ""; } };
    const clock = window.setInterval(update, 250);
    const poll = window.setInterval(refresh, 10000);
    const retry = window.setInterval(() => void flush(), 5000);
    window.addEventListener("online", resume); window.addEventListener("focus", resume); window.addEventListener("beforeunload", warn);
    return () => { window.clearInterval(clock); window.clearInterval(poll); window.clearInterval(retry); window.removeEventListener("online", resume); window.removeEventListener("focus", resume); window.removeEventListener("beforeunload", warn); };
  }, [flush, id, sync]);

  const question = questions[index];
  useEffect(() => {
    if (question && !closed.current) void api(`/exam-attempts/${id}/viewed/`, { question_id: question.id }).catch(() => {});
  }, [id, question]);

  async function submit() {
    if (Object.keys(pending.current).length || draining.current) { setError("Wait for all answers to save before submitting."); setConfirm(false); return; }
    setSubmitting(true); setError("");
    try { sync(await api<Attempt>(`/exam-attempts/${id}/submit/`, {})); }
    catch (reason) { if (reason instanceof ApiError && reason.status === 409) router.replace(`/attempt/${id}/result`); else setError("Could not confirm submission. Your saved answers are safe. Retry submission."); }
    finally { setSubmitting(false); setConfirm(false); }
  }
  const days = Math.floor(remaining / 86400);
  const time = (days ? `${days}d ` : "") + [Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].map((v) => String(v).padStart(2, "0")).join(":");
  return <div className="container exam-workspace"><div className="page-heading"><div><p className="eyebrow">Examination in progress</p><h1>{attempt?.title || "Loading examination…"}</h1></div><div className={`timer ${remaining < 300 ? "urgent" : ""}`} role="timer" aria-label={`Time remaining ${time}`}><span>Time remaining</span><strong>{time}</strong></div></div>{connection && <p className="warning" role="alert">{connection}</p>}{error && <p className="error" role="alert">{error} <a href="/login" target="_blank" rel="noreferrer">Sign in</a> · <button className="text-button" onClick={() => void flush()}>Retry saving</button> · <button className="text-button" onClick={() => window.location.reload()}>Reload saved answers</button></p>}{attempt && remaining === 0 && <p className="warning" role="status">Time has ended. Checking your examination record with the server. Only answers saved before the server deadline count.</p>}{attempt && remaining > 0 && <div className="resume-note"><p>You can leave and continue later until <strong>{deadlineLabel(attempt.expires_at)}</strong>. Wait for all answers to save before leaving. Submit only when you have finished.</p><button className="secondary" disabled={!!pendingCount || saving || submitting} onClick={() => router.push("/exams")}>Continue later</button></div>}{question && <div className="workspace-grid"><aside className="question-nav" aria-label="Question navigation"><h2>Questions</h2><p>{Object.keys(choices).length} of {questions.length} answered</p><div>{questions.map((q, i) => <button key={q.id} onClick={() => setIndex(i)} className={`${choices[q.id] ? "answered" : ""} ${i === index ? "current" : ""}`} aria-current={i === index ? "step" : undefined} aria-label={`Question ${i + 1}, ${choices[q.id] ? "answered" : "unanswered"}`}>{i + 1}</button>)}</div><p className="save-status" role="status">{saving ? "Saving…" : pendingCount ? `${pendingCount} answer(s) not yet saved` : "All answers saved"}</p></aside><section className="panel question" onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><p className="question-watermark">Confidential · {attempt?.candidate_name || "IoD-Gh candidate"} · {id.slice(0, 8)} · Do not copy or share</p><p className="eyebrow">Question {index + 1} of {questions.length} · {question.marks} marks</p><fieldset disabled={remaining === 0 || submitting}><legend>{question.text}</legend>{question.options.map((option, optionIndex) => <label key={option.id} className={`option ${choices[question.id] === option.id ? "selected" : ""}`}><input type="radio" name={question.id} checked={choices[question.id] === option.id} onChange={() => { setChoices((old) => ({ ...old, [question.id]: option.id })); pending.current[question.id] = option.id; setPendingCount(Object.keys(pending.current).length); void flush(); }} /><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option.text}</span></label>)}</fieldset><div className="question-actions"><button className="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button><button className="secondary" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>Next</button></div><div className="submit-row"><p>{questions.length - Object.keys(choices).length} unanswered</p><button className="primary" disabled={!!pendingCount || saving || submitting || remaining === 0} onClick={() => setConfirm(true)}>Submit examination</button></div></section></div>}{confirm && <dialog ref={confirmation} onCancel={() => setConfirm(false)} aria-labelledby="submit-title" className="panel modal"><h2 id="submit-title">Submit your examination?</h2><p>You will not be able to change your answers after submission.</p><p>{questions.length - Object.keys(choices).length} questions remain unanswered.</p><div className="question-actions"><button className="secondary" autoFocus disabled={submitting} onClick={() => setConfirm(false)}>Cancel</button><button className="primary" disabled={submitting || !!pendingCount || saving} onClick={() => void submit()}>{submitting ? "Submitting…" : "Submit examination"}</button></div></dialog>}</div>;
}
