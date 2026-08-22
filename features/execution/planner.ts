import { keccak256, toHex } from "viem";
import type { DeterministicPlannerInput, PlannerResult } from "./types";
const BPS = 10_000n;
export function planDeterministicReduction(input: DeterministicPlannerInput, now: Date): PlannerResult {
  if (input.totalValueE18 === 0n) return { ok: false, code: "ZERO_PORTFOLIO" };
  if (Date.parse(input.expiresAt) < now.getTime()) return { ok: false, code: "STALE_PROPOSAL" };
  if (!input.destination.allowed || input.destination.address === input.assetIn.address) return { ok: false, code: "UNSUPPORTED_DESTINATION" };
  if (input.targetExposureBps > input.maximumSingleAssetExposureBps) return { ok: false, code: "PROPOSAL_OUTSIDE_CONSTITUTION" };
  if (input.targetExposureBps >= input.assetIn.allocationBps) return { ok: false, code: "NO_REDUCTION_REQUIRED" };
  const desiredValue = (input.totalValueE18 * BigInt(input.assetIn.allocationBps - input.targetExposureBps) + BPS - 1n) / BPS;
  const limitingBps = Math.min(input.maximumActionBps, input.remainingTurnoverBps);
  const maximumValue = input.totalValueE18 * BigInt(limitingBps) / BPS;
  const amountInValueE18 = desiredValue < maximumValue ? desiredValue : maximumValue;
  const scale = 10n ** BigInt(input.assetIn.decimals);
  const amountIn = (amountInValueE18 * scale + input.assetIn.priceE18 - 1n) / input.assetIn.priceE18;
  if (amountIn === 0n || amountIn > input.assetIn.balance) return { ok: false, code: "INSUFFICIENT_BALANCE" };
  const actualValue = amountIn * input.assetIn.priceE18 / scale;
  const projected = Math.max(0, input.assetIn.allocationBps - Number((actualValue * BPS) / input.totalValueE18));
  const seed = `${input.chainId}:${input.vault}:${input.proposalId}:${input.assetIn.address}:${input.destination.address}:${amountIn}:${input.targetExposureBps}:${input.expiresAt}`;
  return { ok: true, plan: { planId: keccak256(toHex(seed)), proposalId: input.proposalId, vault: input.vault, chainId: input.chainId, assetIn: input.assetIn.address, assetOut: input.destination.address, amountIn, amountInValueE18: actualValue, currentExposureBps: input.assetIn.allocationBps, targetExposureBps: input.targetExposureBps, projectedExposureBps: projected, limitingBps, remainingTurnoverBps: input.remainingTurnoverBps, maximumSlippageBps: input.maximumSlippageBps, expiresAt: input.expiresAt } };
}
