# Financial Constitution

Phase 6 defines the vault owner's deterministic portfolio-policy boundary. It is structured user input, not a MARA recommendation, trade instruction, or autonomous execution capability. The application representation is versioned `phase-6.v1`; Solidity storage is unchanged.

All four values are integer basis points from 0 through 10,000. `minimumReserveBps` is the minimum aggregate allocation to baseline-Reserve assets. `maximumSingleAssetExposureBps` caps each supported asset. `maximumAggressiveExposureBps` caps aggregate baseline-Aggressive assets. `maximumDailyReallocationBps` is a future action limit and cannot be evaluated from current holdings alone. Baseline catalog classification is deliberately used; Phase 4's dynamic `currentRiskTier` is independent risk intelligence.

Zero is literal, never “unset”: a zero reserve minimum imposes no minimum; zero single-asset or aggressive maximum permits no such exposure; and zero daily reallocation permits no reallocation. At 10,000, the maximum rules permit up to the full portfolio and the reserve minimum requires the full portfolio.

Validity, feasibility, and compliance are separate. Validity checks exact fields and BPS bounds. Feasibility checks whether the current supported catalog can satisfy the rules (including reserve capacity under the single-asset cap). Compliance evaluates only a fully valued Phase 3 snapshot; partial, unavailable, or corrupt allocation state is unavailable, never compliant. Current-state compliance covers reserve minimum, per-asset maximum, and baseline-Aggressive maximum. Daily reallocation remains an action limit.

A draft is local UI state and is labeled `Draft · not active onchain`. When a vault exists, its `AdaptiveVault.policy` values are canonical. Direct reads of policy and owner are pinned to one X Layer block and failures are never replaced with zero defaults. Only the connected vault owner can explicitly call `setPolicy`; the app validates validity and feasibility, requests a wallet signature, waits for a successful receipt, and rereads chain state. The contract remains final authorization.

MARA, guardian, executor, and server have no constitution mutation authority. Phase 6 adds no private signer, arbitrary call path, trade, or autonomous rebalancing. The existing contract stores but does not yet enforce policy against executions because routing and valuation enforcement do not exist. Phase 7 may consume MARA advisory proposals plus this canonical policy through deterministic adaptation validation; Phase 7 is not implemented here.

## Manual smoke checks

- Connect a wallet and verify X Layer Testnet detection.
- Verify no-vault draft labeling and disabled onchain save.
- With a vault, verify pinned onchain policy, owner-only save, and reset-to-onchain.
- Verify invalid and catalog-infeasible drafts are blocked.
- Reject a wallet request and confirm no success message appears.
- Confirm a transaction and verify the policy is reread.
