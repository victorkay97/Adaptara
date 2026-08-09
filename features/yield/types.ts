import type { Address } from "viem";
import type { AssetId } from "@/features/portfolio/types";

export type YieldHorizonDays = 30 | 90 | 365;

export interface YieldTerms {
  programId: string;
  version: "phase-9.v1";
  assetId: AssetId;
  mode: "demo";
  annualRateBps: number;
  compoundingFrequency: "daily";
  dayCountBasis: 365;
  description: string;
  limitations: readonly string[];
}

export interface YieldProjection {
  version: "phase-9.v1";
  status: "projected";
  executionAuthority: "none";
  mode: "demo";
  vaultAddress: Address;
  chainId: 1952;
  portfolioBlockNumber: bigint;
  assetId: AssetId;
  programId: string;
  horizonDays: YieldHorizonDays;
  annualRateBps: number;
  principalRaw: bigint;
  simpleYieldRaw: bigint;
  compoundedYieldRaw: bigint;
  compoundingDeltaVsSimpleRaw: bigint;
  projectedEndingBalanceRaw: bigint;
  tokenDecimals: number;
  limitations: readonly string[];
}

export type YieldProjectionResult =
  | { status: "projected"; projection: YieldProjection }
  | { status: "unavailable"; reason: string };

export interface YieldTermsProvider {
  getTerms(assetId: AssetId): YieldTerms | null;
  listTerms(): readonly YieldTerms[];
}
