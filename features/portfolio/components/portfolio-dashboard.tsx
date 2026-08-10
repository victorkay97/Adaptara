"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { xLayerTestnet } from "@/lib/chain/xlayer";
import { publicEnv } from "@/lib/env/public";
import { ASSET_CATALOG } from "../catalog";
import { formatUnitsExact } from "../money";
import { DemoReferencePriceProvider } from "../prices";
import { discoverVault, readVaultPortfolio, readWalletPortfolio } from "../readers";
import type { AssetPosition, PortfolioSnapshot } from "../types";
import { RiskIntelligence } from "@/features/risk/components/risk-intelligence";
import { calculatePortfolioRisk } from "@/features/risk/portfolio-risk";
import { getDemoRiskSignals } from "@/features/risk/signals";
import { MaraPanel } from "@/features/mara/components/mara-panel";
import { FinancialConstitutionPanel } from "@/features/constitution/components/financial-constitution";
import type { OnchainConstitution } from "@/features/constitution/types";
import type { MaraAnalysis } from "@/features/mara/types";
import { buildMaraContext, maraAnalysisForContext, maraContextFingerprint, type ContextScopedMaraAnalysis } from "@/features/mara/context";
import { AdaptationPlanPanel } from "@/features/adaptation/components/adaptation-plan";
import { SentinelPanel } from "@/features/sentinel/components/sentinel-panel";
import { overlaySentinelStress, riskAssessedAtWithSentinel, sentinelInfluencesPortfolioRisk } from "@/features/sentinel/effective-signals";
import { sentinelAssessmentForContext, sentinelContextFingerprint } from "@/features/sentinel/context";
import type { ContextScopedSentinelAssessment, SentinelAssessment } from "@/features/sentinel/types";
import { YieldPanel } from "@/features/yield/components/yield-panel";
import { canReadVaultPortfolio, deriveVaultNavigation, deriveWorkspaceReadiness, hasUsableVaultSnapshot, ReadinessSummary, SourceSwitcher, WorkspaceAuthorityGate, WorkspaceNavigation, WorkspacePanel, WorkspaceSourceContent, type PortfolioSource } from "@/features/dashboard/components/workspace-controls";

const demoPrices = new DemoReferencePriceProvider();
const displayNumber = (value: string) => { const [whole, fraction] = value.split("."); return `${BigInt(whole).toLocaleString()}${fraction ? `.${fraction.slice(0, 4)}` : ""}`; };
const displayUsd = (value: bigint, decimals: number) => `$${displayNumber(formatUnitsExact(value, decimals))}`;

function PositionCard({ position }: { position: AssetPosition }) {
  const statusCopy: Record<AssetPosition["availability"], string> = {
    available: "Available", "not-configured": "Sandbox asset not deployed yet", unsupported: "Not supported",
    unpriced: "Balance available; reference price unavailable", "read-error": "Balance unavailable", "configuration-error": "Token configuration mismatch",
  };
  return <article className="rounded-2xl border border-[var(--line)] bg-white/70 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><h4 className="text-lg font-semibold">{position.asset.symbol}</h4>{position.asset.sandbox ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">Sandbox · no redemption rights</span> : null}</div><p className="mt-1 text-sm text-[var(--muted)]">{position.asset.displayName}</p></div>
      <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">{position.asset.baselineRiskTier}</span>
    </div>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
      <div><dt className="text-[var(--muted)]">Balance</dt><dd className="mt-1 font-semibold">{position.displayBalance === null ? "—" : `${displayNumber(position.displayBalance)} ${position.asset.symbol}`}</dd></div>
      <div><dt className="text-[var(--muted)]">Reference value</dt><dd className="mt-1 font-semibold">{position.usdValue === null ? "—" : displayUsd(position.usdValue, position.usdValueDecimals)}</dd></div>
      <div><dt className="text-[var(--muted)]">Allocation</dt><dd className="mt-1 font-semibold">{position.allocationBps === null ? "—" : `${(position.allocationBps / 100).toFixed(2)}%`}</dd></div>
    </dl>
    <p className="mt-4 text-xs text-[var(--muted)]">{statusCopy[position.availability]}{position.error ? ` · ${position.error}` : ""}{position.referencePrice ? " · Demo reference (non-live)" : ""}</p>
  </article>;
}

