"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiBaseUrl, apiRequest, ApiError } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/api/auth";
import {
  Area,
  buttonClass,
  Field,
  inputClass,
  Panel,
  primaryClass,
} from "./cms/Fields";

type Question = {
  id?: string;
  version?: number;
  text: string;
  marks: string;
  explanation: string;
  category: string;
  difficulty: string;
  is_active: boolean;
  options: { text: string; is_correct: boolean }[];
};
type Exam = {
  id?: string;
  version?: number;
  title: string;
  instructions: string;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  pass_mark: string;
  maximum_attempts: number;
  question_count: number;
  randomize_options: boolean;
  select_from_bank: boolean;
  result_release: string;
  release_at: string | null;
  is_active: boolean;
  question_ids: string[];
};
type AttemptRow = {
  attempt: {
    id: string;
    title: string;
    status: string;
    started_at: string;
    expires_at: string;
  };
  student_email: string;
  attempt_number: number;
  submitted_at: string | null;
  released: boolean;
  score?: string;
  total_marks?: string;
  percentage?: string;
  grade?: string;
  passed?: boolean;
};
type Assignment = {
  identifier: string;
  name: string;
  is_active: boolean;
  has_candidate_code: boolean;
  candidate_code_issued_at: string | null;
  candidate_code?: string;
};
type Page<T> = { count: number; next: string | null; results: T[] };
type Review = {
  student_email: string;
  questions: {
    id: string;
    text: string;
    selected_option: string | null;
    correct_option?: string;
    options: { id: string; text: string }[];
  }[];
  events: { event: string; timestamp: string }[];
};
const emptyQuestion = (): Question => ({
  text: "",
  marks: "1",
  explanation: "",
  category: "",
  difficulty: "MEDIUM",
  is_active: true,
  options: [
    { text: "", is_correct: true },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ],
});
const emptyExam = (): Exam => ({
  title: "",
  instructions:
    "Select one answer for each question. Answers save automatically. Submit when you are ready.",
  duration_minutes: 120,
  starts_at: "",
  ends_at: "",
  pass_mark: "60",
  maximum_attempts: 1,
  question_count: 1,
  randomize_options: true,
  select_from_bank: false,
  result_release: "MANUAL_REVIEW",
  release_at: null,
  is_active: false,
  question_ids: [],
});
const localDate = (date: string | null) => {
  if (!date) return "";
  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const dateText = (date: string | null) =>
  date
    ? new Date(date).toLocaleString("en-GH", { timeZone: "Africa/Accra" })
    : "—";

export function ExaminationsAdmin() {
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"exams" | "questions" | "results">("exams");
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionPage, setQuestionPage] = useState(1);
  const [moreQuestions, setMoreQuestions] = useState(false);
  const [search, setSearch] = useState("");
  const [examPage, setExamPage] = useState(1);
  const [moreExams, setMoreExams] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedExam, setSelectedExam] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [candidateCode, setCandidateCode] = useState("");
  const [issuedCandidate, setIssuedCandidate] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [moreAssignments, setMoreAssignments] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [attemptPage, setAttemptPage] = useState(1);
  const [moreAttempts, setMoreAttempts] = useState(false);
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<Review | null>(null);

  const fail = (reason: unknown) => {
    setError(
      reason instanceof ApiError && reason.details
        ? Object.values(reason.details).flat().join(" ")
        : reason instanceof Error
          ? reason.message
          : "The request failed.",
    );
  };
  const loadExams = useCallback(async (page = 1) => {
    const data = await apiRequest<Page<Exam>>(
      `/exams/staff/exams/?page=${page}`,
    );
    setExams((old) => (page === 1 ? data.results : [...old, ...data.results]));
    setExamPage(page);
    setMoreExams(!!data.next);
  }, []);
  const loadQuestions = useCallback(async (page = 1, query = "") => {
    const data = await apiRequest<Page<Question>>(
      `/exams/staff/questions/?page=${page}&search=${encodeURIComponent(query)}`,
    );
    setQuestions((old) =>
      page === 1 ? data.results : [...old, ...data.results],
    );
    setQuestionPage(page);
    setMoreQuestions(!!data.next);
  }, []);
  const loadAssignments = useCallback(async (id: string, page = 1) => {
    const data = await apiRequest<Page<Assignment>>(
      `/exams/staff/exams/${id}/eligibility/?page=${page}`,
    );
    setAssignments(data.results);
    setAssignmentPage(page);
    setMoreAssignments(!!data.next);
  }, []);
  const loadAttempts = useCallback(
    async (page = 1) => {
      const data = await apiRequest<Page<AttemptRow>>(
        `/exams/staff/attempts/?page=${page}${selectedExam ? `&exam=${selectedExam}` : ""}${status ? `&status=${status}` : ""}`,
      );
      setAttempts(data.results);
      setAttemptPage(page);
      setMoreAttempts(!!data.next);
    },
    [selectedExam, status],
  );
  useEffect(() => {
    let live = true;
    getCurrentUser()
      .then(async (user) => {
        if (!live) return;
        if (
          !user.is_superuser &&
          !(user.is_staff && user.roles.includes("Training Officer"))
        )
          throw new Error(
            "Examination management is restricted to authorized Training Officers and superusers.",
          );
        setAllowed(true);
        await Promise.all([loadExams(), loadQuestions()]);
      })
      .catch(fail);
    return () => {
      live = false;
    };
  }, [loadExams, loadQuestions]);
  useEffect(() => {
    if (!allowed || tab !== "results") return;
    const timer = window.setTimeout(() => void loadAttempts().catch(fail), 0);
    return () => window.clearTimeout(timer);
  }, [allowed, tab, loadAttempts]);

  async function save(event: FormEvent, kind: "exam" | "question") {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const item = kind === "exam" ? exam : question;
      if (!item) return;
      const result = await apiRequest<Exam & Question>(
        `/exams/staff/${kind === "exam" ? "exams" : "questions"}/${item.id ? `${item.id}/` : ""}`,
        { method: item.id ? "PUT" : "POST", body: JSON.stringify(item) },
      );
      setNotice(
        `Saved version ${result.version}. Existing examination attempts are unchanged.`,
      );
      if (kind === "exam") {
        setExam(null);
        await loadExams();
      } else {
        setQuestion(null);
        await loadQuestions(1, search);
      }
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function assign(
    value: string,
    is_active: boolean,
    issueNewCode = false,
  ) {
    setBusy(true);
    setError("");
    setCandidateCode("");
    setIssuedCandidate("");
    try {
      const grant = await apiRequest<Assignment>(
        `/exams/staff/exams/${selectedExam}/eligibility/`,
        {
          method: "POST",
          body: JSON.stringify({
            identifier: value,
            is_active,
            issue_new_code: issueNewCode,
          }),
        },
      );
      setIdentifier("");
      await loadAssignments(selectedExam);
      if (grant.candidate_code) {
        setCandidateCode(grant.candidate_code);
        setIssuedCandidate(grant.name || grant.identifier);
        setNotice(
          `Access code created for ${grant.name || grant.identifier}. Give the candidate their saved full name and this code.`,
        );
      } else {
        setNotice(
          is_active
            ? "Account assigned to examination. The existing candidate access code remains valid."
            : "Eligibility revoked for future starts. Existing attempts are retained.",
        );
      }
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  function selectCandidateExam(id: string, scrollToAccess = false) {
    setSelectedExam(id);
    setIdentifier("");
    setCandidateCode("");
    setIssuedCandidate("");
    if (!id) {
      setAssignments([]);
      setAssignmentPage(1);
      setMoreAssignments(false);
      return;
    }
    void loadAssignments(id).catch(fail);
    if (scrollToAccess) {
      window.setTimeout(
        () =>
          document
            .getElementById("candidate-access")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
    }
  }
  async function removeQuestion(item: Question) {
    if (
      !item.id ||
      !window.confirm(
        "Remove this question from the bank? It will not be usable in future examination versions. Historical attempts and results will be retained.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<Question>(`/exams/staff/questions/${item.id}/`, {
        method: "DELETE",
      });
      setQuestions((old) => old.filter((question) => question.id !== item.id));
      if (question?.id === item.id) setQuestion(null);
      setNotice(
        "Question removed from the future question bank. Historical examination records were retained.",
      );
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function exportResults() {
    setBusy(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/exams/staff/results/export/?exam=${selectedExam}`,
        { credentials: "include", cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not export results.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "exam-results.csv";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <p className="mt-6" role={error ? "alert" : "status"}>
        {error || "Checking examination access…"}
      </p>
    );
  return (
    <div className="mt-6 max-w-6xl space-y-5">
      <p className="text-sm text-[var(--color-slate)]">
        Manage examinations independently of the CMS. Published question sets
        are versioned; official scores cannot be overwritten. Times in attempt
        records are Ghana time.
      </p>
      <nav className="flex gap-2" aria-label="Examination management">
        {(["exams", "questions", "results"] as const).map((item) => (
          <button
            type="button"
            key={item}
            className={tab === item ? primaryClass : buttonClass}
            onClick={() => {
              setTab(item);
              setError("");
              setReview(null);
            }}
          >
            {item === "questions"
              ? "Question bank"
              : item === "results"
                ? "Attempts & results"
                : "Examinations"}
          </button>
        ))}
      </nav>
      {error && (
        <p
          className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="rounded bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}
      {tab === "exams" && (
        <>
          <Panel title="Candidate access codes" open>
            <div id="candidate-access" className="scroll-mt-6">
              <p className="text-sm text-[var(--color-slate)]">
                Give each candidate access in three short steps. Their answers
                are saved, so they can return later using the same name and
                code.
              </p>
              <ol className="mt-4 space-y-5">
                <li>
                  <label className="block max-w-xl text-sm font-semibold">
                    <span>1. Select the examination</span>
                    <select
                      className={inputClass}
                      value={selectedExam}
                      onChange={(event) =>
                        selectCandidateExam(event.target.value)
                      }
                    >
                      <option value="">Choose an examination</option>
                      {exams.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!exams.length && (
                    <p className="mt-2 text-sm text-[var(--color-slate)]">
                      Create an examination below before assigning candidates.
                    </p>
                  )}
                </li>
                {selectedExam && (
                  <>
                    <li>
                      <h3 className="text-sm font-semibold">
                        2. Add the candidate
                      </h3>
                      <p className="mt-1 text-sm text-[var(--color-slate)]">
                        Enter the email address or membership number already on
                        the candidate&apos;s account.
                      </p>
                      <form
                        className="mt-3 flex flex-wrap items-end gap-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void assign(identifier, true);
                        }}
                      >
                        <Field
                          label="Candidate email or membership number"
                          value={identifier}
                          onChange={setIdentifier}
                          required
                        />
                        <button className={primaryClass} disabled={busy}>
                          Create access code
                        </button>
                      </form>
                    </li>
                    {candidateCode && (
                      <li
                        className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950"
                        aria-live="polite"
                      >
                        <h3 className="font-semibold">
                          3. Give the candidate these two details
                        </h3>
                        <dl className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr]">
                          <dt className="font-semibold">Full name</dt>
                          <dd>{issuedCandidate}</dd>
                          <dt className="font-semibold">Access code</dt>
                          <dd>
                            <code className="block select-all rounded bg-white px-3 py-2 font-mono text-base tracking-wide">
                              {candidateCode}
                            </code>
                          </dd>
                        </dl>
                        <button
                          type="button"
                          className={`${buttonClass} mt-3`}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                candidateCode,
                              );
                              setNotice("Access code copied.");
                            } catch {
                              setNotice(
                                "Select and copy the access code shown.",
                              );
                            }
                          }}
                        >
                          Copy access code
                        </button>
                        <p className="mt-3">
                          The candidate enters this exact full name and code in
                          the Examination Portal. This continues any saved exam
                          session; it does not sign them into the CMS.
                        </p>
                      </li>
                    )}
                  </>
                )}
              </ol>
              {selectedExam && (
                <section className="mt-6 border-t border-[var(--color-line)] pt-5">
                  <h3 className="font-semibold">Assigned candidates</h3>
                  <p className="mt-1 text-sm text-[var(--color-slate)]">
                    Revoke a candidate to stop future starts, or create a new
                    code if the old one has been lost.
                  </p>
                  {assignments.length ? (
                    <div className="mt-3 divide-y rounded border border-[var(--color-line)] bg-white px-4">
                      {assignments.map((entry) => (
                        <article
                          key={entry.identifier}
                          className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold">
                              {entry.name || "Unnamed candidate"}
                            </p>
                            <p className="text-[var(--color-slate)]">
                              {entry.identifier}
                            </p>
                            <p className="mt-1 text-xs">
                              {entry.is_active
                                ? entry.has_candidate_code
                                  ? "Eligible — code ready"
                                  : "Eligible — code not yet created"
                                : "Access revoked"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={buttonClass}
                              disabled={busy}
                              onClick={() =>
                                void assign(entry.identifier, !entry.is_active)
                              }
                            >
                              {entry.is_active ? "Revoke" : "Restore"}
                            </button>
                            {entry.is_active && (
                              <button
                                type="button"
                                className={buttonClass}
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Create a new code for ${entry.name || entry.identifier}? The old code will stop working.`,
                                    )
                                  )
                                    void assign(entry.identifier, true, true);
                                }}
                              >
                                New code
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded bg-[var(--color-paper)] p-3 text-sm text-[var(--color-slate)]">
                      No candidates have been assigned to this examination yet.
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={buttonClass}
                      disabled={assignmentPage <= 1}
                      onClick={() =>
                        void loadAssignments(
                          selectedExam,
                          assignmentPage - 1,
                        ).catch(fail)
                      }
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      disabled={!moreAssignments}
                      onClick={() =>
                        void loadAssignments(
                          selectedExam,
                          assignmentPage + 1,
                        ).catch(fail)
                      }
                    >
                      Next
                    </button>
                  </div>
                </section>
              )}
            </div>
          </Panel>
          <button
            type="button"
            className={primaryClass}
            onClick={() => setExam(emptyExam())}
          >
            Create examination
          </button>
          <div className="space-y-3">
            {exams.map((item) => (
              <article
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--color-line)] bg-white p-5"
                key={item.id}
              >
                <div>
                  <h2 className="text-xl">{item.title}</h2>
                  <p className="text-sm">
                    Version {item.version} ·{" "}
                    {item.is_active ? "Active" : "Inactive"} ·{" "}
                    {item.duration_minutes} minutes · {item.question_count}{" "}
                    questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => setExam(item)}
                  >
                    Edit / new version
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => selectCandidateExam(item.id!, true)}
                  >
                    Manage candidates
                  </button>
                </div>
              </article>
            ))}
          </div>
          {moreExams && (
            <button
              className={buttonClass}
              onClick={() => void loadExams(examPage + 1).catch(fail)}
            >
              Load more examinations
            </button>
          )}
          {false && selectedExam && (
            <Panel
              title={`Eligible accounts — ${exams.find((item) => item.id === selectedExam)?.title || "Examination"}`}
              open
            >
              <p className="mb-4 text-sm text-[var(--color-slate)]">
                Assign an existing account, then give the displayed access code
                to that candidate. Their full name and this code are required in
                the Examination Portal.
              </p>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void assign(identifier, true);
                }}
              >
                <Field
                  label="Email or membership number"
                  value={identifier}
                  onChange={setIdentifier}
                  required
                />
                <button className={primaryClass} disabled={busy}>
                  Assign eligible account
                </button>
              </form>
              {candidateCode && (
                <div className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
                  <p className="font-semibold">
                    Candidate access code — copy before you leave this page
                  </p>
                  <code className="mt-2 block select-all rounded bg-white px-3 py-2 font-mono text-base tracking-wide">
                    {candidateCode}
                  </code>
                  <p className="mt-2">
                    Give this code only to the named candidate. It restores
                    their saved examination session; it does not sign them into
                    the CMS or member portal.
                  </p>
                </div>
              )}
              <div className="divide-y">
                {assignments.map((entry) => (
                  <div
                    key={entry.identifier}
                    className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span>
                      {entry.name} · {entry.identifier} ·{" "}
                      {entry.is_active ? "Eligible" : "Revoked"}{" "}
                      {entry.is_active &&
                        (entry.has_candidate_code
                          ? "· Code issued"
                          : "· Code pending")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() =>
                          void assign(entry.identifier, !entry.is_active)
                        }
                      >
                        {entry.is_active
                          ? "Revoke eligibility"
                          : "Restore eligibility"}
                      </button>
                      {entry.is_active && (
                        <button
                          className={buttonClass}
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Issue a replacement code for ${entry.name || entry.identifier}? Their previous code will stop working.`,
                              )
                            )
                              void assign(entry.identifier, true, true);
                          }}
                        >
                          Issue replacement code
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  className={buttonClass}
                  disabled={assignmentPage <= 1}
                  onClick={() =>
                    void loadAssignments(
                      selectedExam,
                      assignmentPage - 1,
                    ).catch(fail)
                  }
                >
                  Previous
                </button>
                <button
                  className={buttonClass}
                  disabled={!moreAssignments}
                  onClick={() =>
                    void loadAssignments(
                      selectedExam,
                      assignmentPage + 1,
                    ).catch(fail)
                  }
                >
                  Next
                </button>
              </div>
            </Panel>
          )}
          {exam && (
            <form onSubmit={(event) => void save(event, "exam")}>
              <Panel
                title={
                  exam.id ? "Save a new examination version" : "New examination"
                }
                open
              >
                <fieldset disabled={busy} className="space-y-4">
                  <Field
                    label="Title"
                    value={exam.title}
                    required
                    onChange={(title) => setExam({ ...exam, title })}
                  />
                  <Area
                    label="Instructions"
                    value={exam.instructions}
                    onChange={(instructions) =>
                      setExam({ ...exam, instructions })
                    }
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {(
                      [
                        ["duration_minutes", "Duration (minutes)"],
                        ["pass_mark", "Pass mark (%)"],
                        ["maximum_attempts", "Maximum attempts"],
                        ["question_count", "Question count"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        type="number"
                        required
                        value={String(exam[key])}
                        onChange={(value) =>
                          setExam({
                            ...exam,
                            [key]: key === "pass_mark" ? value : Number(value),
                          })
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs">
                    Enter availability times in your browser&apos;s local
                    timezone. Ghana uses UTC.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["starts_at", "Starts at"],
                        ["ends_at", "Ends at"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        type="datetime-local"
                        required
                        value={localDate(exam[key])}
                        onChange={(value) =>
                          setExam({
                            ...exam,
                            [key]: value ? new Date(value).toISOString() : "",
                          })
                        }
                      />
                    ))}
                  </div>
                  <label className="block text-sm font-semibold">
                    Result release
                    <select
                      className={inputClass}
                      value={exam.result_release}
                      onChange={(event) =>
                        setExam({ ...exam, result_release: event.target.value })
                      }
                    >
                      <option value="IMMEDIATE">Immediate</option>
                      <option value="MANUAL_REVIEW">Manual review</option>
                      <option value="SCHEDULED">Scheduled</option>
                    </select>
                  </label>
                  {exam.result_release === "SCHEDULED" && (
                    <Field
                      label="Release results at"
                      type="datetime-local"
                      required
                      value={localDate(exam.release_at)}
                      onChange={(value) =>
                        setExam({
                          ...exam,
                          release_at: value
                            ? new Date(value).toISOString()
                            : null,
                        })
                      }
                    />
                  )}
                  <p className="rounded border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-sm text-[var(--color-slate)]">
                    Question order is randomized separately for every candidate.
                  </p>
                  {(
                    [
                      [
                        "is_active",
                        "Active (eligible accounts can start during the availability window)",
                      ],
                      ["randomize_options", "Randomize option order"],
                      [
                        "select_from_bank",
                        "Randomly select question count from the selected question pool",
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      className="flex items-center gap-2 text-sm"
                      key={key}
                    >
                      <input
                        type="checkbox"
                        checked={exam[key]}
                        onChange={(event) =>
                          setExam({ ...exam, [key]: event.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <div>
                    <h3 className="font-semibold">
                      Question pool ({exam.question_ids.length} selected)
                    </h3>
                    <p className="text-sm">
                      Question text and answer keys are frozen into this version
                      when saved.
                    </p>
                    <div className="mt-3 max-h-80 space-y-2 overflow-auto border p-3">
                      {questions
                        .filter((q) => q.is_active)
                        .map((q) => (
                          <label
                            className="flex items-start gap-3 text-sm"
                            key={q.id}
                          >
                            <input
                              type="checkbox"
                              checked={exam.question_ids.includes(q.id!)}
                              onChange={(event) =>
                                setExam({
                                  ...exam,
                                  question_ids: event.target.checked
                                    ? [...exam.question_ids, q.id!]
                                    : exam.question_ids.filter(
                                        (pk) => pk !== q.id,
                                      ),
                                })
                              }
                            />
                            <span>
                              {q.text}{" "}
                              <small>
                                (v{q.version}, {q.marks} marks)
                              </small>
                            </span>
                          </label>
                        ))}
                    </div>
                    {moreQuestions && (
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() =>
                          void loadQuestions(questionPage + 1, search).catch(
                            fail,
                          )
                        }
                      >
                        Load more questions
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button className={primaryClass}>
                      Save examination version
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => setExam(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </fieldset>
              </Panel>
            </form>
          )}
        </>
      )}
      {tab === "questions" && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <button
              className={primaryClass}
              onClick={() => setQuestion(emptyQuestion())}
            >
              Create question
            </button>
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void loadQuestions(1, search).catch(fail);
              }}
            >
              <Field
                label="Search question bank"
                value={search}
                onChange={setSearch}
              />
              <button className={buttonClass}>Search</button>
            </form>
          </div>
          <div className="divide-y rounded border bg-white">
            {questions.map((item) => (
              <article
                className="flex items-center justify-between gap-4 p-5"
                key={item.id}
              >
                <div>
                  <p className="font-semibold">{item.text}</p>
                  <p className="text-xs">
                    Version {item.version} · {item.category || "Uncategorized"}{" "}
                    · {item.difficulty} · {item.marks} marks
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => setQuestion(item)}
                  >
                    Edit / new version
                  </button>
                  <button
                    className={
                      buttonClass +
                      " border-red-300 text-red-700 hover:bg-red-50"
                    }
                    disabled={busy}
                    onClick={() => void removeQuestion(item)}
                  >
                    Remove question
                  </button>
                </div>
              </article>
            ))}
          </div>
          {moreQuestions && (
            <button
              className={buttonClass}
              onClick={() =>
                void loadQuestions(questionPage + 1, search).catch(fail)
              }
            >
              Load more questions
            </button>
          )}
          {question && (
            <form onSubmit={(event) => void save(event, "question")}>
              <Panel
                title={question.id ? "New question revision" : "New question"}
                open
              >
                <fieldset disabled={busy} className="space-y-4">
                  <Area
                    label="Question text"
                    value={question.text}
                    onChange={(text) => setQuestion({ ...question, text })}
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label="Marks"
                      type="number"
                      value={question.marks}
                      required
                      onChange={(marks) => setQuestion({ ...question, marks })}
                    />
                    <Field
                      label="Category / topic"
                      value={question.category}
                      onChange={(category) =>
                        setQuestion({ ...question, category })
                      }
                    />
                    <label className="text-sm font-semibold">
                      Difficulty
                      <select
                        className={inputClass}
                        value={question.difficulty}
                        onChange={(event) =>
                          setQuestion({
                            ...question,
                            difficulty: event.target.value,
                          })
                        }
                      >
                        {["EASY", "MEDIUM", "HARD"].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="text-sm font-semibold">
                    Answer options — select the one correct answer
                  </p>
                  {question.options.map((option, i) => (
                    <div className="flex items-center gap-3" key={i}>
                      <input
                        type="radio"
                        name="correct-option"
                        aria-label={`Option ${i + 1} is correct`}
                        checked={option.is_correct}
                        onChange={() =>
                          setQuestion({
                            ...question,
                            options: question.options.map((o, index) => ({
                              ...o,
                              is_correct: i === index,
                            })),
                          })
                        }
                      />
                      <div className="flex-1">
                        <Field
                          label={`Option ${i + 1}`}
                          required
                          value={option.text}
                          onChange={(text) =>
                            setQuestion({
                              ...question,
                              options: question.options.map((o, index) =>
                                i === index ? { ...o, text } : o,
                              ),
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        disabled={question.options.length <= 2}
                        className={buttonClass}
                        onClick={() =>
                          setQuestion({
                            ...question,
                            options: question.options.filter(
                              (_, index) => index !== i,
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={question.options.length >= 10}
                    onClick={() =>
                      setQuestion({
                        ...question,
                        options: [
                          ...question.options,
                          { text: "", is_correct: false },
                        ],
                      })
                    }
                  >
                    Add option
                  </button>
                  <Area
                    label="Internal explanation (never delivered to students)"
                    value={question.explanation}
                    onChange={(explanation) =>
                      setQuestion({ ...question, explanation })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={question.is_active}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          is_active: event.target.checked,
                        })
                      }
                    />
                    Active for future examination versions
                  </label>
                  <div className="flex gap-3">
                    <button className={primaryClass}>
                      Save question version
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => setQuestion(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </fieldset>
              </Panel>
            </form>
          )}
        </>
      )}
      {tab === "results" && (
        <>
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Filter by examination"
              className={inputClass + " !mt-0 !w-auto"}
              value={selectedExam}
              onChange={(event) => setSelectedExam(event.target.value)}
            >
              <option value="">All examinations</option>
              {exams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              className={inputClass + " !mt-0 !w-auto"}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {["IN_PROGRESS", "SUBMITTED", "EXPIRED", "CANCELLED"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
            <button
              className={buttonClass}
              disabled={!selectedExam || busy}
              onClick={() => void exportResults()}
            >
              Export exam results (CSV)
            </button>
            <button
              className={buttonClass}
              onClick={() => void loadAttempts(attemptPage).catch(fail)}
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Candidate / exam</th>
                  <th className="p-3">Status / time (Ghana)</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Release</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((item) => (
                  <tr className="border-b" key={item.attempt.id}>
                    <td className="p-3">
                      {item.student_email}
                      <br />
                      {item.attempt.title}
                      <br />
                      Attempt {item.attempt_number}
                      <br />
                      <button
                        className="mt-2 underline"
                        onClick={() =>
                          void apiRequest<Review>(
                            `/exams/staff/attempts/${item.attempt.id}/`,
                          )
                            .then(setReview)
                            .catch(fail)
                        }
                      >
                        Review answers and audit trail
                      </button>
                    </td>
                    <td className="p-3">
                      {item.attempt.status}
                      <br />
                      Started: {dateText(item.attempt.started_at)}
                      <br />
                      Expires: {dateText(item.attempt.expires_at)}
                      <br />
                      Submitted: {dateText(item.submitted_at)}
                    </td>
                    <td className="p-3">
                      {item.score !== undefined ? (
                        <>
                          {item.score}/{item.total_marks} · {item.percentage}%
                          <br />
                          Grade {item.grade} ·{" "}
                          {item.passed ? "Passed" : "Not passed"}
                        </>
                      ) : (
                        "Not yet graded"
                      )}
                    </td>
                    <td className="p-3">
                      {item.released ? (
                        "Released"
                      ) : item.score !== undefined ? (
                        <button
                          className={buttonClass}
                          disabled={busy}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "Release this result to the candidate?",
                              )
                            )
                              return;
                            setBusy(true);
                            try {
                              await apiRequest(
                                `/exams/staff/attempts/${item.attempt.id}/release/`,
                                { method: "POST", body: "{}" },
                              );
                              await loadAttempts(attemptPage);
                            } catch (reason) {
                              fail(reason);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Release result
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              className={buttonClass}
              disabled={attemptPage <= 1}
              onClick={() => void loadAttempts(attemptPage - 1).catch(fail)}
            >
              Previous
            </button>
            <button
              className={buttonClass}
              disabled={!moreAttempts}
              onClick={() => void loadAttempts(attemptPage + 1).catch(fail)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {review && (
        <Panel title={`Attempt review — ${review.student_email}`} open>
          <button className={buttonClass} onClick={() => setReview(null)}>
            Close review
          </button>
          {review.questions.map((item, index) => (
            <article className="border-b py-4" key={item.id}>
              <h3 className="font-semibold">
                {index + 1}. {item.text}
              </h3>
              <p className="mt-2 text-sm">
                Selected:{" "}
                {item.options.find(
                  (option) => option.id === item.selected_option,
                )?.text || "Unanswered"}
              </p>
              {item.correct_option && (
                <p className="text-sm">
                  Correct:{" "}
                  {
                    item.options.find(
                      (option) => option.id === item.correct_option,
                    )?.text
                  }
                </p>
              )}
            </article>
          ))}
          <h3 className="mt-5 font-semibold">Audit trail</h3>
          <ol className="max-h-64 overflow-auto text-xs">
            {review.events.map((event, index) => (
              <li className="py-1" key={index}>
                {dateText(event.timestamp)} · {event.event}
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
