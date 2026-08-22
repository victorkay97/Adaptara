import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createAssetCatalog } from "../catalog";
import type { PortfolioSnapshot } from "../types";
import { YieldPanel } from "@/features/yield/components/yield-panel";
import { GettingStarted, LIVE_CONSTITUTION_WRITES_ENABLED, OVERVIEW_INFORMATION_HIERARCHY, PortfolioAllocationVisual, shouldShowYieldIntelligence, VaultCollectionState, VaultUnavailablePanel } from "./portfolio-dashboard";

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
  it("renders concise dismissible first-use guidance without storing portfolio data", () => { const html = renderToStaticMarkup(<GettingStarted onNavigate={() => undefined} onDismiss={() => undefined} />); expect(html).toContain("Getting started"); expect(html).toContain("Review your portfolio"); expect(html).toContain("Ask MARA"); expect(html).toContain("Explore a simulation"); expect(html).toContain("Check your safety rules"); expect(html).toContain("Dismiss"); expect(html).not.toMatch(/localStorage|accountAddress|balance/i); });
  it("prioritizes human intelligence before context and detailed workspace controls", () => {
    expect(OVERVIEW_INFORMATION_HIERARCHY.slice(0, 5)).toEqual(["primary-metrics", "mara", "attention", "portfolio-preview", "safety"]);
    expect(OVERVIEW_INFORMATION_HIERARCHY.indexOf("portfolio-context")).toBeGreaterThan(OVERVIEW_INFORMATION_HIERARCHY.indexOf("safety"));
    expect(OVERVIEW_INFORMATION_HIERARCHY.at(-1)).toBe("detailed-workspace");
  });
  it("keeps every public Constitution write control disabled during read-only V2 activation", () => expect(LIVE_CONSTITUTION_WRITES_ENABLED).toBe(false));
  it("shows truthful zero-Vault readiness without exposing creation", () => {
    const html = renderToStaticMarkup(<VaultCollectionState vaults={[]} snapshot={vaultSnapshot()} onSelect={() => undefined} />);
    expect(html).toContain("Multi-Vault infrastructure is live");
    expect(html).toContain("Creation remains disabled");
    expect(html).toContain('disabled=""');
  });
  it("keeps V1 and V2 provenance visible in a mixed Vault list", () => {
    const owner = vaultSnapshot().accountAddress;
    const v1 = { source: "v1" as const, address: "0x0000000000000000000000000000000000000011" as const, owner, index: 0 };
    const v2 = { source: "v2" as const, address: "0x0000000000000000000000000000000000000022" as const, owner, index: 0 };
    const html = renderToStaticMarkup(<VaultCollectionState vaults={[v1, v2]} selected={v2} snapshot={vaultSnapshot()} onSelect={() => undefined} />);
    expect(html).toContain("V1");
    expect(html).toContain("V2");
    expect(html).toContain("Selected");
  });
  it("does not place Yield Intelligence in the wallet flow", () => expect(shouldShowYieldIntelligence("wallet")).toBe(false));
  it("renders unavailable Yield Intelligence when vault integration is not configured", () => { const html = renderToStaticMarkup(<VaultUnavailablePanel message="Vault integration not deployed yet." />); expect(html).toContain("Vault integration not deployed yet."); expect(html).toContain("Yield Intelligence"); expect(html).toContain("disabled"); });
  it("renders unavailable Yield Intelligence when no vault has been created", () => { const html = renderToStaticMarkup(<VaultUnavailablePanel message="No Adaptara Vault found." />); expect(html).toContain("No Adaptara Vault found."); expect(html).toContain("Sandbox yield model · non-live"); expect(html).toContain("eligible sTRSY balance is required"); });
  it("cannot generate a projection without a snapshot", () => { const html = renderToStaticMarkup(<YieldPanel />); expect(html).toContain('disabled=""'); expect(html).not.toContain("Projected ending balance"); });
  it("keeps simulation available for a valid vault snapshot", () => { const html = renderToStaticMarkup(<YieldPanel snapshot={vaultSnapshot()} />); expect(html).toContain("Run Compounding Simulation"); expect(html).not.toContain('disabled=""'); expect(shouldShowYieldIntelligence("vault")).toBe(true); });
  it("renders an accessible truthful allocation empty state", () => { const html = renderToStaticMarkup(<PortfolioAllocationVisual snapshot={vaultSnapshot()} />); expect(html).toContain('role="img"'); expect(html).toContain("No portfolio allocation available"); expect(html).toContain("No valued allocation"); expect(html).not.toMatch(/APY|APR|performance/i); });
});