export const shouldShowYieldIntelligence = (source: PortfolioSnapshot["source"]): boolean => source === "vault";

export function VaultUnavailablePanel({ message, role }: { message: string; role?: "alert" | "status" }) {
  return <div className="grid gap-6">
    <div className={`rounded-3xl border border-[var(--line)] p-8 ${role === "alert" ? "bg-red-50 text-red-800" : "bg-white/70"}`} role={role}>
      <h2 className="text-2xl font-semibold">Adaptara Vault</h2><p className="mt-3">{message}</p>
    </div>
    <YieldPanel />
  </div>;
}

function SnapshotPanel({ title, snapshot, constitution }: { title: string; snapshot: PortfolioSnapshot; constitution?: OnchainConstitution }) {
  const sentinelContext = sentinelContextFingerprint(snapshot);
  const [sentinelResult, setSentinelResult] = useState<ContextScopedSentinelAssessment | null>(null);
  const handleSentinelAssessment = useCallback((assessment: SentinelAssessment, contextKey: string) => setSentinelResult({ contextKey, assessment }), []);
  const sentinelAssessment = sentinelAssessmentForContext(sentinelResult, sentinelContext);
  const baseRiskSignals = new Map(snapshot.positions.map((position) => [position.asset.id, getDemoRiskSignals(position.asset.id)]));
  const sentinelInfluence = sentinelInfluencesPortfolioRisk(snapshot, baseRiskSignals, sentinelAssessment);
  const riskSignals = overlaySentinelStress(baseRiskSignals, sentinelAssessment);
  const riskAssessment = calculatePortfolioRisk(snapshot, riskSignals, riskAssessedAtWithSentinel(snapshot, baseRiskSignals, sentinelAssessment));
  const currentMaraContext = maraContextFingerprint(snapshot, riskAssessment);
  const [maraResult, setMaraResult] = useState<ContextScopedMaraAnalysis | null>(null);
  const handleMaraAnalysis = useCallback((value: MaraAnalysis | null, contextKey: string) => { if (value) setMaraResult({ contextKey, analysis: value }); }, []);
  const maraAnalysis = maraAnalysisForContext(maraResult, currentMaraContext);
  const largest = snapshot.valuationStatus === "valued"
    ? snapshot.positions.reduce<AssetPosition | undefined>((current, position) => {
        if (position.usdValue === null) return current;
        if (!current || current.usdValue === null || position.usdValue > current.usdValue) return position;
        return current;
      }, undefined)
    : undefined;
  const reserve = snapshot.positions.find((p) => p.asset.baselineRiskTier === "Reserve")?.allocationBps;
  const totalLabel = snapshot.valuationStatus === "partial" ? "Valued reference subtotal" : "Total reference value";
  return <section aria-labelledby={`${snapshot.source}-title`} className="rounded-3xl border border-white/80 bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(34,57,43,0.08)] sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#377657]">Adaptara-supported portfolio</p><h2 id={`${snapshot.source}-title`} className="mt-2 text-2xl font-semibold">{title}</h2></div><span className="text-xs text-[var(--muted)]">Single-block read · {snapshot.valuationStatus} valuation</span></div>
    <div className="mt-6 grid gap-3 rounded-2xl bg-[#edf3ed] p-4 sm:grid-cols-4">
      <div><p className="text-xs text-[var(--muted)]">{totalLabel}</p><p className="mt-1 font-semibold">{snapshot.totals.totalUsdValue > 0n ? displayUsd(snapshot.totals.totalUsdValue, snapshot.totals.usdValueDecimals) : "—"}</p></div>
      <div><p className="text-xs text-[var(--muted)]">Asset count</p><p className="mt-1 font-semibold">{snapshot.totals.nonzeroAssetCount}</p></div>
      <div><p className="text-xs text-[var(--muted)]">Reserve allocation</p><p className="mt-1 font-semibold">{reserve === null || reserve === undefined ? "—" : `${(reserve / 100).toFixed(2)}%`}</p></div>
      <div><p className="text-xs text-[var(--muted)]">{snapshot.valuationStatus === "valued" ? "Largest position" : "Unknown balances"}</p><p className="mt-1 font-semibold">{snapshot.valuationStatus === "valued" ? (largest?.usdValue && largest.usdValue > 0n ? largest.asset.symbol : "—") : snapshot.totals.unknownBalanceAssetCount}</p></div>
    </div>
    {snapshot.valuationStatus === "partial" ? <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Some configured holdings could not be completely read or valued. Portfolio allocation is unavailable until valuation is complete.</p> : null}
    {snapshot.valuationStatus === "unavailable" && snapshot.totals.unknownBalanceAssetCount > 0 ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Portfolio value is unavailable because one or more configured balances could not be read or verified.</p> : null}
    {snapshot.totals.nonzeroAssetCount === 0 && snapshot.totals.unknownBalanceAssetCount === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">No supported token balances were found for this source.</p> : null}
    <div className="mt-5 grid gap-3">{snapshot.positions.map((position) => <PositionCard key={position.asset.id} position={position} />)}</div>
    <SentinelPanel snapshot={snapshot} assessment={sentinelAssessment} onAssessmentChange={handleSentinelAssessment} />
    <RiskIntelligence assessment={riskAssessment} sentinelInfluence={sentinelInfluence} />
    <MaraPanel snapshot={snapshot} assessment={riskAssessment} onAnalysisChange={snapshot.source === "vault" ? handleMaraAnalysis : undefined} />
    {snapshot.source === "vault" ? <AdaptationPlanPanel snapshot={snapshot} assessment={riskAssessment} constitution={constitution} analysis={maraAnalysis} facts={buildMaraContext(snapshot, riskAssessment).facts} /> : null}
    {shouldShowYieldIntelligence(snapshot.source) ? <YieldPanel snapshot={snapshot} /> : null}
  </section>;
}

function LoadingCard({ label }: { label: string }) { return <div className="loading-card" role="status" aria-live="polite"><span className="skeleton-line" /><span className="skeleton-line short" /><p>{label}...</p></div>; }
function EmptyState({ title, detail, warning = false }: { title: string; detail: string; warning?: boolean }) { return <section className={`empty-state ${warning ? "warning" : ""}`}><p className="eyebrow">Workspace status</p><h2>{title}</h2><p>{detail}</p></section>; }
function ErrorCard({ message }: { message: string }) { return <div className="empty-state error" role="alert"><h2>Portfolio unavailable</h2><p>{message}</p></div>; }

export function PortfolioDashboard() {
  const [source, setSource] = useState<PortfolioSource>("wallet");
  const [activeConstitution, setActiveConstitution] = useState<OnchainConstitution | null>(null);
  const handleActiveConstitution = useCallback((value: OnchainConstitution | null) => setActiveConstitution(value), []);
  const { address, chain, isConnected } = useAccount();
  const connected = Boolean(isConnected && address);
  const client = usePublicClient({ chainId: xLayerTestnet.id });
  const onXLayer = chain?.id === xLayerTestnet.id;
  const wallet = useQuery({ queryKey: ["portfolio", "wallet", address], enabled: Boolean(address && onXLayer && client), queryFn: () => readWalletPortfolio({ client: client!, accountAddress: address!, assets: ASSET_CATALOG, priceProvider: demoPrices }) });
  const factoryAddress = publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS ? getAddress(publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS) : undefined;
  const vault = useQuery({ queryKey: ["vault-discovery", address, factoryAddress], enabled: Boolean(address && onXLayer && client), queryFn: () => discoverVault(client!, address!, factoryAddress) });
  const vaultPortfolio = useQuery({ queryKey: ["portfolio", "vault", vault.data?.status === "available" ? vault.data.address : null], enabled: canReadVaultPortfolio(Boolean(onXLayer), Boolean(client), vault.data?.status), queryFn: () => {
    const discovered = vault.data;
    if (!client || discovered?.status !== "available") throw new Error("Vault is not available");
    return readVaultPortfolio({ client, accountAddress: discovered.address, assets: ASSET_CATALOG, priceProvider: demoPrices });
  } });

  const readiness = deriveWorkspaceReadiness({ isConnected: connected, onXLayer: Boolean(onXLayer), source, wallet, vault, vaultPortfolio });
  const hasPolicy = Boolean(client && vault.data);
  const usableVaultSnapshot = hasUsableVaultSnapshot(vault.data?.status, vaultPortfolio);
  const vaultNavigation = deriveVaultNavigation(usableVaultSnapshot, hasPolicy);
  const vaultContent = vault.isPending ? <LoadingCard label="Discovering Adaptara Vault" /> : vault.data?.status === "not-configured" ? <VaultUnavailablePanel message="Vault integration is not configured in this environment. An Adaptara Vault is an isolated smart-contract vault governed by your Financial Constitution." /> : vault.data?.status === "not-created" ? <VaultUnavailablePanel message="No Adaptara Vault has been created for this wallet. Vault creation is not enabled in Phase 10." /> : vault.data?.status === "read-error" ? <VaultUnavailablePanel message={`Vault discovery unavailable: ${vault.data.error}`} role="alert" /> : vaultPortfolio.isPending ? <LoadingCard label="Reading vault portfolio" /> : vaultPortfolio.isError ? <VaultUnavailablePanel message={`Vault portfolio unavailable: ${vaultPortfolio.error.message}`} role="alert" /> : vaultPortfolio.data ? <SnapshotPanel title="Adaptara Vault" snapshot={vaultPortfolio.data} constitution={activeConstitution ?? undefined} /> : null;
  const walletContent = wallet.isPending ? <LoadingCard label="Reading wallet portfolio" /> : wallet.isError ? <ErrorCard message={`Wallet portfolio unavailable: ${wallet.error.message}`} /> : wallet.data ? <SnapshotPanel title="Your Wallet" snapshot={wallet.data} /> : null;

  return <div className="workspace-shell">
    <div className="workspace-intro"><div><p className="eyebrow">Portfolio workspace</p><h2>One source. Clear intelligence.</h2><p>Choose a supported wallet for read-only intelligence, or an Adaptara Vault for policy-bounded strategy simulations.</p></div><SourceSwitcher value={source} onChange={setSource} /></div>
    <ReadinessSummary readiness={readiness} />
    <WorkspacePanel source={source}><WorkspaceAuthorityGate isConnected={connected} onXLayer={Boolean(onXLayer)} disconnected={<EmptyState title="Connect your wallet" detail="Connect an existing wallet to inspect supported holdings and begin the explicit intelligence journey." />} wrongNetwork={<EmptyState title="Wrong network" detail="Switch to X Layer Testnet to read supported wallet or vault balances." warning />} authorized={<WorkspaceSourceContent source={source} wallet={<div id="overview">{walletContent}</div>} vault={<><WorkspaceNavigation targets={vaultNavigation} /><div id="overview">{vaultContent}</div>{client && vault.data ? <div id="policy" className="mt-6"><FinancialConstitutionPanel key={`${address}:${vault.data.status === "available" ? vault.data.address : "no-vault"}`} address={address!} client={client} vault={vault.data} snapshot={vault.data.status === "available" ? vaultPortfolio.data : undefined} onActiveChange={handleActiveConstitution} /></div> : null}</>} />}/></WorkspacePanel>
  </div>;

}
