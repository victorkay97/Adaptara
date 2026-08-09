import type { YieldHorizonDays } from "./types";

export const YIELD_MODEL_VERSION = "phase-9.v1" as const;
export const YIELD_HORIZONS = [30, 90, 365] as const satisfies readonly YieldHorizonDays[];
export const X_LAYER_TESTNET_CHAIN_ID = 1952 as const;
export const BPS_DENOMINATOR = 10_000n;
export const DAY_COUNT_BASIS = 365n;
export const YIELD_LIMITATIONS = [
  "Demo/non-live yield terms; the rate is not sourced from a live protocol.",
  "The projection is not guaranteed and does not represent earned or claimable yield.",
  "Market price and future USD return are not projected.",
  "No transaction is executed.",
  "Sandbox assets have no real-world redemption claim.",
] as const;
