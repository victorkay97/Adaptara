import { describe, expect, it } from "vitest";
import type { AskMaraContext } from "./context";
import { ADAPTARA_GLOSSARY, findGlossaryEntry } from "./glossary";
import { answerAskMara } from "./respond";

const context: AskMaraContext = { destination: "Portfolio", source: "vault", valuationStatus: "valued", portfolioValue: "$20.00", positions: [{ symbol: "USD₮0", allocationPercent: "40.00%", availability: "available" }, { symbol: "sXAU", allocationPercent: "20.00%", availability: "available" }], riskTier: "Defensive", riskScore: "31.20", reservePercent: "40.00%", compliance: "compliant", policy: { minimumReserveBps: 2000, maximumSingleAssetExposureBps: 6000, maximumAggressiveExposureBps: 3000, maximumDailyReallocationBps: 1000 } };

describe("bounded Ask MARA", () => {
  it("maintains a canonical beginner glossary", () => { expect(ADAPTARA_GLOSSARY.length).toBeGreaterThanOrEqual(20); expect(findGlossaryEntry("What is reserve protection?")?.term).toBe("Reserve protection"); });
  it("answers glossary questions without a provider", () => { const answer = answerAskMara("What does simulation mean?", context); expect(answer.provenance).toBe("Canonical Adaptara glossary"); expect(answer.body).toContain("does not move assets"); });
  it("uses only supplied deterministic context for portfolio answers", () => { const answer = answerAskMara("What do I own?", context); expect(answer.body).toContain("USD₮0 40.00%"); expect(answer.body).toContain("sXAU 20.00%"); });
  it("fails boundedly when extended generation is unavailable", () => { const answer = answerAskMara("Write me a market outlook", context); expect(answer.title).toBe("Extended answer unavailable"); expect(answer.body).toContain("not configured"); });
  it("refuses execution authority", () => { const answer = answerAskMara("Sell and transfer my assets", context); expect(answer.title).toBe("No execution authority"); expect(answer.body).toMatch(/cannot sign|cannot.*move assets/i); });
  it("never fabricates unavailable risk", () => { const answer = answerAskMara("What is my risk?", { ...context, riskTier: null, riskScore: null }); expect(answer.body).toContain("not available"); expect(answer.body).not.toContain("Defensive"); });
});
