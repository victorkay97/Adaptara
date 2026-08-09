import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "@/features/portfolio/catalog";
import type { AssetPosition, PortfolioSnapshot } from "@/features/portfolio/types";
import { evaluateConstitutionCompliance } from "./compliance";
import { evaluateConstitutionFeasibility } from "./feasibility";
import { formatBpsAsPercent, parsePercentToBps } from "./money-or-bps";
import type { FinancialConstitution } from "./types";
import { validateConstitution } from "./validation";

const policy: FinancialConstitution = { minimumReserveBps: 3000, maximumSingleAssetExposureBps: 6000, maximumAggressiveExposureBps: 2000, maximumDailyReallocationBps: 500 };
const catalog = createAssetCatalog();
const position = (index: number, allocationBps: number, overrides = {}): AssetPosition => ({ asset: catalog[index], availability: "available", rawBalance: 1n, balanceDecimals: 18, displayBalance: "1", referencePrice: null, usdValue: 1n, usdValueDecimals: 8, allocationBps, ...overrides });
const snapshot = (positions: AssetPosition[], valuationStatus: PortfolioSnapshot["valuationStatus"] = "valued"): PortfolioSnapshot => ({ source: "vault", accountAddress: "0x0000000000000000000000000000000000000001", chainId: 1952, blockNumber: 1n, blockConsistency: "single-block", capturedAt: "2026-01-01T00:00:00Z", positions, totals: { totalUsdValue: 1n, usdValueDecimals: 8, valuedAssetCount: positions.length, nonzeroAssetCount: positions.length, unknownBalanceAssetCount: 0 }, valuationStatus, priceSources: ["fixture"] });

describe("exact percentage/BPS conversion", () => {
  it.each([["0",0],["0.01",1],["25",2500],["25.5",2550],["25.50",2550],["100",10000]] as const)("parses %s", (input, expected) => expect(parsePercentToBps(input)).toBe(expected));
  it.each(["-1","100.01","1.001","1e2","NaN","Infinity","25,5",""," "])("rejects %s", (input) => expect(() => parsePercentToBps(input)).toThrow());
  it("formats exactly", () => { expect(formatBpsAsPercent(0)).toBe("0.00"); expect(formatBpsAsPercent(2550)).toBe("25.50"); expect(formatBpsAsPercent(10000)).toBe("100.00"); });
});

describe("constitution validation and feasibility", () => {
  it("accepts literal zero and maximum policies", () => { expect(validateConstitution({ minimumReserveBps: 0, maximumSingleAssetExposureBps: 0, maximumAggressiveExposureBps: 0, maximumDailyReallocationBps: 0 }).valid).toBe(true); expect(validateConstitution({ minimumReserveBps: 10000, maximumSingleAssetExposureBps: 10000, maximumAggressiveExposureBps: 10000, maximumDailyReallocationBps: 10000 }).valid).toBe(true); });
  it.each([{...policy,minimumReserveBps:-1},{...policy,minimumReserveBps:10001},{...policy,minimumReserveBps:1.5},{ maximumSingleAssetExposureBps: 1, maximumAggressiveExposureBps: 1, maximumDailyReallocationBps: 1 },{...policy,extra:1}])("rejects malformed policy", (value) => expect(validateConstitution(value).valid).toBe(false));
  it("keeps reserve minimum and single-cap contradictions infeasible", () => expect(evaluateConstitutionFeasibility({...policy,minimumReserveBps:6000,maximumSingleAssetExposureBps:4000}, catalog).feasible).toBe(false));
  it("rejects total per-asset capacity below 10,000", () => { const result=evaluateConstitutionFeasibility({...policy,minimumReserveBps:0,maximumSingleAssetExposureBps:2000,maximumAggressiveExposureBps:10000},catalog); expect(result.totalPermittedCapacityBps).toBe(8000); expect(result.feasible).toBe(false); });
  it("keeps all-zero structurally valid but infeasible", () => { const zero={minimumReserveBps:0,maximumSingleAssetExposureBps:0,maximumAggressiveExposureBps:0,maximumDailyReallocationBps:0}; expect(validateConstitution(zero).valid).toBe(true); expect(evaluateConstitutionFeasibility(zero,catalog).feasible).toBe(false); });
  it("lets the aggressive cap make an otherwise sufficient physical catalog infeasible", () => { const result=evaluateConstitutionFeasibility({...policy,minimumReserveBps:0,maximumSingleAssetExposureBps:3000,maximumAggressiveExposureBps:500},catalog); expect(result.nonAggressiveCapacityBps+result.aggressivePhysicalCapacityBps).toBe(12000); expect(result.totalPermittedCapacityBps).toBe(9500); expect(result.feasible).toBe(false); });
  it("accepts exact total permitted capacity of 10,000", () => { const result=evaluateConstitutionFeasibility({...policy,minimumReserveBps:3000,maximumSingleAssetExposureBps:3000,maximumAggressiveExposureBps:1000},catalog); expect(result.totalPermittedCapacityBps).toBe(10000); expect(result.feasible).toBe(true); });
  it("accepts a normal current-catalog feasible policy", () => expect(evaluateConstitutionFeasibility({...policy,minimumReserveBps:4000,maximumSingleAssetExposureBps:4000}, catalog).feasible).toBe(true));
});

describe("portfolio compliance", () => {
  it.each([[3001,"compliant"],[3000,"compliant"],[2999,"violated"]] as const)("evaluates reserve %s", (reserve, status) => expect(evaluateConstitutionCompliance(snapshot([position(0,reserve),position(1,10000-reserve)]), policy).reserve.status).toBe(status));
  it("preserves deterministic violating order and accepts equality", () => { expect(evaluateConstitutionCompliance(snapshot([position(0,6000),position(1,4000)]),policy).singleAsset.status).toBe("compliant"); const result=evaluateConstitutionCompliance(snapshot([position(0,5000),position(1,5000)]),{...policy,maximumSingleAssetExposureBps:4000}); expect(result.singleAsset.violatingAssetIds).toEqual(["usdt0","strsy"]); });
  it("uses baseline, never dynamic, aggressive tier", () => { const balancedNowAggressive=position(2,8000,{currentRiskTier:"Aggressive"}); const result=evaluateConstitutionCompliance(snapshot([position(0,2000),balancedNowAggressive]),policy); expect(result.aggressive.actualBps).toBe(0); });
  it.each(["partial","unavailable"] as const)("returns unavailable for %s valuation", (status) => expect(evaluateConstitutionCompliance(snapshot([position(0,10000)],status),policy).status).toBe("unavailable"));
  it("does not fabricate compliance for missing allocations", () => expect(evaluateConstitutionCompliance(snapshot([position(0,10000,{allocationBps:null})]),policy).status).toBe("unavailable"));
  it.each([9999,10001])("rejects meaningful allocation total %s", (allocationBps) => expect(evaluateConstitutionCompliance(snapshot([position(0,allocationBps)]),policy).status).toBe("unavailable"));
  it("rejects a forged valued snapshot with no meaningful holdings", () => expect(evaluateConstitutionCompliance(snapshot([]),policy).status).toBe("unavailable"));
  it.each([-1,10001,12.5])("rejects out-of-range or fractional allocation %s", (allocationBps) => expect(evaluateConstitutionCompliance(snapshot([position(0,allocationBps)]),policy).status).toBe("unavailable"));
  it("keeps daily reallocation as an action limit", () => expect(evaluateConstitutionCompliance(snapshot([position(0,10000)]),policy).dailyReallocation).toEqual({status:"action-limit",configuredLimitBps:500}));
});
