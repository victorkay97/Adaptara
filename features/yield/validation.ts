import { CANONICAL_YIELD_TERMS_BY_PROGRAM_ID } from "./terms";
import type { YieldTerms } from "./types";

const authorityFields = ["version", "assetId", "mode", "annualRateBps", "compoundingFrequency", "dayCountBasis"] as const;

export function validateYieldTerms(value: YieldTerms): Readonly<YieldTerms> {
  const canonical = CANONICAL_YIELD_TERMS_BY_PROGRAM_ID.get(value.programId);
  if (!canonical) throw new Error("Unknown yield program ID");
  for (const field of authorityFields) if (value[field] !== canonical[field]) throw new Error(`Yield program ${value.programId} has non-canonical ${field}`);
  return canonical;
}
