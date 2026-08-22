import type { AssetId } from "@/features/portfolio/types";

export type ObservationHealth = "healthy" | "stale" | "unavailable" | "partial";
export type SignalDirection = "positive" | "neutral" | "negative";
export type SignalSeverity = "low" | "medium" | "high";

export interface MarketSignal {
  id: string; assetId: AssetId; symbol: string; price: string | null; priceChange24h: string | null;
  liquidityUsd: string | null; observedAt: string; expiresAt: string; direction: SignalDirection;
  severity: SignalSeverity; source: { provider: string; reference: string }; evidence: string;
}
export interface NewsSignal {
  id: string; relatedAssetIds: AssetId[]; headline: string; summary: string | null; observedAt: string;
  expiresAt: string; sentiment: "bullish" | "bearish" | "neutral" | null;
  providerImportance: "high" | "medium" | "low" | null; source: { provider: string; publisher: string; url: string | null };
}
export interface RwaObservation {
  id: string; chainIndex: string; contractAddress: string; symbol: string; issuer: string; category: string | null;
  underlyingSymbol: string | null; referencePrice: string | null; eligibility: "unknown" | "unsupported";
  source: { provider: string; reference: string };
}
export interface ObservationBatch<T> { status: ObservationHealth; capturedAt: string; observations: T[]; errorCode?: "timeout" | "provider-error" | "malformed-response" }
export interface PortfolioExposure { assetId: AssetId; symbol: string; allocationBps: number; held: boolean; allowed: boolean }
export interface RelevantSignal<T> { signal: T; relevanceBps: number; reason: string }
export interface MaraObservationContextV1 {
  contextVersion: "phase-13c.observation.v1"; capturedAt: string; portfolio: PortfolioExposure[];
  market: { status: ObservationHealth; signals: RelevantSignal<MarketSignal>[] };
  news: { status: ObservationHealth; signals: RelevantSignal<NewsSignal>[] };
  policy: { managementMode: "Advisory" | "ApprovalRequired" | "Adaptive"; executionAuthority: "none" };
  limitations: string[];
}
export interface ProposedSwapIntentV1 {
  schemaVersion: "phase-13c.proposed-swap.v1"; direction: "reduce" | "evaluate-increase"; assetId: AssetId;
  targetAllocationBps: number | null; rationale: string; evidenceRefs: string[]; advisoryConfidence: "low" | "medium" | "high";
  expiresAt: string; executionAuthority: "none"; plannerRequired: true;
}
export interface ObservationCycleResult { context: MaraObservationContextV1; proposal: ProposedSwapIntentV1 | null; summary: string }
export interface MarketObservationProvider { observeMarket(assets: PortfolioExposure[], now: Date): Promise<ObservationBatch<MarketSignal>> }
export interface NewsObservationProvider { observeNews(assets: PortfolioExposure[], now: Date): Promise<ObservationBatch<NewsSignal>> }
export interface RwaObservationProvider { discoverRwa(now: Date): Promise<ObservationBatch<RwaObservation>> }
