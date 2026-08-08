"use client";

import { useAccount } from "wagmi";
import { xLayerTestnet } from "@/lib/chain/xlayer";
import { WalletControl } from "@/components/wallet/wallet-control";

function StatusCard({ eyebrow, title, detail, tone = "green" }: { eyebrow: string; title: string; detail: string; tone?: "green" | "amber" | "slate" }) {
  const dot = tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-400";
  return (
    <article className="rounded-3xl border border-white/80 bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(34,57,43,0.08)] backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]"><span className={`h-2 w-2 rounded-full ${dot}`} />{eyebrow}</div>
      <h2 className="mt-7 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </article>
  );
}

export function Dashboard() {
  const { isConnected, chain } = useAccount();
  const onXLayer = isConnected && chain?.id === xLayerTestnet.id;
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
      <div className="rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-center text-sm font-medium text-amber-950">
        Experimental hackathon software. Testnet assets only. No real investment value.
      </div>
      <header className="flex flex-col gap-5 border-b border-[var(--line)] py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173d2d] font-bold text-white">A</span><span className="text-xl font-bold tracking-tight">Adaptara</span><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">X Layer Testnet</span></div>
        <WalletControl />
      </header>
      <section className="py-16 sm:py-24">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#377657]">Policy-bounded by design</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-7xl">Adaptive intelligence for onchain wealth.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)]">An AI-powered RWA wealth agent designed to understand, monitor and eventually manage tokenized portfolios within rules you control.</p>
      </section>
      <section aria-label="Foundation status" className="grid gap-4 pb-12 md:grid-cols-3">
        <StatusCard eyebrow="Wallet" title={isConnected ? "Connected" : "Disconnected"} detail={isConnected ? "Your wallet is available for network validation." : "Connect an existing wallet to begin network validation."} tone={isConnected ? "green" : "slate"} />
        <StatusCard eyebrow="X Layer" title={onXLayer ? "Connected to X Layer Testnet" : isConnected ? "Wrong Network" : "Awaiting Wallet"} detail={onXLayer ? "Chain ID 1952 · test OKB gas." : "Switch to X Layer Testnet before future onchain actions."} tone={onXLayer ? "green" : isConnected ? "amber" : "slate"} />
        <StatusCard eyebrow="Agent System" title="Foundation Mode" detail="Autonomous management is not active. This phase establishes wallet, chain, and security foundations only." tone="slate" />
      </section>
    </main>
  );
}
