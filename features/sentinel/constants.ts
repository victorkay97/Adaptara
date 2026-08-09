import type { SentinelSeverity } from "./types";

export const SENTINEL_VERSION = "phase-8.v1" as const;
export const MAX_SENTINEL_REQUEST_BYTES = 16_384;
export const MAX_SENTINEL_OBSERVATIONS = 50;
export const SENTINEL_ACTIVE_WINDOW_MS = 72 * 60 * 60 * 1000;
export const SENTINEL_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
export const SENTINEL_STRESS_BPS: Readonly<Record<SentinelSeverity, number>> = { low: 2_500, medium: 5_000, high: 7_500, critical: 10_000 };
export const SENTINEL_LIMITATIONS = [
  "Event feed is demo/non-live.",
  "Corroboration is based on provided demo source identities.",
  "No live web or news API was queried.",
  "Event stress does not predict prices.",
  "Event stress does not execute transactions.",
] as const;
