import type { RiskFactorId } from "./types";

export const RISK_SCORE_MAX = 10_000;

export const RISK_FACTOR_WEIGHTS = {
  volatility: 2_000,
  liquidity: 2_000,
  referenceDeviation: 1_500,
  issuerCollateral: 2_000,
  concentration: 1_500,
  marketEventStress: 1_000,
} as const satisfies Record<RiskFactorId, number>;

export const RISK_TIER_THRESHOLDS = {
  balanced: 3_500,
  aggressive: 6_500,
} as const;

export const RISK_FACTOR_LABELS: Record<RiskFactorId, string> = {
  volatility: "Volatility",
  liquidity: "Liquidity",
  referenceDeviation: "Reference deviation",
  issuerCollateral: "Issuer / collateral",
  concentration: "Concentration",
  marketEventStress: "Market / event stress",
};
