import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "./catalog";
import { getAddress } from "viem";

describe("asset catalog", () => {
  it("uses stable IDs and baseline tiers", () => {
    const catalog = createAssetCatalog();
    expect(catalog.map((asset) => asset.id)).toEqual(["usdt0", "strsy", "sxau", "saaplx"]);
    expect(catalog.map((asset) => asset.baselineRiskTier)).toEqual(["Reserve", "Defensive", "Balanced", "Aggressive"]);
  });
  it("does not invent sandbox addresses", () => {
    const sandbox = createAssetCatalog().filter((asset) => asset.sandbox);
    expect(sandbox).toHaveLength(3);
    expect(sandbox.every((asset) => asset.address === undefined)).toBe(true);
  });
  it("uses the confirmed configured sandbox contracts without changing asset identity", () => {
    const catalog = createAssetCatalog({
      strsy: getAddress("0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc"),
      sxau: getAddress("0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A"),
      saaplx: getAddress("0x009e2dfEa3FE134BcE3F769aA3E6C287823af184"),
    });
    expect(catalog.slice(1).map((asset) => asset.address)).toEqual([
      getAddress("0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc"),
      getAddress("0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A"),
      getAddress("0x009e2dfEa3FE134BcE3F769aA3E6C287823af184"),
    ]);
    expect(catalog.map((asset) => asset.expectedDecimals)).toEqual([6, 18, 18, 18]);
  });
});
