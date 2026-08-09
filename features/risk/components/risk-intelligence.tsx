import { RISK_FACTOR_LABELS } from "../constants";
import { formatRiskScore } from "../tiers";
import type { PortfolioRiskAssessment, RiskSignalSource } from "../types";

const SOURCE_LABELS: Record<RiskSignalSource, string> = {
  demo: "Demo",
  fixture: "Fixture",
};

export function riskSourceLabel(sources: readonly RiskSignalSource[]): string {
  const labels = [...new Set(sources)].map((source) => SOURCE_LABELS[source]);
  return `${labels.join(" + ")} risk inputs · non-live`;
}

export function RiskIntelligence({ assessment, sentinelInfluence = false }: { assessment: PortfolioRiskAssessment; sentinelInfluence?: boolean }) {
  if (["portfolio-valuation-partial", "portfolio-valuation-unavailable", "no-meaningful-holdings"].includes(assessment.reason)) return <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white/70 p-5"><h3 className="text-xl font-semibold">Risk Intelligence</h3><p className="mt-3 text-sm text-[var(--muted)]">Risk assessment unavailable until portfolio valuation is complete and contains a meaningful holding.</p></section>;
  if (assessment.reason === "invalid-allocation") return <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"><h3 className="text-xl font-semibold">Risk Intelligence</h3><p className="mt-3 text-sm text-red-900">Risk assessment unavailable because portfolio allocation data failed validation.</p></section>;
  if (assessment.status !== "assessed") return <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="text-xl font-semibold">Risk Intelligence</h3><p className="mt-3 text-sm text-amber-900">Risk inputs incomplete. No complete portfolio score is available.</p>{assessment.unavailableAssets.length ? <p className="mt-2 text-sm text-amber-900">Missing coverage: {assessment.unavailableAssets.map((item) => item.assetId).join(", ")}</p> : null}</section>;
  const sourceLabel = riskSourceLabel(assessment.signalSources);
  return <section className="mt-6 rounded-2xl border border-[#bfd7c6] bg-[#f4f8f4] p-5" aria-label="Risk Intelligence">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#377657]">Risk Intelligence</p><h3 className="mt-2 text-xl font-semibold">Current deterministic risk profile</h3></div><p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{sourceLabel}</p></div>
    <dl className="mt-5 grid gap-3 sm:grid-cols-3"><div><dt className="text-xs text-[var(--muted)]">Portfolio risk score</dt><dd className="mt-1 text-2xl font-semibold">{formatRiskScore(assessment.portfolioRiskScoreBps!)} / 100</dd></div><div><dt className="text-xs text-[var(--muted)]">Current tier</dt><dd className="mt-1 text-2xl font-semibold">{assessment.portfolioCurrentRiskTier}</dd></div><div><dt className="text-xs text-[var(--muted)]">Risk-input source</dt><dd className="mt-1 font-semibold">{sourceLabel}</dd></div></dl>
    {sentinelInfluence ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Market/event stress includes the current Sentinel demo assessment.</p> : null}
    <div className="mt-5 grid gap-3">{assessment.assetAssessments.map((asset) => <article key={asset.assetId} className="rounded-xl border border-[var(--line)] bg-white/80 p-4"><div className="flex flex-wrap justify-between gap-3"><h4 className="font-semibold">{asset.assetId}</h4><p className="font-semibold">{formatRiskScore(asset.scoreBps)} / 100</p></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[var(--muted)]">Baseline</dt><dd className="font-semibold">{asset.baselineRiskTier}</dd></div><div><dt className="text-[var(--muted)]">Current</dt><dd className="font-semibold">{asset.currentRiskTier}</dd></div></dl><div className="mt-4 grid gap-2 text-sm">{asset.factors.map((factor) => <div key={factor.factorId} className="flex justify-between gap-4"><span>{RISK_FACTOR_LABELS[factor.factorId]}</span><span className="font-mono">{formatRiskScore(factor.weightedContributionBps)}</span></div>)}</div></article>)}</div>
    <p className="mt-4 text-xs text-[var(--muted)]">Current measured risk, not a price or return prediction. MARA may interpret this advisory intelligence only after an explicit user request; it cannot move funds.</p>
  </section>;
}
