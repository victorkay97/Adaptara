import type { AssetId } from "@/features/portfolio/types";
import { SENTINEL_ACTIVE_WINDOW_MS, SENTINEL_FUTURE_TOLERANCE_MS, SENTINEL_LIMITATIONS, SENTINEL_STRESS_BPS, SENTINEL_VERSION } from "./constants";
import { sentinelObservationsSchema } from "./schemas";
import type { SentinelAssessment, SentinelEventGroup, SentinelEventStatus, SentinelObservation, SentinelSeverity } from "./types";

const severityRank: Record<SentinelSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
export const stressBpsForSeverity = (severity: SentinelSeverity): number => SENTINEL_STRESS_BPS[severity];
const activeAt = (publishedAt: string, asOfMs: number) => asOfMs - Date.parse(publishedAt) < SENTINEL_ACTIVE_WINDOW_MS;

export function createSentinelAssessment(assetIds: readonly AssetId[], input: unknown, asOf: string): SentinelAssessment {
  const asOfMs = Date.parse(asOf);
  if (!Number.isFinite(asOfMs)) throw new Error("invalid Sentinel asOf");
  const providerObservations = sentinelObservationsSchema.parse(input);
  if (providerObservations.some((item) => Date.parse(item.publishedAt) > asOfMs + SENTINEL_FUTURE_TOLERANCE_MS)) throw new Error("future-dated Sentinel observation");
  const eventTypes = new Map<string, SentinelObservation["eventType"]>();
  for (const item of providerObservations) {
    const existing = eventTypes.get(item.eventKey);
    if (existing && existing !== item.eventType) throw new Error("conflicting event types for Sentinel eventKey");
    eventTypes.set(item.eventKey, item.eventType);
  }
  const observations = providerObservations.filter((item) => item.affectedAssetIds.some((id) => assetIds.includes(id)));
  const byKey = new Map<string, SentinelObservation[]>();
  for (const item of observations) byKey.set(item.eventKey, [...(byKey.get(item.eventKey) ?? []), item]);
  const eventGroups: SentinelEventGroup[] = [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([eventKey, reports]) => {
    const affectedAssetIds = [...new Set(reports.flatMap((item) => item.affectedAssetIds))].filter((id) => assetIds.includes(id)).sort() as AssetId[];
    const severity = reports.reduce<SentinelSeverity>((max, item) => severityRank[item.severity] > severityRank[max] ? item.severity : max, reports[0].severity);
    const dates = reports.map((item) => Date.parse(item.publishedAt));
    const assetStatuses = affectedAssetIds.map((assetId) => {
      const relevant = reports.filter((item) => item.affectedAssetIds.includes(assetId));
      const active = relevant.filter((item) => activeAt(item.publishedAt, asOfMs));
      const sourceCount = new Set(relevant.map((item) => item.sourceId)).size;
      const activeSourceCount = new Set(active.map((item) => item.sourceId)).size;
      const status: SentinelEventStatus = activeSourceCount >= 2 ? "corroborated-active" : active.length === 0 && sourceCount >= 2 ? "corroborated-expired" : "uncorroborated";
      const activeSeverity = status === "corroborated-active"
        ? active.reduce<SentinelSeverity>((max, item) => severityRank[item.severity] > severityRank[max] ? item.severity : max, active[0].severity)
        : null;
      return { assetId, sourceCount, activeSourceCount, activeSeverity, status };
    });
    return { eventKey, eventType: reports[0].eventType, severity, sourceCount: new Set(reports.map((item) => item.sourceId)).size, affectedAssetIds, earliestPublishedAt: new Date(Math.min(...dates)).toISOString(), latestPublishedAt: new Date(Math.max(...dates)).toISOString(), assetStatuses };
  });
  const assetStress = assetIds.map((assetId) => {
    const active = eventGroups.filter((group) => group.assetStatuses.some((item) => item.assetId === assetId && item.status === "corroborated-active"));
    return { assetId, sentinelEventStressBps: active.reduce((max, group) => {
      const severity = group.assetStatuses.find((item) => item.assetId === assetId)?.activeSeverity;
      return severity ? Math.max(max, stressBpsForSeverity(severity)) : max;
    }, 0), activeCorroboratedEventKeys: active.map((group) => group.eventKey) };
  });
  return { version: SENTINEL_VERSION, status: "complete", executionAuthority: "none", feedMode: "demo", asOf: new Date(asOfMs).toISOString(), requestedAssetIds: [...assetIds], observations, eventGroups, assetStress, limitations: [...SENTINEL_LIMITATIONS] };
}
