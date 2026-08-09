import { describe, expect, it, vi } from "vitest";
import { getAddress, type PublicClient } from "viem";
import { decodeBaselineRiskTier, readAssetRegistryConfig } from "./registry";

describe("AssetRegistry enum mapping", () => {
  it("matches Solidity enum order", () => expect([0, 1, 2, 3].map(decodeBaselineRiskTier)).toEqual(["Reserve", "Defensive", "Balanced", "Aggressive"]));
  it("fails closed for unknown values", () => expect(() => decodeBaselineRiskTier(4)).toThrow("Unknown"));
  it("uses one authoritative config read on X Layer Testnet", async () => {
    const readContract = vi.fn().mockResolvedValue({ supported: true, baselineRiskTier: 2 });
    const client = { getChainId: vi.fn().mockResolvedValue(1952), readContract } as unknown as PublicClient;
    const result = await readAssetRegistryConfig(client, getAddress("0x0000000000000000000000000000000000000021"), getAddress("0x0000000000000000000000000000000000000022"));
    expect(result).toEqual({ supported: true, baselineRiskTier: "Balanced" });
    expect(readContract).toHaveBeenCalledTimes(1);
  });
  it("rejects arbitrary chains before reading the registry", async () => {
    const readContract = vi.fn();
    const client = { getChainId: vi.fn().mockResolvedValue(1), readContract } as unknown as PublicClient;
    await expect(readAssetRegistryConfig(client, getAddress("0x0000000000000000000000000000000000000021"), getAddress("0x0000000000000000000000000000000000000022"))).rejects.toThrow("Unsupported chain");
    expect(readContract).not.toHaveBeenCalled();
  });
});
