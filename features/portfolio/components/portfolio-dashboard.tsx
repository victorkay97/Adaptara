"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { activeXLayer, isLiveReadOnlyMode } from "@/lib/chain/xlayer";
import { publicEnv } from "@/lib/env/public";
import { shortenAddress } from "@/lib/wallet/format";
import { ASSET_CATALOG, MAINNET_ASSET_CATALOG } from "../catalog";
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
import { evaluateConstitutionCompliance } from "@/features/constitution/compliance";
import type { MaraAnalysis } from "@/features/mara/types";
import { buildMaraContext, maraAnalysisForContext, maraContextFingerprint, type ContextScopedMaraAnalysis } from "@/features/mara/context";
import { AdaptationPlanPanel } from "@/features/adaptation/components/adaptation-plan";
import { SentinelPanel } from "@/features/sentinel/components/sentinel-panel";
import { overlaySentinelStress, riskAssessedAtWithSentinel, sentinelInfluencesPortfolioRisk } from "@/features/sentinel/effective-signals";
import { sentinelAssessmentForContext, sentinelContextFingerprint } from "@/features/sentinel/context";
import type { ContextScopedSentinelAssessment, SentinelAssessment } from "@/features/sentinel/types";
import { YieldPanel } from "@/features/yield/components/yield-panel";
import { ManagedSetup } from "@/features/setup/components/managed-setup";
import { MaraActivityLoop } from "@/features/mara/components/mara-activity-loop";
import { canReadVaultPortfolio, deriveDefaultPortfolioSource, deriveWorkspaceReadiness, ReadinessSummary, SourceSwitcher, WorkspaceAuthorityGate, WorkspacePanel, WorkspaceSourceContent, type PortfolioSource, type WorkspaceReadiness } from "@/features/dashboard/components/workspace-controls";
import { TechnicalDisclosure } from "@/components/ui/product-primitives";
import type { DashboardDestination } from "@/features/experience/components/dashboard-shell";
import { AskMara } from "@/features/mara/assistant/ask-mara";
import { buildAskMaraContext } from "@/features/mara/assistant/context";
import { MingcuteIcon } from "@/components/ui/mingcute-icon";
import { ProductIcon } from "@/features/experience/components/product-icons";
import type { DiscoveredManagedVault } from "@/features/vaults/discovery";

const demoPrices = new DemoReferencePriceProvider();
const unavailableLivePrices = { getPrice: async () => null };
export const LIVE_CONSTITUTION_WRITES_ENABLED = false;
const displayNumber = (value: string) => { const [whole, fraction] = value.split("."); return `${BigInt(whole).toLocaleString()}${fraction ? `.${fraction.slice(0, 4)}` : ""}`; };
const displayUsd = (value: bigint, decimals: number) => `$${displayNumber(formatUnitsExact(value, decimals))}`;

