"use client";

import { useEffect, useState } from "react";
import { MingcuteIcon } from "@/components/ui/mingcute-icon";
import type { AskMaraContext } from "./context";
import { answerAskMara, type AskMaraAnswer } from "./respond";

const suggestions = {
  Home: ["Explain this page", "What does Defensive mean?", "Why is my portfolio compliant?"],
  Portfolio: ["What do I own?", "What is reserve?", "What's driving my risk?"],
  Vaults: ["How is my Vault governed?", "What does Approval Required mean?", "Why is V1 limited to one Vault?"],
  Activity: ["What counts as verified activity?", "Why is activity empty?", "How are blocked actions shown?"],
  MARA: ["What can MARA actually do?", "What does simulation mean?", "Explain this page"],
  Safety: ["What is reserve protection?", "Who has authority?", "Why is my portfolio compliant?"],
} as const;

export function ExplainWithMara({ question }: { question: string }) { return <button type="button" className="explain-mara" aria-label={`Ask MARA: ${question}`} onClick={() => window.dispatchEvent(new CustomEvent("adaptara:ask-mara", { detail: question }))}>?</button>; }

export function AskMara({ context }: { context: AskMaraContext }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<readonly { question: string; answer: AskMaraAnswer }[]>([]);
  const ask = (question: string) => { const clean = question.trim(); if (!clean) return; setOpen(true); setMessages((current) => [...current, { question: clean, answer: answerAskMara(clean, context) }]); setInput(""); };
  useEffect(() => { const openWithQuestion = (event: Event) => ask((event as CustomEvent<string>).detail); window.addEventListener("adaptara:ask-mara", openWithQuestion); return () => window.removeEventListener("adaptara:ask-mara", openWithQuestion); });
  return <><button type="button" className="ask-mara-launcher" aria-expanded={open} aria-controls="ask-mara-panel" onClick={() => setOpen(true)}><MingcuteIcon name="sparkles" size={15} /> Ask MARA</button>{open ? <div className="ask-mara-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside id="ask-mara-panel" className="ask-mara-panel" role="dialog" aria-modal="true" aria-labelledby="ask-mara-title"><header><div><p>MARA</p><h2 id="ask-mara-title">Ask about what you see</h2></div><button type="button" aria-label="Close Ask MARA" onClick={() => setOpen(false)}>×</button></header><p className="ask-mara-intro">Hi. I can explain Adaptara terms and the authoritative portfolio facts available on this page. I cannot move money or sign.</p><div className="ask-mara-suggestions">{suggestions[context.destination].map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div><div className="ask-mara-conversation" aria-live="polite">{messages.length ? messages.map((message, index) => <article key={`${message.question}-${index}`}><p className="ask-mara-question">You · {message.question}</p><h3>{message.answer.title}</h3><p>{message.answer.body}</p><small>{message.answer.provenance}</small></article>) : <p className="ask-mara-empty">Choose a question or ask for a bounded explanation.</p>}</div><form onSubmit={(event) => { event.preventDefault(); ask(input); }}><label htmlFor="ask-mara-input">Your question</label><div><input id="ask-mara-input" maxLength={500} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Explain this page" /><button type="submit">Send</button></div></form></aside></div> : null}</>;
}
