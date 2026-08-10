import { describe, expect, it, vi } from "vitest";
import { getAddress, zeroAddress, type PublicClient } from "viem";
import { createAssetCatalog } from "./catalog";
import { DemoReferencePriceProvider } from "./prices";
import { discoverVault, readVaultPortfolio, readWalletPortfolio } from "./readers";

const account = getAddress("0x0000000000000000000000000000000000000001");
const factory = getAddress("0x0000000000000000000000000000000000000002");
const vaultAddress = getAddress("0x0000000000000000000000000000000000000003");
const sandboxAddresses = { strsy: getAddress("0x0000000000000000000000000000000000000011"), sxau: getAddress("0x0000000000000000000000000000000000000012"), saaplx: getAddress("0x0000000000000000000000000000000000000013") };
type ReadArgs = { functionName: string; blockNumber?: bigint };
const defaultRead = vi.fn(async ({ functionName }: ReadArgs) => functionName === "balanceOf" ? 1_250_000n : functionName === "decimals" ? 6 : zeroAddress);
const client = (overrides = {}) => ({ getChainId: vi.fn().mockResolvedValue(1952), getBlockNumber: vi.fn().mockResolvedValue(42n), readContract: defaultRead, ...overrides }) as unknown as PublicClient;
const readWallet = (portfolioClient: PublicClient, assets = createAssetCatalog()) => readWalletPortfolio({ client: portfolioClient, accountAddress: account, assets, priceProvider: new DemoReferencePriceProvider() });

describe("portfolio readers without Multicall3", () => {
  it("reads a wallet with no multicall action or chain Multicall3 configuration", async () => { const portfolioClient = client({ readContract: vi.fn(async ({ functionName }: ReadArgs) => functionName === "balanceOf" ? 1_250_000n : 6) }); expect("multicall" in portfolioClient).toBe(false); const snapshot = await readWallet(portfolioClient); expect(snapshot.source).toBe("wallet"); expect(snapshot.positions[0].rawBalance).toBe(1_250_000n); expect(snapshot.blockConsistency).toBe("single-block"); });
  it("pins every configured balance and decimals read to one captured block", async () => { const readContract = vi.fn(async ({ functionName }: ReadArgs) => functionName === "balanceOf" ? 1n : 18); const portfolioClient = client({ readContract }); const snapshot = await readWallet(portfolioClient, createAssetCatalog(sandboxAddresses)); expect(portfolioClient.getBlockNumber).toHaveBeenCalledOnce(); expect(snapshot.blockNumber).toBe(42n); expect(readContract).toHaveBeenCalledTimes(8); expect(readContract.mock.calls.every(([args]) => args.blockNumber === 42n)).toBe(true); });
  it("isolates one balance failure as read-error and never zero", async () => { const readContract = vi.fn(async ({ functionName }: ReadArgs) => { if (functionName === "balanceOf") throw new Error("balance RPC failed"); return 6; }); const snapshot = await readWallet(client({ readContract })); expect(snapshot.positions[0]).toMatchObject({ availability: "read-error", rawBalance: null }); });
  it("isolates one decimals failure as read-error and never zero", async () => { const readContract = vi.fn(async ({ functionName }: ReadArgs) => { if (functionName === "decimals") throw new Error("decimals RPC failed"); return 1n; }); const snapshot = await readWallet(client({ readContract })); expect(snapshot.positions[0]).toMatchObject({ availability: "read-error", rawBalance: null }); });
  it("keeps decimals mismatch as configuration-error", async () => { const readContract = vi.fn(async ({ functionName }: ReadArgs) => functionName === "balanceOf" ? 1n : 18); expect((await readWallet(client({ readContract }))).positions[0]).toMatchObject({ availability: "configuration-error", rawBalance: null }); });
  it("keeps not-configured assets outside live reads", async () => { const readContract = vi.fn(async ({ functionName }: ReadArgs) => functionName === "balanceOf" ? 0n : 6); const snapshot = await readWallet(client({ readContract })); expect(readContract).toHaveBeenCalledTimes(2); expect(snapshot.positions.slice(1).every((position) => position.availability === "not-configured")).toBe(true); });
  it("rejects the wrong chain before block or contract reads", async () => { const portfolioClient = client({ getChainId: vi.fn().mockResolvedValue(1), getBlockNumber: vi.fn(), readContract: vi.fn() }); await expect(readWallet(portfolioClient)).rejects.toThrow("Unsupported chain"); expect(portfolioClient.getBlockNumber).not.toHaveBeenCalled(); expect(portfolioClient.readContract).not.toHaveBeenCalled(); });
  it("preserves wallet and vault provenance", async () => { const readContract = vi.fn(async ({ functionName }: ReadArgs) => functionName === "balanceOf" ? 0n : 6); expect((await readWallet(client({ readContract }))).source).toBe("wallet"); expect((await readVaultPortfolio({ client: client({ readContract }), accountAddress: vaultAddress, assets: createAssetCatalog(), priceProvider: new DemoReferencePriceProvider() })).source).toBe("vault"); });
});

