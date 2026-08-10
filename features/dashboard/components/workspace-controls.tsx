import type { ReactNode } from "react";
import type { PortfolioSnapshot, VaultDiscovery } from "@/features/portfolio/types";

export type PortfolioSource = "wallet" | "vault";
export type WorkspaceTarget = "overview" | "intelligence" | "strategy" | "policy";
export type QueryProjection<T> = { isPending: boolean; isError: boolean; data?: T };
export type WorkspaceReadiness = { wallet: string; network: string; vault: string; portfolio: string };

export function deriveWorkspaceReadiness({ isConnected, onXLayer, source, wallet, vault, vaultPortfolio }: { isConnected: boolean; onXLayer: boolean; source: PortfolioSource; wallet: QueryProjection<PortfolioSnapshot>; vault: QueryProjection<VaultDiscovery>; vaultPortfolio: QueryProjection<PortfolioSnapshot> }): WorkspaceReadiness {
  if (!isConnected) return { wallet: "Not connected", network: "Awaiting wallet", vault: "Unavailable", portfolio: "Not loaded" };
  if (!onXLayer) return { wallet: "Connected", network: "Wrong network", vault: "Unavailable", portfolio: "Unavailable" };
  const vaultStatus = vault.isPending ? "Checking" : vault.isError ? "Read error" : vault.data?.status === "available" ? "Available" : vault.data?.status === "not-created" ? "Not created" : vault.data?.status === "read-error" ? "Read error" : vault.data?.status === "not-configured" ? "Not configured" : "Unavailable";
  const query = source === "wallet" ? wallet : vaultPortfolio;
  const snapshot = query.data;
  const queryPortfolio = query.isPending ? "Loading" : query.isError ? "Unavailable" : snapshot?.valuationStatus === "valued" ? "Valued" : snapshot?.valuationStatus === "partial" ? "Partial" : snapshot ? "Unavailable" : "Not loaded";
  const discoveryStatus = vault.data?.status;
  const portfolio = source === "wallet" ? queryPortfolio
    : discoveryStatus === "not-configured" || discoveryStatus === "not-created" ? "Not available"
    : vault.isError || discoveryStatus === "read-error" ? "Unavailable"
    : discoveryStatus === "available" ? queryPortfolio
    : vaultPortfolio.isError ? "Unavailable"
    : "Not loaded";
  return { wallet: "Connected", network: "X Layer Testnet", vault: vaultStatus, portfolio };
}

export function deriveVaultNavigation(hasUsableSnapshot: boolean, hasPolicy: boolean): WorkspaceTarget[] {
  return hasUsableSnapshot ? ["overview", "intelligence", "strategy", ...(hasPolicy ? ["policy" as const] : [])] : ["overview", ...(hasPolicy ? ["policy" as const] : [])];
}

export function canReadVaultPortfolio(onXLayer: boolean, hasClient: boolean, vaultStatus?: VaultDiscovery["status"]): boolean {
  return onXLayer && hasClient && vaultStatus === "available";
}

export function hasUsableVaultSnapshot(vaultStatus: VaultDiscovery["status"] | undefined, vaultPortfolio: QueryProjection<PortfolioSnapshot>): boolean {
  return vaultStatus === "available" && !vaultPortfolio.isPending && !vaultPortfolio.isError && Boolean(vaultPortfolio.data);
}

export function SourceSwitcher({ value, onChange }: { value: PortfolioSource; onChange: (source: PortfolioSource) => void }) {
  return <div className="source-switcher" role="tablist" aria-label="Portfolio source"><button type="button" role="tab" id="wallet-tab" aria-selected={value === "wallet"} aria-controls="wallet-panel" onClick={() => onChange("wallet")}>Your Wallet<span>Intelligence only</span></button><button type="button" role="tab" id="vault-tab" aria-selected={value === "vault"} aria-controls="vault-panel" onClick={() => onChange("vault")}>Adaptara Vault<span>Controlled strategy</span></button></div>;
}

const labels: Record<WorkspaceTarget, string> = { overview: "Overview", intelligence: "Intelligence", strategy: "Strategy", policy: "Policy" };
export function WorkspaceNavigation({ targets }: { targets: readonly WorkspaceTarget[] }) { return <nav className="workspace-nav" aria-label="Vault workspace sections">{targets.map((target) => <a key={target} href={`#${target}`}>{labels[target]}</a>)}</nav>; }

export function WorkspacePanel({ source, children }: { source: PortfolioSource; children: ReactNode }) { return <div role="tabpanel" id={`${source}-panel`} aria-labelledby={`${source}-tab`}>{children}</div>; }

export function WorkspaceAuthorityGate({ isConnected, onXLayer, disconnected, wrongNetwork, authorized }: { isConnected: boolean; onXLayer: boolean; disconnected: ReactNode; wrongNetwork: ReactNode; authorized: ReactNode }) { return <>{!isConnected ? disconnected : !onXLayer ? wrongNetwork : authorized}</>; }

export function WorkspaceSourceContent({ source, wallet, vault }: { source: PortfolioSource; wallet: ReactNode; vault: ReactNode }) { return <>{source === "wallet" ? wallet : vault}</>; }

export function ReadinessSummary({ readiness }: { readiness: WorkspaceReadiness }) {
  const values = [["Wallet", readiness.wallet], ["Network", readiness.network], ["Vault", readiness.vault], ["Portfolio", readiness.portfolio]];
  return <section className="readiness" aria-label="System readiness">{values.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>;
}
