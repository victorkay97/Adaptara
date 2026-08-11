import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import type { AssetPosition } from "@/features/portfolio/types";
import type { FinancialConstitution } from "@/features/constitution/types";
import type { MaraProposal } from "@/features/mara/types";

export interface AdaptationPair {
  donor: AssetPosition;
  receiver: AssetPosition;
  amountBps: number;
}

const catalogOrder = new Map(ASSET_CATALOG.map((asset, index) => [asset.id, index]));
const canonical = (a: AssetPosition, b: AssetPosition) => catalogOrder.get(a.asset.id)! - catalogOrder.get(b.asset.id)!;
const byLowest = (a: AssetPosition, b: AssetPosition) => a.allocationBps! - b.allocationBps! || canonical(a, b);
const byHighest = (a: AssetPosition, b: AssetPosition) => b.allocationBps! - a.allocationBps! || canonical(a, b);

function transferCapacity(donor: AssetPosition, receiver: AssetPosition, eligible: AssetPosition[], policy: FinancialConstitution, step: number): number {
  const reserve = eligible.filter((position) => position.asset.baselineRiskTier === "Reserve").reduce((sum, position) => sum + position.allocationBps!, 0);
  const aggressive = eligible.filter((position) => position.asset.baselineRiskTier === "Aggressive").reduce((sum, position) => sum + position.allocationBps!, 0);
  let capacity = Math.min(step, donor.allocationBps!, policy.maximumSingleAssetExposureBps - receiver.allocationBps!);
  if (donor.asset.baselineRiskTier === "Reserve" && receiver.asset.baselineRiskTier !== "Reserve") capacity = Math.min(capacity, reserve - policy.minimumReserveBps);
  if (receiver.asset.baselineRiskTier === "Aggressive" && donor.asset.baselineRiskTier !== "Aggressive") capacity = Math.min(capacity, policy.maximumAggressiveExposureBps - aggressive);
  return Math.max(0, capacity);
}

function candidatePairs(proposal: MaraProposal, eligible: AssetPosition[], meaningful: AssetPosition[]): Array<[AssetPosition, AssetPosition]> {
  if (proposal.action === "increase_reserve") {
    const donors = meaningful.filter((position) => position.asset.baselineRiskTier !== "Reserve").sort(byHighest);
    const receivers = eligible.filter((position) => position.asset.baselineRiskTier === "Reserve").sort(byLowest);
    return donors.flatMap((donor) => receivers.map((receiver) => [donor, receiver] as [AssetPosition, AssetPosition]));
  }
  if (proposal.action === "reduce_exposure") {
    const donor = proposal.assetId ? meaningful.find((position) => position.asset.id === proposal.assetId) : undefined;
    if (!donor) return [];
    const group = (position: AssetPosition) => position.asset.baselineRiskTier === "Reserve" ? 0 : position.asset.baselineRiskTier === "Aggressive" ? 2 : 1;
    return eligible.filter((position) => position.asset.id !== donor.asset.id).sort((a, b) => group(a) - group(b) || byLowest(a, b)).map((receiver) => [donor, receiver]);
  }
  if (proposal.action === "diversify") {
    const donor = proposal.assetId ? meaningful.find((position) => position.asset.id === proposal.assetId) : undefined;
    if (!donor) return [];
    const group = (position: AssetPosition) => position.asset.baselineRiskTier === "Aggressive" ? 1 : 0;
    return eligible.filter((position) => position.asset.id !== donor.asset.id).sort((a, b) => group(a) - group(b) || byLowest(a, b)).map((receiver) => [donor, receiver]);
  }
  return [];
}

export function selectAdaptationPair(proposal: MaraProposal, eligible: AssetPosition[], meaningful: AssetPosition[], policy: FinancialConstitution, step: number): AdaptationPair | null {
  for (const [donor, receiver] of candidatePairs(proposal, eligible, meaningful)) {
    const amountBps = transferCapacity(donor, receiver, eligible, policy, step);
    if (amountBps >= 1) return { donor, receiver, amountBps };
  }
  return null;
}
