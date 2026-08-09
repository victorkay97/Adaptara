"use client";

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

function SnapshotPanel({ title, snapshot }: { title: string; snapshot: PortfolioSnapshot }) {
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
  </section>;
}

export function PortfolioDashboard() {
  const { address, chain, isConnected } = useAccount();
  const client = usePublicClient({ chainId: xLayerTestnet.id });
  const onXLayer = chain?.id === xLayerTestnet.id;
  const wallet = useQuery({ queryKey: ["portfolio", "wallet", address], enabled: Boolean(address && onXLayer && client), queryFn: () => readWalletPortfolio({ client: client!, accountAddress: address!, assets: ASSET_CATALOG, priceProvider: demoPrices }) });
  const factoryAddress = publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS ? getAddress(publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS) : undefined;
  const vault = useQuery({ queryKey: ["vault-discovery", address, factoryAddress], enabled: Boolean(address && onXLayer && client), queryFn: () => discoverVault(client!, address!, factoryAddress) });
  const vaultPortfolio = useQuery({ queryKey: ["portfolio", "vault", vault.data?.status === "available" ? vault.data.address : null], enabled: Boolean(client && vault.data?.status === "available"), queryFn: () => {
    const discovered = vault.data;
    if (!client || discovered?.status !== "available") throw new Error("Vault is not available");
    return readVaultPortfolio({ client, accountAddress: discovered.address, assets: ASSET_CATALOG, priceProvider: demoPrices });
  } });

  if (!isConnected || !address) return <section className="rounded-3xl border border-[var(--line)] bg-white/70 p-8 text-center"><h2 className="text-2xl font-semibold">Portfolio intelligence</h2><p className="mt-3 text-[var(--muted)]">Connect your wallet to view your Adaptara-supported portfolio.</p></section>;
  if (!onXLayer) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center"><h2 className="text-2xl font-semibold">Wrong network</h2><p className="mt-3 text-amber-900">Switch to X Layer Testnet to read supported portfolio balances.</p></section>;
  return <div className="grid gap-6">
    {wallet.isPending ? <p className="rounded-3xl bg-white/70 p-8" role="status">Reading wallet balances…</p> : wallet.isError ? <p className="rounded-3xl bg-red-50 p-8 text-red-800" role="alert">Wallet portfolio unavailable: {wallet.error.message}</p> : wallet.data ? <SnapshotPanel title="Your Wallet" snapshot={wallet.data} /> : null}
    <section>{vault.isPending ? <p className="rounded-3xl bg-white/70 p-8" role="status">Discovering Adaptara Vault…</p> : vault.data?.status === "not-configured" ? <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-8"><h2 className="text-2xl font-semibold">Adaptara Vault</h2><p className="mt-3 text-[var(--muted)]">Vault integration not deployed yet.</p></div> : vault.data?.status === "not-created" ? <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-8"><h2 className="text-2xl font-semibold">Adaptara Vault</h2><p className="mt-3 text-[var(--muted)]">No Adaptara Vault found.</p></div> : vault.data?.status === "read-error" ? <p className="rounded-3xl bg-red-50 p-8 text-red-800" role="alert">Vault discovery unavailable: {vault.data.error}</p> : vaultPortfolio.isPending ? <p className="rounded-3xl bg-white/70 p-8">Reading vault balances…</p> : vaultPortfolio.data ? <SnapshotPanel title="Adaptara Vault" snapshot={vaultPortfolio.data} /> : null}</section>
    <section className="rounded-3xl border border-[var(--line)] bg-white/60 p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">MARA</p><p className="mt-2">Intelligence engine coming online in a later phase.</p></section>
  </div>;
}
