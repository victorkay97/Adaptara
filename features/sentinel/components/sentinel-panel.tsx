"use client";

import { useRef, useState } from "react";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import { sentinelContextFingerprint } from "../context";
import type { SentinelAssessment } from "../types";

type ScanState = { contextKey: string; status: "scanning" | "error" } | null;
export const sentinelCompletionForContext = <T,>(started: string, current: string, value: T): T | null => started === current ? value : null;

export function SentinelPanel({ snapshot, assessment, onAssessmentChange }: { snapshot: PortfolioSnapshot; assessment: SentinelAssessment | null; onAssessmentChange: (assessment: SentinelAssessment, contextKey: string) => void }) {
  const [request, setRequest] = useState<ScanState>(null);
  const contextKey = sentinelContextFingerprint(snapshot); const contextRef = useRef(contextKey);
  // eslint-disable-next-line react-hooks/refs
  contextRef.current = contextKey;
  const status = request?.contextKey === contextKey ? request.status : "idle";
  async function scan() {
    const started = contextKey; setRequest({ contextKey: started, status: "scanning" });
    try {
      const response = await fetch("/api/sentinel/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetIds: snapshot.positions.map((item) => item.asset.id) }) });
      const data = await response.json() as { assessment?: SentinelAssessment };
      if (!sentinelCompletionForContext(started, contextRef.current, data)) return;
      if (!response.ok || !data.assessment) { setRequest({ contextKey: started, status: "error" }); return; }
      onAssessmentChange(data.assessment, started); setRequest(null);
    } catch { if (sentinelCompletionForContext(started, contextRef.current, true)) setRequest({ contextKey: started, status: "error" }); }
  }
  return <section className="mt-6 rounded-2xl border border-[#d4b56b] bg-[#fffaf0] p-5" aria-label="Adaptara Sentinel">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a621d]">Adaptara Sentinel</p><h3 className="mt-2 text-xl font-semibold">Event monitoring</h3></div><span className="rounded-full border border-[#d4b56b] px-3 py-1 text-xs font-bold">Demo event feed · non-live</span></div>
    <p className="mt-2 text-sm text-[var(--muted)]">User-triggered deterministic event-risk screening. Sentinel cannot call MARA, create a plan, or execute a transaction.</p>
    <button type="button" onClick={scan} disabled={status === "scanning"} className="mt-4 rounded-xl bg-[#8a621d] px-4 py-2 font-semibold text-white disabled:opacity-50">{status === "scanning" ? "Scanning demo events…" : "Run Sentinel Scan"}</button>
    {status === "error" ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Sentinel scan is unavailable. No zero-risk result was substituted.</p> : null}
    {assessment ? <div className="mt-5 grid gap-4"><p className="text-xs text-[var(--muted)]">Scanned {new Date(assessment.asOf).toLocaleString()} · Feed: {assessment.feedMode} · Execution authority: {assessment.executionAuthority}</p>
      <div className="grid gap-2 sm:grid-cols-2">{assessment.assetStress.map((item) => <div key={item.assetId} className="rounded-xl bg-white/80 p-3 text-sm"><strong>{item.assetId}</strong><span className="float-right">{item.sentinelEventStressBps} BPS</span></div>)}</div>
      <div className="grid gap-3">{assessment.eventGroups.map((group) => <article key={group.eventKey} className="rounded-xl border border-[#ead9af] bg-white/80 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{group.eventKey}</strong><span className="text-xs font-bold uppercase">{group.severity}</span></div><p className="mt-2 text-sm">{group.eventType.replaceAll("_", " ")} · {group.sourceCount} distinct source{group.sourceCount === 1 ? "" : "s"} · {group.affectedAssetIds.join(", ")}</p>{group.assetStatuses.map((item) => <p key={item.assetId} className="mt-2 text-xs text-[var(--muted)]"><strong>{item.assetId}: {item.status}</strong> · {item.status === "corroborated-active" ? "Eligible to influence the deterministic market/event stress factor." : item.status === "uncorroborated" ? "Informational only · does not affect deterministic risk." : "Expired · no current risk influence."}</p>)}</article>)}</div>
    </div> : <p className="mt-4 text-sm text-[var(--muted)]">No current-context scan result. Run a scan explicitly.</p>}
  </section>;
}
