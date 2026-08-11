import type { AssetId, PortfolioSource, ValuationStatus } from "@/features/portfolio/types";
import type { RiskAssessmentStatus, RiskFactorId } from "@/features/risk/types";

export const MARA_ACTIONS = ["maintain", "review", "increase_reserve", "reduce_exposure", "diversify"] as const;
export type MaraAction = (typeof MARA_ACTIONS)[number];
export type MaraStatus = "complete" | "limited" | "unavailable";
export type MaraFactSource = "portfolio-engine" | "risk-engine" | "asset-catalog";

export interface MaraGroundingFact { id: string; category: "portfolio" | "asset" | "risk" | "factor" | "provenance"; label: string; value: string; source: MaraFactSource }
export interface MaraContext { contextVersion: "phase-5.v1"; portfolioSource: PortfolioSource; portfolioStatus: ValuationStatus; riskStatus: RiskAssessmentStatus; facts: MaraGroundingFact[]; limitations: string[]; capturedAt: string; assessedAt: string }
export interface MaraObservation { type: "portfolio" | "risk" | "concentration" | "asset" | "uncertainty"; assetId: AssetId | null; factorId: RiskFactorId | null; importance: "low" | "medium" | "high"; text: string; evidenceRefs: string[] }
export interface MaraProposal { action: MaraAction; assetId: AssetId | null; rationale: string; evidenceRefs: string[]; executionAuthority: "none" }
export interface MaraAnalysis { status: MaraStatus; summary: string; observations: MaraObservation[]; proposals: MaraProposal[]; uncertainties: string[] }
export interface MaraModelInput { context: MaraContext; question: string | null; remediationInstruction?: string }
export interface MaraModelClient { analyze(input: MaraModelInput): Promise<unknown> }

export type MaraFailureCode = "invalid-request" | "incomplete-context" | "not-configured" | "provider-failure" | "invalid-model-output";
export type MaraDiagnosticCode =
  | "openai_request_failure"
  | "response_not_completed"
  | "output_text_missing"
  | "output_json_parse"
  | "output_schema_validation"
  | "unknown_evidence"
  | "unsupported_asset_reference"
  | "asset_evidence_mismatch"
  | "invalid_factor_reference"
  | "factor_evidence_mismatch"
  | "unsafe_numeric_claim"
  | "canonical_quantity_claim"
  | "return_multiplier_claim"
  | "non_live_claim_violation";
export interface MaraProviderMetadata { providerErrorName: string; providerStatus?: number; providerCode?: string; providerType?: string; providerRequestId?: string }
export class MaraError extends Error {
  constructor(public readonly code: MaraFailureCode, message: string, public readonly diagnosticCode?: MaraDiagnosticCode, public readonly providerMetadata?: MaraProviderMetadata) {
    super(message);
    this.name = "MaraError";
  }
}
