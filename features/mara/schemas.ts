import { z } from "zod";
import { ASSET_IDS } from "@/features/portfolio/types";
import { RISK_FACTOR_IDS } from "@/features/risk/types";
import { MARA_ACTIONS } from "./types";

const nullableAsset = z.enum(ASSET_IDS).nullable();
const nullableFactor = z.enum(RISK_FACTOR_IDS).nullable();
export const maraAnalysisSchema = z.object({
  status: z.literal("complete"),
  summary: z.string().min(1).max(600),
  observations: z.array(z.object({ type: z.enum(["portfolio", "risk", "concentration", "asset", "uncertainty"]), assetId: nullableAsset, factorId: nullableFactor, importance: z.enum(["low", "medium", "high"]), text: z.string().min(1).max(400), evidenceRefs: z.array(z.string().min(1).max(120)).min(1).max(8) }).strict()).max(5),
  proposals: z.array(z.object({ action: z.enum(MARA_ACTIONS), assetId: nullableAsset, rationale: z.string().min(1).max(400), evidenceRefs: z.array(z.string().min(1).max(120)).min(1).max(8), executionAuthority: z.literal("none") }).strict()).max(3),
  uncertainties: z.array(z.string().min(1).max(300)).max(5),
}).strict();

export const maraContextSchema = z.object({ contextVersion: z.literal("phase-5.v1"), portfolioSource: z.enum(["wallet", "vault"]), portfolioStatus: z.enum(["valued", "partial", "unavailable"]), riskStatus: z.enum(["assessed", "partial", "unavailable"]), facts: z.array(z.object({ id: z.string().min(1).max(120), category: z.enum(["portfolio", "asset", "risk", "factor", "provenance"]), label: z.string().min(1).max(100), value: z.string().min(1).max(200), source: z.enum(["portfolio-engine", "risk-engine", "asset-catalog"]) }).strict()).max(150), limitations: z.array(z.string().min(1).max(300)).max(10), capturedAt: z.string().datetime(), assessedAt: z.string().datetime() }).strict();
export const maraRequestSchema = z.object({ context: maraContextSchema, question: z.string().trim().min(1).max(1000).nullable().optional() }).strict();

export const MARA_JSON_SCHEMA = {
  type: "object", additionalProperties: false, required: ["status", "summary", "observations", "proposals", "uncertainties"],
  properties: {
    status: { type: "string", enum: ["complete"] }, summary: { type: "string", minLength: 1, maxLength: 600 },
    observations: { type: "array", maxItems: 5, items: { type: "object", additionalProperties: false, required: ["type", "assetId", "factorId", "importance", "text", "evidenceRefs"], properties: { type: { type: "string", enum: ["portfolio", "risk", "concentration", "asset", "uncertainty"] }, assetId: { type: ["string", "null"], enum: [...ASSET_IDS, null] }, factorId: { type: ["string", "null"], enum: [...RISK_FACTOR_IDS, null] }, importance: { type: "string", enum: ["low", "medium", "high"] }, text: { type: "string", minLength: 1, maxLength: 400 }, evidenceRefs: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 120 } } } } },
    proposals: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, required: ["action", "assetId", "rationale", "evidenceRefs", "executionAuthority"], properties: { action: { type: "string", enum: MARA_ACTIONS }, assetId: { type: ["string", "null"], enum: [...ASSET_IDS, null] }, rationale: { type: "string", minLength: 1, maxLength: 400 }, evidenceRefs: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 120 } }, executionAuthority: { type: "string", enum: ["none"] } } } },
    uncertainties: { type: "array", maxItems: 5, items: { type: "string", minLength: 1, maxLength: 300 } },
  },
} as const;
