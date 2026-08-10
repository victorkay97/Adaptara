import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "./catalog";
import { PRICE_DECIMALS, valueFromBalance } from "./money";
import { DemoReferencePriceProvider } from "./prices";
import type { AssetPosition, ReferencePrice } from "./types";
import { valuePositions } from "./valuation";

describe("DemoReferencePriceProvider deployment references", () => {
  it("returns the intentional eight-decimal USD demo references", async () => {
    const provider = new DemoReferencePriceProvider();
    const expected = { usdt0: 100_000_000n, strsy: 10_000_000_000n, sxau: 200_000_000_000n, saaplx: 20_000_000_000n } as const;
    for (const [assetId, value] of Object.entries(expected)) {
      const price = await provider.getPrice(assetId as keyof typeof expected);
      expect(price).toMatchObject({ assetId, value, decimals: PRICE_DECIMALS, currency: "USD", source: "demo" });
    }
  });

  it("values one seed unit as 4/3/2/1 and allocates 4000/3000/2000/1000 BPS", async () => {
    const provider = new DemoReferencePriceProvider();
    const assets = createAssetCatalog();
    const rawBalances = [4_000_000n, 30_000_000_000_000_000n, 1_000_000_000_000_000n, 5_000_000_000_000_000n];
    const prices = new Map<string, ReferencePrice>();
    for (const asset of assets) prices.set(asset.id, (await provider.getPrice(asset.id))!);
    const positions: AssetPosition[] = assets.map((asset, index) => ({
      asset,
      availability: "available",
      rawBalance: rawBalances[index],
      balanceDecimals: asset.expectedDecimals,
      displayBalance: null,
      referencePrice: null,
      usdValue: null,
      usdValueDecimals: PRICE_DECIMALS,
      allocationBps: null,
    }));

    expect(positions.map((position) => valueFromBalance(position.rawBalance!, position.balanceDecimals!, prices.get(position.asset.id)!.value, PRICE_DECIMALS)))
      .toEqual([400_000_000n, 300_000_000n, 200_000_000n, 100_000_000n]);
    const result = valuePositions(positions, prices);
    expect(result.valuationStatus).toBe("valued");
    expect(result.positions.map((position) => position.allocationBps)).toEqual([4000, 3000, 2000, 1000]);
  });
});
