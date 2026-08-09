import { ASSET_IDS } from "@/features/portfolio/types";
import { RISK_SCORE_MAX } from "./constants";
import type { ExternalRiskSignals } from "./types";

export function assertRiskScoreBps(value: number, label = "risk score"): void {
  if (!Number.isInteger(value) || value < 0 || value > RISK_SCORE_MAX) {
    throw new RangeError(`${label} must be an integer from 0 to ${RISK_SCORE_MAX}`);
  }
}

export function validateExternalRiskSignals(input: unknown): ExternalRiskSignals {
  if (!input || typeof input !== "object") throw new TypeError("Risk signals must be an object");
  const value = input as Record<string, unknown>;
  if (typeof value.assetId !== "string" || !ASSET_IDS.includes(value.assetId as (typeof ASSET_IDS)[number])) throw new TypeError("Risk signals contain an invalid assetId");
  if (value.source !== "demo" && value.source !== "fixture") throw new TypeError("Risk signals contain an invalid source");
  for (const field of ["volatilityScoreBps", "liquidityScoreBps", "referenceDeviationScoreBps", "issuerCollateralScoreBps", "marketEventStressScoreBps"] as const) {
    assertRiskScoreBps(value[field] as number, field);
  }
  return value as unknown as ExternalRiskSignals;
}
