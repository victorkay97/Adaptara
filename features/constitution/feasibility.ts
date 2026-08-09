import { BPS_DENOMINATOR } from "./constants";
import type { AssetMetadata } from "@/features/portfolio/types";
import type { ConstitutionFeasibility, FinancialConstitution } from "./types";

export function evaluateConstitutionFeasibility(policy: FinancialConstitution, assets: readonly AssetMetadata[]): ConstitutionFeasibility {
  const reserveCount = assets.filter((asset) => asset.baselineRiskTier === "Reserve").length;
  const nonAggressiveCount = assets.filter((asset) => asset.baselineRiskTier !== "Aggressive").length;
  const aggressiveCount = assets.filter((asset) => asset.baselineRiskTier === "Aggressive").length;
  const reserveCapacityBps = reserveCount * policy.maximumSingleAssetExposureBps;
  const nonAggressiveCapacityBps = nonAggressiveCount * policy.maximumSingleAssetExposureBps;
  const aggressivePhysicalCapacityBps = aggressiveCount * policy.maximumSingleAssetExposureBps;
  const allowedAggressiveCapacityBps = Math.min(aggressivePhysicalCapacityBps, policy.maximumAggressiveExposureBps);
  const totalPermittedCapacityBps = Math.min(BPS_DENOMINATOR, nonAggressiveCapacityBps + allowedAggressiveCapacityBps);
  const issues: string[] = [];
  if (reserveCapacityBps < policy.minimumReserveBps) issues.push("This constitution cannot currently satisfy both the reserve minimum and single-asset limit with Adaptara's supported Reserve assets.");
  if (totalPermittedCapacityBps < BPS_DENOMINATOR) issues.push("This constitution does not permit enough total capacity across Adaptara's supported assets to allocate a complete portfolio.");
  return { feasible: issues.length === 0, reserveCapacityBps, nonAggressiveCapacityBps, aggressivePhysicalCapacityBps, allowedAggressiveCapacityBps, totalPermittedCapacityBps, issues };
}
