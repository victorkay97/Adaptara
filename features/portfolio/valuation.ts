import { BPS_TOTAL, PRICE_DECIMALS, valueFromBalance } from "./money";
import type { AssetPosition, PortfolioTotals, ReferencePrice, ValuationStatus } from "./types";

export interface ValuationResult { positions: AssetPosition[]; totals: PortfolioTotals; valuationStatus: ValuationStatus }

export function valuePositions(positions: AssetPosition[], prices: ReadonlyMap<string, ReferencePrice>): ValuationResult {
  const valued: AssetPosition[] = positions.map((position) => {
    const price = prices.get(position.asset.id) ?? null;
    if (position.rawBalance === null || position.balanceDecimals === null) return { ...position, referencePrice: price, usdValue: null, allocationBps: null };
    if (!price) return { ...position, availability: position.rawBalance > 0n ? "unpriced" : position.availability, referencePrice: null, usdValue: null, allocationBps: null };
    return { ...position, referencePrice: price, usdValue: valueFromBalance(position.rawBalance, position.balanceDecimals, price.value, price.decimals), usdValueDecimals: PRICE_DECIMALS, allocationBps: null };
  });
  const nonzero = valued.filter((p) => p.rawBalance !== null && p.rawBalance > 0n);
  const pricedNonzero = nonzero.filter((p) => p.usdValue !== null);
  const unknownBalanceAssetCount = valued.filter((p) => p.asset.address !== undefined && p.rawBalance === null && (p.availability === "read-error" || p.availability === "configuration-error")).length;
  const total = pricedNonzero.reduce((sum, p) => sum + (p.usdValue ?? 0n), 0n);
  const valuationStatus: ValuationStatus = total === 0n ? "unavailable" : unknownBalanceAssetCount === 0 && pricedNonzero.length === nonzero.length ? "valued" : "partial";

  if (valuationStatus === "valued") {
    const eligible = valued.map((p, index) => ({ index, value: p.usdValue ?? 0n })).filter((p) => p.value > 0n);
    let assigned = 0;
    for (const item of eligible) {
      const allocationBps = Number((item.value * BigInt(BPS_TOTAL)) / total);
      valued[item.index] = { ...valued[item.index], allocationBps };
      assigned += allocationBps;
    }
    const remainder = BPS_TOTAL - assigned;
    if (remainder > 0 && eligible.length) {
      const largest = eligible.reduce((best, item) => item.value > best.value ? item : best);
      valued[largest.index] = { ...valued[largest.index], allocationBps: (valued[largest.index].allocationBps ?? 0) + remainder };
    }
  }
  return { positions: valued, totals: { totalUsdValue: total, usdValueDecimals: PRICE_DECIMALS, valuedAssetCount: pricedNonzero.length, nonzeroAssetCount: nonzero.length, unknownBalanceAssetCount }, valuationStatus };
}
