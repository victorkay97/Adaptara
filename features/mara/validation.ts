import { ASSET_IDS } from "@/features/portfolio/types";
import { RISK_FACTOR_IDS } from "@/features/risk/types";
import { maraAnalysisSchema } from "./schemas";
import type { MaraAnalysis, MaraContext } from "./types";
import { MaraError } from "./types";

const FINANCIAL_NUMBER = /(?:[$€£]\s*\d|\b\d+(?:\.\d+)?\s*(?:%|bps\b)|\b\d+(?:\.\d+)?\s*\/\s*100\b)/i;
const LIVE_DATA_CLAIM = /\b(?:real[- ]?time|latest[- ]market|current real-world market data|live (?:data|prices?|price data|risk(?: data)?|signals?|market(?: data| conditions| truth)?))\b/i;

export function validateMaraOutput(value: unknown, context: MaraContext): MaraAnalysis {
  const parsed = maraAnalysisSchema.safeParse(value);
  if (!parsed.success) throw new MaraError("invalid-model-output", "MARA returned an invalid structured response.");
  const evidence = new Set(context.facts.map((fact) => fact.id));
  const meaningfulAssets = new Set(context.facts.filter((fact) => fact.id.endsWith(".symbol")).map((fact) => fact.id.split(".")[1]));
  for (const item of [...parsed.data.observations, ...parsed.data.proposals]) {
    if (item.evidenceRefs.some((ref) => !evidence.has(ref))) throw new MaraError("invalid-model-output", "MARA cited unknown evidence.");
    if (item.assetId && (!ASSET_IDS.includes(item.assetId) || !meaningfulAssets.has(item.assetId))) throw new MaraError("invalid-model-output", "MARA referenced an unknown portfolio asset.");
    if ("factorId" in item && item.factorId && !RISK_FACTOR_IDS.includes(item.factorId)) throw new MaraError("invalid-model-output", "MARA referenced an unknown risk factor.");
    if (item.assetId && !item.evidenceRefs.some((ref) => ref.startsWith(`asset.${item.assetId}.`))) throw new MaraError("invalid-model-output", "MARA evidence does not support the referenced asset.");
    if ("factorId" in item && item.factorId && (!item.assetId || !item.evidenceRefs.includes(`asset.${item.assetId}.risk.${item.factorId}`))) throw new MaraError("invalid-model-output", "MARA evidence does not support the referenced risk factor.");
  }
  const prose = [parsed.data.summary, ...parsed.data.observations.map((item) => item.text), ...parsed.data.proposals.map((item) => item.rationale), ...parsed.data.uncertainties];
  if (prose.some((text) => FINANCIAL_NUMBER.test(text))) throw new MaraError("invalid-model-output", "MARA produced an unsafe numeric financial claim.");
  const nonLive = context.limitations.some((limitation) => /\b(?:demo|fixture|non-live|not live)\b/i.test(limitation));
  if (nonLive && prose.some((text) => LIVE_DATA_CLAIM.test(text.replace(/\b(?:non-live|not live|never live)\b/gi, "")))) throw new MaraError("invalid-model-output", "MARA incorrectly described non-live data as live.");
  return parsed.data;
}
