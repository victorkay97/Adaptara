import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "../catalog";
import type { PortfolioSnapshot } from "../types";
import { YieldPanel } from "@/features/yield/components/yield-panel";
import { LIVE_CONSTITUTION_WRITES_ENABLED, shouldShowYieldIntelligence, VaultUnavailablePanel } from "./portfolio-dashboard";

const vaultSnapshot = (): PortfolioSnapshot => ({
  source: "vault",
  accountAddress: "0x0000000000000000000000000000000000000001",
  chainId: 1952,
  blockNumber: 10n,
  blockConsistency: "single-block",
  capturedAt: "fixture",
  positions: createAssetCatalog().map((asset) => ({ asset, availability: asset.id === "strsy" ? "available" : "not-configured", rawBalance: asset.id === "strsy" ? 100_000000000000000000n : null, balanceDecimals: asset.id === "strsy" ? 18 : null, displayBalance: null, referencePrice: null, usdValue: null, usdValueDecimals: 8, allocationBps: null })),
  totals: { totalUsdValue: 0n, usdValueDecimals: 8, valuedAssetCount: 0, nonzeroAssetCount: 1, unknownBalanceAssetCount: 0 },
  valuationStatus: "unavailable",
  priceSources: [],
});

describe("vault yield discoverability", () => {
  it("opts the live dashboard into the reviewed owner Constitution capability", () => expect(LIVE_CONSTITUTION_WRITES_ENABLED).toBe(true));
  it("does not place Yield Intelligence in the wallet flow", () => expect(shouldShowYieldIntelligence("wallet")).toBe(false));
  it("renders unavailable Yield Intelligence when vault integration is not configured", () => { const html = renderToStaticMarkup(<VaultUnavailablePanel message="Vault integration not deployed yet." />); expect(html).toContain("Vault integration not deployed yet."); expect(html).toContain("Yield Intelligence"); expect(html).toContain("disabled"); });
  it("renders unavailable Yield Intelligence when no vault has been created", () => { const html = renderToStaticMarkup(<VaultUnavailablePanel message="No Adaptara Vault found." />); expect(html).toContain("No Adaptara Vault found."); expect(html).toContain("Sandbox yield model · non-live"); expect(html).toContain("eligible sTRSY balance is required"); });
  it("cannot generate a projection without a snapshot", () => { const html = renderToStaticMarkup(<YieldPanel />); expect(html).toContain('disabled=""'); expect(html).not.toContain("Projected ending balance"); });
  it("keeps simulation available for a valid vault snapshot", () => { const html = renderToStaticMarkup(<YieldPanel snapshot={vaultSnapshot()} />); expect(html).toContain("Run Compounding Simulation"); expect(html).not.toContain('disabled=""'); expect(shouldShowYieldIntelligence("vault")).toBe(true); });
});
