"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getPublishedCmsPage } from "@/lib/api/cms";

type AssistantAnswer = { id: string; question: string; answer: string; href: string; linkLabel: string; keywords: string[] };
type Message = { id: string; from: "assistant" | "visitor"; text: string; answer?: AssistantAnswer; suggestions?: AssistantAnswer[] };

const initialAnswers: AssistantAnswer[] = [
  { id: "membership", question: "How do I become a member?", answer: "You can review the membership categories and submit an application online. The team will guide you through the next steps after your application is received.", href: "/membership/apply", linkLabel: "Apply for membership", keywords: ["membership", "member", "join", "apply", "application", "renewal"] },
  { id: "training", question: "Which professional development programmes are available?", answer: "IoD-Gh offers professional development programmes and continuing professional development opportunities for directors and leaders.", href: "/training", linkLabel: "Explore professional development", keywords: ["training", "course", "courses", "programme", "program", "cpd", "seminar", "workshop", "learning"] },
  { id: "events", question: "What events are coming up?", answer: "Our Events page lists current governance conversations, forums and networking opportunities.", href: "/events", linkLabel: "View upcoming events", keywords: ["event", "events", "conference", "forum", "networking", "upcoming"] },
  { id: "fees", question: "Where can I find membership fees?", answer: "Membership categories and current fee information are available on the Membership pages.", href: "/membership", linkLabel: "Explore membership", keywords: ["fees", "fee", "cost", "price", "pricing", "payment", "subscription"] },
  { id: "resources", question: "Where can I find governance resources?", answer: "The Knowledge Centre contains IoD-Gh reports, research and practical resources for directors.", href: "/knowledge", linkLabel: "Visit the Knowledge Centre", keywords: ["resource", "resources", "research", "report", "reports", "knowledge", "governance", "guide"] },
  { id: "contact", question: "How can I contact IoD-Gh?", answer: "You can send an enquiry through our contact page and the team will connect you with the right person.", href: "/contact", linkLabel: "Contact IoD-Gh", keywords: ["contact", "call", "email", "phone", "speak", "help", "support", "office"] },
];

const ignoredWords = new Set(["about", "after", "and", "are", "can", "could", "does", "for", "from", "have", "how", "i", "iod", "is", "me", "my", "of", "on", "please", "the", "to", "what", "where", "which", "with", "you", "your"]);

function validHref(value: unknown) {
  return typeof value === "string" && (/^\/(?!\/)/.test(value.trim()) || /^https?:\/\//i.test(value.trim())) ? value.trim() : "";
}

function terms(value: string) {
  return Array.from(new Set((value.toLowerCase().match(/[a-z0-9]{2,}/g) || []).filter((word) => !ignoredWords.has(word))));
}

function keywordList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").flatMap((item) => terms(item));
  return typeof value === "string" ? terms(value) : [];
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
      const id = typeof item.id === "string" ? item.id : `answer-${sectionIndex}-${index}`;
      const defaultKeywords = initialAnswers.find((entry) => entry.id === id)?.keywords || [];
      return [{ id, question, answer, href: validHref(item.href) || validHref(metadata.href), linkLabel: typeof metadata.link_label === "string" && metadata.link_label.trim() ? metadata.link_label.trim() : "Learn more", keywords: Array.from(new Set([...defaultKeywords, ...keywordList(metadata.keywords)])) }];
    });
  });
}

export function matchAssistantAnswer(question: string, answers: AssistantAnswer[] = initialAnswers) {
  const query = terms(question);
  const exactQuestion = question.trim().toLowerCase();
  return answers.map((answer) => {
    if (answer.question.toLowerCase() === exactQuestion) return { answer, score: 100 };
    const corpus = new Set(terms(`${answer.question} ${answer.answer}`).concat(answer.keywords));
    const directMatches = query.filter((word) => corpus.has(word));
    const keywordMatches = query.filter((word) => answer.keywords.includes(word));
    return { answer, score: directMatches.length + keywordMatches.length * 3 };
  }).sort((a, b) => b.score - a.score)[0];
}

function AssistantAvatar({ small = false }: { small?: boolean }) {
  return <span className={`grid shrink-0 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-ink)] ${small ? "h-7 w-7" : "h-11 w-11"}`} aria-hidden="true"><svg viewBox="0 0 24 24" className={small ? "h-4 w-4 fill-none stroke-current stroke-[1.8]" : "h-6 w-6 fill-none stroke-current stroke-[1.8]"}><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 20l2-4.1A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeLinecap="round" strokeWidth="2.8" /></svg></span>;
}

