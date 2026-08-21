# Security Model

## Multi-Vault V2 threat model

The V2 creation helper is bound immutably to its deploying factory and rejects all other callers. It only constructs `AdaptiveManagedVaultV1` with the factory-supplied owner and guardian, a forced-zero executor, and fixed shared dependencies; it has no post-creation authority.

Sibling Vaults share only immutable read dependencies. They share no custody, Constitution, mode, pause flag, replay map, turnover bucket, asset enumeration, allowances, or yield accounting. An owner controls only Vaults they own; the factory, shared admins, MARA, adapters, and sibling Vaults cannot withdraw. The factory has no upgrade path or continuing privilege. A 16-Vault owner cap and bounded pagination prevent enumeration exhaustion. Activity must label onchain events as authoritative and MARA/planner records as offchain; a reverted policy violation cannot persist an onchain `ActionBlocked` event.

## Phase 13E supply-only Aave boundary

The Aave adapter is pinned to chain 196, the verified Pool, USDT, and aUSDT. It has no borrowing, debt delegation, flash-loan, collateral-toggle, arbitrary-recipient, arbitrary-Pool, or arbitrary-calldata function. Exact approvals are reset and temporary adapter custody must end at zero. The Vault owns the aToken position. Liquid reserve excludes yield-deployed capital, while concentration aggregates liquid and supplied USDT exposure. Principal and checkpointed retained yield cannot be swept repeatedly as new yield. Failed actions atomically roll back token movement, replay, turnover, and accounting.

## Phase 13B restricted execution and atomic rollback

Phase 13B introduces real contract-level swap execution only in the undeployed, versioned `AdaptiveManagedVaultV1`. Custody never moves to an executor account. The vault temporarily authorizes only the selected adapter for the exact input amount and resets the allowance in the same transaction. A malicious overpull fails at ERC-20 allowance enforcement; success leaves zero residual allowance. The execution entry points and owner withdrawal are protected by OpenZeppelin `ReentrancyGuard`.

Approval Required and Adaptive use one internal pipeline with different caller gates. Advisory has no execution path. The owner cannot use approval as a Constitution bypass; both paths require current policies, managed assets, an allowed adapter, a fresh unique intent, authoritative fresh valuation, value-based action/daily/slippage limits, actual balance deltas, and compliant post-state reserve/concentration/aggressive exposure.

Intent consumption and daily turnover are written before the adapter call to follow checks-effects-interactions, but Solidity atomicity rolls them back with token movements and approvals if the adapter, delta checks, valuation, or final policy check fails. `SwapExecuted` and the execution record occur only after every invariant passes. The adapter's reported output cannot substitute for actual vault balances.

The provider and asset registry are immutable, and managed assets are an append-only owner list bounded at 32. The executor cannot change prices, classifications, policy, mode, pause state, allowlists, roles, or recipients; it receives no arbitrary target or calldata surface. The existing deployed vault and Phase 13A mandate retain their prior non-executing behavior.

Phase 13B deliberately excludes production adapters, live routing, Chainlink, OKX, Agentic Wallet, Aave, external LLM/news calls, deployment, and production-security claims.

## Phase 13A autonomous mandate foundation

Phase 13A adds `AutonomousMandateV1` beside, rather than inside, the already deployed non-upgradeable `AdaptiveVault`. The mandate is bound to one vault and dynamically reads that vault's owner, executor, and pause state. It holds no funds, cannot transfer or approve tokens, cannot call the vault, and cannot invoke an adapter. The user's external wallet is never a capital source: only balances intentionally deposited in the existing vault can be managed by a future execution layer.

The owner alone configures management mode, execution policy, asset and adapter allowlists, and the mandate emergency pause. Advisory and Approval Required modes reject the autonomous pathway. Adaptive mode still requires the current vault executor, both pause layers to be open, a configured/enabled policy, bounded allowlisted typed input, and a fresh deadline. Revoking the vault executor takes effect immediately. The executor cannot alter either Constitution, change allowlists, unpause, withdraw, approve, or make an arbitrary call.

`acceptSwapIntent` is an auditable authorization reservation, not a trade: it hashes typed fields, prevents replay, and consumes UTC-day turnover BPS, but deliberately causes no asset movement and emits no execution event. `actionExposureBps` is planner input and therefore is not sufficient transaction authority. A later phase must recompute it from authoritative balances and approved valuation, reread the existing four Constitution limits, execute through a reviewed adapter with bounded approvals and reentrancy protection, and atomically verify actual balances. Until that complete validator/executor exists, Phase 13A exposes no execution function and therefore fails closed.

The yield compound/reserve BPS fields store only the owner's instruction and must sum to 10,000. They are not accounting: principal, protocol yield, realized gain/loss, and unrealized PnL remain undefined until approved strategy adapters provide an authoritative basis.

## Phase 11 adversarial hardening

Phase 11 revalidated every existing authority boundary under hostile runtime objects, provider output, RPC failures, cached state, token behavior, and direct contract callers. It added no execution capability. Runtime consumers fail closed, simulations remain non-authoritative, and future execution must reread chain state. The complete findings and authority inventory are in `SECURITY_REVIEW.md`.

