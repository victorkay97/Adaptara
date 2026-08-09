import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";
import type { OnchainConstitution } from "@/features/constitution/types";
import { acceptMaraResultForContext } from "@/features/mara/components/mara-panel";
import { maraAnalysisForContext } from "@/features/mara/context";
import type { MaraAnalysis } from "@/features/mara/types";
import { AdaptationPlanPanel, adaptationContextKey, canCreateAdaptation } from "./adaptation-plan";

const snapshot = { source: "vault", valuationStatus: "valued", accountAddress: "0x0000000000000000000000000000000000000001", chainId: 1952, blockNumber: 10n, capturedAt: "2026-01-01T00:00:00Z", positions: [], priceSources: [] } as unknown as PortfolioSnapshot;
const risk = { status: "assessed", portfolioRiskScoreBps: 0, portfolioCurrentRiskTier: "Defensive", assetAssessments: [], unavailableAssets: [], signalSources: [], assessedAt: "2026-01-01T00:00:01Z", reason: "complete" } as PortfolioRiskAssessment;
const constitution = { version: "phase-6.v1", source: "onchain", vaultAddress: snapshot.accountAddress, owner: snapshot.accountAddress, blockNumber: 11n, capturedAt: "2026-01-01T00:00:02Z", constitution: { minimumReserveBps: 0, maximumSingleAssetExposureBps: 10_000, maximumAggressiveExposureBps: 10_000, maximumDailyReallocationBps: 500 } } as OnchainConstitution;
const analysis = { status: "complete", summary: "summary", observations: [], proposals: [], uncertainties: [] } as MaraAnalysis;

describe("adaptation presentation and context isolation", () => {
  it("is simulation-only and has no transaction control", () => { const html = renderToStaticMarkup(<AdaptationPlanPanel snapshot={snapshot} assessment={risk} constitution={constitution} analysis={analysis} facts={[]} />); expect(html).toContain("Simulation · not executed"); expect(html).toContain("Generate Adaptation Simulation"); expect(html).not.toMatch(/>\s*(Execute|Approve|Swap|Rebalance|Submit transaction)/i); });
  it("requires current MARA analysis", () => { const html = renderToStaticMarkup(<AdaptationPlanPanel snapshot={snapshot} assessment={risk} constitution={constitution} analysis={null} facts={[]} />); expect(html).toContain("Generate a current MARA advisory"); expect(html).toContain("disabled"); });
  it("changes the plan context when portfolio or constitution provenance changes", () => { const a = adaptationContextKey(snapshot, risk, constitution, analysis); expect(adaptationContextKey({ ...snapshot, blockNumber: 12n }, risk, constitution, analysis)).not.toBe(a); expect(adaptationContextKey(snapshot, risk, { ...constitution, blockNumber: 13n }, analysis)).not.toBe(a); expect(adaptationContextKey({ ...snapshot, accountAddress: "0x0000000000000000000000000000000000000002" }, risk, constitution, analysis)).not.toBe(a); });
  it("rejects a late MARA result from an old snapshot context", () => { expect(acceptMaraResultForContext("snapshot-a", "snapshot-b", analysis)).toBeNull(); expect(acceptMaraResultForContext("snapshot-b", "snapshot-b", analysis)).toBe(analysis); });
  it("cannot expose an already-accepted A analysis in B", () => { expect(maraAnalysisForContext({ contextKey: "snapshot-a", analysis }, "snapshot-b")).toBeNull(); });
  it("invalidates risk-content changes even when assessedAt is unchanged", () => { const a = adaptationContextKey(snapshot, risk, constitution, analysis); const changed = { ...risk, portfolioRiskScoreBps: 1 }; expect(changed.assessedAt).toBe(risk.assessedAt); expect(adaptationContextKey(snapshot, changed, constitution, analysis)).not.toBe(a); });
  it("enables generation only for complete valued vault authority", () => { expect(canCreateAdaptation(snapshot, risk, constitution, analysis)).toBe(true); expect(canCreateAdaptation({ ...snapshot, source: "wallet" }, risk, constitution, analysis)).toBe(false); expect(canCreateAdaptation({ ...snapshot, valuationStatus: "partial" }, risk, constitution, analysis)).toBe(false); expect(canCreateAdaptation(snapshot, { ...risk, status: "partial" }, constitution, analysis)).toBe(false); expect(canCreateAdaptation(snapshot, { ...risk, reason: "missing-risk-signals" }, constitution, analysis)).toBe(false); expect(canCreateAdaptation(snapshot, risk, undefined, analysis)).toBe(false); expect(canCreateAdaptation(snapshot, risk, constitution, null)).toBe(false); });
});
