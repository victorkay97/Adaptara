import { RISK_SCORE_MAX, RISK_TIER_THRESHOLDS } from "./constants";
import type { CurrentRiskTier } from "./types";
import { assertRiskScoreBps } from "./validation";

export function currentRiskTierForScore(scoreBps: number): CurrentRiskTier {
  assertRiskScoreBps(scoreBps);
  if (scoreBps < RISK_TIER_THRESHOLDS.balanced) return "Defensive";
  if (scoreBps < RISK_TIER_THRESHOLDS.aggressive) return "Balanced";
  return "Aggressive";
}

export function formatRiskScore(scoreBps: number): string {
  assertRiskScoreBps(scoreBps);
  return `${Math.floor(scoreBps / 100)}.${String(scoreBps % 100).padStart(2, "0")}`;
}

export { RISK_SCORE_MAX };
