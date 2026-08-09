export const PRICE_DECIMALS = 8 as const;
export const BPS_TOTAL = 10_000;

export function formatUnitsExact(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = absolute / base;
  const fraction = (absolute % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function valueFromBalance(rawBalance: bigint, balanceDecimals: number, price: bigint, priceDecimals: number): bigint {
  if (priceDecimals !== PRICE_DECIMALS) throw new Error(`Price scale mismatch: expected ${PRICE_DECIMALS}, received ${priceDecimals}`);
  return (rawBalance * price) / (10n ** BigInt(balanceDecimals));
}
