import { PRICE_DECIMALS } from "./money";
import type { AssetId, ReferencePrice } from "./types";

export interface ReferencePriceProvider { getPrice(assetId: AssetId): Promise<ReferencePrice | null> }

export class DemoReferencePriceProvider implements ReferencePriceProvider {
  constructor(private readonly prices: Partial<Record<AssetId, bigint>> = {
    usdt0: 100_000_000n,
    strsy: 10_000_000_000n,
    sxau: 200_000_000_000n,
    saaplx: 20_000_000_000n,
  }) {}
  async getPrice(assetId: AssetId): Promise<ReferencePrice | null> {
    const value = this.prices[assetId];
    return value === undefined ? null : { assetId, value, decimals: PRICE_DECIMALS, currency: "USD", source: "demo", capturedAt: new Date().toISOString() };
  }
}
