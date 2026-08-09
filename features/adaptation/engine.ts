import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import type { AssetPosition } from "@/features/portfolio/types";
import type { MaraProposal } from "@/features/mara/types";
import { ADAPTATION_VERSION, MAX_ADAPTATION_STEP_BPS, type AdaptationAllocation, type AdaptationInput, type AdaptationPlan } from "./types";
import { evaluateTargetAllocationCompliance } from "./target-compliance";
import { planningEligible, validateAdaptationInput, validateAdaptationPlan } from "./validation";

const ACTIONABLE = new Set(["increase_reserve", "reduce_exposure", "diversify"]);
const catalogOrder = new Map(ASSET_CATALOG.map((asset, index) => [asset.id, index]));
const canonical = (a: AssetPosition, b: AssetPosition) => catalogOrder.get(a.asset.id)! - catalogOrder.get(b.asset.id)!;
const byLowest = (a: AssetPosition, b: AssetPosition) => a.allocationBps! - b.allocationBps! || canonical(a, b);
const byHighest = (a: AssetPosition, b: AssetPosition) => b.allocationBps! - a.allocationBps! || canonical(a, b);
const standardNotes = [
  "Simulation · not executed.",
  "Phase 7 limits each generated plan to the constitution's daily reallocation ceiling. Cumulative daily execution accounting is not implemented because Phase 7 performs no execution.",
  "Future execution must reread authoritative chain state and revalidate the plan.",
];

function base(input: AdaptationInput): AdaptationPlan {
  const onchain = input.constitution.source === "onchain" ? input.constitution : null;
  return {
    version: ADAPTATION_VERSION, status: "blocked", executionAuthority: "none", vaultAddress: onchain?.vaultAddress ?? null,
    chainId: input.snapshot.chainId, portfolioBlockNumber: input.snapshot.blockNumber, constitutionBlockNumber: onchain?.blockNumber ?? null,
    selectedProposalIndex: null, selectedAction: null, selectedAssetId: null, maximumAdaptationStepBps: MAX_ADAPTATION_STEP_BPS,
    constitutionReallocationLimitBps: onchain?.constitution.maximumDailyReallocationBps ?? null,
    stepBudgetBps: onchain ? Math.min(MAX_ADAPTATION_STEP_BPS, onchain.constitution.maximumDailyReallocationBps) : 0,
    reallocationBps: 0,
    allocations: input.snapshot.positions.filter((position) => position.allocationBps !== null).map((position) => ({ assetId: position.asset.id, currentAllocationBps: position.allocationBps!, targetAllocationBps: position.allocationBps!, deltaBps: 0 })),
    postPlanCompliance: null, maraEvidenceRefs: [], blockers: [], notes: standardNotes,
  };
}

function transferCapacity(donor: AssetPosition, receiver: AssetPosition, input: AdaptationInput, step: number): number {
  if (input.constitution.source !== "onchain") return 0;
  const policy = input.constitution.constitution;
  const eligible = planningEligible(input.snapshot);
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
    const donor = meaningful.find((position) => position.asset.id === proposal.assetId);
    if (!donor) return [];
    const group = (position: AssetPosition) => position.asset.baselineRiskTier === "Reserve" ? 0 : position.asset.baselineRiskTier === "Aggressive" ? 2 : 1;
    return eligible.filter((position) => position.asset.id !== donor.asset.id).sort((a, b) => group(a) - group(b) || byLowest(a, b)).map((receiver) => [donor, receiver]);
  }
  if (proposal.action === "diversify") {
    const donor = proposal.assetId ? meaningful.find((position) => position.asset.id === proposal.assetId) : [...meaningful].sort(byHighest)[0];
    return donor ? eligible.filter((position) => position.asset.id !== donor.asset.id).sort(byLowest).map((receiver) => [donor, receiver]) : [];
  }
  return [];
}

export function createAdaptationPlan(input: AdaptationInput): AdaptationPlan {
  const plan = base(input);
  const inputBlockers = validateAdaptationInput(input);
  if (inputBlockers.length) return { ...plan, blockers: inputBlockers };
  const selectedProposalIndex = input.maraAnalysis.proposals.findIndex((proposal) => ACTIONABLE.has(proposal.action));
  if (selectedProposalIndex < 0) return { ...plan, status: "no-action", notes: ["No allocation change proposed. MARA's advisory direction did not require a deterministic portfolio movement.", ...standardNotes] };
  const proposal = input.maraAnalysis.proposals[selectedProposalIndex];
  Object.assign(plan, { selectedProposalIndex, selectedAction: proposal.action, selectedAssetId: proposal.assetId, maraEvidenceRefs: [...proposal.evidenceRefs] });
  if (plan.stepBudgetBps === 0) return { ...plan, blockers: ["Active constitution permits no reallocation."] };
  const eligible = planningEligible(input.snapshot);
  const meaningful = eligible.filter((position) => position.rawBalance! > 0n && position.allocationBps! > 0);
  if ((proposal.action === "reduce_exposure" || (proposal.action === "diversify" && proposal.assetId)) && !meaningful.some((position) => position.asset.id === proposal.assetId)) {
    return { ...plan, status: "no-action", notes: ["The MARA-referenced asset is not a meaningful current vault holding, so no allocation change is proposed.", ...standardNotes] };
  }
  let selected: [AssetPosition, AssetPosition, number] | null = null;
  for (const [donor, receiver] of candidatePairs(proposal, eligible, meaningful)) {
    const amount = transferCapacity(donor, receiver, input, plan.stepBudgetBps);
    if (amount >= 1) { selected = [donor, receiver, amount]; break; }
  }
  if (!selected) return { ...plan, blockers: [proposal.action === "increase_reserve" ? "No eligible Reserve destination has available capacity." : "No eligible donor and destination pair permits a constitution-compliant transfer."] };
  const [donor, receiver, amount] = selected;
  const allocations: AdaptationAllocation[] = plan.allocations.map((item) => {
    const deltaBps = item.assetId === donor.asset.id ? -amount : item.assetId === receiver.asset.id ? amount : 0;
    return { ...item, targetAllocationBps: item.currentAllocationBps + deltaBps, deltaBps };
  });
  const policy = input.constitution.source === "onchain" ? input.constitution.constitution : null;
  if (!policy) return { ...plan, blockers: ["An active onchain Financial Constitution is required."] };
  const proposed = { ...plan, status: "proposed" as const, reallocationBps: amount, allocations, postPlanCompliance: evaluateTargetAllocationCompliance(allocations, ASSET_CATALOG, policy) };
  const errors = validateAdaptationPlan(proposed, input);
  return errors.length ? { ...plan, blockers: errors } : proposed;
}
