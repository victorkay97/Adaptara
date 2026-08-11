# Adaptara Demo Guide

Target length: approximately 3–5 minutes. The times below are guides, not hard cuts.

## Before recording

- [ ] Application is running locally or at the final deployed URL.
- [ ] X Layer Testnet, chain ID `1952`, is selected.
- [ ] Demo owner `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E` is connected.
- [ ] Factory discovers vault `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4`.
- [ ] Final balances are 8 USD₮0, 0.06 sTRSY, 0.002 sXAU, and 0.01 sAAPLx.
- [ ] Active Constitution reads 20% / 60% / 30% / 10% and no draft is dirty.
- [ ] No pending MetaMask request is open.
- [ ] Builder registration and attributed-proof links are open in clean tabs.
- [ ] Browser zoom, window size, and tab titles are clean and readable.
- [ ] No terminal, environment file, wallet seed phrase, API key, or other secret is visible.
- [ ] Notifications and unrelated browser extensions are hidden.

## Demo script

### 0:00–0:20 — Problem and premise

- Tokenized portfolios need continuous interpretation, but intelligence should not have unrestricted authority over funds.
- Introduce Adaptara: “Adaptive intelligence for onchain wealth.”
- Frame the product: AI recommends; X Layer and the owner's Constitution retain authority.

### 0:20–0:45 — Wallet and live X Layer vault

- Show X Layer Testnet and the connected demo owner.
- Show that the application discovers the owner's vault through the deployed factory rather than using a hardcoded fallback.
- Point out that balances and decimals are live onchain reads.

### 0:45–1:15 — Portfolio and sandbox RWA allocation

- Show 8 USD₮0, 0.06 sTRSY, 0.002 sXAU, and 0.01 sAAPLx.
- Explain the 40/30/20/10 allocation and $20 demo reference total.
- Keep the demo/non-live pricing and sandbox/no-redemption disclosures visible.

### 1:15–1:45 — Risk, compliance, and Constitution

- Show the deterministic risk result and its reconstructable weighted factors.
- Show the active Constitution: 20% reserve minimum, 60% single-asset maximum, 30% aggressive maximum, and 10% daily reallocation maximum.
- Explain current compliance and that only the owner can update policy.
- Do not submit a policy transaction during the recording.

### 1:45–2:25 — MARA

- Trigger or display MARA analysis over the current portfolio state.
- Highlight portfolio interpretation, risk reasoning, RWA explanation, and structured recommendations.
- State that MARA has no private key, signer, or autonomous transaction tools.

### 2:25–2:50 — Adaptation, Yield, and Sentinel

1. Show Adaptation while the current validated MARA advisory is still current. Explain that it is a deterministic allocation recommendation/simulation constrained by the Constitution.
2. Show Yield Intelligence as a non-live compounding projection, not deployed yield or earned returns. Its hypothetical simulation does not invalidate MARA or Adaptation.
3. Run or show Sentinel last and explain its bounded advisory event context.
4. Explain that a risk-changing Sentinel scan intentionally makes the previous MARA advisory and dependent Adaptation Plan stale, without automatically regenerating either.
5. If useful, briefly show the disabled/stale Adaptation state. Do not rerun MARA during the recording unless needed.

### 2:50–3:20 — Security model

- Explain one non-upgradeable isolated vault per owner and no pooled custody.
- Mention no generic execute, arbitrary call, or `delegatecall` path.
- Point out owner withdrawals/recovery, pause controls, and role collision protections.
- Reiterate that AI output is never transaction authority.

### 3:20–3:50 — Builder Code and ERC-8021 proof

- Open the [Builder registration transaction](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef).
- Show registered Builder Code `tl5ce7n7gk5a5pzk`.
- Open the [mined ERC-8021 proof](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e).
- Explain that OKLink recognizes the attribution and the suffix decodes to the registered code.
- Clarify that attribution is metadata, not financial authority.

### 3:50–4:10 — Closing

- Summarize: live X Layer state, deterministic risk and policy, advisory MARA, and owner-controlled authority.
- Close with: “AI decides what should happen. X Layer guarantees what is allowed to happen.”

## Things NOT to say

- Adaptara guarantees returns.
- Autonomous wealth management is already executing.
- Sandbox tokens have live RWA backing, issuer guarantees, collateral, or redemption rights.
- Adaptara executes live yield strategies or has earned yield.
- Demo reference values are live/oracle prices or reliable price predictions.
- AI controls funds, owns a wallet key, or can bypass the Constitution.
- The system is deployed on mainnet.
- Contracts are explorer-verified while their recorded status remains deployed-unverified.

## Evidence to show

- Builder Code registration: `0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef`
- ERC-8021 proof: `0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e`
- Demo vault: `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4`
- AssetRegistry and AdaptiveVaultFactory addresses
- Active Constitution and exact demo balances
- 437 passing TypeScript tests across 38 files
- 67 passing Foundry tests across 7 suites

## Final recording checklist

- [ ] Recording is approximately 3–5 minutes.
- [ ] Product name, tagline, MARA name, and architecture statement are correct.
- [ ] X Layer Testnet is visible and no mainnet claim is made.
- [ ] Vault address, balances, allocation, and Constitution match the final record.
- [ ] Demo/non-live and sandbox disclosures are visible or spoken.
- [ ] Advisory and simulation features are not presented as autonomous execution.
- [ ] Builder registration and attributed proof hashes are legible.
- [ ] No wallet mutation, signature request, or pending transaction is needed.
- [ ] No secret-bearing terminal, environment file, or wallet credential appears.
- [ ] Audio is clear, cursor movement is deliberate, and the final frame is clean.
