import { z } from "zod";
import { ASSET_IDS } from "@/features/portfolio/types";
import { MAX_SENTINEL_OBSERVATIONS } from "./constants";
import { SENTINEL_EVENT_TYPES, SENTINEL_SEVERITIES } from "./types";

const assetIdSchema = z.enum(ASSET_IDS);
const boundedId = z.string().min(1).max(100).regex(/^[a-zA-Z0-9._:-]+$/);
export const sentinelRequestSchema = z.object({ assetIds: z.array(assetIdSchema).min(1).max(ASSET_IDS.length).refine((ids) => new Set(ids).size === ids.length) }).strict();
export const sentinelObservationSchema = z.object({
  observationId: boundedId, eventKey: boundedId, sourceId: boundedId,
  sourceLabel: z.string().trim().min(1).max(100), publishedAt: z.string().datetime({ offset: true }),
  headline: z.string().trim().min(1).max(200), summary: z.string().trim().min(1).max(500),
  affectedAssetIds: z.array(assetIdSchema).min(1).max(4).refine((ids) => new Set(ids).size === ids.length),
  eventType: z.enum(SENTINEL_EVENT_TYPES), severity: z.enum(SENTINEL_SEVERITIES),
}).strict();
export const sentinelObservationsSchema = z.array(sentinelObservationSchema).max(MAX_SENTINEL_OBSERVATIONS)
  .refine((items) => new Set(items.map((item) => item.observationId)).size === items.length, "observation IDs must be unique");