## Phase 10 UX boundary

The UX restructuring does not change authority boundaries. Sentinel, MARA, Adaptation Simulation, and Yield Intelligence remain explicitly user-triggered, and source switching invokes none of them. Phase 10 introduces no signer, API, provider, or write surface. The previously reviewed owner-confirmed Financial Constitution update remains the only UI write behavior.

AI is untrusted and may be mistaken, manipulated, or compromised. A backend is not sufficient authority over funds. Recommendations require typed proposals, deterministic validation, and contract-level policy enforcement. Users must explicitly confirm financial policy. Secrets remain server-only; testnet configuration fails closed when invalid.

## Phase 2 authorities

- **Owner:** immutable vault authority for Phase 2. May withdraw supported tokens, recover accidental ERC-20 or forced native balances, change guardian and executor, update stored policy, pause, and unpause. Both ownership transfer and renunciation are disabled to preserve the factory's permanent owner-to-vault mapping. A future transfer protocol must update vault and factory atomically.
- **Agent executor:** stored for future MARA integration but has no Phase 2 execution or asset-transfer function. Every nonzero executor must differ from both owner and guardian, preventing privilege aliasing. It cannot withdraw, recover, pause, update policy, change roles, administer assets, or make arbitrary calls.
- **Guardian:** emergency-only authority that may pause its vault. It cannot unpause, transfer assets, update policy, or change any role.
- **Registry admin:** the single `DEFAULT_ADMIN_ROLE` holder registers and disables supported assets. Default-admin transfer is delayed and two-step through `AccessControlDefaultAdminRules`. MARA has no registry role.

## Pause and recovery

Pause blocks deposits and provides the guard that future automated functions must use. Only the owner may unpause. Pausing never traps owner funds: supported-asset withdrawal and owner-only recovery of disabled, unsupported, or accidentally transferred ERC-20s remain available. Direct native OKB transfers are rejected, while an owner-only, non-reentrant recovery path handles balances that were forcibly placed in the vault.

Guardian may equal owner because this grants no authority the owner does not already possess; it only makes the separate emergency address redundant. A nonzero executor can never equal either identity. Zero guardian and executor values remain valid revocation states.

Vaults do not keep shadow asset balances. ERC-20 `balanceOf` state is authoritative, including tokens transferred directly without calling `deposit`. All transfer paths use `SafeERC20` and `ReentrancyGuard`.

## Future donation and griefing threat

Anyone can transfer ERC-20 balances directly into a vault without calling `deposit`. Future portfolio-policy enforcement must tolerate unsolicited balances: a donation must not permanently freeze a vault in a noncompliant state, and corrective or risk-reducing actions must remain possible. Phase 2 documents this constraint but does not implement future valuation, policy enforcement, or risk logic.

## Phase 2 contract and future-execution security rules

1. No arbitrary external-call function for the AI executor.
2. Agent executor follows least privilege.
3. Vault owner retains withdrawal and control authority.
4. Agent cannot change ownership.
5. Agent cannot change oracle configuration.
6. Agent cannot change financial policies.
7. Any future rebalance execution must be validated onchain.
8. Any future oracle integration must enforce staleness checks.
9. Unsupported assets revert.
10. Emergency pause blocks deposits and future automated operations without blocking owner exits.
11. Contracts remain non-upgradeable for the hackathon.
12. User vaults are isolated per user, not pooled.

Phase 2 is testnet-only, includes custody and authorization foundations but no management or trading logic, and makes no production-security claim.

## Phase 3 read-only portfolio security (historical layer boundary)

The portfolio module performs public reads only. It has no transaction, approval, signature, executor-key, or contract-write authority. A failed RPC or token read is an explicit unavailable/error state and is never represented as a zero balance, because zero is valid financial data. Deployed token decimals are checked against expected product metadata; mismatches fail closed as configuration errors.

A configured asset with a failed read or configuration error has an unknown balance and prevents a complete valuation. Known zero remains distinct and does not degrade completeness. Assets without deployed/configured addresses are outside live onchain completeness rather than being treated as unreadable balances. Partial totals are valued subtotals only, and allocation BPS are withheld unless the entire supported portfolio is fully valued. At the Phase 3 boundary, the Risk Engine was not yet implemented; the completed Phase 4 engine now rejects or explicitly degrades calculations that require complete portfolio valuation.

Portfolio discovery covers only the configured Adaptara-supported catalog. Unsolicited tokens can exist in wallets and vaults but are not enumerated or silently treated as supported exposure. Wallet and vault sources are displayed separately, and onchain balances remain authoritative.

`baselineRiskTier` is static product/registry metadata. A future adaptive current tier belongs to the Phase 4 Risk Engine and is not calculated here. Demo reference prices are deterministic development inputs, not live market truth, peg verification, performance data, or investment advice.

## Phase 4 risk-engine security

Risk output is deterministic, read-only advisory data with no transaction, signature, contract-write, or vault authority. Incomplete valuation, invalid allocation, malformed normalized inputs, or missing signal coverage cannot produce a complete portfolio score. Demo risk inputs are visibly labeled and are not live market truth, predictions, legal/creditworthiness determinations, or oracle data.

