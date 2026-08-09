import { BPS_DENOMINATOR } from "./constants";

export function parsePercentToBps(input: string): number {
  if (!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(input)) throw new Error("Enter a percentage from 0 to 100 with at most two decimal places.");
  const [whole, fraction = ""] = input.split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (bps > BPS_DENOMINATOR) throw new Error("Percentage must not exceed 100.");
  return bps;
}

export function formatBpsAsPercent(bps: number): string {
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS_DENOMINATOR) throw new Error("BPS must be an integer from 0 to 10,000.");
  const whole = Math.floor(bps / 100);
  const fraction = String(bps % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
