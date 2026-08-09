import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "./catalog";

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
});
