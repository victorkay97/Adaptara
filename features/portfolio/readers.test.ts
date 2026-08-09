import { describe, expect, it, vi } from "vitest";
import { getAddress, zeroAddress, type PublicClient } from "viem";
import { createAssetCatalog } from "./catalog";
import { DemoReferencePriceProvider } from "./prices";
import { discoverVault, readVaultPortfolio, readWalletPortfolio } from "./readers";

const account = getAddress("0x0000000000000000000000000000000000000001");
const factory = getAddress("0x0000000000000000000000000000000000000002");
const vaultAddress = getAddress("0x0000000000000000000000000000000000000003");
const client = (overrides = {}) => ({ getChainId: vi.fn().mockResolvedValue(1952), getBlockNumber: vi.fn().mockResolvedValue(42n), multicall: vi.fn().mockResolvedValue([{ status: "success", result: 1_250_000n }, { status: "success", result: 6 }]), readContract: vi.fn().mockResolvedValue(zeroAddress), ...overrides }) as unknown as PublicClient;

describe("portfolio readers", () => {
  it("reads wallet and preserves wallet provenance", async () => {
    const snapshot = await readWalletPortfolio({ client: client(), accountAddress: account, assets: createAssetCatalog(), priceProvider: new DemoReferencePriceProvider() });
    expect(snapshot.source).toBe("wallet"); expect(snapshot.blockNumber).toBe(42n); expect(snapshot.positions[0].rawBalance).toBe(1_250_000n); expect(snapshot.positions[1].availability).toBe("not-configured");
  });
  it("preserves vault provenance independently", async () => expect((await readVaultPortfolio({ client: client(), accountAddress: vaultAddress, assets: createAssetCatalog(), priceProvider: new DemoReferencePriceProvider() })).source).toBe("vault"));
  it("does not turn failed reads into zero", async () => {
    const failed = client({ multicall: vi.fn().mockResolvedValue([{ status: "failure", error: new Error("RPC down") }, { status: "success", result: 6 }]) });
    const snapshot = await readWalletPortfolio({ client: failed, accountAddress: account, assets: createAssetCatalog(), priceProvider: new DemoReferencePriceProvider() });
    expect(snapshot.positions[0].rawBalance).toBeNull(); expect(snapshot.positions[0].availability).toBe("read-error");
  });
  it("detects decimals mismatch", async () => {
    const mismatch = client({ multicall: vi.fn().mockResolvedValue([{ status: "success", result: 1n }, { status: "success", result: 18 }]) });
    expect((await readWalletPortfolio({ client: mismatch, accountAddress: account, assets: createAssetCatalog(), priceProvider: new DemoReferencePriceProvider() })).positions[0].availability).toBe("configuration-error");
  });
  it("rejects the wrong chain", async () => await expect(readWalletPortfolio({ client: client({ getChainId: vi.fn().mockResolvedValue(1) }), accountAddress: account, assets: createAssetCatalog(), priceProvider: new DemoReferencePriceProvider() })).rejects.toThrow("Unsupported chain"));
});

describe("vault discovery", () => {
  it("handles unconfigured, absent, and available vaults", async () => {
    expect(await discoverVault(client(), account)).toEqual({ status: "not-configured" });
    expect(await discoverVault(client(), account, factory)).toEqual({ status: "not-created" });
    expect(await discoverVault(client({ readContract: vi.fn().mockResolvedValue(vaultAddress) }), account, factory)).toEqual({ status: "available", address: vaultAddress });
  });
  it("returns explicit wrong-chain and read errors", async () => {
    expect(await discoverVault(client({ getChainId: vi.fn().mockResolvedValue(1) }), account, factory)).toEqual({ status: "wrong-chain" });
    expect((await discoverVault(client({ readContract: vi.fn().mockRejectedValue(new Error("RPC")) }), account, factory)).status).toBe("read-error");
  });
  it("converts a chain ID RPC rejection into read-error", async () => {
    const result = await discoverVault(client({ getChainId: vi.fn().mockRejectedValue(new Error("chain unavailable")) }), account, factory);
    expect(result).toEqual({ status: "read-error", error: "chain unavailable" });
  });
});
