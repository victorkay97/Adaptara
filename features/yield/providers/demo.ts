import type { AssetId } from "@/features/portfolio/types";
import { DEMO_STRSY_TERMS } from "../terms";
import type { YieldTerms, YieldTermsProvider } from "../types";
import { validateYieldTerms } from "../validation";

export class DemoYieldTermsProvider implements YieldTermsProvider {
  private readonly programs: readonly YieldTerms[];
  constructor(programs: readonly YieldTerms[] = [DEMO_STRSY_TERMS]) {
    const ids = programs.map((terms) => terms.programId);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate yield program ID");
    this.programs = programs.map((terms) => validateYieldTerms(terms));
  }
  getTerms(assetId: AssetId): YieldTerms | null { return this.programs.find((terms) => terms.assetId === assetId) ?? null; }
  listTerms(): readonly YieldTerms[] { return [...this.programs]; }
}
