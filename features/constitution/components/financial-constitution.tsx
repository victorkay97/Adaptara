"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { getAddress, type Address, type PublicClient } from "viem";
import { useWalletClient } from "wagmi";
import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import type { PortfolioSnapshot, VaultDiscovery } from "@/features/portfolio/types";
import { optionalBuilderAttributionDataSuffix } from "@/lib/contracts/builder-attribution";
import { publicEnv } from "@/lib/env/public";
import { EMPTY_CONSTITUTION, isConstitutionActivated } from "../constants";
import { evaluateConstitutionCompliance } from "../compliance";
import { evaluateConstitutionFeasibility } from "../feasibility";
import { formatBpsAsPercent, parsePercentToBps } from "../money-or-bps";
import { readVaultConstitution } from "../readers";
import type { ConstitutionField, FinancialConstitution, OnchainConstitution } from "../types";
import { validateConstitution } from "../validation";
import { updateVaultConstitution } from "../writers";

const fields: Array<[ConstitutionField, string, string]> = [
  ["minimumReserveBps", "Minimum reserve", "Minimum combined allocation to baseline-Reserve assets."],
  ["maximumSingleAssetExposureBps", "Maximum single-asset exposure", "Maximum allocation permitted for any one supported asset."],
  ["maximumAggressiveExposureBps", "Maximum aggressive exposure", "Maximum combined allocation to baseline-Aggressive assets."],
  ["maximumDailyReallocationBps", "Maximum daily reallocation", "Future action limit; not current portfolio compliance."],
];
const inputStrings = (policy: FinancialConstitution) => Object.fromEntries(fields.map(([key]) => [key, formatBpsAsPercent(policy[key])])) as Record<ConstitutionField, string>;
const builderAttributionDataSuffix = optionalBuilderAttributionDataSuffix(publicEnv.NEXT_PUBLIC_ADAPTARA_BUILDER_CODE);

export function applyConfirmedConstitution(confirmed: OnchainConstitution): { active: OnchainConstitution; draft: FinancialConstitution; inputs: Record<ConstitutionField, string> } {
  return { active: confirmed, draft: confirmed.constitution, inputs: inputStrings(confirmed.constitution) };
}
export function constitutionContextId(address: Address, vaultAddress?: Address): string { return `${getAddress(address)}:${vaultAddress ? getAddress(vaultAddress) : "no-vault"}`; }
export function freshConstitutionContextState() { return { draft: EMPTY_CONSTITUTION, inputs: inputStrings(EMPTY_CONSTITUTION), errors: {}, tx: "", saving: false } as const; }
export function shouldShowPolicyControls(hasVault: boolean, policyLoaded: boolean): boolean { return !hasVault || policyLoaded; }
export function activeConstitutionOrNull(value?: OnchainConstitution): OnchainConstitution | null { return value && isConstitutionActivated(value.constitution) ? value : null; }
export function canSubmitConstitution({ writesEnabled, hasVault, policyLoaded, hasWalletClient, owner, dirty, valid, feasible, hasErrors, saving }: { writesEnabled: boolean; hasVault: boolean; policyLoaded: boolean; hasWalletClient: boolean; owner: boolean; dirty: boolean; valid: boolean; feasible: boolean; hasErrors: boolean; saving: boolean }): boolean {
  return writesEnabled && hasVault && policyLoaded && hasWalletClient && owner && dirty && valid && feasible && !hasErrors && !saving;
}
export async function executeConstitutionWriteIfEnabled<T>(writesEnabled: boolean, operation: () => Promise<T>): Promise<T | null> {
  if (!writesEnabled) return null;
  return operation();
}
export function commitConfirmedConstitution(queryClient: QueryClient, queryKey: QueryKey, confirmed: OnchainConstitution, startedContext: string, currentContext: string) {
  queryClient.setQueryData(queryKey, confirmed);
  return startedContext === currentContext ? applyConfirmedConstitution(confirmed) : null;
}

