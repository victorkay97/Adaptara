"use client";

import { useState } from "react";
import { TechnicalDisclosure } from "@/components/ui/product-primitives";
import { DEMO_MANDATE, fundingPreview, mandateReady, valueToCents, type ManagementMode } from "../model";

const steps = ["Portfolio", "Vault", "Capital", "Constitution", "Autonomy", "Activate"] as const;
const usd = (cents: bigint) => `$${(Number(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ManagedSetup({ totalValue = 100_000n, valueDecimals = 2 }: { totalValue?: bigint; valueDecimals?: number }) {
  const [step, setStep] = useState(0);
  const [percent, setPercent] = useState(50);
  const [mode, setMode] = useState<ManagementMode>("Adaptive");
  const totalCents = valueToCents(totalValue, valueDecimals);
  const preview = fundingPreview(totalCents, percent)!;
  const next = () => setStep((value) => Math.min(value + 1, steps.length - 1));
  return <section className="managed-setup" aria-label="Managed Vault setup">
    <header><div><p>Intelligence → managed mode</p><h2>{step === 5 ? "Ready to activate MARA" : "Create your Managed Vault mandate"}</h2><span>Demo setup · no wallet signature or public transaction</span></div><strong>{step + 1} / {steps.length}</strong></header>
    <ol className="setup-progress">{steps.map((label, index) => <li key={label} data-current={index === step} data-complete={index < step}><i>{index + 1}</i><span>{label}</span></li>)}</ol>
    <div className="setup-stage">
      {step === 0 ? <><h3>Understand before you delegate</h3><p>Your connected portfolio can be analyzed now. Nothing in your wallet is controlled by MARA.</p><dl><div><dt>Supported portfolio</dt><dd>{usd(totalCents)}</dd></div><div><dt>Current state</dt><dd>Intelligence Mode</dd></div></dl></> : null}
      {step === 1 ? <><h3>Your Vault is the authority boundary</h3><p>You own and control it. Only capital explicitly moved into it may eventually be managed; everything else remains outside MARA&apos;s authority.</p><span className="setup-status">Ready for creation · demo readiness</span></> : null}
      {step === 2 ? <><h3>Choose how much Adaptara may manage</h3><div className="funding-shortcuts">{[25,50,75].map((value) => <button key={value} type="button" aria-pressed={percent === value} onClick={() => setPercent(value)}>{value}%</button>)}</div><label>Manage <input type="number" min="1" max="100" value={percent} onChange={(event) => setPercent(Math.max(1, Math.min(100, Number(event.target.value))))} />%</label><div className="funding-preview"><div><span>Wallet portfolio</span><strong>{usd(preview.available)}</strong></div><div><span>Manage with Adaptara</span><strong>{usd(preview.managed)}</strong></div><div><span>Remain outside Vault</span><strong>{usd(preview.outside)}</strong></div></div><p>Funding preview only. No assets move in Phase 13F.</p></> : null}
      {step === 3 ? <><h3>Set your Financial Constitution</h3><div className="mandate-grid"><span>Minimum liquid reserve <strong>20%</strong></span><span>Single asset maximum <strong>50%</strong></span><span>Aggressive maximum <strong>30%</strong></span><span>Daily adaptation <strong>10%</strong></span><span>Maximum action <strong>5%</strong></span><span>Aave strategy maximum <strong>20%</strong></span></div><p>Earned yield: <strong>70% compound · 30% liquid reserve</strong>.</p></> : null}
      {step === 4 ? <><h3>Choose MARA&apos;s autonomy</h3><div className="mode-grid">{(["Advisory","Approval Required","Adaptive"] as ManagementMode[]).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}><strong>{value}</strong><span>{value === "Advisory" ? "Watches and recommends only." : value === "Approval Required" ? "Prepares actions for your approval." : "May act inside your Constitution."}</span></button>)}</div><p>You can pause Adaptive management or revoke the executor. Selecting a mode here grants no live authority.</p></> : null}
      {step === 5 ? <><h3>Review your mandate</h3><div className="mandate-review"><span>Managed capital <strong>{usd(preview.managed)}</strong></span><span>Outside Vault <strong>{usd(preview.outside)}</strong></span><span>Mode <strong>{mode}</strong></span><span>Approved rebalancing <strong>Uniswap V3</strong></span><span>Approved yield <strong>Aave V3</strong></span><span>Yield policy <strong>70% / 30%</strong></span></div><p className="activation-note">Portfolio connected · Constitution valid · venues verified on X Layer fork. Public execution remains disabled.</p><TechnicalDisclosure summary="View technical mandate"><p>Chain 196 · limits map deterministically to BPS · protocol-supported ∩ owner-enabled adapters · fork proof passed.</p></TechnicalDisclosure></> : null}
    </div>
    <footer><button type="button" className="button button-secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button>{step < 5 ? <button type="button" className="button button-primary" onClick={next}>Continue</button> : <button type="button" className="button button-primary" disabled={!mandateReady({...DEMO_MANDATE,mode})}>Demo activation</button>}</footer>
  </section>;
}
