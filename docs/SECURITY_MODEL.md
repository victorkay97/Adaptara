# Security Model

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

## Contract security rules

1. No arbitrary external-call function for the AI executor.
2. Agent executor follows least privilege.
3. Vault owner retains withdrawal and control authority.
4. Agent cannot change ownership.
5. Agent cannot change oracle configuration.
6. Agent cannot change financial policies.
7. Every rebalance is validated onchain.
8. Oracle staleness is checked.
9. Unsupported assets revert.
10. Emergency pause blocks deposits and future automated operations without blocking owner exits.
11. Contracts remain non-upgradeable for the hackathon.
12. User vaults are isolated per user, not pooled.

Phase 2 is testnet-only, includes custody and authorization foundations but no management or trading logic, and makes no production-security claim.

## Phase 3 read-only portfolio security

The portfolio module performs public reads only. It has no transaction, approval, signature, executor-key, or contract-write authority. A failed RPC or token read is an explicit unavailable/error state and is never represented as a zero balance, because zero is valid financial data. Deployed token decimals are checked against expected product metadata; mismatches fail closed as configuration errors.

A configured asset with a failed read or configuration error has an unknown balance and prevents a complete valuation. Known zero remains distinct and does not degrade completeness. Assets without deployed/configured addresses are outside live onchain completeness rather than being treated as unreadable balances. Partial totals are valued subtotals only, and allocation BPS are withheld unless the entire supported portfolio is fully valued. A future Risk Engine must reject or explicitly degrade any calculation that requires complete portfolio valuation; no Risk Engine is implemented in Phase 3.

Portfolio discovery covers only the configured Adaptara-supported catalog. Unsolicited tokens can exist in wallets and vaults but are not enumerated or silently treated as supported exposure. Wallet and vault sources are displayed separately, and onchain balances remain authoritative.

`baselineRiskTier` is static product/registry metadata. A future adaptive current tier belongs to the Phase 4 Risk Engine and is not calculated here. Demo reference prices are deterministic development inputs, not live market truth, peg verification, performance data, or investment advice.

## Phase 4 risk-engine security

Risk output is deterministic, read-only advisory data with no transaction, signature, contract-write, or vault authority. Incomplete valuation, invalid allocation, malformed normalized inputs, or missing signal coverage cannot produce a complete portfolio score. Demo risk inputs are visibly labeled and are not live market truth, predictions, legal/creditworthiness determinations, or oracle data.

Weights and tier thresholds are fixed in typed engine configuration and tested; MARA cannot define or change them. Assessments preserve their mathematical factor inputs and provenance. Any future execution remains independently subject to policy, contract, and oracle validation.
# Phase 5 MARA boundary

MARA and OpenAI have zero wallet and transaction authority. MARA receives privacy-minimized context, has no tools, and its output is untrusted until strict post-validation. User questions are untrusted input and cannot alter the server-owned policy, model, schema, or capabilities. Incomplete deterministic state cannot produce complete advice. Future execution must independently validate current chain state and policy.
