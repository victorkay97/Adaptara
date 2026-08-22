import { getAddress } from "viem";
import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import { ASSET_IDS, type AssetPosition, type CanonicalAssetId, type PortfolioSnapshot } from "@/features/portfolio/types";
import { evaluateConstitutionCompliance } from "@/features/constitution/compliance";
import { evaluateConstitutionFeasibility } from "@/features/constitution/feasibility";
import { validateConstitution } from "@/features/constitution/validation";
import { RISK_FACTOR_WEIGHTS, RISK_SCORE_MAX } from "@/features/risk/constants";
import { weightedContribution } from "@/features/risk/scoring";
import { currentRiskTierForScore } from "@/features/risk/tiers";
import { RISK_FACTOR_IDS } from "@/features/risk/types";
import { MARA_ACTIONS } from "@/features/mara/types";
import { evaluateTargetAllocationCompliance } from "./target-compliance";
import { MAX_ADAPTATION_STEP_BPS, type AdaptationInput, type AdaptationPlan } from "./types";
import { selectAdaptationPair } from "./selection";

const catalogById = new Map(ASSET_CATALOG.map((asset) => [asset.id, asset]));
const actionable = new Set(["increase_reserve", "reduce_exposure", "diversify"]);
const exactJson = (value: unknown) => JSON.stringify(value);

export const planningEligible = (snapshot: PortfolioSnapshot): AssetPosition[] => snapshot.positions.filter((position) => {
  const canonical = catalogById.get(position.asset.id);
  return Boolean(canonical && position.asset.baselineRiskTier === canonical.baselineRiskTier && position.availability === "available" && position.rawBalance !== null && position.referencePrice !== null && position.referencePrice.assetId === position.asset.id && position.allocationBps !== null);
});

function validateSnapshot(snapshot: PortfolioSnapshot): string[] {
  const errors: string[] = [];
  if (snapshot.blockConsistency !== "single-block") errors.push("The portfolio must preserve single-block onchain consistency.");
  try { getAddress(snapshot.accountAddress); } catch { errors.push("The portfolio account address is invalid."); }
  const ids = snapshot.positions.map((position) => position.asset.id);
  if (new Set(ids).size !== ids.length) errors.push("The portfolio contains duplicate asset IDs.");
  if (ids.length !== ASSET_IDS.length || ASSET_IDS.some((id) => !ids.includes(id))) errors.push("The portfolio must contain every canonical Adaptara asset exactly once.");
  for (const position of snapshot.positions) {
    const canonical = catalogById.get(position.asset.id);
    if (!canonical || !ASSET_IDS.includes(position.asset.id as CanonicalAssetId)) errors.push("The portfolio contains a non-canonical asset ID.");
    else if (
      position.asset.symbol !== canonical.symbol
      || position.asset.displayName !== canonical.displayName
      || position.asset.role !== canonical.role
      || position.asset.baselineRiskTier !== canonical.baselineRiskTier
      || position.asset.expectedDecimals !== canonical.expectedDecimals
      || position.asset.sandbox !== canonical.sandbox
      || position.asset.referencePriceId !== canonical.referencePriceId
    ) errors.push(`Asset ${position.asset.id} does not match canonical policy metadata.`);
    if (canonical) {
      if (position.availability === "available" && (position.rawBalance === null || position.balanceDecimals !== canonical.expectedDecimals)) errors.push(`Available asset ${position.asset.id} must have a known balance with canonical decimals.`);
      if ((position.availability === "read-error" || position.availability === "configuration-error") && position.rawBalance !== null) errors.push(`Unavailable asset ${position.asset.id} cannot present an unknown balance as known.`);
    }
  }
  const meaningful = snapshot.positions.filter((position) => position.rawBalance !== null && position.rawBalance > 0n);
  if (!meaningful.length) errors.push("The vault portfolio has no meaningful nonzero holding.");
  if (meaningful.some((position) => position.availability !== "available" || position.allocationBps === null || position.referencePrice === null || position.referencePrice.assetId !== position.asset.id)) errors.push("Every meaningful holding must be available, allocated, and have a usable reference price.");
  const allocations = snapshot.positions.filter((position) => position.allocationBps !== null);
  if (allocations.some((position) => !Number.isInteger(position.allocationBps) || position.allocationBps! < 0 || position.allocationBps! > 10_000)
      || meaningful.some((position) => position.allocationBps === null)
      || allocations.reduce((sum, position) => sum + position.allocationBps!, 0) !== 10_000) errors.push("The current allocation map must contain exact integer BPS totaling 10,000.");
  if (snapshot.positions.some((position) => position.rawBalance === null && position.availability !== "not-configured" && position.availability !== "unsupported")) errors.push("The portfolio contains an unknown configured balance.");
  return errors;
}

