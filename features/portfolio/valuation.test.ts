import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { createAssetCatalog } from "./catalog";
import { PRICE_DECIMALS } from "./money";
import type { AssetPosition, ReferencePrice } from "./types";
import { valuePositions } from "./valuation";

const assets = createAssetCatalog();
const configuredAssets = createAssetCatalog({
  strsy: getAddress("0x0000000000000000000000000000000000000011"),
  sxau: getAddress("0x0000000000000000000000000000000000000012"),
  saaplx: getAddress("0x0000000000000000000000000000000000000013"),
});
const position = (index: number, balance: bigint, decimals = assets[index].expectedDecimals): AssetPosition => ({ asset: assets[index], availability: "available", rawBalance: balance, balanceDecimals: decimals, displayBalance: "", referencePrice: null, usdValue: null, usdValueDecimals: PRICE_DECIMALS, allocationBps: null });
const configuredPosition = (index: number, balance: bigint): AssetPosition => ({ ...position(index, balance), asset: configuredAssets[index] });
const unknownPosition = (index: number, availability: "read-error" | "configuration-error"): AssetPosition => ({ ...configuredPosition(index, 0n), availability, rawBalance: null, balanceDecimals: null, displayBalance: null });
const price = (assetId: ReferencePrice["assetId"], value = 100_000_000n): ReferencePrice => ({ assetId, value, decimals: 8, currency: "USD", source: "fixture", capturedAt: "2026-01-01T00:00:00Z" });

describe("portfolio valuation", () => {
  it("values complete portfolios and assigns exactly 10,000 BPS", () => {
    const result = valuePositions([position(0, 2_000_000n), position(1, 3n * 10n ** 18n)], new Map([["usdt0", price("usdt0")], ["strsy", price("strsy")]]));
    expect(result.valuationStatus).toBe("valued");
    expect(result.totals.totalUsdValue).toBe(500_000_000n);
    expect(result.positions.reduce((sum, item) => sum + (item.allocationBps ?? 0), 0)).toBe(10_000);
  });
  it("assigns rounding remainder deterministically to the largest position", () => {
    const result = valuePositions([position(0, 1_000_000n), position(1, 2n * 10n ** 18n), position(2, 3n * 10n ** 18n)], new Map([["usdt0", price("usdt0")], ["strsy", price("strsy")], ["sxau", price("sxau")]]));
    expect(result.positions.map((item) => item.allocationBps)).toEqual([1666, 3333, 5001]);
  });
  it("preserves catalog order for equal-value allocation ties", () => {
    const result = valuePositions([position(0, 1_000_000n), configuredPosition(1, 1n * 10n ** 18n), configuredPosition(2, 1n * 10n ** 18n)], new Map([["usdt0", price("usdt0")], ["strsy", price("strsy")], ["sxau", price("sxau")]]));
    expect(result.positions.map((item) => item.allocationBps)).toEqual([3334, 3333, 3333]);
  });
  it("reports partial when a nonzero position is unpriced", () => {
    const result = valuePositions([position(0, 1_000_000n), configuredPosition(1, 1n)], new Map([["usdt0", price("usdt0")]]));
    expect(result.valuationStatus).toBe("partial");
    expect(result.positions.every((item) => item.allocationBps === null)).toBe(true);
  });
  it("ignores zero-balance unpriced assets for completeness", () => {
    const result = valuePositions([position(0, 1_000_000n), configuredPosition(1, 0n)], new Map([["usdt0", price("usdt0")]]));
    expect(result.valuationStatus).toBe("valued");
    expect(result.positions[0].allocationBps).toBe(10_000);
  });
  it("excludes not-configured assets from live completeness", () => {
    expect(valuePositions([position(0, 1_000_000n), { ...position(1, 0n), rawBalance: null, balanceDecimals: null, availability: "not-configured" }], new Map([["usdt0", price("usdt0")]])).valuationStatus).toBe("valued");
  });
  it.each(["read-error", "configuration-error"] as const)("makes a configured %s balance partial and suppresses allocations", (availability) => {
    const result = valuePositions([position(0, 1_000_000n), unknownPosition(1, availability)], new Map([["usdt0", price("usdt0")]]));
    expect(result.valuationStatus).toBe("partial");
    expect(result.totals.unknownBalanceAssetCount).toBe(1);
    expect(result.positions.every((item) => item.allocationBps === null)).toBe(true);
    expect(result.totals.totalUsdValue).toBe(100_000_000n);
  });
  it("is unavailable when an unknown configured balance has no valued exposure", () => {
    const result = valuePositions([unknownPosition(1, "read-error")], new Map());
    expect(result.valuationStatus).toBe("unavailable");
    expect(result.totals.unknownBalanceAssetCount).toBe(1);
  });
  it("reports unavailable when nothing meaningful can be valued", () => {
    expect(valuePositions([position(1, 1n)], new Map()).valuationStatus).toBe("unavailable");
    expect(valuePositions([position(0, 0n)], new Map([["usdt0", price("usdt0")]])).valuationStatus).toBe("unavailable");
  });
});
