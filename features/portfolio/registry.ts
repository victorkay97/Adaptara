import type { Address, PublicClient } from "viem";
import { XLAYER_TESTNET_CHAIN_ID } from "@/lib/chain/xlayer";
import { assetRegistryReadAbi } from "./abis";
import type { BaselineRiskTier } from "./types";

export const SOLIDITY_RISK_TIERS = ["Reserve", "Defensive", "Balanced", "Aggressive"] as const satisfies readonly BaselineRiskTier[];
export function decodeBaselineRiskTier(value: number): BaselineRiskTier {
  const tier = SOLIDITY_RISK_TIERS[value];
  if (!tier) throw new Error(`Unknown baseline risk tier ${value}`);
  return tier;
}
export async function readAssetRegistryConfig(client: PublicClient, registry: Address, asset: Address) {
  const chainId = await client.getChainId();
  if (chainId !== XLAYER_TESTNET_CHAIN_ID) throw new Error(`Unsupported chain ${chainId}; expected ${XLAYER_TESTNET_CHAIN_ID}`);
  const config = await client.readContract({ address: registry, abi: assetRegistryReadAbi, functionName: "getAssetConfig", args: [asset] });
  return { supported: config.supported, baselineRiskTier: decodeBaselineRiskTier(config.baselineRiskTier) };
}
