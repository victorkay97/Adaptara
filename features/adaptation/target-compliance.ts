import type { FinancialConstitution, ConstitutionCompliance } from "@/features/constitution/types";
import type { AssetId, AssetMetadata } from "@/features/portfolio/types";

export interface TargetAllocation { assetId: AssetId; targetAllocationBps: number }

export function evaluateTargetAllocationCompliance(allocations: readonly TargetAllocation[], catalog: readonly AssetMetadata[], policy: FinancialConstitution): ConstitutionCompliance {
  const metadata = new Map(catalog.map((asset) => [asset.id, asset]));
  const valuesValid = allocations.length > 0
    && allocations.every((allocation) => metadata.has(allocation.assetId) && Number.isInteger(allocation.targetAllocationBps) && allocation.targetAllocationBps >= 0 && allocation.targetAllocationBps <= 10_000)
    && new Set(allocations.map((allocation) => allocation.assetId)).size === allocations.length
    && allocations.reduce((sum, allocation) => sum + allocation.targetAllocationBps, 0) === 10_000;
  const dailyReallocation = { status: "action-limit" as const, configuredLimitBps: policy.maximumDailyReallocationBps };
  if (!valuesValid) return {
    status: "unavailable", reserve: { status: "unavailable", actualBps: null, requiredBps: policy.minimumReserveBps },
    singleAsset: { status: "unavailable", violatingAssetIds: [], observedMaximumBps: null, configuredMaximumBps: policy.maximumSingleAssetExposureBps },
    aggressive: { status: "unavailable", actualBps: null, maximumBps: policy.maximumAggressiveExposureBps }, dailyReallocation,
  };
  const reserveBps = allocations.filter((allocation) => metadata.get(allocation.assetId)!.baselineRiskTier === "Reserve").reduce((sum, allocation) => sum + allocation.targetAllocationBps, 0);
  const aggressiveBps = allocations.filter((allocation) => metadata.get(allocation.assetId)!.baselineRiskTier === "Aggressive").reduce((sum, allocation) => sum + allocation.targetAllocationBps, 0);
  const violatingAssetIds = allocations.filter((allocation) => allocation.targetAllocationBps > policy.maximumSingleAssetExposureBps).map((allocation) => allocation.assetId);
  const observedMaximumBps = allocations.reduce((maximum, allocation) => Math.max(maximum, allocation.targetAllocationBps), 0);
  const reserveStatus = reserveBps >= policy.minimumReserveBps ? "compliant" : "violated";
  const singleStatus = violatingAssetIds.length === 0 ? "compliant" : "violated";
  const aggressiveStatus = aggressiveBps <= policy.maximumAggressiveExposureBps ? "compliant" : "violated";
  return { status: reserveStatus === "compliant" && singleStatus === "compliant" && aggressiveStatus === "compliant" ? "compliant" : "violated", reserve: { status: reserveStatus, actualBps: reserveBps, requiredBps: policy.minimumReserveBps }, singleAsset: { status: singleStatus, violatingAssetIds, observedMaximumBps, configuredMaximumBps: policy.maximumSingleAssetExposureBps }, aggressive: { status: aggressiveStatus, actualBps: aggressiveBps, maximumBps: policy.maximumAggressiveExposureBps }, dailyReallocation };
}
