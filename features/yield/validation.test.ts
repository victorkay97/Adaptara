import { describe, expect, it } from "vitest";
import { DemoYieldTermsProvider } from "./providers/demo";
import { DEMO_STRSY_TERMS } from "./terms";
import { validateYieldTerms } from "./validation";
import type { YieldTerms } from "./types";

const forged = (change: object) => ({ ...DEMO_STRSY_TERMS, ...change }) as YieldTerms;

describe("canonical yield terms", () => {
  it("accepts the canonical sTRSY demo program", () => expect(validateYieldTerms(DEMO_STRSY_TERMS)).toBe(DEMO_STRSY_TERMS));
  it.each([{ assetId: "usdt0" }, { annualRateBps: 501 }, { annualRateBps: 9000 }, { version: "phase-8.v1" }, { mode: "live" }, { compoundingFrequency: "monthly" }, { dayCountBasis: 360 }, { programId: "forged" }])("rejects forged canonical authority fields %#", (change) => expect(() => validateYieldTerms(forged(change))).toThrow());
  it("rejects a duplicate program ID", () => expect(() => new DemoYieldTermsProvider([DEMO_STRSY_TERMS, { ...DEMO_STRSY_TERMS }])).toThrow("Duplicate"));
  it.each([{ assetId: "usdt0" }, { annualRateBps: 501 }, { compoundingFrequency: "monthly" }, { dayCountBasis: 360 }, { programId: "unknown" }])("rejects injected provider programs %#", (change) => expect(() => new DemoYieldTermsProvider([forged(change)])).toThrow());
  it("does not invent programs for other assets", () => { const provider = new DemoYieldTermsProvider(); expect(provider.getTerms("usdt0")).toBeNull(); expect(provider.getTerms("sxau")).toBeNull(); expect(provider.getTerms("saaplx")).toBeNull(); });
});
