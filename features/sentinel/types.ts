import type { AssetId } from "@/features/portfolio/types";

export const SENTINEL_EVENT_TYPES = ["issuer_collateral", "regulatory_legal", "liquidity_market", "operational_cyber", "corporate_fundamental", "macro_geopolitical"] as const;
export const SENTINEL_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type SentinelEventType = (typeof SENTINEL_EVENT_TYPES)[number];
export type SentinelSeverity = (typeof SENTINEL_SEVERITIES)[number];
export type SentinelEventStatus = "corroborated-active" | "corroborated-expired" | "uncorroborated";

export interface SentinelObservation {
  observationId: string;
  eventKey: string;
  sourceId: string;
  sourceLabel: string;
  publishedAt: string;
  headline: string;
  summary: string;
  affectedAssetIds: AssetId[];
  eventType: SentinelEventType;
  severity: SentinelSeverity;
}

export interface SentinelAssetEventStatus {
  assetId: AssetId;
  sourceCount: number;
  activeSourceCount: number;
  activeSeverity: SentinelSeverity | null;
  status: SentinelEventStatus;
}
export interface SentinelEventGroup {
  eventKey: string;
  eventType: SentinelEventType;
  severity: SentinelSeverity;
  sourceCount: number;
  affectedAssetIds: AssetId[];
  earliestPublishedAt: string;
  latestPublishedAt: string;
  assetStatuses: SentinelAssetEventStatus[];
}
export interface SentinelAssetStress { assetId: AssetId; sentinelEventStressBps: number; activeCorroboratedEventKeys: string[] }
export interface SentinelAssessment {
  version: "phase-8.v1";
  status: "complete";
  executionAuthority: "none";
  feedMode: "demo";
  asOf: string;
  requestedAssetIds: AssetId[];
  observations: SentinelObservation[];
  eventGroups: SentinelEventGroup[];
  assetStress: SentinelAssetStress[];
  limitations: string[];
}
export interface SentinelProvider { scan(assetIds: readonly AssetId[], asOf: string): Promise<SentinelObservation[]> }
export interface ContextScopedSentinelAssessment { contextKey: string; assessment: SentinelAssessment }
