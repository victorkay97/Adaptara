"use client";

import { useMemo, useState } from "react";
import type { OnchainConstitution } from "@/features/constitution/types";
import { formatBpsAsPercent } from "@/features/constitution/money-or-bps";
import type { MaraAnalysis, MaraGroundingFact } from "@/features/mara/types";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";
import { maraContextFingerprint } from "@/features/mara/context";
import { createAdaptationPlan } from "../engine";
import type { AdaptationPlan } from "../types";

export const adaptationContextKey = (snapshot: PortfolioSnapshot, assessment: PortfolioRiskAssessment, constitution?: OnchainConstitution, analysis?: MaraAnalysis | null) =>
  `${maraContextFingerprint(snapshot, assessment)}:${constitution?.vaultAddress ?? "none"}:${constitution?.blockNumber.toString() ?? "none"}:${analysis ? JSON.stringify(analysis.proposals) : "none"}`;
export const canCreateAdaptation = (snapshot: PortfolioSnapshot, assessment: PortfolioRiskAssessment, constitution?: OnchainConstitution, analysis?: MaraAnalysis | null): boolean => snapshot.source === "vault" && snapshot.valuationStatus === "valued" && assessment.status === "assessed" && assessment.reason === "complete" && Boolean(analysis && constitution?.source === "onchain");

export function AdaptationPlanPanel({ snapshot, assessment, constitution, analysis, facts }: { snapshot: PortfolioSnapshot; assessment: PortfolioRiskAssessment; constitution?: OnchainConstitution; analysis: MaraAnalysis | null; facts: MaraGroundingFact[] }) {
  const [planned, setPlanned] = useState<{ contextKey: string; plan: AdaptationPlan } | null>(null);
  const contextKey = adaptationContextKey(snapshot, assessment, constitution, analysis);
  const plan = planned?.contextKey === contextKey ? planned.plan : null;
  const canCreate = canCreateAdaptation(snapshot, assessment, constitution, analysis);
  const evidence = useMemo(() => new Map(facts.map((fact) => [fact.id, fact.label])), [facts]);
  const donor = plan?.allocations.find((item) => item.deltaBps < 0)?.assetId;
  const receiver = plan?.allocations.find((item) => item.deltaBps > 0)?.assetId;
  const create = () => {
    if (!analysis || !constitution) return;
    setPlanned({ contextKey, plan: createAdaptationPlan({ snapshot, riskAssessment: assessment, constitution, maraAnalysis: analysis }) });
  };
  return <section className="mt-6 rounded-2xl border border-[#9db9a8] bg-[#f2f8f4] p-5" aria-label="Adaptation Plan">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#236a4a]">Deterministic Adaptation Engine</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Adaptation Plan</h3><span className="rounded-full border border-[#9db9a8] px-3 py-1 text-xs font-bold">Simulation · not executed</span></div>
    <p className="mt-2 text-sm text-[var(--muted)]">MARA supplies direction only. Adaptara deterministically selects exact bounded allocation BPS under the active onchain constitution.</p>
    {!analysis ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Generate a current MARA advisory before creating an adaptation simulation.</p> : !constitution ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">An active onchain Financial Constitution is required. Draft policy cannot authorize an operational plan.</p> : null}
    <button type="button" disabled={!canCreate} onClick={create} className="mt-4 rounded-xl bg-[#236a4a] px-4 py-2 font-semibold text-white disabled:opacity-40">Generate Adaptation Simulation</button>
    {plan ? <div className="mt-5 border-t border-[#cbdcd1] pt-5">
      <p className="text-sm font-bold">Status: {plan.status}</p>
      {plan.status === "blocked" ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{plan.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</div> : null}
      {plan.status === "no-action" ? <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm">No allocation change proposed. MARA&apos;s advisory direction did not require a deterministic portfolio movement.</p> : null}
      {plan.status === "proposed" ? <>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-[var(--muted)]">Selected MARA direction</dt><dd className="font-bold">{plan.selectedAction}</dd></div><div><dt className="text-[var(--muted)]">Donor asset</dt><dd className="font-bold">{donor}</dd></div><div><dt className="text-[var(--muted)]">Receiver asset</dt><dd className="font-bold">{receiver}</dd></div></dl>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-[var(--muted)]">Plan movement</dt><dd className="font-bold">{formatBpsAsPercent(plan.reallocationBps)}% ({plan.reallocationBps} BPS)</dd></div><div><dt className="text-[var(--muted)]">Adaptara safety step</dt><dd className="font-bold">{formatBpsAsPercent(plan.maximumAdaptationStepBps)}%</dd></div><div><dt className="text-[var(--muted)]">Constitution ceiling used</dt><dd className="font-bold">{formatBpsAsPercent(plan.constitutionReallocationLimitBps!)}%</dd></div></dl>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Asset</th><th className="p-2">Current</th><th className="p-2">Target</th><th className="p-2">Delta</th></tr></thead><tbody>{plan.allocations.map((item) => <tr key={item.assetId} className="border-t border-[#cbdcd1]"><td className="p-2 font-semibold">{item.assetId}</td><td className="p-2">{formatBpsAsPercent(item.currentAllocationBps)}%</td><td className="p-2">{formatBpsAsPercent(item.targetAllocationBps)}%</td><td className="p-2">{item.deltaBps > 0 ? "+" : ""}{item.deltaBps} BPS</td></tr>)}</tbody></table></div>
        <p className="mt-3 text-sm"><strong>Post-plan constitution:</strong> {plan.postPlanCompliance?.status}</p>
        {plan.maraEvidenceRefs.length ? <p className="mt-2 text-xs text-[var(--muted)]">MARA evidence: {plan.maraEvidenceRefs.map((ref) => evidence.get(ref) ?? ref).join(" · ")}</p> : null}
      </> : null}
      <p className="mt-4 text-xs text-[var(--muted)]">Portfolio block {plan.portfolioBlockNumber?.toString() ?? "unavailable"} · Constitution block {plan.constitutionBlockNumber?.toString() ?? "unavailable"} · Execution authority: none</p>
      <p className="mt-2 text-xs text-[var(--muted)]">Cumulative daily execution accounting is not implemented yet. Future execution must reread authoritative chain state.</p>
    </div> : null}
  </section>;
}
