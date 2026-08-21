import { keccak256, toHex } from "viem";
import type { DeterministicSwapPlan, NormalizedSwapRoute, PreparedAdaptiveExecution, RouteTrustConfig } from "./types";
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export function validateRoute(plan: DeterministicSwapPlan, route: NormalizedSwapRoute, trust: RouteTrustConfig, now: Date): string[] {
  const errors: string[] = [];
  if (route.chainId !== plan.chainId || route.chainId !== trust.chainId) errors.push("WRONG_CHAIN");
  if (!same(route.assetIn, plan.assetIn)) errors.push("WRONG_INPUT_TOKEN"); if (!same(route.assetOut, plan.assetOut)) errors.push("WRONG_OUTPUT_TOKEN");
  if (route.amountIn !== plan.amountIn) errors.push("WRONG_AMOUNT"); if (!same(route.recipient, plan.vault)) errors.push("WRONG_RECIPIENT");
  if (!trust.routers.some((x) => same(x, route.router))) errors.push("UNKNOWN_ROUTER"); if (!trust.approvalTargets.some((x) => same(x, route.approvalTarget))) errors.push("UNKNOWN_APPROVAL_TARGET");
  if (route.slippageBps > plan.maximumSlippageBps) errors.push("EXCESSIVE_SLIPPAGE"); if (route.priceImpactBps !== null && route.priceImpactBps > trust.maximumPriceImpactBps) errors.push("EXCESSIVE_PRICE_IMPACT");
  if (route.taxOrHoneypot) errors.push("UNSUPPORTED_TOKEN_SIGNAL"); if (route.transactionValue !== 0n) errors.push("NATIVE_VALUE_NOT_SUPPORTED");
  if (Date.parse(route.expiresAt) < now.getTime() || Date.parse(plan.expiresAt) < now.getTime()) errors.push("EXPIRED"); if (route.minimumAmountOut <= 0n || route.estimatedAmountOut < route.minimumAmountOut) errors.push("INVALID_OUTPUT");
  return errors;
}
export function routeCommitment(plan: DeterministicSwapPlan, route: NormalizedSwapRoute): `0x${string}` { return keccak256(toHex(JSON.stringify({ planId: plan.planId, vault: plan.vault, chainId: plan.chainId, assetIn: plan.assetIn, assetOut: plan.assetOut, amountIn: plan.amountIn.toString(), minimumAmountOut: route.minimumAmountOut.toString(), router: route.router, approvalTarget: route.approvalTarget, calldataHash: route.calldataHash, expiresAt: route.expiresAt }))); }
export function prepareExecution(plan: DeterministicSwapPlan, route: NormalizedSwapRoute, simulationPassed: boolean): PreparedAdaptiveExecution { return { status: simulationPassed ? "SimulationPassed" : "Blocked", proposalId: plan.proposalId, planId: plan.planId, vault: plan.vault, chainId: plan.chainId, routeCommitment: routeCommitment(plan, route), route, constitutionPassed: true, simulation: { passed: simulationPassed, provider: "local-fixture", reference: null }, executorAddress: null, broadcastAuthorized: false }; }
