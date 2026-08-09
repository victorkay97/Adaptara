import type { PortfolioSnapshot } from "@/features/portfolio/types";
import { BPS_DENOMINATOR, DAY_COUNT_BASIS, X_LAYER_TESTNET_CHAIN_ID, YIELD_HORIZONS, YIELD_MODEL_VERSION } from "./constants";
import type { YieldHorizonDays, YieldProjectionResult, YieldTerms } from "./types";
import { validateYieldTerms } from "./validation";
import { evaluateYieldPosition } from "./position";

export function calculateYieldAmounts(principalRaw: bigint, annualRateBps: number, horizonDays: YieldHorizonDays) {
  if (principalRaw < 0n) throw new Error("Principal must be non-negative");
  if (!Number.isInteger(annualRateBps) || annualRateBps < 0 || annualRateBps > 10_000) throw new Error("Invalid annualized rate BPS");
  if (!YIELD_HORIZONS.includes(horizonDays)) throw new Error("Unsupported yield horizon");
  const rate = BigInt(annualRateBps);
  const simpleYieldRaw = principalRaw * rate * BigInt(horizonDays) / (BPS_DENOMINATOR * DAY_COUNT_BASIS);
  let balance = principalRaw;
  for (let day = 0; day < horizonDays; day += 1) balance += balance * rate / (BPS_DENOMINATOR * DAY_COUNT_BASIS);
  const compoundedYieldRaw = balance - principalRaw;
  return { simpleYieldRaw, compoundedYieldRaw, compoundingDeltaVsSimpleRaw: compoundedYieldRaw - simpleYieldRaw, projectedEndingBalanceRaw: balance };
}

export function projectVaultYield(snapshot: PortfolioSnapshot, unvalidatedTerms: YieldTerms, horizonDays: YieldHorizonDays): YieldProjectionResult {
  let terms: YieldTerms;
  try { terms = validateYieldTerms(unvalidatedTerms); } catch { return { status: "unavailable", reason: "Yield terms are invalid or untrusted." }; }
  if (snapshot.source !== "vault") return { status: "unavailable", reason: "Compounding simulation is available only for Adaptara Vault holdings." };
  if (snapshot.chainId !== X_LAYER_TESTNET_CHAIN_ID) return { status: "unavailable", reason: "X Layer Testnet (chain 1952) is required." };
  if (snapshot.blockNumber === null) return { status: "unavailable", reason: "Portfolio block provenance is unavailable." };
  if (snapshot.blockConsistency !== "single-block") return { status: "unavailable", reason: "A single-block vault snapshot is required." };
  const { canonicalAsset, position, identity } = evaluateYieldPosition(snapshot, terms.assetId);
  if (!position || !canonicalAsset || !identity.metadataMatchesCanonical || position.availability !== "available" || position.rawBalance === null || position.rawBalance <= 0n || position.balanceDecimals !== canonicalAsset.expectedDecimals) return { status: "unavailable", reason: "No eligible sTRSY vault balance is available for a compounding simulation." };
  const amounts = calculateYieldAmounts(position.rawBalance, terms.annualRateBps, horizonDays);
  return { status: "projected", projection: { version: YIELD_MODEL_VERSION, status: "projected", executionAuthority: "none", mode: "demo", vaultAddress: snapshot.accountAddress, chainId: X_LAYER_TESTNET_CHAIN_ID, portfolioBlockNumber: snapshot.blockNumber, assetId: terms.assetId, programId: terms.programId, horizonDays, annualRateBps: terms.annualRateBps, principalRaw: position.rawBalance, ...amounts, tokenDecimals: position.balanceDecimals, limitations: terms.limitations } };
}
