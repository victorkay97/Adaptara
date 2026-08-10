# Phase 11 Security Review

## Scope and threat model

Wallet/RPC state, API bodies, AI output, Sentinel observations, cached queries, snapshots, risk and policy objects, simulations, yield terms, async completion order, ERC-20s, and direct contract callers were treated as hostile. AI remains advisory; X Layer state and deterministic authorization remain authoritative. No Phase 12 work or new execution capability was added.

## Authority surfaces

| Surface | Trigger and authority | Side effects | Cannot do | Stale protection |
| --- | --- | --- | --- | --- |
| Constitution `setPolicy` | Explicit owner-wallet save plus contract `onlyOwner` | One policy transaction and reread | Move assets or grant AI authority | Account/chain/vault/pending/receipt context |
| Sentinel | Explicit scan; deterministic validator | Client assessment | Sign, move funds, call MARA | Account/source/block fingerprint |
| MARA | Explicit analyze; server validation | Advisory analysis | Tools, calldata, signatures, writes | Snapshot/risk fingerprint |
| Adaptation | Explicit deterministic simulation | In-memory BPS plan | Execute, sign, route | Vault/chain/block/risk/policy/MARA provenance |
| Yield | Explicit deterministic projection | In-memory projection | Deposit, claim, mutate balances | Eligibility-critical context key |

## Trust boundary

```text
Wallet -> RPC/X Layer -> PortfolioSnapshot -> Risk -> MARA/Sentinel
                                            -> Adaptation/Yield simulation
                                            -> active onchain Policy validation
```

Wallet ownership, balances, registry, policy, and receipts are authoritative only when read from X Layer. User input and AI output are untrusted. Sentinel and yield inputs are bounded non-live demo data.

## Findings

| ID | Severity | Status | Component | Exploit/result | Fix and regression |
| --- | --- | --- | --- | --- | --- |
| ADP-11-001 | Medium | Fixed | Adaptation | A runtime snapshot could omit a canonical zero position, disguise unknown state as zero, keep a canonical ID while forging other product metadata, or mix block provenance. Current impact is advisory simulation integrity because Adaptation has `executionAuthority: none`; this class would become more severe if a future executor consumed an unvalidated plan. | Require exact canonical ID-set equality, coherent availability/balance/decimals, every environment-independent catalog field, and single-block consistency. Covered by omitted-zero, hostile-state, forged-metadata, and mixed-block tests. |
| MARA-11-002 | Medium | Fixed | MARA | Token quantities and return multipliers could bypass the qualitative financial-number guard. | Reject numeric token quantities and `x` multipliers in all prose. Covered by `3 tokens` and `2x` tests. |

No Critical finding or production-contract flaw requiring semantic change was found.

## Contract review

Every Adaptara-owned external/public/payable, transfer, role, policy, pause, recovery, factory, and registry surface was reviewed. Ownership transfer and renunciation revert. Executor cannot equal owner/guardian; guardian may equal owner; zero roles revoke. Only owner unpauses and moves funds. Factory ownership is `msg.sender` and one-owner-one-vault. Registry registration is permanent, disabling is one-way, code is required, and delayed two-step admin transfer remains.

`SafeERC20` and `ReentrancyGuard` protect transfers. False-return and reverting tests cover both incoming deposits and owner outgoing withdrawals: failed movement reverts, recipients receive nothing, and vault balances remain unchanged. Standards-compatible no-return tokens work. Native value is rejected, forced value is owner-recoverable, and a rejecting recipient makes recovery revert without balance loss. There is no generic execution surface. Fuzz tests cover deposits, withdrawals, and all four policy fields with 256 runs each.

## Offchain coverage

- Portfolio/RPC failures remain unknown, never zero; relevant reads use one captured block.
- MARA validates bounded body, schema, complete deterministic context, evidence/asset/factor binding, qualitative prose, non-live claims, and zero execution authority before acceptance. The official Responses API uses `store:false`, low reasoning, bounded strict output, and no tools.
- Sentinel bounds and deduplicates canonical inputs; corroboration uses distinct active sources for each event and asset; future/expired/conflicting observations fail closed.
- Risk requires integer 0-10,000 inputs, fixed weights, recalculated contributions, exact allocation totals, and complete assessed state.
- Constitution requires exact BPS, feasibility, owner/account/chain checks, explicit save, receipt, and onchain reread.
- Adaptation validates source/chain/block, single-block consistency, the exact canonical asset universe, environment-independent canonical metadata, availability/balance/decimals coherence, exact allocation/risk math, active onchain policy, compliance, MARA provenance, and the resulting plan independently.
- Yield validates the exact canonical program tuple, vault-only single-block snapshot, canonical sTRSY identity, positive known balance, fixed horizons, and BigInt arithmetic.
- Current authority state gates cached UI data; context fingerprints/keys prevent late MARA, Sentinel, policy, adaptation, or yield results from becoming current.
- MARA and Sentinel stream bodies are incrementally limited to 64 KiB and 16 KiB. Invalid UTF-8/JSON/schema and provider failures return generic errors without stack/provider disclosure.

## Static, privacy, and dependency review

Production TypeScript classifications: `writeContract` is confined to Financial Constitution `setPolicy`; `fetch` is confined to explicit same-origin MARA and Sentinel POSTs. No production private-key/mnemonic/secret-key storage, `sendTransaction`, `eth_sendTransaction`, unsafe HTML, dynamic evaluation, browser credential storage, or dynamic redirect exists. Anchors are static internal fragments.

Production Solidity has no `delegatecall`, `selfdestruct`, `tx.origin`, assembly, callcode, arbitrary `.call`, execute, permit, approve, or multicall surface. Reviewed native recovery uses OpenZeppelin `Address.sendValue` with an owner-selected recipient and no calldata.

`OPENAI_API_KEY` is consumed only by a `server-only` module. MARA context omits account/vault address, RPC URL, credentials, and transaction data. Build output is searched for the identifier, never the value.

Dependency validation records `npm audit --omit=dev` and `npm ls uuid wagmi @wagmi/connectors @metamask/sdk @gemini-wallet/core`. The accepted baseline is eight moderate transitive UUID findings and zero high/critical. Production source does not import `uuid` or its v3/v5/v6 buffer APIs. Package manifests remain unchanged; no forced Wagmi upgrade is permitted.

Residual risks: external RPC/OpenAI availability, explicitly non-live demo data, unsolicited token donations, and environment-specific token-address authenticity at the upstream catalog/reader boundary. Adaptation has no independent address registry input and therefore does not claim to authenticate deployed addresses itself.

## Manual adversarial smoke checklist

- [ ] Start Sentinel, switch Wallet/Vault, confirm old output is not current.
- [ ] Start MARA, switch account/network, confirm old output is not current.
- [ ] Move to a wrong network; cached operational content disappears.
- [ ] Switch account A to B to A; no policy/simulation appears under the wrong account.
- [ ] Disconnect/reconnect; current-context status recovers truthfully.
- [ ] Rapidly switch Wallet/Vault; no operation auto-runs.

Wallet/provider/vault-dependent items must be marked **Not executable in current environment** when prerequisites are unavailable; success must not be fabricated.
