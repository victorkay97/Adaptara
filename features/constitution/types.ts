import type { Address, Hash } from "viem";
import type { AssetId } from "@/features/portfolio/types";

export const CONSTITUTION_FIELDS = ["minimumReserveBps", "maximumSingleAssetExposureBps", "maximumAggressiveExposureBps", "maximumDailyReallocationBps"] as const;
export type ConstitutionField = (typeof CONSTITUTION_FIELDS)[number];
export type ConstitutionSource = "draft" | "onchain" | "fixture";

export interface FinancialConstitution {
  minimumReserveBps: number;
  maximumSingleAssetExposureBps: number;
  maximumAggressiveExposureBps: number;
  maximumDailyReallocationBps: number;
}

export interface SourcedConstitution {
  version: "phase-6.v1";
  source: ConstitutionSource;
  constitution: FinancialConstitution;
}

export interface OnchainConstitution extends SourcedConstitution {
  source: "onchain";
  vaultAddress: Address;
  owner: Address;
  blockNumber: bigint;
  capturedAt: string;
}

export interface ConstitutionValidationError { field: ConstitutionField | "constitution"; message: string }
export type ConstitutionValidation = { valid: true; value: FinancialConstitution } | { valid: false; errors: ConstitutionValidationError[] };
export interface ConstitutionFeasibility {
  feasible: boolean;
  reserveCapacityBps: number;
  nonAggressiveCapacityBps: number;
  aggressivePhysicalCapacityBps: number;
  allowedAggressiveCapacityBps: number;
  totalPermittedCapacityBps: number;
  issues: string[];
}
export type RuleStatus = "compliant" | "violated" | "unavailable";
export interface ConstitutionCompliance {
  status: RuleStatus;
  reserve: { status: RuleStatus; actualBps: number | null; requiredBps: number };
  singleAsset: { status: RuleStatus; violatingAssetIds: AssetId[]; observedMaximumBps: number | null; configuredMaximumBps: number };
  aggressive: { status: RuleStatus; actualBps: number | null; maximumBps: number };
  dailyReallocation: { status: "action-limit"; configuredLimitBps: number };
}

export interface ConstitutionUpdateResult { transactionHash: Hash; receiptBlockNumber: bigint; constitution: OnchainConstitution }
