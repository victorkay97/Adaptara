import type { ObservationHealth } from "../types";

const LABEL: Record<ObservationHealth, string> = { healthy: "Current", partial: "Partial", stale: "Stale", unavailable: "Unavailable" };

export function ObservationAwareness({ market = "unavailable", news = "unavailable" }: { market?: ObservationHealth; news?: ObservationHealth }) {
  return <aside className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 p-4" aria-label="MARA observation awareness">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Observation awareness</h4><span className="text-xs font-semibold text-[var(--muted)]">Watching only</span></div>
    <p className="mt-2 text-sm text-[var(--muted)]">Market and news evidence may inform proposals. It cannot choose amounts, create calldata, or authorize execution.</p>
    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-[var(--surface)] p-2"><dt>Market</dt><dd className="font-semibold">{LABEL[market]}</dd></div><div className="rounded-lg bg-[var(--surface)] p-2"><dt>News</dt><dd className="font-semibold">{LABEL[news]}</dd></div></dl>
    <p className="mt-3 text-xs text-[var(--muted)]">Providers are not connected in this workspace preview. Unavailable does not mean neutral.</p>
  </aside>;
}
