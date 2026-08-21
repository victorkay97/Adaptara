"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";
import { buildMaraContext, maraContextFingerprint } from "../context";
import type { MaraAnalysis, MaraGroundingFact } from "../types";
import { ObservationAwareness } from "@/features/observation/components/observation-awareness";

const evidenceLabel = (ref: string, facts: MaraGroundingFact[]) => facts.find((fact) => fact.id === ref)?.label ?? "Grounding evidence";
const ACTION_LABELS = { maintain: "Maintain and monitor", review: "Review exposure", increase_reserve: "Evaluate higher reserves", reduce_exposure: "Evaluate lower exposure", diversify: "Evaluate diversification" } as const;
export const acceptMaraResultForContext = (startedContext: string, currentContext: string, analysis: MaraAnalysis): MaraAnalysis | null => startedContext === currentContext ? analysis : null;
export type MaraRequestStatus = "idle" | "loading" | "error" | "config";
export interface MaraRequestState { contextKey: string; status: MaraRequestStatus }
export const maraRequestStatusForContext = (request: MaraRequestState | null, contextKey: string): MaraRequestStatus => request?.contextKey === contextKey ? request.status : "idle";
export const maraCompletionForContext = <T,>(startedContext: string, currentContext: string, value: T): T | null => startedContext === currentContext ? value : null;

export function MaraPanel({ snapshot, assessment, onAnalysisChange }: { snapshot: PortfolioSnapshot; assessment: PortfolioRiskAssessment; onAnalysisChange?: (analysis: MaraAnalysis | null, contextKey: string) => void }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<{ contextKey: string; analysis: MaraAnalysis } | null>(null);
  const [request, setRequest] = useState<MaraRequestState | null>(null);
  const context = buildMaraContext(snapshot, assessment);
  const contextKey = maraContextFingerprint(snapshot, assessment);
  const contextRef = useRef(contextKey);
  // The latest rendered authority context must be visible before effects run.
  // eslint-disable-next-line react-hooks/refs
  contextRef.current = contextKey;
  useEffect(() => { onAnalysisChange?.(null, contextKey); }, [contextKey, onAnalysisChange]);
  useEffect(() => { const receiveSuggestion = (event: Event) => setQuestion((event as CustomEvent<string>).detail); window.addEventListener("adaptara:mara-question", receiveSuggestion); return () => window.removeEventListener("adaptara:mara-question", receiveSuggestion); }, []);
  const analysis = result?.contextKey === contextKey ? result.analysis : null;
  const state = maraRequestStatusForContext(request, contextKey);
  const complete = snapshot.valuationStatus === "valued" && assessment.status === "assessed";
  async function analyze() {
    const startedContext = contextKey;
    setRequest({ contextKey: startedContext, status: "loading" }); setResult(null); onAnalysisChange?.(null, contextKey);
    try {
      const response = await fetch("/api/mara/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ context, question: question.trim() || null }) });
      const data = await response.json() as { analysis?: MaraAnalysis; code?: string };
      const currentData = maraCompletionForContext(startedContext, contextRef.current, data);
      if (!currentData) return;
      if (!response.ok || !currentData.analysis) { setRequest({ contextKey: startedContext, status: currentData.code === "not-configured" ? "config" : "error" }); return; }
      const accepted = acceptMaraResultForContext(startedContext, contextRef.current, currentData.analysis);
      if (!accepted) return;
      setResult({ contextKey: startedContext, analysis: accepted }); onAnalysisChange?.(accepted, startedContext); setRequest({ contextKey: startedContext, status: "idle" });
    } catch { if (maraCompletionForContext(startedContext, contextRef.current, "error")) setRequest({ contextKey: startedContext, status: "error" }); }
  }
  return <section className="mt-6 rounded-2xl border border-[#b9c9e8] bg-[#f5f7fc] p-5" aria-label="MARA">
    <ObservationAwareness />
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#405f9b]">MARA</p><h3 className="mt-2 text-xl font-semibold">Market Adaptive Risk Agent</h3><p className="mt-2 text-sm text-[var(--muted)]">AI interpretation of Adaptara&apos;s deterministic portfolio and risk data.</p></div>
    <p className="mt-4 rounded-xl bg-white/80 p-3 text-sm"><strong>AI-generated interpretation — advisory only.</strong> Deterministic portfolio and risk calculations come from Adaptara&apos;s Portfolio and Risk engines.</p>
    {!complete ? <p className="mt-4 text-sm text-amber-900">MARA analysis is unavailable until deterministic portfolio valuation and risk assessment are complete.</p> : <><label className="mt-5 block text-sm font-semibold" htmlFor={`mara-question-${snapshot.source}`}>Optional portfolio question</label><textarea id={`mara-question-${snapshot.source}`} maxLength={1000} value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm" placeholder="What is driving most of my current risk?" /><button type="button" onClick={analyze} disabled={state === "loading"} className="mt-3 rounded-full bg-[#294f3b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{state === "loading" ? "MARA is analyzing…" : "Analyze with MARA"}</button></>}
    {state === "config" ? <p role="status" className="mt-4 text-sm text-amber-900">MARA is not configured on this server.</p> : null}
    {state === "error" ? <p role="alert" className="mt-4 text-sm text-red-800">MARA analysis is temporarily unavailable. Portfolio and Risk Intelligence remain authoritative.</p> : null}
    {analysis ? <div className="mt-6 grid gap-5"><div><h4 className="font-semibold">MARA Summary</h4><p className="mt-2 text-sm">{analysis.summary}</p></div><div><h4 className="font-semibold">Key Observations</h4><div className="mt-2 grid gap-2">{analysis.observations.map((item, index) => <article className="rounded-xl bg-white/80 p-3" key={`${item.type}-${index}`}><p className="text-sm">{item.text}</p><p className="mt-2 text-xs text-[var(--muted)]">Evidence: {item.evidenceRefs.map((ref) => evidenceLabel(ref, context.facts)).join(" · ")}</p></article>)}</div></div><div><h4 className="font-semibold">Adaptation Ideas</h4><div className="mt-2 grid gap-2">{analysis.proposals.map((item, index) => <article className="rounded-xl bg-white/80 p-3" key={`${item.action}-${index}`}><p className="font-semibold">{ACTION_LABELS[item.action]}</p><p className="mt-1 text-sm">{item.rationale}</p><p className="mt-2 text-xs text-[var(--muted)]">Evidence: {item.evidenceRefs.map((ref) => evidenceLabel(ref, context.facts)).join(" · ")} · Advisory only</p></article>)}</div></div><div><h4 className="font-semibold">Uncertainties</h4>{analysis.uncertainties.length ? <ul className="mt-2 list-disc pl-5 text-sm">{analysis.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">No additional uncertainty was identified beyond the supplied data limitations.</p>}</div></div> : null}
  </section>;
}
