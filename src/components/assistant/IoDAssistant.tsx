"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getPublishedCmsPage } from "@/lib/api/cms";

type AssistantAnswer = { id: string; question: string; answer: string; href: string; linkLabel: string };
type Message = { id: string; from: "assistant" | "visitor"; text: string; answer?: AssistantAnswer };

const initialAnswers: AssistantAnswer[] = [
  { id: "membership", question: "How do I become a member?", answer: "You can review membership categories and submit an application online. The team will guide you through the next steps after your application is received.", href: "/membership/apply", linkLabel: "Apply for membership" },
  { id: "training", question: "Which professional development programmes are available?", answer: "IoD-Gh offers professional development programmes and continuing professional development opportunities for directors and leaders.", href: "/training", linkLabel: "Explore professional development" },
  { id: "events", question: "What events are coming up?", answer: "Our Events page lists current governance conversations, forums and networking opportunities.", href: "/events", linkLabel: "View upcoming events" },
  { id: "fees", question: "Where can I find membership fees?", answer: "Membership categories and the current fee information are available on the Membership pages.", href: "/membership", linkLabel: "Explore membership" },
  { id: "resources", question: "Where can I find governance resources?", answer: "The Knowledge Centre contains IoD-Gh reports, research and practical resources for directors.", href: "/knowledge", linkLabel: "Visit the Knowledge Centre" },
  { id: "contact", question: "How can I contact IoD-Gh?", answer: "You can send an enquiry through our contact page and the team will connect you with the right person.", href: "/contact", linkLabel: "Contact IoD-Gh" },
];

function validHref(value: unknown) {
  return typeof value === "string" && (/^\/(?!\/)/.test(value.trim()) || /^https?:\/\//i.test(value.trim())) ? value.trim() : "";
}

function answersFromPage(page: Awaited<ReturnType<typeof getPublishedCmsPage>>): AssistantAnswer[] {
  return page.revision.sections.filter((section) => section.section_type === "faq" && section.is_enabled).flatMap((section, sectionIndex) => {
    const items = Array.isArray(section.data.items) ? section.data.items : [];
    return items.flatMap((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const item = value as Record<string, unknown>;
      const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
      const question = typeof item.title === "string" ? item.title.trim() : "";
      const answer = typeof item.description === "string" ? item.description.trim() : "";
      if (!question || !answer) return [];
      return [{ id: typeof item.id === "string" ? item.id : `answer-${sectionIndex}-${index}`, question, answer, href: validHref(item.href) || validHref(metadata.href), linkLabel: typeof metadata.link_label === "string" && metadata.link_label.trim() ? metadata.link_label.trim() : "Learn more" }];
    });
  });
}

function words(value: string) {
  return Array.from(new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) || []));
}

function findAnswer(question: string, answers: AssistantAnswer[]) {
  const query = words(question);
  return answers.map((answer) => ({ answer, score: words(`${answer.question} ${answer.answer}`).filter((word) => query.includes(word)).length })).sort((a, b) => b.score - a.score)[0];
}

export function IoDAssistant() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", from: "assistant", text: "Hello — I’m IoD Assist. Ask me about membership, professional development, events or governance resources." }]);
  const messageNumber = useRef(1);

  useEffect(() => {
    let active = true;
    getPublishedCmsPage("site-assistant").then((page) => {
      const cmsAnswers = answersFromPage(page);
      if (active && cmsAnswers.length) setAnswers(cmsAnswers);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const suggestions = useMemo(() => answers.slice(0, 4), [answers]);
  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const match = findAnswer(text, answers);
    const questionId = `question-${messageNumber.current++}`;
    const answerId = `answer-${messageNumber.current++}`;
    const reply: Message = match?.score ? { id: answerId, from: "assistant", text: match.answer.answer, answer: match.answer } : { id: answerId, from: "assistant", text: "I don’t have an approved answer for that yet. Our team can help with your enquiry.", answer: initialAnswers.find((answer) => answer.id === "contact") };
    setMessages((current) => [...current, { id: questionId, from: "visitor", text }, reply]);
    setInput("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); ask(input); };

  return <div className="fixed bottom-20 right-5 z-40 sm:bottom-7 sm:right-24">
    {open && <section id="iod-assistant" role="dialog" aria-modal="false" aria-label="IoD Assist" className="absolute bottom-16 right-0 flex h-[min(36rem,calc(100vh-9rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-2xl"><header className="bg-[var(--color-ink)] px-5 py-4 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.14em] text-[var(--color-gold-light)]">IoD-Gh digital assistant</p><h2 className="mt-1 font-serif text-2xl">IoD Assist</h2><p className="mt-1 text-xs text-[var(--color-mist)]">Answers from our approved knowledge base.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-xl transition hover:bg-white hover:text-[var(--color-ink)]" aria-label="Close IoD Assist">×</button></div></header><div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[var(--color-paper)] p-4" aria-live="polite">{messages.map((message) => <div key={message.id} className={message.from === "visitor" ? "ml-9 text-right" : "mr-5"}><div className={`inline-block max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-6 ${message.from === "visitor" ? "bg-[var(--color-accent-dark)] text-white" : "bg-white text-[var(--color-ink)] shadow-sm"}`}><p>{message.text}</p>{message.answer?.href && <a href={message.answer.href} className="mt-3 inline-flex border-b border-current pb-0.5 text-xs font-bold" onClick={() => setOpen(false)}>{message.answer.linkLabel}</a>}</div></div>)}{messages.length === 1 && <div><p className="mb-2 text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">POPULAR QUESTIONS</p><div className="flex flex-wrap gap-2">{suggestions.map((answer) => <button key={answer.id} type="button" onClick={() => ask(answer.question)} className="rounded-full border border-[var(--color-line)] bg-white px-3 py-2 text-left text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-warm-white)]">{answer.question}</button>)}</div></div>}</div><form onSubmit={submit} className="border-t border-[var(--color-line)] bg-white p-3"><label className="sr-only" htmlFor="iod-assistant-question">Ask IoD Assist a question</label><div className="flex gap-2"><input id="iod-assistant-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question…" className="min-w-0 flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent-dark)]" /><button type="submit" className="rounded-lg bg-[var(--color-ink)] px-4 text-sm font-bold text-white transition hover:bg-[var(--color-accent-dark)]">Send</button></div></form></section>}
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="iod-assistant" aria-label={open ? "Close IoD Assist" : "Open IoD Assist"} title="Ask IoD Assist" className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-ink)] text-white shadow-lg transition hover:scale-105 hover:bg-[var(--color-accent-dark)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent-dark)]"><AssistantIcon /><span className="sr-only">Ask IoD Assist</span></button>
  </div>;
}

function AssistantIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-[1.8]"><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 20l2-4.1A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeLinecap="round" strokeWidth="2.8" /></svg>;
}