function validateRisk(input: AdaptationInput): string[] {
  const { snapshot, riskAssessment } = input;
  const errors: string[] = [];
  if (riskAssessment.status !== "assessed" || riskAssessment.portfolioRiskScoreBps === null || riskAssessment.portfolioCurrentRiskTier === null || riskAssessment.reason !== "complete" || riskAssessment.unavailableAssets.length !== 0) return ["A complete assessed deterministic risk result is required."];
  const meaningful = snapshot.positions.filter((position) => position.rawBalance !== null && position.rawBalance > 0n);
  const assessmentIds = riskAssessment.assetAssessments.map((assessment) => assessment.assetId);
  if (new Set(assessmentIds).size !== assessmentIds.length || assessmentIds.length !== meaningful.length) errors.push("Risk assessments must correspond exactly once to meaningful holdings.");
  for (const position of meaningful) {
    const matches = riskAssessment.assetAssessments.filter((assessment) => assessment.assetId === position.asset.id);
    if (matches.length !== 1) { errors.push(`Risk assessment coverage for ${position.asset.id} is incoherent.`); continue; }
    const assessment = matches[0];
    const canonical = catalogById.get(assessment.assetId);
    if (!canonical || assessment.baselineRiskTier !== canonical.baselineRiskTier) errors.push(`Risk assessment metadata for ${position.asset.id} is non-canonical.`);
    const factorIds = assessment.factors.map((factor) => factor.factorId);
    if (factorIds.length !== RISK_FACTOR_IDS.length || new Set(factorIds).size !== RISK_FACTOR_IDS.length || RISK_FACTOR_IDS.some((id) => !factorIds.includes(id))) { errors.push(`Risk factors for ${position.asset.id} are incomplete or duplicated.`); continue; }
    let score = 0;
    for (const factor of assessment.factors) {
      if (!Number.isInteger(factor.inputScoreBps) || factor.inputScoreBps < 0 || factor.inputScoreBps > RISK_SCORE_MAX || !Number.isInteger(factor.weightedContributionBps) || factor.weightedContributionBps < 0 || factor.weightedContributionBps > RISK_SCORE_MAX || factor.weightBps !== RISK_FACTOR_WEIGHTS[factor.factorId] || factor.weightedContributionBps !== weightedContribution(factor.inputScoreBps, factor.weightBps)) errors.push(`Risk factor math for ${position.asset.id} is incoherent.`);
      if (factor.factorId === "concentration" && (factor.inputScoreBps !== position.allocationBps || factor.source !== "portfolio-derived")) errors.push(`Concentration risk for ${position.asset.id} is incoherent with current allocation.`);
      score += factor.weightedContributionBps;
    }
    if (!Number.isInteger(assessment.scoreBps) || assessment.scoreBps < 0 || assessment.scoreBps > RISK_SCORE_MAX || score > RISK_SCORE_MAX || assessment.scoreBps !== score || (score <= RISK_SCORE_MAX && assessment.currentRiskTier !== currentRiskTierForScore(score))) errors.push(`Asset risk score for ${position.asset.id} is incoherent.`);
  }
  const weightedTotal = riskAssessment.assetAssessments.reduce((sum, assessment) => sum + assessment.scoreBps * (meaningful.find((position) => position.asset.id === assessment.assetId)?.allocationBps ?? 0), 0);
  const expectedPortfolioScore = Math.floor(weightedTotal / RISK_SCORE_MAX);
  if (!Number.isInteger(riskAssessment.portfolioRiskScoreBps) || riskAssessment.portfolioRiskScoreBps < 0 || riskAssessment.portfolioRiskScoreBps > RISK_SCORE_MAX || expectedPortfolioScore > RISK_SCORE_MAX || riskAssessment.portfolioRiskScoreBps !== expectedPortfolioScore || (expectedPortfolioScore <= RISK_SCORE_MAX && riskAssessment.portfolioCurrentRiskTier !== currentRiskTierForScore(expectedPortfolioScore))) errors.push("Portfolio risk score or tier is incoherent with its asset assessments.");
  return errors;
}

