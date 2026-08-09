import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";
import type { MaraAnalysis, MaraContext, MaraGroundingFact } from "./types";

export interface ContextScopedMaraAnalysis { contextKey: string; analysis: MaraAnalysis }
export const maraAnalysisForContext = (result: ContextScopedMaraAnalysis | null, contextKey: string): MaraAnalysis | null => result?.contextKey === contextKey ? result.analysis : null;

export function buildMaraContext(snapshot: PortfolioSnapshot, risk: PortfolioRiskAssessment): MaraContext {
  const facts: MaraGroundingFact[] = [
    { id: "portfolio.valuation-status", category: "portfolio", label: "Valuation status", value: snapshot.valuationStatus, source: "portfolio-engine" },
    { id: "portfolio.risk.status", category: "risk", label: "Risk assessment status", value: risk.status, source: "risk-engine" },
  ];
  if (risk.portfolioRiskScoreBps !== null) facts.push({ id: "portfolio.risk.score", category: "risk", label: "Authoritative portfolio risk score (BPS)", value: String(risk.portfolioRiskScoreBps), source: "risk-engine" });
  if (risk.portfolioCurrentRiskTier) facts.push({ id: "portfolio.risk.current-tier", category: "risk", label: "Current portfolio risk tier", value: risk.portfolioCurrentRiskTier, source: "risk-engine" });
  for (const position of snapshot.positions.filter((item) => item.rawBalance !== null && item.rawBalance > 0n)) {
    const id = `asset.${position.asset.id}`;
    facts.push({ id: `${id}.symbol`, category: "asset", label: "Asset symbol", value: position.asset.symbol, source: "asset-catalog" }, { id: `${id}.baseline-tier`, category: "asset", label: "Baseline product risk tier", value: position.asset.baselineRiskTier, source: "asset-catalog" });
    if (position.allocationBps !== null) facts.push({ id: `${id}.allocation`, category: "portfolio", label: "Portfolio allocation (BPS)", value: String(position.allocationBps), source: "portfolio-engine" });
    const assessment = risk.assetAssessments.find((item) => item.assetId === position.asset.id);
    if (assessment) {
      facts.push({ id: `${id}.current-tier`, category: "risk", label: "Current calculated risk tier", value: assessment.currentRiskTier, source: "risk-engine" });
      for (const factor of assessment.factors) facts.push({ id: `${id}.risk.${factor.factorId}`, category: "factor", label: `${factor.factorId} risk factor contribution`, value: String(factor.weightedContributionBps), source: "risk-engine" });
    }
  }
  const limitations = [...new Set([...(snapshot.priceSources.length ? [`Portfolio reference prices are ${snapshot.priceSources.join("/")} data, not live market truth.`] : []), ...(risk.signalSources.length ? [`Risk signals are ${risk.signalSources.join("/")} data, not live market truth.`] : [])])];
  return { contextVersion: "phase-5.v1", portfolioSource: snapshot.source, portfolioStatus: snapshot.valuationStatus, riskStatus: risk.status, facts, limitations, capturedAt: snapshot.capturedAt, assessedAt: risk.assessedAt };
}

export function maraContextFingerprint(snapshot: PortfolioSnapshot, risk: PortfolioRiskAssessment): string {
  return JSON.stringify({
    source: snapshot.source,
    accountAddress: snapshot.accountAddress,
    chainId: snapshot.chainId,
    blockNumber: snapshot.blockNumber?.toString() ?? null,
    context: buildMaraContext(snapshot, risk),
  });
}
