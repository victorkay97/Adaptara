import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { DiscoveredManagedVault } from "@/features/vaults/discovery";
import { LiveConnectedDashboard } from "./live-connected-dashboard";

const owner = "0x7bc800000000000000000000000000000000234E" as const;
const vault: DiscoveredManagedVault = { source: "v2", address: "0x1111111111111111111111111111111111111111", owner, index: 0 };
const snapshot: PortfolioSnapshot = {
  source: "wallet", accountAddress: owner, chainId: 196, blockNumber: 1n, blockConsistency: "single-block", capturedAt: "2026-08-22T00:00:00Z", valuationStatus: "valued", priceSources: ["fixture"],
  totals: { totalUsdValue: 12_345_00n, usdValueDecimals: 2, valuedAssetCount: 2, nonzeroAssetCount: 2, unknownBalanceAssetCount: 0 },
  positions: [
    { asset: { id: "usdt", symbol: "USDT", displayName: "Tether", role: "Reserve", baselineRiskTier: "Reserve", expectedDecimals: 6, sandbox: false }, availability: "available", rawBalance: 5000n, balanceDecimals: 6, displayBalance: "5000", referencePrice: { assetId: "usdt", value: 100000000n, decimals: 8, currency: "USD", source: "fixture", capturedAt: "2026-08-22T00:00:00Z" }, usdValue: 500000n, usdValueDecimals: 2, allocationBps: 4050 },
    { asset: { id: "xeth", symbol: "xETH", displayName: "X Layer Ether", role: "Growth", baselineRiskTier: "Balanced", expectedDecimals: 18, sandbox: false }, availability: "available", rawBalance: 1n, balanceDecimals: 18, displayBalance: "1", referencePrice: { assetId: "xeth", value: 734500000000n, decimals: 8, currency: "USD", source: "fixture", capturedAt: "2026-08-22T00:00:00Z" }, usdValue: 734500n, usdValueDecimals: 2, allocationBps: 5950 },
  ],
};
const render = (destination: "Home" | "Portfolio" | "Vaults" | "Activity", value = snapshot) => renderToStaticMarkup(<LiveConnectedDashboard destination={destination} snapshot={value} riskTier="Balanced" vaults={[vault]} selected={vault} onNavigate={vi.fn()} />);

describe("connected Live presentation parity", () => {
  it("uses the approved Home architecture with authoritative supplied state", () => {
    const html = render("Home");
    for (const label of ["Overview", "Total Portfolio", "In Vaults", "Outside Vaults", "Active Vaults", "Allocation", "Portfolio state", "Vault health", "MARA Intelligence", "Your Vaults", "Recent Activity"]) expect(html).toContain(label);
    expect(html).toContain("$12,345");
    expect(html).toContain("0x1111");
    expect(html).not.toMatch(/Your Adaptara position|Needs attention|Next actions|Growth Vault|Reserve Vault|Opportunity Vault|\$25,000|floating/i);
  });

  it("keeps connected Portfolio, Vaults and Activity inside the light shared structure", () => {
    expect(render("Portfolio")).toMatch(/Asset Allocation[\s\S]*Risk Exposure|Portfolio state/);
    expect(render("Vaults")).toMatch(/Your Vaults|Managed Capital Distribution|Constitutions Overview/);
    expect(render("Activity")).toMatch(/No authoritative activity ingested[\s\S]*Onchain/);
  });

  it("keeps unknown valuation distinct from actual zero and never invents activity", () => {
    const unavailable = { ...snapshot, valuationStatus: "unavailable" as const, totals: { ...snapshot.totals, totalUsdValue: 0n }, positions: snapshot.positions.map((position) => ({ ...position, usdValue: null, allocationBps: null })) };
    const html = render("Home", unavailable);
    expect(html).toContain("Valuation unavailable");
    expect(html).toContain("—");
    expect(html).not.toContain("$0");
    expect(html).toContain("No live activity yet");
  });
});