Weights and tier thresholds are fixed in typed engine configuration and tested; MARA cannot define or change them. Assessments preserve their mathematical factor inputs and provenance. Any future execution remains independently subject to policy, contract, and oracle validation.
# Phase 5 MARA boundary

MARA and OpenAI have zero wallet and transaction authority. MARA receives privacy-minimized context, has no tools, and its output is untrusted until strict post-validation. User questions are untrusted input and cannot alter the server-owned policy, model, schema, or capabilities. Incomplete deterministic state cannot produce complete advice. Future execution must independently validate current chain state and policy.

## Phase 6 constitution boundary

The Financial Constitution belongs to the vault owner. Only an explicit owner wallet signature may change canonical `AdaptiveVault.policy`; MARA and the server cannot sign, and the guardian and agent executor retain no policy authority under the existing contract. Local drafts are non-authoritative. Failed policy or owner reads never become default values, and uncertainty disables writes.

Exact validation and current-catalog feasibility checks fail closed before a wallet request. These checks are defense in depth; the contract remains the authorization boundary. Confirmation is required before success is displayed, followed by an onchain reread. Phase 6 provides no autonomous execution. Future execution must enforce the canonical constitution independently.

## Phase 7 adaptation boundary

MARA supplies direction but never chooses BPS. The deterministic engine never signs or sends transactions and accepts only an active onchain constitution for operational planning. Both current and target vault allocations must be compliant; a violating baseline blocks normal MARA-directed adaptation rather than being silently repaired.

Only the first actionable MARA proposal is converted, using one donor, one receiver, canonical tie-breaks, and a 500-BPS application safety throttle further constrained by policy. `maximumDailyReallocationBps` is a per-plan ceiling here, not cumulative daily accounting. Portfolio, MARA, vault/account, and constitution provenance changes invalidate visible state. Future execution must reread authoritative state, account for cumulative daily activity, and independently revalidate every constraint.

## Phase 8 Sentinel boundary

News and events are untrusted inputs. Phase 8 accepts bounded canonical observations and fixed categorical severity; a provider cannot supply BPS. Two distinct sources must corroborate the same event key and asset. Duplicate same-source and expired reports have no risk influence. Stress affects only market/event stress, uses max aggregation, and never lowers the base signal.

Sentinel cannot invoke MARA or adaptation and cannot sign or send transactions. Scan completions are context-isolated. The feed is demo/non-live and fetches no URLs. A future live provider requires separate SSRF, provenance, source-trust, privacy, and availability review.

## Phase 9 yield-simulation boundary

Fixture yield terms are transparent demo inputs, not market or protocol truth. The canonical provider, rather than user input, supplies the rate. Projection uses deterministic, round-down `BigInt` arithmetic and never creates a fake future `PortfolioSnapshot`.

Yield Intelligence has no signer, transaction, protocol adapter, network, or arbitrary execution surface and cannot change risk, Sentinel, MARA, Constitution, or Adaptation authority. Future real yield protocols require separate adapter design and security review.

## Current integrated security status

The deterministic Risk Engine is implemented, and configured portfolio reads use live X Layer onchain balances while retaining demo/non-live valuation references. The Financial Constitution is active in the deployed, non-upgradeable demo vault; `setPolicy` remains an explicit owner-controlled wallet write with receipt confirmation and an onchain reread. MARA remains advisory, Sentinel remains non-executing, Adaptation and Yield remain simulations, and none receives a signing key or arbitrary transaction authority. ERC-8021 Builder attribution is metadata appended to the existing owner write and grants no contract or asset authority. The vault contracts remain constrained: no pooled custody, generic execute, arbitrary call, `delegatecall`, trading router, or autonomous execution path has been added.
# Phase 13C provider boundary

## Phase 13D route boundary

MARA supplies direction only; deterministic planning owns quantities; OKX supplies untrusted routing; configured trust and the Constitution validate it. Broadcast is disabled, no router calldata reaches an executor, and the OKX adapter remains a documented NO-GO pending verifiable ABI semantics. See `docs/PHASE_13D_EXECUTION.md`.

## Phase 13D.1 direct Uniswap boundary

External market/news sources are advisory evidence. MARA supplies direction. The deterministic planner supplies the amount. QuoterV2 supplies expected output only. The Financial Constitution is the authority constraint. `UniswapV3SwapAdapterV1` is a narrow typed execution mechanism. The managed Vault retains custody and independently enforces actual balance deltas and post-state policy. See `docs/PHASE_13D1_UNISWAP_EXECUTION.md`.

See `docs/PHASE_13C_OBSERVATION.md` for feed validity, provenance, stale/future rejection, provider-outage behavior, adapter-registry separation, token compatibility assumptions, monitoring, and recovery.

## Phase 13C.1 hardening

See `docs/PHASE_13C1_HARDENING.md` for exact 4–32 asset gas scaling, stateful invariant configuration/results, the enforced protocol-supported ∩ owner-enabled adapter boundary, token exclusions, and Phase 13D prerequisites.
