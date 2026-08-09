import { describe, expect, it } from "vitest";
import { currentRiskTierForScore, formatRiskScore } from "./tiers";

describe("risk tiers", () => {
  it.each([[0, "Defensive"], [3499, "Defensive"], [3500, "Balanced"], [6499, "Balanced"], [6500, "Aggressive"], [10000, "Aggressive"]] as const)("maps %i to %s", (score, tier) => expect(currentRiskTierForScore(score)).toBe(tier));
  it.each([-1, 10001, 1.5, Number.NaN])("rejects invalid score %s", (score) => expect(() => currentRiskTierForScore(score)).toThrow());
  it("formats bounded BPS without calculation floats", () => expect(formatRiskScore(4235)).toBe("42.35"));
});
