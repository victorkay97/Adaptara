import { describe, expect, it } from "vitest";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import { createAssetCatalog } from "@/features/portfolio/catalog";
import { PRICE_DECIMALS } from "@/features/portfolio/money";
import { assessPortfolioRisk, calculatePortfolioRisk } from "./portfolio-risk";
import { DemoRiskSignalProvider, getDemoRiskSignals } from "./signals";

const assets = createAssetCatalog();
const snapshot = (allocations: number[], valuationStatus: PortfolioSnapshot["valuationStatus"] = "valued"): PortfolioSnapshot => ({ source: "wallet", accountAddress: "0x0000000000000000000000000000000000000001", chainId: 1952, blockNumber: 1n, blockConsistency: "single-block", capturedAt: "2026-01-01T00:00:00Z", positions: allocations.map((allocationBps, index) => ({ asset: assets[index], availability: "available", rawBalance: allocationBps === 0 ? 0n : 1n, balanceDecimals: assets[index].expectedDecimals, displayBalance: "1", referencePrice: null, usdValue: allocationBps === 0 ? 0n : 1n, usdValueDecimals: PRICE_DECIMALS, allocationBps: valuationStatus === "valued" ? allocationBps : null })), totals: { totalUsdValue: 1n, usdValueDecimals: PRICE_DECIMALS, valuedAssetCount: allocations.filter(Boolean).length, nonzeroAssetCount: allocations.filter(Boolean).length, unknownBalanceAssetCount: 0 }, valuationStatus, priceSources: ["fixture"] });
const signals = (count: number) => new Map(assets.slice(0, count).map((asset) => [asset.id, getDemoRiskSignals(asset.id)]));

describe("portfolio risk", () => {
  it("assesses one asset and preserves exact allocation weighting", () => { const result = calculatePortfolioRisk(snapshot([10000]), signals(1), "x"); expect(result.status).toBe("assessed"); expect(result.portfolioRiskScoreBps).toBe(result.assetAssessments[0].scoreBps); });
  it("weights multiple assets using Phase 3 allocations", () => { const result = calculatePortfolioRisk(snapshot([4000, 6000]), signals(2), "x"); const expected = Math.floor(result.assetAssessments.reduce((sum, item, index) => sum + item.scoreBps * [4000, 6000][index], 0) / 10000); expect(result.portfolioRiskScoreBps).toBe(expected); });
  it("rejects malformed allocation totals", () => expect(calculatePortfolioRisk(snapshot([4000, 5000]), signals(2), "x")).toMatchObject({ status: "unavailable", portfolioRiskScoreBps: null, reason: "invalid-allocation" }));
  it.each(["partial", "unavailable"] as const)("withholds score for %s valuation", (status) => expect(calculatePortfolioRisk(snapshot([10000], status), signals(1), "x").portfolioRiskScoreBps).toBeNull());
  it("is partial when one holding lacks signals", () => expect(calculatePortfolioRisk(snapshot([5000, 5000]), signals(1), "x")).toMatchObject({ status: "partial", portfolioRiskScoreBps: null }));
  it("is unavailable when all signals are missing", () => expect(calculatePortfolioRisk(snapshot([5000, 5000]), new Map(), "x")).toMatchObject({ status: "unavailable", portfolioRiskScoreBps: null }));
  it("ignores zero balances", () => expect(calculatePortfolioRisk(snapshot([10000, 0]), signals(1), "x").assetAssessments).toHaveLength(1));
  it("orders assessments by portfolio position order", () => expect(calculatePortfolioRisk(snapshot([5000, 5000]), signals(2), "x").assetAssessments.map((item) => item.assetId)).toEqual(["usdt0", "strsy"]));
  it("loads deterministic demo signals without network or time inputs", async () => expect(await assessPortfolioRisk(snapshot([10000]), new DemoRiskSignalProvider(), "fixed")).toMatchObject({ status: "assessed", signalSources: ["demo"], assessedAt: "fixed" }));
  it("demo provider returns deterministic demo values", async () => { const provider = new DemoRiskSignalProvider(); expect(await provider.getSignals("sxau")).toEqual(await provider.getSignals("sxau")); expect((await provider.getSignals("sxau"))?.source).toBe("demo"); });
  it("demo provider returns null for an unknown runtime ID", async () => expect(await new DemoRiskSignalProvider().getSignals("unknown" as never)).toBeNull());
});
