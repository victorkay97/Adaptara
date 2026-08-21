# Financial Constitution

## Per-Vault scope

Every V1 or V2 Managed Vault owns its own Constitution. Sibling Vaults do not share reserve, concentration, aggressive-exposure, action, turnover, mode, pause, replay, or yield-policy state. Aggregated UI must never imply one wallet-wide Constitution.

## Phase 13B atomic enforcement

`AdaptiveManagedVaultV1` stores the same four existing Constitution meanings and enforces them against actual post-swap balances. Every managed balance is converted to a common 18-decimal value basis through an immutable typed valuation provider. Reserve and Aggressive classification use the existing onchain `AssetRegistry.baselineRiskTier`; MARA and the executor supply neither prices nor classifications.

- `minimumReserveBps` is aggregate post-state value classified Reserve, rounded down.
- `maximumSingleAssetExposureBps` applies to every managed asset, with exposure rounded up so rounding cannot hide an excess.
- `maximumAggressiveExposureBps` is aggregate post-state Aggressive value, rounded up.
- `maximumDailyReallocationBps` combines with the execution-policy daily maximum by taking the stricter value. Successful action value is accumulated in UTC-day BPS; reverted execution consumes nothing.

Phase 13A's single-action BPS is made authoritative in the managed vault: `amountIn` is valued onchain and compared with the configured maximum BPS of total pre-action managed value. The typed minimum output must also be no weaker than the provider-derived fair output less the configured maximum slippage, and actual received balance must meet that minimum.

The local mock provider is test infrastructure, not production valuation. Production freshness, oracle selection, and governance are Phase 13C work.

## Phase 13A execution-policy extension

The deployed four-field `AdaptiveVault.policy` remains canonical and unchanged. Phase 13A adds a separate `AutonomousMandateV1.ExecutionPolicy` for future autonomous execution: maximum single-action BPS, maximum cumulative UTC-day turnover BPS, maximum slippage BPS, maximum intent lifetime, an autonomous-management enable flag, and owner-instruction-only yield compound/reserve BPS. All percentage fields use the existing 10,000 BPS denominator; yield compound plus reserve must equal 10,000.

Management mode, execution policy, and local asset/adapter allowlists are owner-controlled. Missing policy is never treated as zero or permission. Acceptance in Adaptive mode reserves an intent identifier and daily turnover only; it is not execution and does not prove the supplied exposure BPS against authoritative valuation. The original reserve, single-asset, aggressive-exposure, and daily policy meanings are unchanged. Before a later phase moves assets, its executor must reread and enforce both policy records against authoritative onchain state and fail closed when valuation is unavailable.

Phase 6 defines the vault owner's deterministic portfolio-policy boundary. It is structured user input, not a MARA recommendation, trade instruction, or autonomous execution capability. The application representation is versioned `phase-6.v1`; Solidity storage is unchanged.

All four values are integer basis points from 0 through 10,000. `minimumReserveBps` is the minimum aggregate allocation to baseline-Reserve assets. `maximumSingleAssetExposureBps` caps each supported asset. `maximumAggressiveExposureBps` caps aggregate baseline-Aggressive assets. `maximumDailyReallocationBps` constrains each Phase 7 simulation plan. Cumulative daily execution accounting still does not exist because Phase 7 performs no execution. Baseline catalog classification is deliberately used; Phase 4's dynamic `currentRiskTier` is independent risk intelligence.

Zero is literal, never “unset”: a zero reserve minimum imposes no minimum; zero single-asset or aggressive maximum permits no such exposure; and zero daily reallocation permits no reallocation. At 10,000, the maximum rules permit up to the full portfolio and the reserve minimum requires the full portfolio.

Validity, feasibility, and compliance are separate. Validity checks exact fields and BPS bounds. Feasibility checks whether the current supported catalog can satisfy the rules (including reserve capacity under the single-asset cap). Compliance evaluates only a fully valued Phase 3 snapshot; partial, unavailable, or corrupt allocation state is unavailable, never compliant. Current-state compliance covers reserve minimum, per-asset maximum, and baseline-Aggressive maximum. Daily reallocation remains an action limit.

A draft is local UI state and is labeled `Draft · not active onchain`. When a vault exists, its `AdaptiveVault.policy` values are canonical. Direct reads of policy and owner are pinned to one X Layer block and failures are never replaced with zero defaults. Only the connected vault owner can explicitly call `setPolicy`; the app validates validity and feasibility, requests a wallet signature, waits for a successful receipt, and rereads chain state. The contract remains final authorization.

MARA, guardian, executor, and server have no constitution mutation authority. Phase 6 adds no private signer, arbitrary call path, trade, or autonomous rebalancing. The existing contract stores but does not yet enforce policy against executions because routing and valuation enforcement do not exist. Phase 7 consumes MARA advisory direction plus this canonical policy through deterministic validation and produces simulation-only allocation plans with no execution authority.

## Manual smoke checks

- Connect a wallet and verify X Layer Testnet detection.
- Verify no-vault draft labeling and disabled onchain save.
- With a vault, verify pinned onchain policy, owner-only save, and reset-to-onchain.
- Verify invalid and catalog-infeasible drafts are blocked.
- Reject a wallet request and confirm no success message appears.
- Confirm a transaction and verify the policy is reread.
