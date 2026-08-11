import { ASSET_IDS } from "@/features/portfolio/types";
import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import { RISK_FACTOR_IDS } from "@/features/risk/types";
import { maraAnalysisSchema } from "./schemas";
import type { MaraAnalysis, MaraContext } from "./types";
import { MaraError } from "./types";

const FINANCIAL_NUMBER = /(?:[$€£]\s*\d|\b\d+(?:\.\d+)?\s*(?:%|bps\b)|\b\d+(?:\.\d+)?\s*\/\s*100\b)/i;
const LIVE_DATA_CLAIM = /\b(?:real[- ]?time|latest[- ]market|current real-world market data|live (?:data|prices?|price data|risk(?: data)?|signals?|market(?: data| conditions| truth)?))\b/i;
const FINANCIAL_QUANTITY = /\b\d+(?:\.\d+)?\s*tokens?\b/i;
const RETURN_MULTIPLIER = /\b\d+(?:\.\d+)?\s*x\b/i;
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CANONICAL_ASSET_QUANTITY = new RegExp(`\\b\\d+(?:\\.\\d+)?\\s+(?:${ASSET_CATALOG.map((asset) => escapeRegex(asset.symbol)).join("|")})(?![A-Za-z0-9])`, "i");

export function validateMaraOutput(value: unknown, context: MaraContext): MaraAnalysis {
  const parsed = maraAnalysisSchema.safeParse(value);
  if (!parsed.success) throw new MaraError("invalid-model-output", "MARA returned an invalid structured response.", "output_schema_validation");
  const evidence = new Set(context.facts.map((fact) => fact.id));
  const meaningfulAssets = new Set(context.facts.filter((fact) => fact.id.endsWith(".symbol")).map((fact) => fact.id.split(".")[1]));
  for (const item of [...parsed.data.observations, ...parsed.data.proposals]) {
    if (item.evidenceRefs.some((ref) => !evidence.has(ref))) throw new MaraError("invalid-model-output", "MARA cited unknown evidence.", "unknown_evidence");
    if (item.assetId && (!ASSET_IDS.includes(item.assetId) || !meaningfulAssets.has(item.assetId))) throw new MaraError("invalid-model-output", "MARA referenced an unknown portfolio asset.", "unsupported_asset_reference");
    if ("factorId" in item && item.factorId && !RISK_FACTOR_IDS.includes(item.factorId)) throw new MaraError("invalid-model-output", "MARA referenced an unknown risk factor.", "invalid_factor_reference");
    if (item.assetId && !item.evidenceRefs.some((ref) => ref.startsWith(`asset.${item.assetId}.`))) throw new MaraError("invalid-model-output", "MARA evidence does not support the referenced asset.", "asset_evidence_mismatch");
    if ("factorId" in item && item.factorId && (!item.assetId || !item.evidenceRefs.includes(`asset.${item.assetId}.risk.${item.factorId}`))) throw new MaraError("invalid-model-output", "MARA evidence does not support the referenced risk factor.", "factor_evidence_mismatch");
  }
  const prose = [parsed.data.summary, ...parsed.data.observations.map((item) => item.text), ...parsed.data.proposals.map((item) => item.rationale), ...parsed.data.uncertainties];
  if (prose.some((text) => FINANCIAL_NUMBER.test(text) || FINANCIAL_QUANTITY.test(text))) throw new MaraError("invalid-model-output", "MARA produced an unsafe numeric financial claim.", "unsafe_numeric_claim");
  if (prose.some((text) => CANONICAL_ASSET_QUANTITY.test(text))) throw new MaraError("invalid-model-output", "MARA produced a prohibited canonical asset quantity.", "canonical_quantity_claim");
  if (prose.some((text) => RETURN_MULTIPLIER.test(text))) throw new MaraError("invalid-model-output", "MARA produced a prohibited return multiplier.", "return_multiplier_claim");
  const nonLive = context.limitations.some((limitation) => /\b(?:demo|fixture|non-live|not live)\b/i.test(limitation));
  if (nonLive && prose.some((text) => LIVE_DATA_CLAIM.test(text.replace(/\b(?:non-live|not live|never live)\b/gi, "")))) throw new MaraError("invalid-model-output", "MARA incorrectly described non-live data as live.", "non_live_claim_violation");
  return parsed.data;
}
