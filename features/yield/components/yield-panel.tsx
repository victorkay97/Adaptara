"use client";

import { useState } from "react";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import { formatUnitsExact } from "@/features/portfolio/money";
import { YIELD_HORIZONS } from "../constants";
import { yieldContextFingerprint } from "../context";
import { DemoYieldTermsProvider } from "../providers/demo";
import { projectVaultYield } from "../projection";
import type { YieldHorizonDays, YieldProjectionResult } from "../types";

const terms = new DemoYieldTermsProvider().getTerms("strsy")!;
const token = (value: bigint, decimals: number) => `${formatUnitsExact(value, decimals)} sTRSY`;
export const projectionForContext = (stored: { contextKey: string; result: YieldProjectionResult } | null, current: string | null) => current !== null && stored?.contextKey === current ? stored.result : null;

export function YieldPanel({ snapshot }: { snapshot?: PortfolioSnapshot }) {
  const [horizon, setHorizon] = useState<YieldHorizonDays>(365);
  const [stored, setStored] = useState<{ contextKey: string; result: YieldProjectionResult } | null>(null);
  const contextKey = snapshot ? yieldContextFingerprint(snapshot, terms, horizon) : null;
  const result = projectionForContext(stored, contextKey);

  return <section className="mt-6 rounded-2xl border border-[#9db9a8] bg-[#f2f8f4] p-5" aria-label="Yield Intelligence">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#236a4a]">Yield Intelligence</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Compounding Simulation</h3><span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">Sandbox yield model · non-live</span></div>
    <p className="mt-2 text-sm text-[var(--muted)]">Explore deterministic yield and compounding scenarios using transparent demo terms. No yield is earned or claimed by this simulation.</p>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-[var(--muted)]">Eligible asset</dt><dd className="font-bold">sTRSY</dd></div><div><dt className="text-[var(--muted)]">Demo annualized rate</dt><dd className="font-bold">5.00%</dd></div><div><dt className="text-[var(--muted)]">Compounding</dt><dd className="font-bold">Daily · 365-day basis</dd></div></dl>
    <fieldset className="mt-4"><legend className="text-sm font-semibold">Projection horizon</legend><div className="mt-2 flex flex-wrap gap-2">{YIELD_HORIZONS.map((days) => <button key={days} type="button" aria-pressed={horizon === days} onClick={() => setHorizon(days)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${horizon === days ? "border-[#236a4a] bg-[#236a4a] text-white" : "border-[var(--line)] bg-white"}`}>{days} days</button>)}</div></fieldset>
    {!snapshot ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">An Adaptara Vault with an eligible sTRSY balance is required before a compounding simulation can be generated.</p> : null}
    <button type="button" disabled={!snapshot} onClick={() => { if (snapshot && contextKey) setStored({ contextKey, result: projectVaultYield(snapshot, terms, horizon) }); }} className="mt-4 rounded-xl bg-[#236a4a] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Run Compounding Simulation</button>
    {result?.status === "unavailable" ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status"><p>{result.reason}</p><p className="mt-2">If the vault later holds sTRSY, this sandbox model can project how reinvesting demo yield would compound.</p></div> : null}
    {result?.status === "projected" ? <div className="mt-5 border-t border-[#cbdcd1] pt-5">
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-[var(--muted)]">Current principal</dt><dd className="font-bold">{token(result.projection.principalRaw, result.projection.tokenDecimals)}</dd></div>
        <div><dt className="text-[var(--muted)]">Simple projected yield</dt><dd className="font-bold">{token(result.projection.simpleYieldRaw, result.projection.tokenDecimals)}</dd></div>
        <div><dt className="text-[var(--muted)]">Compounded projected yield</dt><dd className="font-bold">{token(result.projection.compoundedYieldRaw, result.projection.tokenDecimals)}</dd></div>
        <div><dt className="text-[var(--muted)]">Difference vs simple</dt><dd className="font-bold">{token(result.projection.compoundingDeltaVsSimpleRaw, result.projection.tokenDecimals)}</dd></div>
        <div><dt className="text-[var(--muted)]">Projected ending balance</dt><dd className="font-bold">{token(result.projection.projectedEndingBalanceRaw, result.projection.tokenDecimals)}</dd></div>
        <div><dt className="text-[var(--muted)]">Horizon and rate</dt><dd className="font-bold">{result.projection.horizonDays} days · 5.00% annualized demo rate</dd></div>
      </dl>
      {result.projection.compoundingDeltaVsSimpleRaw < 0n ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Daily raw-unit flooring can make the daily-compounded projection lower than the full-horizon simple projection for very small balances. This compares calculation methods; it does not indicate a market loss.</p> : null}
      <p className="mt-4 text-xs text-[var(--muted)]">Simple projection does not reinvest yield. Compounded projection adds each day&apos;s projected yield to simulated principal. All raw-unit arithmetic rounds down.</p>
      <p className="mt-2 text-xs text-[var(--muted)]">Portfolio block {result.projection.portfolioBlockNumber.toString()} · Execution authority: none</p>
      <ul className="mt-3 list-disc pl-5 text-xs text-[var(--muted)]">{result.projection.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
    </div> : null}
  </section>;
}
