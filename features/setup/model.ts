export type ManagementMode = "Advisory" | "Approval Required" | "Adaptive";
export type ValuationState = "valued" | "partial" | "unavailable";

export interface FundingPreview { available: bigint; managed: bigint; outside: bigint; percent: number }
export interface DemoMandate {
  minimumLiquidReserve: number; maximumSingleAsset: number; maximumAggressive: number;
  maximumDailyAdaptation: number; maximumSingleAction: number; maximumYieldStrategy: number;
  compoundYield: number; reserveYield: number; mode: ManagementMode;
}

export const DEMO_MANDATE: DemoMandate = {
  minimumLiquidReserve: 20, maximumSingleAsset: 50, maximumAggressive: 30,
  maximumDailyAdaptation: 10, maximumSingleAction: 5, maximumYieldStrategy: 20,
  compoundYield: 70, reserveYield: 30, mode: "Adaptive",
};

export function valueToCents(value: bigint, decimals: number): bigint {
  if (value < 0n || !Number.isInteger(decimals) || decimals < 0) throw new RangeError("Invalid valued amount");
  if (decimals === 2) return value;
  return decimals > 2 ? value / (10n ** BigInt(decimals - 2)) : value * (10n ** BigInt(2 - decimals));
}

export function fundingPreview(available: bigint, percent: number, valuation: ValuationState = "valued"): FundingPreview | null {
  if (valuation !== "valued" || available < 0n || !Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  const normalized = Math.round(percent * 100);
  const managed = available * BigInt(normalized) / 10_000n;
  return { available, managed, outside: available - managed, percent: normalized / 100 };
}

export function mandateReady(input: DemoMandate): boolean {
  return input.minimumLiquidReserve >= 0 && input.maximumSingleAsset <= 100 && input.maximumAggressive <= 100
    && input.maximumDailyAdaptation > 0 && input.maximumSingleAction > 0 && input.maximumYieldStrategy <= 100
    && input.compoundYield + input.reserveYield === 100;
}