function PositionCard({ position }: { position: AssetPosition }) {
  const statusCopy: Record<AssetPosition["availability"], string> = {
    available: "Available", "not-configured": "Sandbox asset not deployed yet", unsupported: "Not supported",
    unpriced: "Balance available; reference price unavailable", "read-error": "Balance unavailable", "configuration-error": "Token configuration mismatch",
  };
  return <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><h4 className="text-lg font-semibold">{position.asset.symbol}</h4>{position.asset.sandbox ? <span className="rounded-full border border-[#5d4821] bg-[#211b0f] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f3c44f]">Sandbox · no redemption rights</span> : null}</div><p className="mt-1 text-sm text-[var(--muted)]">{position.asset.displayName}</p></div>
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
export const OVERVIEW_INFORMATION_HIERARCHY = ["primary-metrics", "mara", "attention", "portfolio-preview", "safety", "risk-detail", "portfolio-context", "detailed-workspace"] as const;

function WorkspaceContextTools({ source, onChange, readiness }: { source: PortfolioSource; onChange: (source: PortfolioSource) => void; readiness: WorkspaceReadiness }) {
  return <section className="context-tools" aria-label="Portfolio context and system status"><div><p>Portfolio context</p><SourceSwitcher value={source} onChange={onChange} /></div><TechnicalDisclosure summary="System status"><ReadinessSummary readiness={readiness} /></TechnicalDisclosure></section>;
}

export function PortfolioAllocationVisual({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const positions = snapshot.positions.filter((position) => position.allocationBps !== null && position.allocationBps > 0);
  const colors = ["#ff6e00", "#9b87ff", "#48d597", "#d6a94d"];
  let cursor = 0;
  const stops = positions.map((position, index) => {
    const start = cursor;
    cursor += position.allocationBps! / 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  return <article className="allocation-visual" aria-labelledby="home-allocation-title"><div><span>Portfolio allocation</span><h2 id="home-allocation-title">Where your visible value sits</h2><p>{positions.length ? "Based on current fully valued supported positions." : "Allocation appears when supported positions are fully valued."}</p></div><div className="allocation-visual__chart" role="img" aria-label={positions.length ? positions.map((position) => `${position.asset.symbol} ${(position.allocationBps! / 100).toFixed(2)}%`).join(", ") : "No portfolio allocation available"} style={positions.length ? { background: `conic-gradient(${stops.join(",")})` } : undefined}><span>{positions.length}<small>assets</small></span></div><dl>{positions.length ? positions.map((position, index) => <div key={position.asset.id}><dt><i style={{ background: colors[index % colors.length] }} />{position.asset.symbol}</dt><dd>{(position.allocationBps! / 100).toFixed(2)}%</dd></div>) : <div><dt>No valued allocation</dt><dd>—</dd></div>}</dl></article>;
}

const gettingStartedSteps = [
  { destination: "Portfolio", icon: "portfolio", title: "Review your portfolio", detail: "See what you hold and where your risk comes from." },
  { destination: "MARA", icon: "intelligence", title: "Ask MARA", detail: "Let MARA explain what may deserve attention." },
  { destination: "MARA", icon: "strategy", title: "Explore a simulation", detail: "Review what a bounded adjustment could look like." },
  { destination: "Safety", icon: "safety", title: "Check your safety rules", detail: "Understand what your Financial Constitution permits." },
] as const;

export function GettingStarted({ onNavigate, onDismiss }: { onNavigate: (destination: DashboardDestination) => void; onDismiss: () => void }) {
  return <section className="getting-started" aria-labelledby="getting-started-title"><header><div><p>Getting started</p><h2 id="getting-started-title">Four steps to understand your portfolio.</h2></div><button type="button" onClick={onDismiss}>Dismiss</button></header><ol>{gettingStartedSteps.map((step) => <li key={step.title}><ProductIcon name={step.icon} /><div><h3>{step.title}</h3><p>{step.detail}</p><button type="button" onClick={() => onNavigate(step.destination)}>{step.destination === "MARA" && step.title === "Ask MARA" ? "Ask MARA" : "Continue"}<MingcuteIcon name="arrowRight" size={15} /></button></div></li>)}</ol><button type="button" className="getting-started__help" onClick={() => window.dispatchEvent(new CustomEvent("adaptara:ask-mara", { detail: "Explain this page" }))}><MingcuteIcon name="sparkles" size={15} />Not sure what something means? Ask MARA.</button></section>;
}

function CommandCenterOverview({ snapshot, riskTier, riskScore, constitution, hasMara, onNavigate }: { snapshot: PortfolioSnapshot; riskTier: string | null; riskScore: number | null; constitution?: OnchainConstitution; hasMara: boolean; onNavigate: (destination: DashboardDestination) => void }) {
  const reserve = snapshot.positions.find((position) => position.asset.baselineRiskTier === "Reserve")?.allocationBps ?? null;
  const compliance = constitution ? evaluateConstitutionCompliance(snapshot, constitution.constitution).status : "unavailable";
  const attention = snapshot.valuationStatus !== "valued" ? "Portfolio valuation needs attention." : compliance === "violated" ? "One or more active safety rules need review." : "No immediate policy exception is present.";
  return <section className="command-center" aria-label="Portfolio command center"><div className="command-center__metrics"><article className="primary-metric"><span>Portfolio value</span><strong>{snapshot.totals.totalUsdValue > 0n ? displayUsd(snapshot.totals.totalUsdValue, snapshot.totals.usdValueDecimals) : "—"}</strong><small>Demo reference value · non-live</small></article><article><span>Risk</span><strong className={`risk-text risk-text--${riskTier?.toLowerCase() ?? "unknown"}`}>{riskTier ?? "Unavailable"}</strong><small>{riskScore === null ? "Deterministic score unavailable" : `Deterministic score ${(riskScore / 100).toFixed(2)}`}</small></article><article><span>Financial Constitution</span><strong>{compliance === "compliant" ? "Compliant" : compliance === "violated" ? "Needs review" : "Awaiting policy"}</strong><small>{constitution ? "Active rules checked" : "Onchain policy loading"}</small></article><article><span>Reserve</span><strong>{reserve === null ? "—" : `${(reserve / 100).toFixed(2)}%`}</strong><small>Current allocation</small></article></div><article className="mara-overview"><span>MARA</span><strong>{hasMara ? "A current advisory is ready to review." : "Ready to explain what may deserve attention."}</strong><button type="button" onClick={() => onNavigate("MARA")}>{hasMara ? "Review MARA" : "Analyze with MARA"}<MingcuteIcon name="arrowRight" size={15} /></button></article><article className="attention-panel"><span>Needs attention</span><strong>{attention}</strong><small>Derived from current valuation and active policy only.</small></article><article className="home-next-actions"><span>Next actions</span><div><button type="button" onClick={() => onNavigate("Portfolio")}>Review portfolio<MingcuteIcon name="arrowRight" size={15} /></button><button type="button" onClick={() => onNavigate("MARA")}>Ask MARA<MingcuteIcon name="arrowRight" size={15} /></button><button type="button" onClick={() => onNavigate("Safety")}>Review Safety<MingcuteIcon name="arrowRight" size={15} /></button></div></article></section>;
}

export function VaultUnavailablePanel({ message, role }: { message: string; role?: "alert" | "status" }) {
  return <div className="grid gap-6">
    <div className={`rounded-3xl border border-[var(--line)] p-8 ${role === "alert" ? "bg-[#241113] text-[#ff8992]" : "bg-[var(--surface-2)]"}`} role={role}>
      <h2 className="text-2xl font-semibold">Adaptara Vault</h2><p className="mt-3">{message}</p>
    </div>
    <YieldPanel />
  </div>;
}

export function VaultList({ vaults, selected, snapshot, constitution, onSelect }: { vaults: readonly DiscoveredManagedVault[]; selected: DiscoveredManagedVault; snapshot: PortfolioSnapshot; constitution?: OnchainConstitution; onSelect: (vault: DiscoveredManagedVault) => void }) {
  return <section className="vaults-product"><header><div><span>Managed Vaults</span><h2>{vaults.length === 1 ? "Your Managed Vault" : `${vaults.length} independently governed Vaults`}</h2><p>Each Vault has its own custody, Constitution and operating mode. Its onchain address is authoritative.</p></div><button type="button" disabled title="Public Vault creation remains disabled">+ Create Vault</button></header>{vaults.map((vault) => { const active = vault.address === selected.address; return <article className="vault-product-card" key={`${vault.source}:${vault.address}`}><div><span>Managed Vault {vault.source.toUpperCase()} · {active ? "Selected" : `#${vault.index + 1}`}</span><strong>{shortenAddress(vault.address, 6)}</strong></div><dl><div><dt>Value</dt><dd>{active && snapshot.totals.totalUsdValue > 0n ? displayUsd(snapshot.totals.totalUsdValue, snapshot.totals.usdValueDecimals) : active ? "Unavailable" : "Select to read"}</dd></div><div><dt>Constitution</dt><dd>{active ? constitution ? "Active" : "Unavailable" : "Select to read"}</dd></div><div><dt>Generation</dt><dd>{vault.source.toUpperCase()}</dd></div></dl>{active ? <p>Onchain address remains the authoritative identity. No persistent display name is stored.</p> : <button type="button" onClick={() => onSelect(vault)}>Select Vault</button>}</article>; })}</section>;
}

export function VaultCollectionState({ vaults, selected, snapshot, constitution, onSelect }: { vaults: readonly DiscoveredManagedVault[]; selected?: DiscoveredManagedVault; snapshot: PortfolioSnapshot; constitution?: OnchainConstitution; onSelect: (vault: DiscoveredManagedVault) => void }) {
  if (vaults.length === 0) return <section className="vaults-empty"><span>Managed Vaults</span><h2>No Managed Vaults discovered.</h2><p>Multi-Vault infrastructure is live. Creation remains disabled during controlled rollout.</p><button type="button" disabled>+ Create Vault</button></section>;
  if (!selected) return <section className="vaults-empty" role="status"><h2>Vault selection unavailable.</h2><p>Adaptara will not infer a Vault identity.</p></section>;
  return <VaultList vaults={vaults} selected={selected} snapshot={snapshot} constitution={constitution} onSelect={onSelect} />;
}

function SnapshotPanel({ title, snapshot, constitution, contextTools, destination, onNavigate, vaults, selectedVault, onSelectVault }: { title: string; snapshot: PortfolioSnapshot; constitution?: OnchainConstitution; contextTools: ReactNode; destination: DashboardDestination; onNavigate: (destination: DashboardDestination) => void; vaults?: readonly DiscoveredManagedVault[]; selectedVault?: DiscoveredManagedVault; onSelectVault?: (vault: DiscoveredManagedVault) => void }) {
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
  const [showGettingStarted, setShowGettingStarted] = useState(true);
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
  const compliance = constitution ? evaluateConstitutionCompliance(snapshot, constitution.constitution) : undefined;
  const assistantContext = buildAskMaraContext({ destination, snapshot, assessment: riskAssessment, compliance, policy: constitution?.constitution, displayValue: snapshot.totals.totalUsdValue > 0n ? displayUsd(snapshot.totals.totalUsdValue, snapshot.totals.usdValueDecimals) : null });
  const allocations = snapshot.positions.filter((position) => position.allocationBps !== null && position.allocationBps > 0);
  const pageHeading = destination === "Home" ? ["Overview", "Your Adaptara position.", "Your wallet, managed Vault and current deterministic risk at a glance."] : destination === "Portfolio" ? ["Portfolio", "Your complete X Layer position.", "Review supported holdings, allocation, and deterministic risk for the selected source."] : destination === "Vaults" ? ["Vaults", "Independently governed capital.", "Review your deployed V1 Managed Vault and its own Financial Constitution."] : destination === "Activity" ? ["Activity", "What happened.", "A truthful record is shown only when authoritative events are available."] : destination === "MARA" ? ["MARA", "Ask MARA about your portfolio.", "Understand what may deserve attention, then explicitly explore a bounded simulation."] : ["Safety", "What protects you.", "Review owner-controlled rules, current compliance, and who has authority."];
  return <section aria-labelledby="dashboard-destination-title" data-selected-vault={selectedVault?.address} data-selected-vault-source={selectedVault?.source} className="portfolio-workspace rounded-3xl border border-white/80 bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(34,57,43,0.08)] sm:p-7">
    <header className="destination-heading"><p>{pageHeading[0]}</p><h1 id="dashboard-destination-title">{pageHeading[1]}</h1><span>{pageHeading[2]}</span></header>
    {destination === "Home" ? <><p className="sr-only" data-managed-vault-count={vaults?.length ?? 0}>{vaults?.length ?? 0} discovered Managed Vaults.</p><CommandCenterOverview snapshot={snapshot} riskTier={riskAssessment.portfolioCurrentRiskTier} riskScore={riskAssessment.portfolioRiskScoreBps} constitution={constitution} hasMara={Boolean(maraAnalysis)} onNavigate={onNavigate} /><PortfolioAllocationVisual snapshot={snapshot} />{showGettingStarted ? <GettingStarted onNavigate={onNavigate} onDismiss={() => setShowGettingStarted(false)} /> : null}</> : null}
    {destination === "Portfolio" ? <>{contextTools}<section className="workspace-domain workspace-domain--portfolio" aria-labelledby={`${snapshot.source}-title`}><div className="workspace-domain__heading"><div><p>Portfolio value and source</p><h2 id={`${snapshot.source}-title`}>{title}</h2><span title={snapshot.accountAddress}>{snapshot.source === "vault" ? "Discovered vault" : "Connected wallet"}: {shortenAddress(snapshot.accountAddress, 6)}</span></div><small>Single-block read · {snapshot.valuationStatus} valuation</small></div>
    <div className="portfolio-facts grid gap-3 rounded-2xl bg-[var(--surface-2)] p-4 sm:grid-cols-4">
      <div><p className="text-xs text-[var(--muted)]">{totalLabel}</p><p className="mt-1 font-semibold">{snapshot.totals.totalUsdValue > 0n ? displayUsd(snapshot.totals.totalUsdValue, snapshot.totals.usdValueDecimals) : "—"}</p></div>
      <div><p className="text-xs text-[var(--muted)]">Asset count</p><p className="mt-1 font-semibold">{snapshot.totals.nonzeroAssetCount}</p></div>
      <div><p className="text-xs text-[var(--muted)]">Reserve allocation</p><p className="mt-1 font-semibold">{reserve === null || reserve === undefined ? "—" : `${(reserve / 100).toFixed(2)}%`}</p></div>
      <div><p className="text-xs text-[var(--muted)]">{snapshot.valuationStatus === "valued" ? "Largest position" : "Unknown balances"}</p><p className="mt-1 font-semibold">{snapshot.valuationStatus === "valued" ? (largest?.usdValue && largest.usdValue > 0n ? largest.asset.symbol : "—") : snapshot.totals.unknownBalanceAssetCount}</p></div>
    </div>
    {snapshot.valuationStatus === "partial" ? <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Some configured holdings could not be completely read or valued. Portfolio allocation is unavailable until valuation is complete.</p> : null}
    {snapshot.valuationStatus === "unavailable" && snapshot.totals.unknownBalanceAssetCount > 0 ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Portfolio value is unavailable because one or more configured balances could not be read or verified.</p> : null}
    {snapshot.totals.nonzeroAssetCount === 0 && snapshot.totals.unknownBalanceAssetCount === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">{isLiveReadOnlyMode ? "No supported X Layer assets found in this wallet." : "No supported token balances were found for this source."}</p> : null}
    <section className="allocation-workspace" aria-labelledby="allocation-title"><div><h2 id="allocation-title">Allocation</h2><span>Share of the fully valued supported portfolio.</span></div><div className="allocation-rail" aria-label="Portfolio allocation">{allocations.map((position) => <i key={position.asset.id} className={`allocation-${position.asset.baselineRiskTier.toLowerCase()}`} style={{ width: `${position.allocationBps! / 100}%` }} />)}</div><div className="allocation-assets">{allocations.map((position) => <span key={position.asset.id}><i className={`allocation-${position.asset.baselineRiskTier.toLowerCase()}`} />{position.asset.symbol} <strong>{(position.allocationBps! / 100).toFixed(2)}%</strong></span>)}</div></section>
    <h2 className="holdings-title">Holdings</h2><div className="position-grid mt-5 grid gap-3">{snapshot.positions.map((position) => <PositionCard key={position.asset.id} position={position} />)}</div></section><section className="risk-summary"><div><p>Risk level</p><h2>{riskAssessment.portfolioCurrentRiskTier ?? "Unavailable"}</h2><span>{riskAssessment.status === "assessed" ? `Current measured risk under Adaptara's deterministic demo model. Score ${(riskAssessment.portfolioRiskScoreBps! / 100).toFixed(2)} out of 100.` : "Risk is withheld until portfolio valuation and inputs are complete."}</span></div><TechnicalDisclosure summary="View risk details"><SentinelPanel snapshot={snapshot} assessment={sentinelAssessment} onAssessmentChange={handleSentinelAssessment} /><RiskIntelligence assessment={riskAssessment} sentinelInfluence={sentinelInfluence} /></TechnicalDisclosure></section><button type="button" className="journey-link" onClick={() => onNavigate("MARA")}>Ask MARA about this portfolio <MingcuteIcon name="arrowRight" size={16} /></button></> : null}
    {destination === "MARA" ? <section className="mara-workspace"><div className="prompt-suggestions"><span>Try asking</span>{["What's driving my risk?", "Is my portfolio too concentrated?", `What does ${riskAssessment.portfolioCurrentRiskTier ?? "my risk level"} mean?`, "What could I improve?"].map((question) => <button type="button" key={question} onClick={() => document.getElementById(`mara-question-${snapshot.source}`)?.focus()}>{question}</button>)}</div><MaraPanel snapshot={snapshot} assessment={riskAssessment} onAnalysisChange={snapshot.source === "vault" ? handleMaraAnalysis : undefined} /><div className="simulation-flow"><p>Recommendation → simulation</p><h2>Review a bounded response</h2><span>MARA supplies direction only. Adaptara selects exact values deterministically and the Constitution remains the final policy gate.</span>{snapshot.source === "vault" ? <AdaptationPlanPanel snapshot={snapshot} assessment={riskAssessment} constitution={constitution} analysis={maraAnalysis} facts={buildMaraContext(snapshot, riskAssessment).facts} /> : <p className="bounded-state">Select an available Adaptara Vault to construct a policy-bounded simulation.</p>}{shouldShowYieldIntelligence(snapshot.source) ? <TechnicalDisclosure summary="Explore conceptual Yield simulation"><YieldPanel snapshot={snapshot} /></TechnicalDisclosure> : null}</div><button type="button" className="journey-link" onClick={() => onNavigate("Safety")}>Understand the rules that validate simulations <MingcuteIcon name="arrowRight" size={16} /></button></section> : null}
    {destination === "Safety" ? <section className="safety-workspace"><div className="authority-summary"><p>Who has authority?</p><h2>You do.</h2><span>MARA analyzes and recommends. Adaptara constructs bounded simulations. Your Financial Constitution validates what is permitted. MARA cannot sign, move assets, or bypass your rules.</span></div>{constitution ? <div className="rule-explainers"><article><h3>Reserve protection</h3><strong>Minimum {(constitution.constitution.minimumReserveBps / 100).toFixed(2)}%</strong><p>The minimum share that must remain in baseline-Reserve assets.</p></article><article><h3>Single-asset exposure</h3><strong>Maximum {(constitution.constitution.maximumSingleAssetExposureBps / 100).toFixed(2)}%</strong><p>The largest permitted allocation to one supported asset.</p></article><article><h3>Aggressive exposure</h3><strong>Maximum {(constitution.constitution.maximumAggressiveExposureBps / 100).toFixed(2)}%</strong><p>The aggregate cap for baseline-Aggressive assets.</p></article><article><h3>Daily adaptation</h3><strong>Maximum {(constitution.constitution.maximumDailyReallocationBps / 100).toFixed(2)}%</strong><p>The maximum bounded change used by one current simulation.</p></article></div> : <p className="bounded-state">Active policy values are unavailable until a vault Constitution is loaded.</p>}<div className={`compliance-summary compliance-summary--${compliance?.status ?? "unavailable"}`}><span>Current compliance</span><strong>{compliance?.status ?? "Unavailable"}</strong><p>{compliance?.status === "compliant" ? "The current fully valued portfolio satisfies the active rules checked by Adaptara." : compliance?.status === "violated" ? "One or more active rules need review." : "Compliance is not inferred when valuation or policy data is unavailable."}</p></div><TechnicalDisclosure summary="View technical policy details"><p>Policy is read from the selected vault on X Layer. The contract and owner remain authoritative; current adaptation output is simulation-only.</p></TechnicalDisclosure></section> : null}
    {destination === "Vaults" && vaults && onSelectVault ? <VaultCollectionState vaults={vaults} selected={selectedVault} snapshot={snapshot} constitution={constitution} onSelect={onSelectVault} /> : null}
    {destination === "Activity" ? <section className="activity-product" data-vault-address={selectedVault?.address} data-vault-source={selectedVault?.source}><div className="activity-filters" aria-label="Activity filters"><button aria-pressed="true">All</button><button disabled>Vaults</button><button disabled>Constitution</button><button disabled>Transactions</button></div><div className="activity-empty"><span>Verified activity</span><h2>No authoritative activity yet.</h2><p>Adaptara will not invent history. Vault creation, funding, policy changes, blocked actions, swaps and Aave events will appear only after verified event ingestion is available.</p></div></section> : null}
    {destination === "Home" && snapshot.source === "wallet" ? <ManagedSetup totalValue={snapshot.totals.totalUsdValue > 0n ? snapshot.totals.totalUsdValue : 100_000n} valueDecimals={snapshot.totals.totalUsdValue > 0n ? snapshot.totals.usdValueDecimals : 2} /> : null}
    {destination === "MARA" ? <MaraActivityLoop /> : null}
    <AskMara context={assistantContext} />
  </section>;
}

function LoadingCard({ label }: { label: string }) { return <div className="loading-card" role="status" aria-live="polite"><span className="skeleton-line" /><span className="skeleton-line short" /><p>{label}...</p></div>; }
function EmptyState({ title, detail, warning = false }: { title: string; detail: string; warning?: boolean }) { return <section className={`empty-state ${warning ? "warning" : ""}`}><p className="eyebrow">Workspace status</p><h2>{title}</h2><p>{detail}</p></section>; }
function ErrorCard({ message }: { message: string }) { return <div className="empty-state error" role="alert"><h2>Portfolio unavailable</h2><p>{message}</p></div>; }

export function PortfolioDashboard({ destination = "Home", onNavigate = () => undefined }: { destination?: DashboardDestination; onNavigate?: (destination: DashboardDestination) => void }) {
  const [selectedSource, setSelectedSource] = useState<PortfolioSource | null>(null);
  const [selectedVaultAddress, setSelectedVaultAddress] = useState<string | null>(null);
  const [activeConstitution, setActiveConstitution] = useState<OnchainConstitution | null>(null);
  const handleActiveConstitution = useCallback((value: OnchainConstitution | null) => setActiveConstitution(value), []);
  const { address, chain, isConnected } = useAccount();
  const connected = Boolean(isConnected && address);
  const client = usePublicClient({ chainId: activeXLayer.id });
  const readReady = isLiveReadOnlyMode || chain?.id === activeXLayer.id;
  const assets = isLiveReadOnlyMode ? MAINNET_ASSET_CATALOG : ASSET_CATALOG;
  const priceProvider = isLiveReadOnlyMode ? unavailableLivePrices : demoPrices;
  const wallet = useQuery({ queryKey: ["portfolio", "wallet", activeXLayer.id, address], enabled: Boolean(address && readReady && client), queryFn: () => readWalletPortfolio({ client: client!, accountAddress: address!, assets, priceProvider, expectedChainId: activeXLayer.id }) });
  const factoryAddress = publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS ? getAddress(publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS) : undefined;
  const factoryV2Address = publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS ? getAddress(publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS) : undefined;
  const vault = useQuery({ queryKey: ["vault-discovery", activeXLayer.id, address, factoryAddress, factoryV2Address], enabled: Boolean(address && readReady && client && (factoryAddress || factoryV2Address)), queryFn: () => discoverVault(client!, address!, factoryAddress, factoryV2Address, activeXLayer.id) });
  const discoveredVaults = vault.data?.status === "available" ? vault.data.vaults : [];
  const selectedVault = discoveredVaults.find((item) => item.address === selectedVaultAddress) ?? discoveredVaults[0];
  const source = selectedSource ?? (destination === "Portfolio" ? "wallet" : deriveDefaultPortfolioSource(vault.data?.status));
  const vaultPortfolio = useQuery({ queryKey: ["portfolio", "vault", activeXLayer.id, selectedVault?.address], enabled: canReadVaultPortfolio(Boolean(readReady), Boolean(client), vault.data?.status) && Boolean(selectedVault), queryFn: () => {
    const discovered = vault.data;
    if (!client || discovered?.status !== "available" || !selectedVault) throw new Error("Vault is not available");
    return readVaultPortfolio({ client, accountAddress: selectedVault.address, assets, priceProvider, expectedChainId: activeXLayer.id });
  } });

  const readiness = deriveWorkspaceReadiness({ isConnected: connected, onXLayer: Boolean(readReady), source, wallet, vault, vaultPortfolio });
  const contextTools = <WorkspaceContextTools source={source} onChange={setSelectedSource} readiness={readiness} />;
  const vaultContent = vault.isPending ? <LoadingCard label="Discovering Adaptara Vault" /> : vault.data?.status === "not-configured" ? <VaultUnavailablePanel message="Vault integration is not configured in this environment. An Adaptara Vault is an isolated smart-contract vault governed by your Financial Constitution." /> : vault.data?.status === "not-created" ? <VaultUnavailablePanel message="No Adaptara Vault has been created for this wallet. Vault creation is not enabled in this product." /> : vault.data?.status === "read-error" ? <VaultUnavailablePanel message={`Vault discovery unavailable: ${vault.data.error}`} role="alert" /> : vaultPortfolio.isPending ? <LoadingCard label="Reading vault portfolio" /> : vaultPortfolio.isError ? <VaultUnavailablePanel message={`Vault portfolio unavailable: ${vaultPortfolio.error.message}`} role="alert" /> : vaultPortfolio.data && selectedVault ? <SnapshotPanel title="Adaptara Vault" snapshot={vaultPortfolio.data} constitution={activeConstitution ?? undefined} contextTools={contextTools} destination={destination} onNavigate={onNavigate} vaults={discoveredVaults} selectedVault={selectedVault} onSelectVault={(item) => { setSelectedVaultAddress(item.address); setActiveConstitution(null); }} /> : null;
  const selectVault = (item: DiscoveredManagedVault) => { setSelectedVaultAddress(item.address); setActiveConstitution(null); setSelectedSource("vault"); };
  const walletContent = wallet.isPending ? <LoadingCard label="Reading wallet portfolio" /> : wallet.isError ? <ErrorCard message={`Wallet portfolio unavailable: ${wallet.error.message}`} /> : wallet.data ? <SnapshotPanel title="Your Wallet" snapshot={wallet.data} contextTools={contextTools} destination={destination} onNavigate={onNavigate} vaults={discoveredVaults} selectedVault={selectedVault} onSelectVault={selectVault} /> : null;

  return <div className="workspace-shell">
    <WorkspacePanel source={source}><WorkspaceAuthorityGate isConnected={connected} onXLayer={Boolean(readReady)} disconnected={<><EmptyState title="Connect your wallet" detail="Connect an existing wallet to inspect supported holdings and begin the explicit intelligence journey." />{contextTools}</>} wrongNetwork={<><EmptyState title="Wrong network" detail="Switch to X Layer to read supported wallet or vault balances." warning />{contextTools}</>} authorized={<WorkspaceSourceContent source={source} wallet={<div>{walletContent}</div>} vault={<><div>{vaultContent}</div>{destination === "Safety" && client && vault.data && selectedVault ? <section className="workspace-domain workspace-domain--policy" aria-label="Financial Constitution controls"><TechnicalDisclosure summary="View and manage owner-controlled Constitution"><FinancialConstitutionPanel key={`${address}:${selectedVault.address}`} address={address!} client={client} vault={vault.data.status === "available" ? { status: "available", address: selectedVault.address, vaults: vault.data.vaults, selected: selectedVault } : vault.data} snapshot={vault.data.status === "available" ? vaultPortfolio.data : undefined} onActiveChange={handleActiveConstitution} writesEnabled={LIVE_CONSTITUTION_WRITES_ENABLED} /></TechnicalDisclosure></section> : null}</>} />}/></WorkspacePanel>
  </div>;

}