describe("vault discovery", () => {
  it("handles unconfigured, absent, and available vaults", async () => { expect(await discoverVault(client(), account)).toEqual({ status: "not-configured" }); expect(await discoverVault(client(), account, factory)).toEqual({ status: "not-created" }); expect(await discoverVault(client({ readContract: vi.fn().mockResolvedValue(vaultAddress) }), account, factory)).toEqual({ status: "available", address: vaultAddress }); });
  it("returns explicit wrong-chain and read errors", async () => { expect(await discoverVault(client({ getChainId: vi.fn().mockResolvedValue(1) }), account, factory)).toEqual({ status: "wrong-chain" }); expect((await discoverVault(client({ readContract: vi.fn().mockRejectedValue(new Error("RPC")) }), account, factory)).status).toBe("read-error"); });
  it("converts a chain ID RPC rejection into read-error", async () => { expect(await discoverVault(client({ getChainId: vi.fn().mockRejectedValue(new Error("chain unavailable")) }), account, factory)).toEqual({ status: "read-error", error: "chain unavailable" }); });
  it("discovers the confirmed demo vault through the factory boundary", async () => {
    const demoOwner = getAddress("0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E");
    const confirmedFactory = getAddress("0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e");
    const confirmedVault = getAddress("0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4");
    const readContract = vi.fn().mockResolvedValue(confirmedVault);
    expect(await discoverVault(client({ readContract }), demoOwner, confirmedFactory)).toEqual({ status: "available", address: confirmedVault });
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({ address: confirmedFactory, functionName: "vaultOf", args: [demoOwner] }));
  });
});

describe("confirmed seeded vault reader shape", () => {
  it("normalizes live-shaped RPC balances into the $20 demo reference allocation", async () => {
    const assets = createAssetCatalog(sandboxAddresses);
    const balances = new Map([
      [assets[0].address!.toLowerCase(), 8_000_000n],
      [assets[1].address!.toLowerCase(), 60_000_000_000_000_000n],
      [assets[2].address!.toLowerCase(), 2_000_000_000_000_000n],
      [assets[3].address!.toLowerCase(), 10_000_000_000_000_000n],
    ]);
    const readContract = vi.fn(async ({ address, functionName }: { address: string; functionName: string }) => functionName === "balanceOf" ? balances.get(address.toLowerCase())! : address.toLowerCase() === assets[0].address!.toLowerCase() ? 6 : 18);
    const snapshot = await readVaultPortfolio({ client: client({ readContract }), accountAddress: vaultAddress, assets, priceProvider: new DemoReferencePriceProvider() });
    expect(snapshot.source).toBe("vault");
    expect(snapshot.positions.map((position) => position.displayBalance)).toEqual(["8", "0.06", "0.002", "0.01"]);
    expect(snapshot.positions.map((position) => position.usdValue)).toEqual([800_000_000n, 600_000_000n, 400_000_000n, 200_000_000n]);
    expect(snapshot.totals.totalUsdValue).toBe(2_000_000_000n);
    expect(snapshot.positions.map((position) => position.allocationBps)).toEqual([4000, 3000, 2000, 1000]);
    expect(snapshot.valuationStatus).toBe("valued");
  });
});
