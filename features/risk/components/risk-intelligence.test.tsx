import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RiskIntelligence, riskSourceLabel } from "./risk-intelligence";
import type { PortfolioRiskAssessment } from "../types";

const assessment = (overrides: Partial<PortfolioRiskAssessment>): PortfolioRiskAssessment => ({
  status: "assessed",
  portfolioRiskScoreBps: 2500,
  portfolioCurrentRiskTier: "Defensive",
  assetAssessments: [],
  unavailableAssets: [],
  signalSources: ["demo"],
  assessedAt: "2026-01-01T00:00:00Z",
  reason: "complete",
  ...overrides,
});

describe("Risk Intelligence presentation", () => {
  it("reports allocation invariant failures separately from missing signals", () => {
    const html = renderToStaticMarkup(<RiskIntelligence assessment={assessment({ status: "unavailable", portfolioRiskScoreBps: null, portfolioCurrentRiskTier: null, signalSources: [], reason: "invalid-allocation" })} />);
    expect(html).toContain("portfolio allocation data failed validation");
    expect(html).not.toContain("Risk inputs incomplete");
  });

  it.each([["demo", "Demo risk inputs · non-live"], ["fixture", "Fixture risk inputs · non-live"]] as const)("derives the %s provenance label", (source, expected) => {
    const html = renderToStaticMarkup(<RiskIntelligence assessment={assessment({ signalSources: [source] })} />);
    expect(html).toContain(expected);
    expect(html).not.toContain("Demo fixture");
  });

  it("formats multiple non-live sources deterministically", () => expect(riskSourceLabel(["demo", "fixture", "demo"])).toBe("Demo + Fixture risk inputs · non-live"));
});
