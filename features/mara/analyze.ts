import type { MaraAnalysis, MaraContext, MaraDiagnosticCode, MaraModelClient } from "./types";
import { MaraError } from "./types";
import { validateMaraOutput } from "./validation";
import { validateCompleteMaraContext } from "./grounding";

export const MARA_REMEDIATION_INSTRUCTIONS = {
  output_json_parse: "Regenerate the structured answer as valid JSON matching the required response format.",
  output_schema_validation: "Regenerate the structured answer so every field exactly satisfies the required response schema.",
  unknown_evidence: "Regenerate using only exact evidence IDs present in the supplied Adaptara grounding facts.",
  unsupported_asset_reference: "Regenerate using only literal asset IDs represented by the supplied Adaptara grounding facts.",
  asset_evidence_mismatch: "Regenerate so every item with an assetId cites at least one exact supplied evidence ID beginning asset.<assetId>.",
  invalid_factor_reference: "Regenerate using only literal factor IDs represented by the supplied Adaptara grounding facts.",
  factor_evidence_mismatch: "Regenerate the structured answer. For every observation with a factorId, set assetId and include the exact supplied evidence ID asset.<assetId>.risk.<factorId>. If that exact supplied fact is absent, omit the factor-specific observation.",
  unsafe_numeric_claim: "Regenerate without quoting financial amounts, percentages, scores, BPS values, or similar prohibited numeric financial claims in prose.",
  canonical_quantity_claim: "Regenerate without quoting canonical token quantities in prose.",
  return_multiplier_claim: "Regenerate without quoting return multipliers in prose.",
  non_live_claim_violation: "Regenerate without characterizing demo/non-live inputs as live, real-time, latest-market, or current real-world market information. Use provenance-safe supplied-state wording.",
} as const satisfies Partial<Record<MaraDiagnosticCode, string>>;

async function runAttempt(context: MaraContext, question: string | null, client: MaraModelClient, remediationInstruction?: string): Promise<MaraAnalysis> {
  const output = await client.analyze({ context, question, ...(remediationInstruction ? { remediationInstruction } : {}) });
  return validateMaraOutput(output, context);
}

export async function analyzeWithMara(context: MaraContext, question: string | null, client: MaraModelClient): Promise<MaraAnalysis> {
  validateCompleteMaraContext(context);
  try {
    return await runAttempt(context, question, client);
  } catch (error) {
    if (!(error instanceof MaraError) || error.code !== "invalid-model-output" || !error.diagnosticCode) throw error;
    const remediationInstruction = MARA_REMEDIATION_INSTRUCTIONS[error.diagnosticCode as keyof typeof MARA_REMEDIATION_INSTRUCTIONS];
    if (!remediationInstruction) throw error;
    return runAttempt(context, question, client, remediationInstruction);
  }
}
