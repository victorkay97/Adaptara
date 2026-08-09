import type { AssetMetadata } from "@/features/portfolio/types";
import { RISK_FACTOR_WEIGHTS, RISK_SCORE_MAX } from "./constants";
import { currentRiskTierForScore } from "./tiers";
import { RISK_FACTOR_IDS, type AssetRiskAssessment, type ExternalRiskSignals, type RiskFactorId, type RiskFactorScore } from "./types";
import { assertRiskScoreBps, validateExternalRiskSignals } from "./validation";

const signalScore = (signals: ExternalRiskSignals, factorId: Exclude<RiskFactorId, "concentration">): number => ({
  volatility: signals.volatilityScoreBps,
  liquidity: signals.liquidityScoreBps,
  referenceDeviation: signals.referenceDeviationScoreBps,
  issuerCollateral: signals.issuerCollateralScoreBps,
  marketEventStress: signals.marketEventStressScoreBps,
})[factorId];

export function weightedContribution(inputScoreBps: number, weightBps: number): number {
  assertRiskScoreBps(inputScoreBps, "factor score");
  assertRiskScoreBps(weightBps, "factor weight");
  return Math.floor((inputScoreBps * weightBps) / RISK_SCORE_MAX);
}

export function calculateAssetRisk(params: { asset: AssetMetadata; allocationBps: number; externalSignals: ExternalRiskSignals; assessedAt: string }): AssetRiskAssessment {
  const { asset, allocationBps, assessedAt } = params;
  assertRiskScoreBps(allocationBps, "allocationBps");
  const externalSignals = validateExternalRiskSignals(params.externalSignals);
  if (externalSignals.assetId !== asset.id) throw new Error(`Risk signals for ${externalSignals.assetId} cannot assess ${asset.id}`);
  if (!assessedAt) throw new Error("assessedAt is required");
  const factors: RiskFactorScore[] = RISK_FACTOR_IDS.map((factorId) => {
    const inputScoreBps = factorId === "concentration" ? allocationBps : signalScore(externalSignals, factorId);
    return { factorId, inputScoreBps, weightBps: RISK_FACTOR_WEIGHTS[factorId], weightedContributionBps: weightedContribution(inputScoreBps, RISK_FACTOR_WEIGHTS[factorId]), source: factorId === "concentration" ? "portfolio-derived" : externalSignals.source };
  });
  const scoreBps = factors.reduce((sum, factor) => sum + factor.weightedContributionBps, 0);
  return { status: "assessed", assetId: asset.id, baselineRiskTier: asset.baselineRiskTier, currentRiskTier: currentRiskTierForScore(scoreBps), scoreBps, factors, signalSource: externalSignals.source, assessedAt };
}