export function IoDAssistant() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", from: "assistant", text: "Hello, I am IoD Assist. I can help you find the right place for membership, training, events and governance resources." }]);
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
  const replyWith = (answer: AssistantAnswer) => {
    const questionId = `question-${messageNumber.current++}`;
    const answerId = `answer-${messageNumber.current++}`;
    setMessages((current) => [...current, { id: questionId, from: "visitor", text: answer.question }, { id: answerId, from: "assistant", text: answer.answer, answer }]);
  };
  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const match = matchAssistantAnswer(text, answers);
    const questionId = `question-${messageNumber.current++}`;
    const answerId = `answer-${messageNumber.current++}`;
    const reply: Message = match && match.score >= 2 ? { id: answerId, from: "assistant", text: match.answer.answer, answer: match.answer } : { id: answerId, from: "assistant", text: "I do not want to guess and give you the wrong information. Try one of these topics, or send your question to our team.", answer: answers.find((answer) => answer.id === "contact") || initialAnswers[5], suggestions: suggestions.slice(0, 3) };
    setMessages((current) => [...current, { id: questionId, from: "visitor", text }, reply]);
    setInput("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); ask(input); };

  return <div className="fixed bottom-20 right-5 z-40 sm:bottom-7 sm:right-24">
    {open && <section id="iod-assistant" role="dialog" aria-modal="false" aria-label="IoD Assist" className="absolute bottom-16 right-0 flex h-[min(39rem,calc(100vh-9rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-[var(--color-line)] bg-white shadow-2xl"><header className="relative overflow-hidden bg-[var(--color-ink)] px-5 py-5 text-white"><span className="pointer-events-none absolute -right-6 -top-9 font-serif text-9xl leading-none text-white/[0.05]">IoD</span><div className="relative flex items-start justify-between gap-4"><div className="flex items-center gap-3"><AssistantAvatar /><div><p className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.14em] text-[var(--color-gold-light)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />ONLINE NOW</p><h2 className="mt-1 font-serif text-2xl">IoD Assist</h2></div></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-xl transition hover:bg-white hover:text-[var(--color-ink)]" aria-label="Close IoD Assist">&times;</button></div></header><div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-paper)] p-4" aria-live="polite"><div className="space-y-4">{messages.map((message) => <div key={message.id} className={message.from === "visitor" ? "ml-12 text-right" : "mr-4"}>{message.from === "assistant" && <div className="mb-1 flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.1em] text-[var(--color-slate)]"><AssistantAvatar small />IOD ASSIST</div>}<div className={`inline-block max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-6 ${message.from === "visitor" ? "rounded-br-sm bg-[var(--color-accent-dark)] text-white" : "rounded-tl-sm bg-white text-[var(--color-ink)] shadow-sm"}`}><p>{message.text}</p>{message.answer?.href && <a href={message.answer.href} className="mt-3 inline-flex items-center gap-2 border-b border-current pb-0.5 text-xs font-bold" onClick={() => setOpen(false)}>{message.answer.linkLabel} <span aria-hidden="true">→</span></a>}</div>{message.suggestions && <div className="mt-3 grid gap-2">{message.suggestions.map((answer) => <button key={answer.id} type="button" onClick={() => replyWith(answer)} className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-left text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-gold)] hover:bg-[var(--color-warm-white)]">{answer.question}</button>)}</div>}</div>)}</div>{messages.length === 1 && <div className="mt-6"><p className="mb-3 text-[0.65rem] font-bold tracking-[0.12em] text-[var(--color-slate)]">WHAT CAN I HELP WITH?</p><div className="grid grid-cols-2 gap-2">{suggestions.map((answer) => <button key={answer.id} type="button" onClick={() => replyWith(answer)} className="min-h-20 rounded-xl border border-[var(--color-line)] bg-white p-3 text-left text-xs font-semibold leading-5 text-[var(--color-ink)] transition hover:-translate-y-0.5 hover:border-[var(--color-gold)] hover:shadow-sm motion-reduce:transform-none">{answer.question}</button>)}</div></div>}</div><form onSubmit={submit} className="border-t border-[var(--color-line)] bg-white p-3"><label className="sr-only" htmlFor="iod-assistant-question">Ask IoD Assist a question</label><div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] p-1.5 focus-within:border-[var(--color-accent-dark)]"><input id="iod-assistant-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question..." className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" /><button type="submit" className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-ink)] text-white transition hover:bg-[var(--color-accent-dark)]" aria-label="Send question"><span aria-hidden="true">→</span></button></div><p className="px-2 pt-2 text-[0.65rem] text-[var(--color-slate)]">Answers are based on IoD-Gh&apos;s approved information.</p></form></section>}
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="iod-assistant" aria-label={open ? "Close IoD Assist" : "Open IoD Assist"} title="Ask IoD Assist" className="group flex h-12 items-center gap-2 rounded-full bg-[var(--color-ink)] pl-3 pr-4 text-white shadow-lg transition hover:scale-105 hover:bg-[var(--color-accent-dark)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent-dark)]"><AssistantAvatar small /><span className="hidden text-sm font-bold sm:inline">Ask IoD Assist</span><span className="sr-only">Ask IoD Assist</span></button>
  </div>;
}
