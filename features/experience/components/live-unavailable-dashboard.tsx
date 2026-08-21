import type { DashboardDestination } from "./dashboard-shell";

const unavailableMetrics = [
  ["Total Portfolio", "—", "Connect wallet to view your portfolio"],
  ["In Vaults", "—", "Connect wallet to discover Vaults"],
  ["Outside Vaults", "—", "Unavailable until connected"],
  ["Active Vaults", "—", "Connect wallet to view"],
] as const;

function Metrics() {
  return <section className="final-metrics">{unavailableMetrics.map(([label, value, note]) => <article key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></article>)}</section>;
}

function EmptySection({ title, copy }: { title: string; copy: string }) {
  return <section className="final-section live-empty-section"><h2>{title}</h2><p>{copy}</p></section>;
}

function Home() {
  return <><Metrics/><section className="final-triptych"><EmptySection title="Allocation" copy="Connect your wallet to calculate supported asset allocation."/><EmptySection title="Portfolio state" copy="Deterministic portfolio state is unavailable until live holdings can be read."/><EmptySection title="Vault health" copy="Connect your wallet to discover authoritative V1 and V2 Vault state."/></section><section className="final-section final-mara"><header><div><span>MARA Intelligence</span><p>Live intelligence remains unavailable until a supported portfolio is connected and read.</p></div></header></section><EmptySection title="Your Vaults" copy="Connect your wallet to discover independently governed Vaults."/><EmptySection title="Recent Activity" copy="Authoritative activity appears only from verified live state and events."/></>;
}

export function LiveUnavailableDashboard({ destination, reason = "Connect your wallet to read supported X Layer state." }: { destination: DashboardDestination; reason?: string }) {
  const title = destination === "Home" ? "Overview" : destination;
  const copy = destination === "Home" ? "Live on X Layer. Your portfolio, Vaults and current Adaptara position." : `Live ${destination.toLowerCase()} state from X Layer.`;
  return <><header className="final-page-head"><div><h1>{title}</h1><p>{copy}</p></div></header>{destination === "Home" ? <Home/> : <><Metrics/><EmptySection title={`${destination} unavailable`} copy={reason}/></>}</>;
}
