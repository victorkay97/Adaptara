import { decodeFunctionData, encodeFunctionData, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "@/features/portfolio/catalog";
import type { AssetPosition, PortfolioSnapshot } from "@/features/portfolio/types";
import { adaptiveVaultConstitutionAbi } from "./abis";
import { evaluateConstitutionCompliance } from "./compliance";
import { isConstitutionActivated } from "./constants";
import { evaluateConstitutionFeasibility } from "./feasibility";
import type { FinancialConstitution } from "./types";
import { validateConstitution } from "./validation";

const candidate: FinancialConstitution = {
  minimumReserveBps: 2000,
  maximumSingleAssetExposureBps: 6000,
  maximumAggressiveExposureBps: 3000,
  maximumDailyReallocationBps: 1000,
};

const catalog = createAssetCatalog();
const allocations = [4000, 3000, 2000, 1000];
const positions = catalog.map((asset, index): AssetPosition => ({
  asset,
  availability: "available",
  rawBalance: 1n,
  balanceDecimals: asset.expectedDecimals,
  displayBalance: "1",
  referencePrice: null,
  usdValue: BigInt(allocations[index]),
  usdValueDecimals: 8,
  allocationBps: allocations[index],
}));
const seededSnapshot: PortfolioSnapshot = {
  source: "vault",
  accountAddress: "0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4",
  chainId: 1952,
  blockNumber: 1n,
  blockConsistency: "single-block",
  capturedAt: "2026-08-10T00:00:00.000Z",
  positions,
  totals: { totalUsdValue: 10_000n, usdValueDecimals: 8, valuedAssetCount: 4, nonzeroAssetCount: 4, unknownBalanceAssetCount: 0 },
  valuationStatus: "valued",
  priceSources: ["demo"],
};

describe("Phase 12C2A Constitution activation readiness", () => {
  it("accepts the exact integer-BPS candidate as valid, feasible, and activated", () => {
    expect(validateConstitution(candidate)).toEqual({ valid: true, value: candidate });
    expect(evaluateConstitutionFeasibility(candidate, catalog)).toMatchObject({ feasible: true, reserveCapacityBps: 6000, nonAggressiveCapacityBps: 18_000, aggressivePhysicalCapacityBps: 6000, allowedAggressiveCapacityBps: 3000, totalPermittedCapacityBps: 10_000, issues: [] });
    expect(isConstitutionActivated(candidate)).toBe(true);
  });

  it("finds the real seeded allocation compliant using static baseline tiers", () => {
    expect(evaluateConstitutionCompliance(seededSnapshot, candidate)).toEqual({
      status: "compliant",
      reserve: { status: "compliant", actualBps: 4000, requiredBps: 2000 },
      singleAsset: { status: "compliant", violatingAssetIds: [], observedMaximumBps: 4000, configuredMaximumBps: 6000 },
      aggressive: { status: "compliant", actualBps: 1000, maximumBps: 3000 },
      dailyReallocation: { status: "action-limit", configuredLimitBps: 1000 },
    });
  });

  it("round-trips the exact setPolicy tuple without an attribution suffix", () => {
    const data = encodeFunctionData({ abi: adaptiveVaultConstitutionAbi, functionName: "setPolicy", args: [candidate] });
    expect(data.slice(0, 10)).toBe(toFunctionSelector("setPolicy((uint16,uint16,uint16,uint16))"));
    expect(data.length).toBe(2 + 8 + 64 * 4);
    const decoded = decodeFunctionData({ abi: adaptiveVaultConstitutionAbi, data });
    expect(decoded.functionName).toBe("setPolicy");
    expect(decoded.args).toEqual([candidate]);
  });
});
