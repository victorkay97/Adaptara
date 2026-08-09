import { describe, expect, it } from "vitest";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import { yieldContextFingerprint } from "./context";
import { DEMO_STRSY_TERMS } from "./terms";
import { maraContextFingerprint } from "@/features/mara/context";
import { sentinelContextFingerprint } from "@/features/sentinel/context";
import { adaptationContextKey } from "@/features/adaptation/components/adaptation-plan";
import type { PortfolioRiskAssessment } from "@/features/risk/types";
import { projectionForContext } from "./components/yield-panel";
import { createAssetCatalog } from "@/features/portfolio/catalog";
const snapshot = { source: "vault", accountAddress: "0x0000000000000000000000000000000000000001", chainId: 1952, blockNumber: 1n, capturedAt: "fixture", valuationStatus: "unavailable", priceSources: [], positions: [{ asset: { id: "strsy", expectedDecimals: 18 }, availability: "available", rawBalance: 10n, balanceDecimals: 18 }] } as unknown as PortfolioSnapshot;
describe("yield context isolation", () => { it("changes for every eligibility and authority input", () => {
  const base = yieldContextFingerprint(snapshot, DEMO_STRSY_TERMS, 365);
  const changedPosition = (change: object) => ({ ...snapshot, positions: [{ ...snapshot.positions[0], ...change }] });
  expect(yieldContextFingerprint({ ...snapshot, blockNumber: 2n }, DEMO_STRSY_TERMS, 365)).not.toBe(base);
  expect(yieldContextFingerprint({ ...snapshot, accountAddress: "0x0000000000000000000000000000000000000002" }, DEMO_STRSY_TERMS, 365)).not.toBe(base);
  expect(yieldContextFingerprint(changedPosition({ rawBalance: 11n }), DEMO_STRSY_TERMS, 365)).not.toBe(base);
  expect(yieldContextFingerprint(changedPosition({ availability: "read-error" }), DEMO_STRSY_TERMS, 365)).not.toBe(base);
  expect(yieldContextFingerprint(changedPosition({ balanceDecimals: 6 }), DEMO_STRSY_TERMS, 365)).not.toBe(base);
  expect(yieldContextFingerprint(snapshot, DEMO_STRSY_TERMS, 30)).not.toBe(base);
  expect(yieldContextFingerprint(snapshot, { ...DEMO_STRSY_TERMS, version: "phase-8.v1" } as never, 365)).not.toBe(base);
  expect(yieldContextFingerprint(snapshot, { ...DEMO_STRSY_TERMS, annualRateBps: 501 }, 365)).not.toBe(base);
}); });
it("invalidates stored presentation when canonical metadata changes", () => {
  const asset = createAssetCatalog().find((item) => item.id === "strsy")!;
  const valid = { ...snapshot, blockConsistency: "single-block", positions: [{ asset, availability: "available", rawBalance: 10n, balanceDecimals: 18 }] } as unknown as PortfolioSnapshot;
  const contextA = yieldContextFingerprint(valid, DEMO_STRSY_TERMS, 365);
  const stored = { contextKey: contextA, result: { status: "unavailable", reason: "fixture" } as const };
  for (const assetChange of [{ symbol: "forged" }, { baselineRiskTier: "Aggressive" as const }]) {
    const changed = { ...valid, positions: [{ ...valid.positions[0], asset: { ...valid.positions[0].asset, ...assetChange } }] };
    const contextB = yieldContextFingerprint(changed, DEMO_STRSY_TERMS, 365);
    expect(contextB).not.toBe(contextA);
    expect(projectionForContext(stored, contextB)).toBeNull();
  }
});
it("changes context for block consistency and duplicate program-asset positions", () => {
  const base = yieldContextFingerprint(snapshot, DEMO_STRSY_TERMS, 365);
  expect(yieldContextFingerprint({ ...snapshot, blockConsistency: "latest-near-simultaneous" }, DEMO_STRSY_TERMS, 365)).not.toBe(base);
  expect(yieldContextFingerprint({ ...snapshot, positions: [...snapshot.positions, { ...snapshot.positions[0] }] }, DEMO_STRSY_TERMS, 365)).not.toBe(base);
});
it("does not alter MARA, Sentinel, or adaptation context for unchanged authoritative inputs", () => { const risk = { status: "unavailable", assetAssessments: [], signalSources: [] } as unknown as PortfolioRiskAssessment; const before = [maraContextFingerprint(snapshot, risk), sentinelContextFingerprint(snapshot), adaptationContextKey(snapshot, risk)]; yieldContextFingerprint(snapshot, DEMO_STRSY_TERMS, 30); yieldContextFingerprint(snapshot, DEMO_STRSY_TERMS, 365); expect([maraContextFingerprint(snapshot, risk), sentinelContextFingerprint(snapshot), adaptationContextKey(snapshot, risk)]).toEqual(before); });
