import { createAssetCatalog } from "@/features/portfolio/catalog";
import { ASSET_IDS, type AssetId, type BaselineRiskTier, type CanonicalAssetId } from "@/features/portfolio/types";
import { RISK_FACTOR_WEIGHTS, RISK_SCORE_MAX } from "@/features/risk/constants";
import { RISK_FACTOR_IDS, type CurrentRiskTier, type RiskFactorId } from "@/features/risk/types";
import type { MaraContext, MaraGroundingFact } from "./types";
import { MaraError } from "./types";

const INTEGER = /^(?:0|[1-9]\d*)$/;
const CURRENT_TIERS = new Set<CurrentRiskTier>(["Defensive", "Balanced", "Aggressive"]);
const BASELINE_TIERS = new Set<BaselineRiskTier>(["Reserve", "Defensive", "Balanced", "Aggressive"]);
const catalog = new Map(createAssetCatalog().map((asset) => [asset.id, asset]));
const LIMITATION = /^(?:Portfolio reference prices|Risk signals) are (?:demo|fixture)(?:\/(?:demo|fixture))* data, not live market truth\.$/;

type FactRule = Pick<MaraGroundingFact, "category" | "source" | "label"> & { value: (value: string) => boolean };
const exact = (expected: string) => (value: string) => value === expected;
const integerWithin = (maximum: number) => (value: string) => INTEGER.test(value) && Number(value) <= maximum;

/** Advisory consistency validation only. Future execution must reread authoritative chain state. */
export function validateCompleteMaraContext(context: MaraContext): void {
  if (context.portfolioStatus !== "valued" || context.riskStatus !== "assessed") fail();
  if (!context.limitations.length || context.limitations.some((item) => !LIMITATION.test(item)) || new Set(context.limitations).size !== context.limitations.length) fail();
  const ids = context.facts.map((fact) => fact.id);
  if (new Set(ids).size !== ids.length) fail();

  for (const fact of context.facts) {
    const assetMatch = /^asset\.([^.]+)\./.exec(fact.id);
    if (assetMatch && !ASSET_IDS.includes(assetMatch[1] as CanonicalAssetId)) fail();
  }
  const assetIds = context.facts.map((fact) => /^asset\.([^.]+)\.symbol$/.exec(fact.id)?.[1]).filter((id): id is CanonicalAssetId => Boolean(id && ASSET_IDS.includes(id as CanonicalAssetId)));
  if (!assetIds.length || new Set(assetIds).size !== assetIds.length) fail();

  const rules = new Map<string, FactRule>([
    ["portfolio.valuation-status", { category: "portfolio", source: "portfolio-engine", label: "Valuation status", value: exact("valued") }],
    ["portfolio.risk.status", { category: "risk", source: "risk-engine", label: "Risk assessment status", value: exact("assessed") }],
    ["portfolio.risk.score", { category: "risk", source: "risk-engine", label: "Authoritative portfolio risk score (BPS)", value: integerWithin(RISK_SCORE_MAX) }],
    ["portfolio.risk.current-tier", { category: "risk", source: "risk-engine", label: "Current portfolio risk tier", value: (value) => CURRENT_TIERS.has(value as CurrentRiskTier) }],
  ]);
  for (const assetId of assetIds) addAssetRules(rules, assetId);
  if (context.facts.length !== rules.size) fail();
  for (const fact of context.facts) {
    const rule = rules.get(fact.id);
    if (!rule || fact.category !== rule.category || fact.source !== rule.source || fact.label !== rule.label || !rule.value(fact.value)) fail();
  }

  let allocationTotal = 0;
  for (const assetId of assetIds) allocationTotal += Number(context.facts.find((fact) => fact.id === `asset.${assetId}.allocation`)!.value);
  if (allocationTotal !== RISK_SCORE_MAX) fail();
}

function addAssetRules(rules: Map<string, FactRule>, assetId: AssetId): void {
  const asset = catalog.get(assetId);
  if (!asset) fail();
  const prefix = `asset.${assetId}`;
  rules.set(`${prefix}.symbol`, { category: "asset", source: "asset-catalog", label: "Asset symbol", value: exact(asset.symbol) });
  rules.set(`${prefix}.allocation`, { category: "portfolio", source: "portfolio-engine", label: "Portfolio allocation (BPS)", value: integerWithin(RISK_SCORE_MAX) });
  rules.set(`${prefix}.baseline-tier`, { category: "asset", source: "asset-catalog", label: "Baseline product risk tier", value: (value) => BASELINE_TIERS.has(value as BaselineRiskTier) && value === asset.baselineRiskTier });
  rules.set(`${prefix}.current-tier`, { category: "risk", source: "risk-engine", label: "Current calculated risk tier", value: (value) => CURRENT_TIERS.has(value as CurrentRiskTier) });
  for (const factorId of RISK_FACTOR_IDS) rules.set(`${prefix}.risk.${factorId}`, factorRule(factorId));
}

function factorRule(factorId: RiskFactorId): FactRule {
  return { category: "factor", source: "risk-engine", label: `${factorId} risk factor contribution`, value: integerWithin(RISK_FACTOR_WEIGHTS[factorId]) };
}

function fail(): never { throw new MaraError("incomplete-context", "MARA context is incomplete or incoherent."); }
