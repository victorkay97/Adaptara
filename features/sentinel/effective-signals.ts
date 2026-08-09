import type { ExternalRiskSignals } from "@/features/risk/types";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { SentinelAssessment } from "./types";

export function overlaySentinelStress(base: ReadonlyMap<string, ExternalRiskSignals | null>, assessment?: SentinelAssessment | null): Map<string, ExternalRiskSignals | null> {
  const effective = new Map(base);
  if (!assessment) return effective;
  for (const item of assessment.assetStress) {
    const current = effective.get(item.assetId);
    if (current) effective.set(item.assetId, { ...current, marketEventStressScoreBps: Math.max(current.marketEventStressScoreBps, item.sentinelEventStressBps) });
  }
  return effective;
}

export function sentinelInfluencesPortfolioRisk(snapshot: PortfolioSnapshot, base: ReadonlyMap<string, ExternalRiskSignals | null>, assessment?: SentinelAssessment | null): boolean {
  if (!assessment) return false;
  return snapshot.positions.some((position) => {
    if (position.rawBalance === null || position.rawBalance <= 0n) return false;
    const baseSignal = base.get(position.asset.id);
    const sentinelStress = assessment.assetStress.find((item) => item.assetId === position.asset.id)?.sentinelEventStressBps;
    return Boolean(baseSignal && sentinelStress !== undefined && sentinelStress > baseSignal.marketEventStressScoreBps);
  });
}

export const riskAssessedAtWithSentinel = (snapshot: PortfolioSnapshot, base: ReadonlyMap<string, ExternalRiskSignals | null>, assessment?: SentinelAssessment | null): string =>
  sentinelInfluencesPortfolioRisk(snapshot, base, assessment) ? assessment!.asOf : snapshot.capturedAt;
