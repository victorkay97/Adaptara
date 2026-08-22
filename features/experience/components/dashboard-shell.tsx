"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { WalletControl } from "@/components/wallet/wallet-control";
import { PortfolioDashboard } from "@/features/portfolio/components/portfolio-dashboard";
import { activeXLayer } from "@/lib/chain/xlayer";
import { ApplicationHeader } from "./application-header";
import { LiveUnavailableDashboard } from "./live-unavailable-dashboard";

export const DASHBOARD_DESTINATIONS = ["Home", "Portfolio", "Vaults", "Activity"] as const;
export type DashboardDestination = typeof DASHBOARD_DESTINATIONS[number] | "MARA" | "Safety";

export function OrientationContent({ onDismiss }: { onDismiss: () => void }) {
  return <div className="orientation" role="dialog" aria-modal="true" aria-labelledby="orientation-title"><div className="orientation__panel"><p className="eyebrow">Welcome to Adaptara</p><h2 id="orientation-title">Your intelligence workspace is ready.</h2><ol><li><span>01</span><p>We&apos;ve discovered your Adaptara vault when one is available.</p></li><li><span>02</span><p>Adaptara calculates your portfolio and deterministic risk.</p></li><li><span>03</span><p>MARA can help explain what deserves attention.</p></li></ol><button type="button" className="button button-primary" onClick={onDismiss}>Enter dashboard</button><button type="button" className="orientation__dismiss" onClick={onDismiss}>Skip orientation</button></div></div>;
}

export function DashboardShell({ showOrientation = false }: { showOrientation?: boolean }) {
  const { isConnected, chain } = useAccount();
  const [destination, setDestination] = useState<DashboardDestination>("Home");
  const [orientationDismissed, setOrientationDismissed] = useState(false);
  const readReady = isConnected && chain?.id === activeXLayer.id;
  const networkLabel = isConnected ? chain?.name ?? "Wrong network" : activeXLayer.name;
  const dismissOrientation = () => { window.history.replaceState({}, "", "/dashboard"); setOrientationDismissed(true); };

  return <main className="final-app dashboard-page">
    <ApplicationHeader navigation={DASHBOARD_DESTINATIONS.map((item) => <button key={item} type="button" aria-current={destination === item ? "page" : undefined} onClick={() => setDestination(item)}>{item}</button>)} context={<><span className="final-live-badge"><i/>Live</span><span className={readReady ? "network-badge network-badge--ready" : "network-badge"}>{networkLabel}</span><WalletControl /></>} />
    <div className="final-app-canvas">{!isConnected ? <LiveUnavailableDashboard destination={destination} connectionAction={<WalletControl variant="primary"/>} /> : !readReady ? <LiveUnavailableDashboard destination={destination} connected reason={`Wrong network. Adaptara Live Mode uses ${activeXLayer.name}.`} /> : <div className="dashboard-view"><PortfolioDashboard destination={destination} onNavigate={setDestination} /></div>}</div>
    {showOrientation && isConnected && !orientationDismissed ? <OrientationContent onDismiss={dismissOrientation} /> : null}
  </main>;
}
