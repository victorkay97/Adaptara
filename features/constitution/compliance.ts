import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { ConstitutionCompliance, FinancialConstitution } from "./types";

export function evaluateConstitutionCompliance(snapshot: PortfolioSnapshot, policy: FinancialConstitution): ConstitutionCompliance {
  const meaningful = snapshot.positions.filter((position) => position.rawBalance !== null && position.rawBalance > 0n);
  const allocationsValid = meaningful.length > 0
    && meaningful.every((position) => Number.isInteger(position.allocationBps) && position.allocationBps! >= 0 && position.allocationBps! <= 10_000)
    && meaningful.reduce((total, position) => total + position.allocationBps!, 0) === 10_000;
  const unavailable = snapshot.valuationStatus !== "valued" || !allocationsValid;
  const dailyReallocation = { status: "action-limit" as const, configuredLimitBps: policy.maximumDailyReallocationBps };
  if (unavailable) return {
    status: "unavailable", reserve: { status: "unavailable", actualBps: null, requiredBps: policy.minimumReserveBps },
    singleAsset: { status: "unavailable", violatingAssetIds: [], observedMaximumBps: null, configuredMaximumBps: policy.maximumSingleAssetExposureBps },
    aggressive: { status: "unavailable", actualBps: null, maximumBps: policy.maximumAggressiveExposureBps }, dailyReallocation,
  };
  const reserveBps = meaningful.filter((position) => position.asset.baselineRiskTier === "Reserve").reduce((sum, position) => sum + position.allocationBps!, 0);
  const aggressiveBps = meaningful.filter((position) => position.asset.baselineRiskTier === "Aggressive").reduce((sum, position) => sum + position.allocationBps!, 0);
  const violatingAssetIds = meaningful.filter((position) => position.allocationBps! > policy.maximumSingleAssetExposureBps).map((position) => position.asset.id);
  const observedMaximumBps = meaningful.reduce((maximum, position) => Math.max(maximum, position.allocationBps!), 0);
  const reserveStatus = reserveBps >= policy.minimumReserveBps ? "compliant" : "violated";
  const singleStatus = violatingAssetIds.length === 0 ? "compliant" : "violated";
  const aggressiveStatus = aggressiveBps <= policy.maximumAggressiveExposureBps ? "compliant" : "violated";
  return { status: reserveStatus === "compliant" && singleStatus === "compliant" && aggressiveStatus === "compliant" ? "compliant" : "violated", reserve: { status: reserveStatus, actualBps: reserveBps, requiredBps: policy.minimumReserveBps }, singleAsset: { status: singleStatus, violatingAssetIds, observedMaximumBps, configuredMaximumBps: policy.maximumSingleAssetExposureBps }, aggressive: { status: aggressiveStatus, actualBps: aggressiveBps, maximumBps: policy.maximumAggressiveExposureBps }, dailyReallocation };
}
