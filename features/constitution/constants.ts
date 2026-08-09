import type { FinancialConstitution } from "./types";

export const CONSTITUTION_VERSION = "phase-6.v1" as const;
export const BPS_DENOMINATOR = 10_000;
export const EMPTY_CONSTITUTION: FinancialConstitution = { minimumReserveBps: 0, maximumSingleAssetExposureBps: 0, maximumAggressiveExposureBps: 0, maximumDailyReallocationBps: 0 };
