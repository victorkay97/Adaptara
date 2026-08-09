import type { AssetPosition, PortfolioSnapshot } from "@/features/portfolio/types";
import { RISK_SCORE_MAX } from "./constants";
import { calculateAssetRisk } from "./scoring";
import { currentRiskTierForScore } from "./tiers";
import type { AssetRiskAssessment, ExternalRiskSignals, MissingAssetRiskAssessment, PortfolioRiskAssessment, RiskSignalProvider } from "./types";

const meaningfulPositions = (snapshot: PortfolioSnapshot): AssetPosition[] => snapshot.positions.filter((position) => position.rawBalance !== null && position.rawBalance > 0n);

export function calculatePortfolioRisk(snapshot: PortfolioSnapshot, signals: ReadonlyMap<string, ExternalRiskSignals | null>, assessedAt: string): PortfolioRiskAssessment {
  const empty = { assetAssessments: [] as AssetRiskAssessment[], unavailableAssets: [] as MissingAssetRiskAssessment[], signalSources: [], assessedAt };
  if (snapshot.valuationStatus !== "valued") return { ...empty, status: snapshot.valuationStatus === "partial" ? "partial" : "unavailable", portfolioRiskScoreBps: null, portfolioCurrentRiskTier: null, reason: snapshot.valuationStatus === "partial" ? "portfolio-valuation-partial" : "portfolio-valuation-unavailable" };
  const positions = meaningfulPositions(snapshot);
  if (!positions.length) return { ...empty, status: "unavailable", portfolioRiskScoreBps: null, portfolioCurrentRiskTier: null, reason: "no-meaningful-holdings" };
  if (positions.some((position) => position.allocationBps === null) || positions.reduce((sum, position) => sum + (position.allocationBps ?? 0), 0) !== RISK_SCORE_MAX) return { ...empty, status: "unavailable", portfolioRiskScoreBps: null, portfolioCurrentRiskTier: null, reason: "invalid-allocation" };
  const assetAssessments: AssetRiskAssessment[] = [];
  const unavailableAssets: MissingAssetRiskAssessment[] = [];
  for (const position of positions) {
    const externalSignals = signals.get(position.asset.id) ?? null;
    if (!externalSignals) unavailableAssets.push({ status: "unavailable", assetId: position.asset.id, baselineRiskTier: position.asset.baselineRiskTier, reason: "missing-risk-signals" });
    else assetAssessments.push(calculateAssetRisk({ asset: position.asset, allocationBps: position.allocationBps!, externalSignals, assessedAt }));
  }
  const signalSources = [...new Set(assetAssessments.map((assessment) => assessment.signalSource))];
  if (unavailableAssets.length) return { status: assetAssessments.length ? "partial" : "unavailable", portfolioRiskScoreBps: null, portfolioCurrentRiskTier: null, assetAssessments, unavailableAssets, signalSources, assessedAt, reason: "missing-risk-signals" };
  const weightedTotal = assetAssessments.reduce((sum, assessment) => sum + assessment.scoreBps * positions.find((position) => position.asset.id === assessment.assetId)!.allocationBps!, 0);
  const portfolioRiskScoreBps = Math.floor(weightedTotal / RISK_SCORE_MAX);
  return { status: "assessed", portfolioRiskScoreBps, portfolioCurrentRiskTier: currentRiskTierForScore(portfolioRiskScoreBps), assetAssessments, unavailableAssets, signalSources, assessedAt, reason: "complete" };
}

export async function assessPortfolioRisk(snapshot: PortfolioSnapshot, provider: RiskSignalProvider, assessedAt: string): Promise<PortfolioRiskAssessment> {
  const entries = snapshot.valuationStatus === "valued" ? await Promise.all(meaningfulPositions(snapshot).map(async (position) => [position.asset.id, await provider.getSignals(position.asset.id)] as const)) : [];
  return calculatePortfolioRisk(snapshot, new Map(entries), assessedAt);
}
