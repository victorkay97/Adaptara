import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import { ADAPTATION_VERSION, MAX_ADAPTATION_STEP_BPS, type AdaptationAllocation, type AdaptationInput, type AdaptationPlan } from "./types";
import { evaluateTargetAllocationCompliance } from "./target-compliance";
import { planningEligible, validateAdaptationInput, validateAdaptationPlan } from "./validation";
import { selectAdaptationPair } from "./selection";

const ACTIONABLE = new Set(["increase_reserve", "reduce_exposure", "diversify"]);
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

export function createAdaptationPlan(input: AdaptationInput): AdaptationPlan {
  const plan = base(input);
  const inputBlockers = validateAdaptationInput(input);
  if (inputBlockers.length) return { ...plan, blockers: inputBlockers };
  const selectedProposalIndex = input.maraAnalysis.proposals.findIndex((proposal) => ACTIONABLE.has(proposal.action));
  if (selectedProposalIndex < 0) return { ...plan, status: "no-action", notes: ["No allocation change proposed. MARA's advisory direction did not require a deterministic portfolio movement.", ...standardNotes] };
  const proposal = input.maraAnalysis.proposals[selectedProposalIndex];
  Object.assign(plan, { selectedProposalIndex, selectedAction: proposal.action, selectedAssetId: proposal.assetId, maraEvidenceRefs: [...proposal.evidenceRefs] });
  if (plan.stepBudgetBps === 0) return { ...plan, blockers: ["Active constitution permits no reallocation."] };
  if ((proposal.action === "reduce_exposure" || proposal.action === "diversify") && proposal.assetId === null) return { ...plan, status: "no-action", notes: ["The selected MARA direction did not identify a specific exposure to reduce, so no allocation change is proposed.", ...standardNotes] };
  const eligible = planningEligible(input.snapshot);
  const meaningful = eligible.filter((position) => position.rawBalance! > 0n && position.allocationBps! > 0);
  if ((proposal.action === "reduce_exposure" || (proposal.action === "diversify" && proposal.assetId)) && !meaningful.some((position) => position.asset.id === proposal.assetId)) {
    return { ...plan, status: "no-action", notes: ["The MARA-referenced asset is not a meaningful current vault holding, so no allocation change is proposed.", ...standardNotes] };
  }
  const selected = input.constitution.source === "onchain" ? selectAdaptationPair(proposal, eligible, meaningful, input.constitution.constitution, plan.stepBudgetBps) : null;
  if (!selected) return { ...plan, blockers: [proposal.action === "increase_reserve" ? "No eligible Reserve destination has available capacity." : "No eligible donor and destination pair permits a constitution-compliant transfer."] };
  const { donor, receiver, amountBps: amount } = selected;
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
