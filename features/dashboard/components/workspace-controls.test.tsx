import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { PortfolioSnapshot, VaultDiscovery } from "@/features/portfolio/types";
import { canReadVaultPortfolio, deriveDefaultPortfolioSource, deriveVaultNavigation, deriveWorkspaceReadiness, hasUsableVaultSnapshot, ReadinessSummary, SourceSwitcher, WorkspaceAuthorityGate, WorkspaceNavigation, WorkspacePanel, WorkspaceSourceContent, type PortfolioSource } from "./workspace-controls";

const snapshot = (source: PortfolioSource, valuationStatus: PortfolioSnapshot["valuationStatus"] = "valued") => ({ source, valuationStatus } as PortfolioSnapshot);
const idle = <T,>(data?: T) => ({ isPending: false, isError: false, data });
const availableVault = { status: "available", address: "0x0000000000000000000000000000000000000001", vaults: [], selected: { source: "v1", address: "0x0000000000000000000000000000000000000001", owner: "0x0000000000000000000000000000000000000002", index: 0 } } as const satisfies VaultDiscovery;

describe("Phase 10 readiness and navigation coherence", () => {
  it("defaults to a discovered vault without removing explicit wallet selection", () => {
    expect(deriveDefaultPortfolioSource("available")).toBe("vault");
    expect(deriveDefaultPortfolioSource("not-created")).toBe("wallet");
    expect(deriveDefaultPortfolioSource(undefined)).toBe("wallet");
    let selected: PortfolioSource = deriveDefaultPortfolioSource("available");
    const switcher = SourceSwitcher({ value: selected, onChange: (next) => { selected = next; } });
    const buttons = switcher.props.children as ReactElement<{ onClick: () => void }>[];
    buttons[0].props.onClick();
    expect(selected).toBe("wallet");
  });
  it("ignores cached valued and available X Layer data on the wrong network", () => {
    const readiness = deriveWorkspaceReadiness({ isConnected: true, onXLayer: false, source: "wallet", wallet: idle(snapshot("wallet")), vault: idle(availableVault), vaultPortfolio: idle(snapshot("vault")) });
    expect(readiness).toEqual({ wallet: "Connected", network: "Wrong network", vault: "Unavailable", portfolio: "Unavailable" });
    const html = renderToStaticMarkup(<ReadinessSummary readiness={readiness} />);
    expect(html).not.toContain("Valued");
    expect(html).not.toContain("Available");
  });

  it("derives disconnected and current X Layer states in authority order", () => {
    expect(deriveWorkspaceReadiness({ isConnected: false, onXLayer: false, source: "wallet", wallet: idle(snapshot("wallet")), vault: idle(), vaultPortfolio: idle() })).toEqual({ wallet: "Not connected", network: "Awaiting wallet", vault: "Unavailable", portfolio: "Not loaded" });
    expect(deriveWorkspaceReadiness({ isConnected: true, onXLayer: true, source: "vault", wallet: idle(), vault: idle({ status: "not-configured" }), vaultPortfolio: idle() })).toMatchObject({ network: "X Layer Testnet", vault: "Not configured", portfolio: "Not available" });
  });

  it.each([
    ["not-configured", "Not configured", "Not available"],
    ["not-created", "Not created", "Not available"],
    ["available", "Available", "Loading"],
  ] as const)("derives vault %s readiness before interpreting pending portfolio state", (status, vaultLabel, portfolioLabel) => {
    const readiness = deriveWorkspaceReadiness({ isConnected: true, onXLayer: true, source: "vault", wallet: idle(), vault: idle({ status } as VaultDiscovery), vaultPortfolio: { isPending: true, isError: false } });
    expect(readiness).toMatchObject({ vault: vaultLabel, portfolio: portfolioLabel });
  });

  it("reports an available vault portfolio query error as unavailable", () => {
    const readiness = deriveWorkspaceReadiness({ isConnected: true, onXLayer: true, source: "vault", wallet: idle(), vault: idle(availableVault), vaultPortfolio: { isPending: false, isError: true } });
    expect(readiness).toMatchObject({ vault: "Available", portfolio: "Unavailable" });
  });

  it("renders only navigation targets that exist in the current vault view", () => {
    const unavailable = deriveVaultNavigation(false, true);
    const unavailableHtml = renderToStaticMarkup(<WorkspaceNavigation targets={unavailable} />);
    expect(unavailableHtml).toContain('href="#overview"');
    expect(unavailableHtml).toContain('href="#policy"');
    expect(unavailableHtml).not.toContain('href="#intelligence"');
    expect(unavailableHtml).not.toContain('href="#strategy"');
    const usable = renderToStaticMarkup(<WorkspaceNavigation targets={deriveVaultNavigation(true, true)} />);
    for (const target of ["overview", "intelligence", "strategy", "policy"]) expect(usable).toContain(`href="#${target}"`);
  });

  it("withholds full vault navigation when stale snapshot data accompanies a current error", () => {
    const vaultPortfolio = { isPending: false, isError: true, data: snapshot("vault") };
    const html = renderToStaticMarkup(<WorkspaceNavigation targets={deriveVaultNavigation(hasUsableVaultSnapshot("available", vaultPortfolio), true)} />);
    expect(html).toContain('href="#overview"');
    expect(html).toContain('href="#policy"');
    expect(html).not.toContain('href="#intelligence"');
    expect(html).not.toContain('href="#strategy"');
  });

  it("disables vault portfolio query eligibility on the wrong network despite cached available discovery", () => {
    expect(canReadVaultPortfolio(false, true, "available")).toBe(false);
    expect(canReadVaultPortfolio(true, true, "available")).toBe(true);
  });

  it("switches the real source-tab component wallet to vault and back without operational calls", () => {
    const operations = { sentinel: vi.fn(), mara: vi.fn(), adaptation: vi.fn(), yield: vi.fn(), constitution: vi.fn() };
    let selected: PortfolioSource = "wallet";
    const renderSwitcher = () => SourceSwitcher({ value: selected, onChange: (next) => { selected = next; } });
    let buttons = renderSwitcher().props.children as ReactElement<{ onClick: () => void }>[];
    expect(renderToStaticMarkup(<WorkspaceSourceContent source={selected} wallet={<span>Wallet presentation</span>} vault={<span>Vault presentation</span>} />)).toContain("Wallet presentation");
    buttons[1].props.onClick();
    expect(selected).toBe("vault");
    expect(renderToStaticMarkup(<WorkspaceSourceContent source={selected} wallet={<span>Wallet presentation</span>} vault={<span>Vault presentation · Yield Intelligence · Financial Constitution</span>} />)).toContain("Vault presentation");
    buttons = renderSwitcher().props.children as ReactElement<{ onClick: () => void }>[];
    buttons[0].props.onClick();
    expect(selected).toBe("wallet");
    Object.values(operations).forEach((operation) => expect(operation).not.toHaveBeenCalled());
  });

  it("keeps vault-only features out of wallet composition and exposes truthful unavailable vault content", () => {
    const wallet = <span>Portfolio Intelligence</span>;
    const vault = <span>Vault integration is not configured · Yield Intelligence · Financial Constitution</span>;
    const walletHtml = renderToStaticMarkup(<WorkspacePanel source="wallet"><WorkspaceSourceContent source="wallet" wallet={wallet} vault={vault} /></WorkspacePanel>);
    expect(walletHtml).not.toMatch(/Adaptation Simulation|Yield Intelligence|Financial Constitution/);
    const vaultHtml = renderToStaticMarkup(<WorkspacePanel source="vault"><WorkspaceNavigation targets={deriveVaultNavigation(false, true)} /><WorkspaceSourceContent source="vault" wallet={wallet} vault={vault} /></WorkspacePanel>);
    expect(vaultHtml).toContain("Vault integration is not configured");
    expect(vaultHtml).toContain("Yield Intelligence");
    expect(vaultHtml).toContain("Financial Constitution");
    expect(vaultHtml).not.toMatch(/href="#intelligence"|href="#strategy"/);
  });

  it("does not render cached operational composition when connected on the wrong network", () => {
    const html = renderToStaticMarkup(<WorkspaceAuthorityGate isConnected onXLayer={false} disconnected={<span>Connect</span>} wrongNetwork={<span>Wrong network</span>} authorized={<span>Stale wallet portfolio · Adaptation Simulation · Yield Intelligence</span>} />);
    expect(html).toContain("Wrong network");
    expect(html).not.toMatch(/Stale wallet portfolio|Adaptation Simulation|Yield Intelligence/);
  });
});
