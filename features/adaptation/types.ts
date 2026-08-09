import type { Address } from "viem";
import type { ConstitutionCompliance, FinancialConstitution, OnchainConstitution } from "@/features/constitution/types";
import type { MaraAction, MaraAnalysis } from "@/features/mara/types";
import type { AssetId, PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";

export const ADAPTATION_VERSION = "phase-7.v1" as const;
export const MAX_ADAPTATION_STEP_BPS = 500;

export interface AdaptationAllocation {
  assetId: AssetId;
  currentAllocationBps: number;
  targetAllocationBps: number;
  deltaBps: number;
}

export interface AdaptationPlan {
  version: typeof ADAPTATION_VERSION;
  status: "proposed" | "no-action" | "blocked";
  executionAuthority: "none";
  vaultAddress: Address | null;
  chainId: number;
  portfolioBlockNumber: bigint | null;
  constitutionBlockNumber: bigint | null;
  selectedProposalIndex: number | null;
  selectedAction: MaraAction | null;
  selectedAssetId: AssetId | null;
  maximumAdaptationStepBps: typeof MAX_ADAPTATION_STEP_BPS;
  constitutionReallocationLimitBps: number | null;
  stepBudgetBps: number;
  reallocationBps: number;
  allocations: AdaptationAllocation[];
  postPlanCompliance: ConstitutionCompliance | null;
  maraEvidenceRefs: string[];
  blockers: string[];
  notes: string[];
}

export interface AdaptationInput {
  snapshot: PortfolioSnapshot;
  riskAssessment: PortfolioRiskAssessment;
  constitution: OnchainConstitution | { version: "phase-6.v1"; source: "draft" | "fixture"; constitution: FinancialConstitution };
  maraAnalysis: MaraAnalysis;
}
