import { getAddress, zeroAddress, type Address, type PublicClient } from "viem";
import { XLAYER_TESTNET_CHAIN_ID } from "@/lib/chain/xlayer";
import { erc20ReadAbi, vaultFactoryReadAbi } from "./abis";
import { formatUnitsExact, PRICE_DECIMALS } from "./money";
import type { ReferencePriceProvider } from "./prices";
import type { AssetMetadata, AssetPosition, PortfolioSnapshot, PortfolioSource, VaultDiscovery } from "./types";
import { valuePositions } from "./valuation";

const failedPosition = (asset: AssetMetadata, availability: AssetPosition["availability"], error?: string): AssetPosition => ({
  asset, availability, rawBalance: null, balanceDecimals: null, displayBalance: null, referencePrice: null,
  usdValue: null, usdValueDecimals: PRICE_DECIMALS, allocationBps: null, error,
});

export async function readPortfolio(params: { client: PublicClient; accountAddress: Address; assets: readonly AssetMetadata[]; source: PortfolioSource; priceProvider: ReferencePriceProvider }): Promise<PortfolioSnapshot> {
  const { client, accountAddress, assets, source, priceProvider } = params;
  const chainId = await client.getChainId();
  if (chainId !== XLAYER_TESTNET_CHAIN_ID) throw new Error(`Unsupported chain ${chainId}; expected ${XLAYER_TESTNET_CHAIN_ID}`);
  const blockNumber = await client.getBlockNumber();
  const configured = assets.filter((asset) => asset.address);
  const contracts = configured.flatMap((asset) => [
    { address: asset.address!, abi: erc20ReadAbi, functionName: "balanceOf" as const, args: [accountAddress] as const },
    { address: asset.address!, abi: erc20ReadAbi, functionName: "decimals" as const },
  ]);
  const results = contracts.length ? await client.multicall({ contracts, allowFailure: true, blockNumber }) : [];
  let resultIndex = 0;
  const positions: AssetPosition[] = assets.map((asset) => {
    if (!asset.address) return failedPosition(asset, "not-configured");
    const balanceResult = results[resultIndex++];
    const decimalsResult = results[resultIndex++];
    if (!balanceResult || balanceResult.status === "failure") return failedPosition(asset, "read-error", balanceResult?.error.message ?? "Balance read failed");
    if (!decimalsResult || decimalsResult.status === "failure") return failedPosition(asset, "read-error", decimalsResult?.error.message ?? "Decimals read failed");
    const rawBalance = balanceResult.result as bigint;
    const decimals = Number(decimalsResult.result);
    if (decimals !== asset.expectedDecimals) return failedPosition(asset, "configuration-error", `Decimals mismatch: expected ${asset.expectedDecimals}, received ${decimals}`);
    return { asset, availability: "available", rawBalance, balanceDecimals: decimals, displayBalance: formatUnitsExact(rawBalance, decimals), referencePrice: null, usdValue: null, usdValueDecimals: PRICE_DECIMALS, allocationBps: null };
  });
  const priceEntries = await Promise.all(assets.map(async (asset) => [asset.id, await priceProvider.getPrice(asset.id)] as const));
  const prices = new Map(priceEntries.filter((entry): entry is readonly [typeof entry[0], NonNullable<typeof entry[1]>] => entry[1] !== null));
  const valuation = valuePositions(positions, prices);
  return { source, accountAddress, chainId, blockNumber, blockConsistency: "single-block", capturedAt: new Date().toISOString(), ...valuation, priceSources: [...new Set([...prices.values()].map((price) => price.source))] };
}

export const readWalletPortfolio = (params: Omit<Parameters<typeof readPortfolio>[0], "source">) => readPortfolio({ ...params, source: "wallet" });
export const readVaultPortfolio = (params: Omit<Parameters<typeof readPortfolio>[0], "source">) => readPortfolio({ ...params, source: "vault" });

export async function discoverVault(client: PublicClient, owner: Address, factoryAddress?: Address): Promise<VaultDiscovery> {
  if (!factoryAddress) return { status: "not-configured" };
  try {
    if (await client.getChainId() !== XLAYER_TESTNET_CHAIN_ID) return { status: "wrong-chain" };
    const vault = await client.readContract({ address: factoryAddress, abi: vaultFactoryReadAbi, functionName: "vaultOf", args: [owner] });
    return vault === zeroAddress ? { status: "not-created" } : { status: "available", address: getAddress(vault) };
  } catch (error) { return { status: "read-error", error: error instanceof Error ? error.message : "Vault discovery failed" }; }
}
