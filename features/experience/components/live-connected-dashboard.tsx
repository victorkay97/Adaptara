import type { CSSProperties } from "react";
import { MingcuteIcon } from "@/components/ui/mingcute-icon";
import type { OnchainConstitution } from "@/features/constitution/types";
import { formatUnitsExact } from "@/features/portfolio/money";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { DiscoveredManagedVault } from "@/features/vaults/discovery";
import { shortenAddress } from "@/lib/wallet/format";
import type { DashboardDestination } from "./dashboard-shell";

const colors = ["#ff6e00", "#777", "#aaa", "#d6d6d1"];
const money = (value: bigint, decimals: number) => `$${Number(formatUnitsExact(value, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const knownValue = (snapshot: PortfolioSnapshot) => snapshot.valuationStatus === "unavailable" ? "—" : money(snapshot.totals.totalUsdValue, snapshot.totals.usdValueDecimals);
const valueNote = (snapshot: PortfolioSnapshot) => snapshot.valuationStatus === "valued" ? "Current supported position" : snapshot.valuationStatus === "partial" ? "Partial valued subtotal" : "Valuation unavailable";
const allocation = (snapshot: PortfolioSnapshot) => snapshot.positions.filter((position) => position.allocationBps !== null && position.allocationBps > 0);

function PageHead({ destination }: { destination: DashboardDestination }) {
  const copy = destination === "Home" ? "Live on X Layer. Your portfolio, Vaults and current Adaptara position." : `Live ${destination.toLowerCase()} state from X Layer.`;
  return <header className="final-page-head"><div><h1>{destination === "Home" ? "Overview" : destination}</h1><p>{copy}</p>{destination === "Vaults" ? <span className="sr-only">Your Vaults</span> : null}</div></header>;
}

function Metrics({ snapshot, vaults }: { snapshot: PortfolioSnapshot; vaults: readonly DiscoveredManagedVault[] }) {
  const inVault = snapshot.source === "vault" ? knownValue(snapshot) : "—";
  const outside = snapshot.source === "wallet" ? knownValue(snapshot) : "—";
  const items = [
    ["Total Portfolio", knownValue(snapshot), valueNote(snapshot)],
    ["In Vaults", inVault, snapshot.source === "vault" ? "Selected managed position" : vaults.length ? "Select a Vault to value" : "No valued Vault position"],
    ["Outside Vaults", outside, snapshot.source === "wallet" ? "Wallet control" : "Wallet value not selected"],
    ["Active Vaults", String(vaults.length), `${vaults.length} authoritative V1/V2 ${vaults.length === 1 ? "Vault" : "Vaults"}`],
  ] as const;
  return <section className="final-metrics">{items.map(([label, value, note]) => <article key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></article>)}</section>;
}

function AllocationCard({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const positions = allocation(snapshot);
  let cursor = 0;
  const stops = positions.map((position, index) => { const start = cursor; cursor += position.allocationBps! / 100; return `${colors[index % colors.length]} ${start}% ${cursor}%`; });
  const style = positions.length ? { background: `conic-gradient(${stops.join(",")})` } as CSSProperties : undefined;
  return <article className="final-section final-allocation"><header><span>Allocation</span></header>{positions.length ? <><div className="final-donut live-connected-donut" style={style} role="img" aria-label={positions.map((position) => `${position.asset.symbol} ${(position.allocationBps! / 100).toFixed(2)}%`).join(", ")} /><dl>{positions.slice(0, 4).map((position) => <div key={position.asset.id}><dt>{position.asset.symbol}</dt><dd>{(position.allocationBps! / 100).toFixed(2)}%</dd></div>)}</dl></> : <div className="live-card-unavailable"><strong>Allocation unavailable</strong><p>Complete valuation is required before percentages are shown.</p></div>}</article>;
}

function PortfolioStateCard({ snapshot, riskTier, title = "Risk Exposure" }: { snapshot: PortfolioSnapshot; riskTier: string | null; title?: string }) {
  const bucket = (tiers: readonly string[]) => snapshot.positions.reduce((sum, position) => sum + (tiers.includes(position.asset.baselineRiskTier) ? position.allocationBps ?? 0 : 0), 0);
  const rows = [["Reserve", bucket(["Reserve"])], ["Balanced", bucket(["Defensive", "Balanced"])], ["Aggressive", bucket(["Aggressive"])]] as const;
  return <article className="final-section final-state"><header><span>{title}</span><em>{riskTier ?? "Unavailable"}</em></header>{snapshot.valuationStatus === "valued" ? <dl>{rows.map(([label, bps]) => <div key={label}><dt>{label}</dt><dd>{(bps / 100).toFixed(2)}%</dd></div>)}</dl> : <div className="live-card-unavailable"><strong>Not evaluated</strong><p>Risk is withheld while valuation is {snapshot.valuationStatus}.</p></div>}</article>;
}

function VaultHealthCard({ vaults, selected, constitution }: { vaults: readonly DiscoveredManagedVault[]; selected?: DiscoveredManagedVault; constitution?: OnchainConstitution }) {
  return <article className="final-section final-health"><header><span>Vault health</span></header>{vaults.length ? <dl>{vaults.slice(0, 3).map((vault) => <div key={`${vault.source}:${vault.address}`}><dt>{shortenAddress(vault.address, 4)}</dt><dd>{vault.address === selected?.address ? constitution ? "Policy loaded" : "Policy unavailable" : "Discovered"}</dd></div>)}</dl> : <div className="live-card-unavailable"><strong>No Vaults discovered</strong><p>No authoritative V1 or V2 Vault belongs to this wallet.</p></div>}<p>{vaults.length ? `${vaults.length} independently governed ${vaults.length === 1 ? "Vault" : "Vaults"}` : "Discovery complete"}</p></article>;
}

function MaraCard({ snapshot, riskTier, onNavigate }: { snapshot: PortfolioSnapshot; riskTier: string | null; onNavigate: (destination: DashboardDestination) => void }) {
  const complete = snapshot.valuationStatus === "valued" && riskTier;
  return <section className="final-section final-mara live-connected-mara"><header><div><span>MARA Intelligence</span><p>{complete ? "No material portfolio issue currently requires attention." : "MARA needs complete live portfolio context before interpreting risk."}</p></div><button type="button" onClick={() => onNavigate("MARA")}>Ask MARA <MingcuteIcon name="arrowRight" size={16} /></button></header><div><article><small>What changed</small><strong>{complete ? "Current supported holdings were evaluated." : "Live valuation is incomplete."}</strong></article><article><small>Why it matters</small><strong>{complete ? `Deterministic portfolio state is ${riskTier}.` : "Unknown value is not treated as zero."}</strong></article><article><small>Recommended next step</small><strong>{complete ? "Review current holdings and Vault boundaries." : "Resolve unavailable live inputs before analysis."}</strong></article></div></section>;
}

function VaultPreview({ vaults, selected, snapshot }: { vaults: readonly DiscoveredManagedVault[]; selected?: DiscoveredManagedVault; snapshot: PortfolioSnapshot }) {
  return <section className="final-section final-vault-preview"><h2>Your Vaults</h2><div>{vaults.length ? vaults.slice(0, 3).map((vault) => <article key={`${vault.source}:${vault.address}`}><small>Managed Vault {vault.source.toUpperCase()}</small><strong>{shortenAddress(vault.address, 6)}</strong><span>{vault.address === selected?.address && snapshot.source === "vault" ? `${knownValue(snapshot)} · Selected` : "Discovered · Select to read"}</span></article>) : <article><strong>No Vaults discovered</strong><span>No authoritative V1 or V2 Vault belongs to this wallet.</span></article>}</div></section>;
}

function ActivityPreview() { return <section className="final-section final-table live-activity-empty"><h2>Recent Activity</h2><div className="final-table-head"><span>Event</span><span>Source</span><span>Time</span></div><div><span>No live activity yet</span><span>Verified onchain and derived events will appear after authoritative ingestion.</span><span>—</span></div></section>; }

function Home({ snapshot, riskTier, vaults, selected, constitution, onNavigate }: LiveConnectedDashboardProps) {
  return <><PageHead destination="Home"/><Metrics snapshot={snapshot} vaults={vaults}/><section className="final-triptych"><AllocationCard snapshot={snapshot}/><PortfolioStateCard snapshot={snapshot} riskTier={riskTier} title="Portfolio state"/><VaultHealthCard vaults={vaults} selected={selected} constitution={constitution}/></section><MaraCard snapshot={snapshot} riskTier={riskTier} onNavigate={onNavigate}/><VaultPreview vaults={vaults} selected={selected} snapshot={snapshot}/><ActivityPreview/></>;
}

function Portfolio({ snapshot, riskTier, vaults, onNavigate }: LiveConnectedDashboardProps) {
  return <><PageHead destination="Portfolio"/><Metrics snapshot={snapshot} vaults={vaults}/><section className="final-section final-wide-allocation"><h2>Asset Allocation</h2>{allocation(snapshot).length ? allocation(snapshot).map((position) => <div key={position.asset.id}><span>{position.asset.symbol}</span><span>{(position.allocationBps! / 100).toFixed(2)}%</span><strong>{position.usdValue === null ? "—" : money(position.usdValue, position.usdValueDecimals)}</strong></div>) : <p>Allocation unavailable until valuation is complete.</p>}</section><section className="final-two"><PortfolioStateCard snapshot={snapshot} riskTier={riskTier}/><article className="final-section"><h2>Custody Split</h2><dl className="final-list"><div><dt>Outside Adaptara</dt><dd>{snapshot.source === "wallet" ? knownValue(snapshot) : "—"}</dd></div><div><dt>Managed by Adaptara</dt><dd>{snapshot.source === "vault" ? knownValue(snapshot) : "—"}</dd></div></dl><p>Only intentionally delegated capital enters Adaptara&apos;s management boundary.</p></article></section><section className="final-section final-holdings"><h2>Holdings</h2><div className="final-table-head">{["Asset","Balance","Value","Allocation","Risk","Location"].map((label) => <span key={label}>{label}</span>)}</div>{snapshot.positions.map((position) => <div key={position.asset.id}><span>{position.asset.symbol}</span><span>{position.displayBalance ?? "—"}</span><span>{position.usdValue === null ? "—" : money(position.usdValue, position.usdValueDecimals)}</span><span>{position.allocationBps === null ? "—" : `${(position.allocationBps / 100).toFixed(2)}%`}</span><span>{position.asset.baselineRiskTier}</span><span>{snapshot.source === "wallet" ? "Outside Adaptara" : "Managed by Adaptara"}</span></div>)}</section><MaraCard snapshot={snapshot} riskTier={riskTier} onNavigate={onNavigate}/></>;
}

function Vaults({ snapshot, vaults, selected, constitution }: LiveConnectedDashboardProps) {
  return <><PageHead destination="Vaults"/><Metrics snapshot={snapshot} vaults={vaults}/><section className="final-vault-list">{vaults.length ? vaults.map((vault) => <article className="final-section" key={`${vault.source}:${vault.address}`}><header><div><small>Managed Vault {vault.source.toUpperCase()}</small><strong>{shortenAddress(vault.address, 6)}</strong></div><div><span>{vault.address === selected?.address ? "Selected" : "Discovered"}</span><em>{vault.address === selected?.address && constitution ? "Policy loaded" : "Policy unavailable"}</em></div></header>{vault.address === selected?.address && constitution ? <dl>{[["Minimum reserve",constitution.constitution.minimumReserveBps],["Maximum asset",constitution.constitution.maximumSingleAssetExposureBps],["Maximum aggressive",constitution.constitution.maximumAggressiveExposureBps],["Daily turnover",constitution.constitution.maximumDailyReallocationBps]].map(([label,bps]) => <div key={label}><dt>{label}</dt><dd>{(Number(bps) / 100).toFixed(2)}%</dd></div>)}</dl> : <p>Constitution details are not inferred until this Vault&apos;s policy is loaded.</p>}</article>) : <section className="final-section live-empty-section"><h2>No Vaults discovered</h2><p>No authoritative V1 or V2 Vault belongs to this wallet.</p></section>}</section><section className="final-two"><article className="final-section"><h2>Managed Capital Distribution</h2><p>Values are shown only for selected, successfully valued Vault state.</p></article><article className="final-section"><h2>Constitutions Overview</h2><p>Each Vault has independent rules. Public Create Vault remains disabled.</p></article></section></>;
}

function Activity({ snapshot, vaults }: LiveConnectedDashboardProps) { return <><PageHead destination="Activity"/><Metrics snapshot={snapshot} vaults={vaults}/><section className="final-section final-activity"><div className="final-table-head">{["Time","Event","Vault","Source","Result"].map((label) => <span key={label}>{label}</span>)}</div><div><span>—</span><span>No authoritative activity ingested</span><span>—</span><span>Onchain</span><span>Unavailable</span></div></section><aside className="final-section final-detail"><small>Live provenance</small><h2>No event selected</h2><p>Adaptara does not fabricate connected-wallet history.</p></aside></>;
}

export type LiveConnectedDashboardProps = { destination: DashboardDestination; snapshot: PortfolioSnapshot; riskTier: string | null; vaults: readonly DiscoveredManagedVault[]; selected?: DiscoveredManagedVault; constitution?: OnchainConstitution; onNavigate: (destination: DashboardDestination) => void };
export function LiveConnectedDashboard(props: LiveConnectedDashboardProps) {
  return props.destination === "Home" ? <Home {...props}/> : props.destination === "Portfolio" ? <Portfolio {...props}/> : props.destination === "Vaults" ? <Vaults {...props}/> : <Activity {...props}/>;
}
