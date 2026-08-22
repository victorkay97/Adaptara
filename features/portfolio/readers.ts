import { type Address, type PublicClient } from "viem";
import { XLAYER_TESTNET_CHAIN_ID } from "@/lib/chain/xlayer";
import { erc20ReadAbi } from "./abis";
import { discoverManagedVaults } from "@/features/vaults/discovery";
import { formatUnitsExact, PRICE_DECIMALS } from "./money";
import type { ReferencePriceProvider } from "./prices";
import type { AssetMetadata, AssetPosition, PortfolioSnapshot, PortfolioSource, VaultDiscovery } from "./types";
import { valuePositions } from "./valuation";

const failedPosition = (asset: AssetMetadata, availability: AssetPosition["availability"], error?: string): AssetPosition => ({
  asset, availability, rawBalance: null, balanceDecimals: null, displayBalance: null, referencePrice: null,
  usdValue: null, usdValueDecimals: PRICE_DECIMALS, allocationBps: null, error,
});

export async function readPortfolio(params: { client: PublicClient; accountAddress: Address; assets: readonly AssetMetadata[]; source: PortfolioSource; priceProvider: ReferencePriceProvider; expectedChainId?: number }): Promise<PortfolioSnapshot> {
  const { client, accountAddress, assets, source, priceProvider, expectedChainId = XLAYER_TESTNET_CHAIN_ID } = params;
  const chainId = await client.getChainId();
  if (chainId !== expectedChainId) throw new Error(`Unsupported chain ${chainId}; expected ${expectedChainId}`);
  const blockNumber = await client.getBlockNumber();
  const configured = assets.filter((asset) => asset.address);
  const readResults = await Promise.all(configured.map(async (asset) => {
    const [balance, decimals] = await Promise.all([
      client.readContract({ address: asset.address!, abi: erc20ReadAbi, functionName: "balanceOf", args: [accountAddress], blockNumber }).then((result) => ({ ok: true as const, result: result as bigint })).catch((error: unknown) => ({ ok: false as const, error })),
      client.readContract({ address: asset.address!, abi: erc20ReadAbi, functionName: "decimals", blockNumber }).then((result) => ({ ok: true as const, result: Number(result) })).catch((error: unknown) => ({ ok: false as const, error })),
    ]);
    return [asset.id, { balance, decimals }] as const;
  }));
  const results = new Map(readResults);
  const positions: AssetPosition[] = assets.map((asset) => {
    if (!asset.address) return failedPosition(asset, "not-configured");
    const result = results.get(asset.id);
    if (!result) return failedPosition(asset, "read-error", "Balance read failed");
    if (!result.balance.ok) return failedPosition(asset, "read-error", errorMessage(result.balance.error, "Balance read failed"));
    if (!result.decimals.ok) return failedPosition(asset, "read-error", errorMessage(result.decimals.error, "Decimals read failed"));
    const rawBalance = result.balance.result;
    const decimals = result.decimals.result;
    if (decimals !== asset.expectedDecimals) return failedPosition(asset, "configuration-error", `Decimals mismatch: expected ${asset.expectedDecimals}, received ${decimals}`);
    return { asset, availability: "available", rawBalance, balanceDecimals: decimals, displayBalance: formatUnitsExact(rawBalance, decimals), referencePrice: null, usdValue: null, usdValueDecimals: PRICE_DECIMALS, allocationBps: null };
  });
  const priceEntries = await Promise.all(assets.map(async (asset) => [asset.id, await priceProvider.getPrice(asset.id)] as const));
  const prices = new Map(priceEntries.filter((entry): entry is readonly [typeof entry[0], NonNullable<typeof entry[1]>] => entry[1] !== null));
  const valuation = valuePositions(positions, prices);
  return { source, accountAddress, chainId, blockNumber, blockConsistency: "single-block", capturedAt: new Date().toISOString(), ...valuation, priceSources: [...new Set([...prices.values()].map((price) => price.source))] };
}

const errorMessage = (error: unknown, fallback: string): string => error instanceof Error ? error.message : fallback;

export const readWalletPortfolio = (params: Omit<Parameters<typeof readPortfolio>[0], "source">) => readPortfolio({ ...params, source: "wallet" });
export const readVaultPortfolio = (params: Omit<Parameters<typeof readPortfolio>[0], "source">) => readPortfolio({ ...params, source: "vault" });

export async function discoverVault(client: PublicClient, owner: Address, v1Factory?: Address, v2Factory?: Address, expectedChainId: number = XLAYER_TESTNET_CHAIN_ID): Promise<VaultDiscovery> {
  if (!v1Factory && !v2Factory) return { status: "not-configured" };
  try {
    if (await client.getChainId() !== expectedChainId) return { status: "wrong-chain" };
    const { vaults, issues } = await discoverManagedVaults({ client, owner, v1Factory, v2Factory });
    if (vaults.length === 0) return issues.length
      ? { status: "read-error", error: issues.map((issue) => `${issue.source.toUpperCase()}: ${issue.message}`).join("; ") }
      : { status: "not-created" };
    return { status: "available", address: vaults[0].address, selected: vaults[0], vaults, ...(issues.length ? { issues } : {}) };
  } catch (error) { return { status: "read-error", error: error instanceof Error ? error.message : "Vault discovery failed" }; }
}
