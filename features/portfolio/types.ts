import type { Address } from "viem";

export const ASSET_IDS = ["usdt0", "strsy", "sxau", "saaplx"] as const;
export type AssetId = (typeof ASSET_IDS)[number];
export type PortfolioSource = "wallet" | "vault";
export type AssetAvailability = "available" | "not-configured" | "unsupported" | "unpriced" | "read-error" | "configuration-error";
export type ValuationStatus = "valued" | "partial" | "unavailable";
export type BaselineRiskTier = "Reserve" | "Defensive" | "Balanced" | "Aggressive";

export interface AssetMetadata {
  id: AssetId;
  symbol: string;
  displayName: string;
  role: string;
  baselineRiskTier: BaselineRiskTier;
  expectedDecimals: number;
  sandbox: boolean;
  address?: Address;
  referencePriceId?: string;
}

export interface ReferencePrice { assetId: AssetId; value: bigint; decimals: number; currency: "USD"; source: "demo" | "fixture"; capturedAt: string }
export interface PortfolioAllocation { assetId: AssetId; allocationBps: number }
export interface AssetPosition {
  asset: AssetMetadata;
  availability: AssetAvailability;
  rawBalance: bigint | null;
  balanceDecimals: number | null;
  displayBalance: string | null;
  referencePrice: ReferencePrice | null;
  usdValue: bigint | null;
  usdValueDecimals: number;
  allocationBps: number | null;
  error?: string;
}
export interface PortfolioTotals { totalUsdValue: bigint; usdValueDecimals: number; valuedAssetCount: number; nonzeroAssetCount: number; unknownBalanceAssetCount: number }
export interface PortfolioSnapshot {
  source: PortfolioSource;
  accountAddress: Address;
  chainId: number;
  blockNumber: bigint | null;
  blockConsistency: "single-block" | "latest-near-simultaneous";
  capturedAt: string;
  positions: AssetPosition[];
  totals: PortfolioTotals;
  valuationStatus: ValuationStatus;
  priceSources: Array<ReferencePrice["source"]>;
}

export type VaultDiscovery =
  | { status: "not-configured" }
  | { status: "wrong-chain" }
  | { status: "read-error"; error: string }
  | { status: "not-created" }
  | { status: "available"; address: Address };
