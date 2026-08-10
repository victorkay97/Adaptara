"use client";
import { useAccount } from "wagmi";
import { xLayerTestnet } from "@/lib/chain/xlayer";
import { WalletControl } from "@/components/wallet/wallet-control";
import { PortfolioDashboard } from "@/features/portfolio/components/portfolio-dashboard";
import { AppFooter, EnvironmentStrip, ProductHero, SystemExplainer } from "@/features/dashboard/components/product-frame";

export function Dashboard() {
  const { isConnected, chain } = useAccount();
  const onXLayer = isConnected && chain?.id === xLayerTestnet.id;
  return <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 sm:px-7 lg:px-12">
    <header className="app-header"><a href="#main-workspace" className="brand"><span aria-hidden="true">A</span><div><strong>Adaptara</strong><small>Adaptive onchain intelligence</small></div></a><div className="header-actions"><span className={`status-badge ${onXLayer ? "status-success" : "status-neutral"}`}>X Layer Testnet</span><WalletControl /></div></header>
    <EnvironmentStrip /><ProductHero />
    <section id="main-workspace" className="pb-14"><PortfolioDashboard /></section>
    <SystemExplainer /><AppFooter />
  </main>;
}
