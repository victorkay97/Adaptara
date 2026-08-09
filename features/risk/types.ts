import type { AssetId, BaselineRiskTier } from "@/features/portfolio/types";

export const RISK_FACTOR_IDS = ["volatility", "liquidity", "referenceDeviation", "issuerCollateral", "concentration", "marketEventStress"] as const;
export type RiskFactorId = (typeof RISK_FACTOR_IDS)[number];
export type ExternalRiskFactorId = Exclude<RiskFactorId, "concentration">;
export type RiskSignalSource = "demo" | "fixture";
export type RiskFactorSource = RiskSignalSource | "portfolio-derived";
export type CurrentRiskTier = "Defensive" | "Balanced" | "Aggressive";
export type RiskAssessmentStatus = "assessed" | "partial" | "unavailable";

export interface ExternalRiskSignals {
  assetId: AssetId;
  source: RiskSignalSource;
  volatilityScoreBps: number;
  liquidityScoreBps: number;
  referenceDeviationScoreBps: number;
  issuerCollateralScoreBps: number;
  marketEventStressScoreBps: number;
}

export interface RiskFactorScore {
  factorId: RiskFactorId;
  inputScoreBps: number;
  weightBps: number;
  weightedContributionBps: number;
  source: RiskFactorSource;
}

export interface AssetRiskAssessment {
  status: "assessed";
  assetId: AssetId;
  baselineRiskTier: BaselineRiskTier;
  currentRiskTier: CurrentRiskTier;
  scoreBps: number;
  factors: readonly RiskFactorScore[];
  signalSource: RiskSignalSource;
  assessedAt: string;
}

export interface MissingAssetRiskAssessment {
  status: "unavailable";
  assetId: AssetId;
  baselineRiskTier: BaselineRiskTier;
  reason: "missing-risk-signals";
}

export interface PortfolioRiskAssessment {
  status: RiskAssessmentStatus;
  portfolioRiskScoreBps: number | null;
  portfolioCurrentRiskTier: CurrentRiskTier | null;
  assetAssessments: readonly AssetRiskAssessment[];
  unavailableAssets: readonly MissingAssetRiskAssessment[];
  signalSources: readonly RiskSignalSource[];
  assessedAt: string;
  reason: "complete" | "portfolio-valuation-partial" | "portfolio-valuation-unavailable" | "invalid-allocation" | "no-meaningful-holdings" | "missing-risk-signals";
}

export interface RiskSignalProvider {
  getSignals(assetId: AssetId): Promise<ExternalRiskSignals | null>;
}