export function FinancialConstitutionPanel({ address, client, vault, snapshot, onActiveChange, writesEnabled = false }: { address: Address; client: PublicClient; vault: VaultDiscovery; snapshot?: PortfolioSnapshot; onActiveChange?: (constitution: OnchainConstitution | null) => void; writesEnabled?: boolean }) {
  const vaultAddress = vault.status === "available" ? vault.address : undefined;
  const contextId = constitutionContextId(address, vaultAddress);
  const contextRef = useRef(contextId);
  contextRef.current = contextId;
  const queryKey = ["financial-constitution", address, vaultAddress] as const;
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();
  const onchain = useQuery({ queryKey, enabled: Boolean(vaultAddress), queryFn: () => readVaultConstitution(client, vaultAddress!) });
  const [draft, setDraft] = useState<FinancialConstitution>(EMPTY_CONSTITUTION);
  const [inputs, setInputs] = useState(inputStrings(EMPTY_CONSTITUTION));
  const [errors, setErrors] = useState<Partial<Record<ConstitutionField, string>>>({});
  const [tx, setTx] = useState("");
  const [saving, setSaving] = useState(false);
  const reset = (policy: FinancialConstitution) => { setDraft(policy); setInputs(inputStrings(policy)); setErrors({}); };
  useEffect(() => { const fresh=freshConstitutionContextState(); setDraft(fresh.draft); setInputs(fresh.inputs); setErrors(fresh.errors); setTx(fresh.tx); setSaving(fresh.saving); }, [contextId]);
  useEffect(() => { if (onchain.data) reset(onchain.data.constitution); }, [onchain.data]);
  useEffect(() => { onActiveChange?.(activeConstitutionOrNull(onchain.data)); }, [contextId, onchain.data, onActiveChange]);

  const validation = validateConstitution(draft);
  const activated = Boolean(onchain.data && isConstitutionActivated(onchain.data.constitution));
  const feasibility = validation.valid ? evaluateConstitutionFeasibility(draft, ASSET_CATALOG) : null;
  const dirty = Boolean(onchain.data && fields.some(([key]) => draft[key] !== onchain.data.constitution[key]));
  const owner = Boolean(onchain.data && getAddress(address) === onchain.data.owner);
  const canSave = canSubmitConstitution({ writesEnabled, hasVault: Boolean(vaultAddress), policyLoaded: Boolean(onchain.data), hasWalletClient: Boolean(walletClient), owner, dirty, valid: validation.valid, feasible: Boolean(feasibility?.feasible), hasErrors: Boolean(Object.keys(errors).length), saving });
  const policyReady = shouldShowPolicyControls(Boolean(vaultAddress), Boolean(onchain.data));

  const change = (field: ConstitutionField, value: string) => {
    setInputs((current) => ({ ...current, [field]: value }));
    try {
      const bps = parsePercentToBps(value);
      setDraft((current) => ({ ...current, [field]: bps }));
      setErrors((current) => { const next = { ...current }; delete next[field]; return next; });
    } catch (error) { setErrors((current) => ({ ...current, [field]: error instanceof Error ? error.message : "Invalid percentage" })); }
  };
  const save = async () => {
    if (!writesEnabled || !vaultAddress || !walletClient || !canSave) return;
    const startedContext = contextId;
    const startedQueryKey = queryKey;
    setSaving(true); setTx("Awaiting wallet confirmation…");
    try {
      const result = await executeConstitutionWriteIfEnabled(writesEnabled, () => updateVaultConstitution({ publicClient: client, walletClient, vaultAddress, connectedAddress: address, policy: draft, assets: ASSET_CATALOG, dataSuffix: builderAttributionDataSuffix }));
      if (!result) return;
      const confirmed = commitConfirmedConstitution(queryClient, startedQueryKey, result.constitution, startedContext, contextRef.current);
      if (confirmed) { setDraft(confirmed.draft); setInputs(confirmed.inputs); setErrors({}); setTx("Constitution confirmed onchain."); }
    } catch (error) { if (contextRef.current === startedContext) setTx(error instanceof Error ? error.message : "Constitution update failed."); }
    finally { if (contextRef.current === startedContext) setSaving(false); }
  };

  return <section aria-labelledby="constitution-title" className="rounded-3xl border border-white/80 bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(34,57,43,0.08)] sm:p-7">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#377657]">User-controlled policy</p><h2 id="constitution-title" className="mt-2 text-2xl font-semibold">Financial Constitution</h2><p className="mt-2 text-sm text-[var(--muted)]">Your rules for how Adaptara may eventually manage this vault. Changing your constitution does not execute a trade.</p></div><ConstitutionSourceBadge hasVault={Boolean(vaultAddress)} pending={Boolean(vaultAddress && onchain.isPending)} failed={Boolean(vaultAddress && onchain.isError)} loaded={Boolean(onchain.data)} activated={activated} /></div>
    {onchain.isError ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Onchain constitution unavailable: {onchain.error.message}</p> : null}
    {!vaultAddress ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">A vault is required before this constitution can become active onchain.</p> : null}
    {onchain.data && !owner ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Connected wallet is not the vault owner. Updates are disabled.</p> : null}
    {onchain.data && !activated ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">The Financial Constitution has not been activated. The zero onchain policy is uninitialized, not an unrestricted policy.</p> : null}
    {onchain.data ? <PolicyReadStatus blockNumber={onchain.data.blockNumber} dirty={dirty} /> : null}
    {policyReady ? <><div className="mt-5 grid gap-4 md:grid-cols-2">{fields.map(([key, label, help]) => <label key={key} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><span className="font-semibold">{label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{help}</span><span className="mt-3 flex items-center gap-2"><input className="w-full rounded-xl border border-[var(--line)] px-3 py-2" inputMode="decimal" value={inputs[key]} onChange={(event) => change(key, event.target.value)} aria-describedby={`${key}-error`} /><b>%</b></span><span className="mt-2 block text-xs">Exact value: {errors[key] ? "invalid" : `${draft[key].toLocaleString()} BPS`}</span>{errors[key] ? <span id={`${key}-error`} role="alert" className="mt-1 block text-xs text-red-700">{errors[key]}</span> : null}</label>)}</div>
      {feasibility && !feasibility.feasible ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{feasibility.issues.join(" ")}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">{onchain.data ? <button type="button" className="rounded-xl border bg-white px-4 py-2 font-semibold" onClick={() => reset(onchain.data.constitution)}>Reset draft to onchain values</button> : null}<ConstitutionWriteControl writesEnabled={writesEnabled} canSave={canSave} saving={saving} onSave={save} /></div></> : null}
    {tx ? <p className="mt-4 text-sm" role="status" aria-live="polite">{tx}</p> : null}
    <ConstitutionComplianceSection snapshot={snapshot} policy={vaultAddress && activated ? onchain.data?.constitution : vaultAddress ? undefined : draft} draftPreview={!vaultAddress} />
  </section>;
}

export function ConstitutionWriteControl({ writesEnabled, canSave, saving, onSave }: { writesEnabled: boolean; canSave: boolean; saving: boolean; onSave: () => void }) {
  if (!writesEnabled) return <p className="w-full rounded-xl bg-[#edf3ed] p-3 text-sm text-[var(--muted)]">Owner-signed Constitution activation is not enabled during read-only deployment verification.</p>;
  return <button type="button" disabled={!canSave} onClick={onSave} className="rounded-xl bg-[#236a4a] px-4 py-2 font-semibold text-white disabled:opacity-40">{saving ? "Confirming…" : "Save Constitution Onchain"}</button>;
}

export function ConstitutionSourceBadge({ hasVault, pending, failed, loaded, activated = true }: { hasVault: boolean; pending: boolean; failed: boolean; loaded: boolean; activated?: boolean }) {
  const label = !hasVault ? "Draft · not active onchain" : loaded && !activated ? "Not activated · zero onchain policy" : loaded ? "Onchain constitution" : failed ? "Onchain constitution unavailable" : pending ? "Loading onchain constitution…" : "Onchain constitution unavailable";
  return <span className="h-fit rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">{label}</span>;
}
export function PolicyReadStatus({ blockNumber, dirty }: { blockNumber: bigint; dirty: boolean }) { return <p className="mt-4 text-xs text-[var(--muted)]">Active policy read at X Layer block {blockNumber.toString()}. {dirty ? "Unsaved changes" : "Draft matches onchain policy."}</p>; }
export function ConstitutionComplianceSection({ snapshot, policy, draftPreview }: { snapshot?: PortfolioSnapshot; policy?: FinancialConstitution; draftPreview: boolean }) {
  const compliance = snapshot && policy ? evaluateConstitutionCompliance(snapshot, policy) : null;
  return <div className="mt-8 border-t border-[var(--line)] pt-6"><h3 className="text-xl font-semibold">{draftPreview ? "Draft Portfolio Compliance Preview" : "Current Portfolio Compliance"}</h3>{draftPreview ? <p className="mt-2 text-xs text-[var(--muted)]">Preview only · this draft is not active onchain.</p> : null}{!policy && !draftPreview ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Portfolio compliance cannot be determined because the active onchain constitution is unavailable.</p> : !compliance || compliance.status === "unavailable" ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Portfolio compliance cannot be determined until portfolio valuation is complete.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2"><Rule label="Reserve minimum" status={compliance.reserve.status} detail={`${formatBpsAsPercent(compliance.reserve.actualBps!)}% actual · ${formatBpsAsPercent(compliance.reserve.requiredBps)}% required`} /><Rule label="Single-asset limit" status={compliance.singleAsset.status} detail={`${formatBpsAsPercent(compliance.singleAsset.observedMaximumBps!)}% observed · ${formatBpsAsPercent(compliance.singleAsset.configuredMaximumBps)}% maximum`} /><Rule label="Aggressive exposure" status={compliance.aggressive.status} detail={`${formatBpsAsPercent(compliance.aggressive.actualBps!)}% baseline-Aggressive · ${formatBpsAsPercent(compliance.aggressive.maximumBps)}% maximum`} /><Rule label="Daily reallocation" status="action-limit" detail={`${formatBpsAsPercent(compliance.dailyReallocation.configuredLimitBps)}% future action limit; not evaluable from current holdings.`} /></div>}</div>;
}
function Rule({ label, status, detail }: { label: string; status: "compliant" | "violated" | "unavailable" | "action-limit"; detail: string }) { return <article className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><h4 className="font-semibold">{label}</h4><p className="mt-2 text-sm font-bold">{status === "action-limit" ? "Action limit" : status === "compliant" ? "Compliant" : status === "violated" ? "Violated" : "Unavailable"}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></article>; }
