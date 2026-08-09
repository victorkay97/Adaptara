import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { YieldHorizonDays, YieldTerms } from "./types";
import { evaluateYieldPosition } from "./position";

export function yieldContextFingerprint(snapshot: PortfolioSnapshot, terms: YieldTerms, horizonDays: YieldHorizonDays): string {
  const evaluation = evaluateYieldPosition(snapshot, terms.assetId);
  return JSON.stringify({ source: snapshot.source, accountAddress: snapshot.accountAddress, chainId: snapshot.chainId, blockNumber: snapshot.blockNumber?.toString() ?? null, blockConsistency: snapshot.blockConsistency, assetId: terms.assetId, positionIdentity: evaluation.identity, canonicalExpectedDecimals: evaluation.canonicalAsset?.expectedDecimals ?? null, programId: terms.programId, programVersion: terms.version, annualRateBps: terms.annualRateBps, horizonDays });
}