export function validateAdaptationInput(input: AdaptationInput): string[] {
  const blockers: string[] = [];
  const { snapshot, constitution, maraAnalysis } = input;
  if (snapshot.source !== "vault") blockers.push("Adaptation planning is available only for an Adaptara Vault portfolio.");
  if (snapshot.chainId !== 1952) blockers.push("Adaptation planning requires X Layer Testnet (chain 1952).");
  if (snapshot.valuationStatus !== "valued") blockers.push("The vault portfolio must have a complete valued allocation.");
  if (snapshot.blockNumber === null) blockers.push("The portfolio snapshot is missing its authoritative block number.");
  blockers.push(...validateSnapshot(snapshot), ...validateRisk(input));
  if (maraAnalysis.status !== "complete" || maraAnalysis.proposals.some((proposal) => proposal.executionAuthority !== "none" || !MARA_ACTIONS.includes(proposal.action))) blockers.push("An already-validated, complete MARA advisory analysis is required.");
  if (constitution.source !== "onchain") blockers.push("An active onchain Financial Constitution is required.");
  if (constitution.source === "onchain") {
    try {
      if (getAddress(snapshot.accountAddress) !== getAddress(constitution.vaultAddress)) blockers.push("The portfolio snapshot does not belong to the constitution's vault.");
    } catch { blockers.push("The portfolio or constitution vault address is invalid."); }
    const validation = validateConstitution(constitution.constitution);
    if (!validation.valid) blockers.push("The active Financial Constitution is structurally invalid.");
    else if (!evaluateConstitutionFeasibility(validation.value, ASSET_CATALOG).feasible) blockers.push("The active Financial Constitution is infeasible for the supported asset catalog.");
    if (validation.valid) {
      const compliance = evaluateConstitutionCompliance(snapshot, validation.value);
      if (compliance.status === "violated") blockers.push("The current vault portfolio already violates its active Financial Constitution. Normal MARA-directed adaptation is blocked.");
      else if (compliance.status !== "compliant") blockers.push("Current vault compliance cannot be established.");
    }
  }
  return [...new Set(blockers)];
}

