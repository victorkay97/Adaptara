import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "@/features/portfolio/catalog";
import { RISK_FACTOR_WEIGHTS, RISK_SCORE_MAX } from "./constants";
import { calculateAssetRisk, weightedContribution } from "./scoring";
import type { ExternalRiskSignals } from "./types";

const asset = createAssetCatalog()[0];
const signals = (score: number): ExternalRiskSignals => ({ assetId: "usdt0", source: "fixture", volatilityScoreBps: score, liquidityScoreBps: score, referenceDeviationScoreBps: score, issuerCollateralScoreBps: score, marketEventStressScoreBps: score });
const calculate = (score: number, allocationBps = score) => calculateAssetRisk({ asset, allocationBps, externalSignals: signals(score), assessedAt: "2026-01-01T00:00:00Z" });

describe("asset risk scoring", () => {
  it("locks factor weights to exactly 10,000 BPS", () => expect(Object.values(RISK_FACTOR_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(RISK_SCORE_MAX));
  it("scores zero and maximum inputs exactly", () => { expect(calculate(0).scoreBps).toBe(0); expect(calculate(10000).scoreBps).toBe(10000); });
  it("floors each weighted contribution", () => expect(weightedContribution(3333, 1500)).toBe(499));
  it("calculates a reconstructable mixed score", () => { const result = calculate(3333, 2500); expect(result.scoreBps).toBe(result.factors.reduce((sum, factor) => sum + factor.weightedContributionBps, 0)); expect(result.factors.find((factor) => factor.factorId === "concentration")).toMatchObject({ inputScoreBps: 2500, source: "portfolio-derived" }); });
  it.each([[1000, 1000], [2500, 2500], [5000, 5000], [10000, 10000]])("derives concentration %i from allocation", (allocation, expected) => expect(calculate(0, allocation).factors.find((factor) => factor.factorId === "concentration")?.inputScoreBps).toBe(expected));
  it("retains baseline while deriving a distinct current tier", () => { const result = calculateAssetRisk({ asset, allocationBps: 1000, externalSignals: signals(7000), assessedAt: "x" }); expect(result.baselineRiskTier).toBe("Reserve"); expect(result.currentRiskTier).not.toBe("Reserve"); });
  it("is deterministic for repeated inputs", () => expect(calculate(4321)).toEqual(calculate(4321)));
  it.each([-10, 12500, 1.5, Number.NaN])("rejects malformed factor input %s", (score) => expect(() => calculate(score)).toThrow());
  it("rejects mismatched signal assets", () => expect(() => calculateAssetRisk({ asset, allocationBps: 10000, externalSignals: { ...signals(0), assetId: "strsy" }, assessedAt: "x" })).toThrow());
});
