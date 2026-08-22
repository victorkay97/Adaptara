import { describe, expect, it } from "vitest";
import { fixtureProviders } from "./fixtures";
import { runObservationCycle } from "./cycle";
import type { MarketObservationProvider, NewsObservationProvider, ObservationBatch, PortfolioExposure, MarketSignal, NewsSignal } from "./types";

const now = new Date("2026-08-12T12:00:00.000Z");
const portfolio: PortfolioExposure[] = [
  { assetId: "usdt0", symbol: "USDT0", allocationBps: 4_000, held: true, allowed: true },
  { assetId: "strsy", symbol: "TRSY", allocationBps: 6_000, held: true, allowed: true },
  { assetId: "sxau", symbol: "XAU", allocationBps: 0, held: false, allowed: true },
];

describe("Phase 13C observation cycle", () => {
  it.each(["neutral", "opportunity"] as const)("keeps %s fixtures non-executing", async (scenario) => {
    const result = await runObservationCycle({ portfolio, managementMode: "Adaptive", ...fixtureProviders(scenario), now });
    expect(result.context.policy.executionAuthority).toBe("none");
    expect(result.proposal).toBeNull();
  });

  it("turns current adverse held-asset news into a typed proposal without amounts or calldata", async () => {
    const result = await runObservationCycle({ portfolio, managementMode: "Adaptive", ...fixtureProviders("adverse"), now });
    expect(result.proposal).toMatchObject({ direction: "reduce", executionAuthority: "none", plannerRequired: true, targetAllocationBps: null });
    expect(result.proposal).not.toHaveProperty("amountIn"); expect(result.proposal).not.toHaveProperty("calldata"); expect(result.proposal).not.toHaveProperty("targetAddress");
    expect(result.proposal?.evidenceRefs).toEqual(["fixture-news-adverse"]);
  });

  it("excludes stale evidence instead of converting it to neutral", async () => {
    const result = await runObservationCycle({ portfolio, managementMode: "Adaptive", ...fixtureProviders("stale"), now });
    expect(result.context.market.signals).toEqual([]); expect(result.context.news.signals).toEqual([]); expect(result.proposal).toBeNull();
  });

  it("reports unavailable providers as limitations", async () => {
    const marketUnavailable: ObservationBatch<MarketSignal> = { status: "unavailable", capturedAt: now.toISOString(), observations: [], errorCode: "timeout" };
    const newsUnavailable: ObservationBatch<NewsSignal> = { status: "unavailable", capturedAt: now.toISOString(), observations: [], errorCode: "timeout" };
    const marketProvider: MarketObservationProvider = { observeMarket: async () => marketUnavailable };
    const newsProvider: NewsObservationProvider = { observeNews: async () => newsUnavailable };
    const result = await runObservationCycle({ portfolio, managementMode: "Advisory", marketProvider, newsProvider, now });
    expect(result.context.limitations).toHaveLength(2); expect(result.summary).toContain("incomplete");
  });
});