export function validateAdaptationPlan(plan: AdaptationPlan, input: AdaptationInput): string[] {
  const errors: string[] = validateAdaptationInput(input).map((error) => `Authoritative input invalid: ${error}`);
  if (plan.version !== "phase-7.v1" || plan.executionAuthority !== "none") errors.push("Plan authority or version is invalid.");
  const expected = input.snapshot.positions.filter((position) => position.allocationBps !== null);
  const planIds = plan.allocations.map((item) => item.assetId);
  const expectedIds = expected.map((position) => position.asset.id);
  if (new Set(planIds).size !== planIds.length || planIds.some((id) => !catalogById.has(id)) || exactJson(planIds) !== exactJson(expectedIds)) errors.push("Plan asset map does not exactly match the authoritative allocation universe.");
  if (plan.allocations.some((item, index) => !Number.isInteger(item.currentAllocationBps) || item.currentAllocationBps < 0 || item.currentAllocationBps > 10_000 || item.currentAllocationBps !== expected[index]?.allocationBps || !Number.isInteger(item.targetAllocationBps) || item.targetAllocationBps < 0 || item.targetAllocationBps > 10_000 || !Number.isInteger(item.deltaBps) || item.deltaBps !== item.targetAllocationBps - item.currentAllocationBps)) errors.push("Plan allocations must match authoritative current values and contain coherent exact BPS.");
  const currentTotal = plan.allocations.reduce((sum, item) => sum + item.currentAllocationBps, 0);
  const targetTotal = plan.allocations.reduce((sum, item) => sum + item.targetAllocationBps, 0);
  const positive = plan.allocations.reduce((sum, item) => sum + Math.max(0, item.deltaBps), 0);
  const negative = plan.allocations.reduce((sum, item) => sum + Math.max(0, -item.deltaBps), 0);
  if (currentTotal !== 10_000 || targetTotal !== 10_000 || positive !== negative || plan.reallocationBps !== positive) errors.push("Plan allocation totals or reallocation measurement are invalid.");
  if (plan.status === "proposed") {
    const donors = plan.allocations.filter((item) => item.deltaBps < 0), receivers = plan.allocations.filter((item) => item.deltaBps > 0);
    if (donors.length !== 1 || receivers.length !== 1) errors.push("A proposed plan must contain exactly one donor and one receiver.");
    const eligible = new Set(planningEligible(input.snapshot).map((position) => position.asset.id));
    const meaningful = new Set(planningEligible(input.snapshot).filter((position) => position.rawBalance! > 0n && position.allocationBps! > 0).map((position) => position.asset.id));
    if (donors[0] && !meaningful.has(donors[0].assetId)) errors.push("Plan donor is not a meaningful permitted holding.");
    if (receivers[0] && !eligible.has(receivers[0].assetId)) errors.push("Plan receiver is not planning eligible.");
    if (input.constitution.source !== "onchain") errors.push("Proposed plan lacks onchain authority.");
    else {
      let vaultMatches = false;
      try { vaultMatches = plan.vaultAddress !== null && getAddress(plan.vaultAddress) === getAddress(input.constitution.vaultAddress); } catch { vaultMatches = false; }
      if (!vaultMatches || plan.chainId !== input.snapshot.chainId || input.snapshot.chainId !== 1952 || plan.portfolioBlockNumber !== input.snapshot.blockNumber || plan.constitutionBlockNumber !== input.constitution.blockNumber) errors.push("Plan provenance does not match authoritative vault, chain, or block inputs.");
      const expectedStep = Math.min(MAX_ADAPTATION_STEP_BPS, input.constitution.constitution.maximumDailyReallocationBps);
      if (plan.maximumAdaptationStepBps !== MAX_ADAPTATION_STEP_BPS || plan.constitutionReallocationLimitBps !== input.constitution.constitution.maximumDailyReallocationBps || plan.stepBudgetBps !== expectedStep || plan.reallocationBps < 1 || plan.reallocationBps > expectedStep) errors.push("Proposed movement or safety fields do not match authoritative limits.");
      const firstIndex = input.maraAnalysis.proposals.findIndex((proposal) => actionable.has(proposal.action));
      const proposal = input.maraAnalysis.proposals[firstIndex];
      if (!proposal || plan.selectedProposalIndex !== firstIndex || plan.selectedAction !== proposal.action || plan.selectedAssetId !== proposal.assetId || exactJson(plan.maraEvidenceRefs) !== exactJson(proposal.evidenceRefs)) errors.push("Selected MARA proposal provenance is invalid.");
      if (proposal) {
        const eligiblePositions = planningEligible(input.snapshot);
        const meaningfulPositions = eligiblePositions.filter((position) => position.rawBalance! > 0n && position.allocationBps! > 0);
        const expectedPair = selectAdaptationPair(proposal, eligiblePositions, meaningfulPositions, input.constitution.constitution, expectedStep);
        if (!expectedPair || donors[0]?.assetId !== expectedPair.donor.asset.id || receivers[0]?.assetId !== expectedPair.receiver.asset.id || plan.reallocationBps !== expectedPair.amountBps) errors.push("Plan movement does not match the deterministic action, donor, receiver, or capacity policy.");
      }
      const compliance = evaluateTargetAllocationCompliance(plan.allocations, ASSET_CATALOG, input.constitution.constitution);
      if (compliance.status !== "compliant") errors.push("Target allocation is not constitution-compliant.");
      if (exactJson(plan.postPlanCompliance) !== exactJson(compliance)) errors.push("Recorded post-plan compliance does not match independent target evaluation.");
    }
  } else if (plan.reallocationBps !== 0) errors.push("A non-proposed plan cannot contain movement.");
  return [...new Set(errors)];
}
