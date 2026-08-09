import { YIELD_LIMITATIONS, YIELD_MODEL_VERSION } from "./constants";
import type { YieldTerms } from "./types";

export const DEMO_STRSY_TERMS: Readonly<YieldTerms> = Object.freeze({
  programId: "demo-strsy-treasury-v1", version: YIELD_MODEL_VERSION, assetId: "strsy", mode: "demo",
  annualRateBps: 500, compoundingFrequency: "daily", dayCountBasis: 365,
  description: "Sandbox annualized rate for deterministic sTRSY compounding simulation.", limitations: YIELD_LIMITATIONS,
});

export const CANONICAL_YIELD_TERMS_BY_PROGRAM_ID: ReadonlyMap<string, Readonly<YieldTerms>> = new Map([
  [DEMO_STRSY_TERMS.programId, DEMO_STRSY_TERMS],
]);
