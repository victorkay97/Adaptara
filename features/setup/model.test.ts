import { describe, expect, it } from "vitest";
import { DEMO_MANDATE, fundingPreview, mandateReady, valueToCents } from "./model";

describe("managed setup funding", () => {
  it("normalizes quote decimals to cents", () => {
    expect(valueToCents(100_000_000_000n, 8)).toBe(100_000n);
    expect(valueToCents(1_000n, 0)).toBe(100_000n);
  });
  it.each([[25,25_000n,75_000n],[50,50_000n,50_000n],[75,75_000n,25_000n]])("previews %s percent", (percent, managed, outside) => expect(fundingPreview(100_000n, percent)).toMatchObject({ managed, outside }));
  it("supports bounded custom percentages", () => expect(fundingPreview(100_000n, 33.33)).toMatchObject({ managed:33_330n, outside:66_670n }));
  it("rejects zero, over-available, partial, and unavailable valuation", () => { expect(fundingPreview(100n,0)).toBeNull(); expect(fundingPreview(100n,101)).toBeNull(); expect(fundingPreview(100n,50,"partial")).toBeNull(); expect(fundingPreview(100n,50,"unavailable")).toBeNull(); });
  it("never produces negative remaining capital", () => expect(fundingPreview(1n,100)?.outside).toBe(0n));
});

describe("managed mandate", () => {
  it("accepts the explicit demo Constitution", () => expect(mandateReady(DEMO_MANDATE)).toBe(true));
  it("rejects a yield split that does not total 100", () => expect(mandateReady({...DEMO_MANDATE,reserveYield:31})).toBe(false));
});
