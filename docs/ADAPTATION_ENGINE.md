# Deterministic Adaptation Engine

Phase 7 introduces the pure application-domain engine `phase-7.v1`. It converts an already-validated MARA directional proposal into an inspectable exact-BPS allocation simulation. MARA never supplies percentages, target allocations, quantities, routes, calldata, or timing. The engine has `executionAuthority: "none"` and never signs, submits, or executes a transaction.

## Authoritative inputs

Operational planning requires a valued X Layer Testnet vault `PortfolioSnapshot`, a complete Phase 4 `assessed` risk result, a complete validated Phase 5 `MaraAnalysis`, and a structurally valid, catalog-feasible Phase 6 constitution whose source is `onchain`. The snapshot account must canonically equal the constitution vault. The allocation must total exactly 10,000 integer BPS and already be constitution-compliant. Drafts, wallet portfolios, incomplete valuation or risk, unknown configured balances, incoherent allocations, and stale or mismatched contexts fail closed.

## Deterministic planning

Only the first allocation-changing MARA proposal is considered. `maintain` and `review` are non-allocation actions. Each proposed plan transfers allocation between exactly one donor and one receiver; there is no optimizer or multi-leg netting.

The application safety throttle is `MAX_ADAPTATION_STEP_BPS = 500`. The step budget is the smaller of 500 BPS and `maximumDailyReallocationBps`. This constrains each Phase 7 plan only. Cumulative daily execution accounting does not exist because Phase 7 performs no execution.

- `increase_reserve`: Reserve receivers use lowest allocation then catalog order; non-Reserve donors use highest allocation then catalog order.
- `reduce_exposure`: the meaningful referenced asset is the donor. Receivers prefer Reserve, other non-Aggressive, then baseline-Aggressive, using lowest allocation then catalog order.
- `diversify`: a meaningful referenced asset is the donor, otherwise the largest meaningful holding is selected. The lowest-allocation eligible different asset is the receiver. Catalog order resolves ties.

Candidates must be canonical, configured/readable, have known balances and usable reference-price state. Known-zero configured positions may receive allocation; unknown balances are never zero. Capacity is capped by donor allocation, receiver single-asset headroom, aggregate Reserve minimum, aggregate baseline-Aggressive maximum, and the step budget. Classification always uses catalog `baselineRiskTier`.

## Validation and provenance

The independent validator checks integer BPS, the exact authoritative asset map and current allocations, current and target totals of 10,000, nonnegative targets, delta coherence, one meaningful donor and one eligible receiver, balanced movement, independently derived safety limits and MARA provenance, and post-plan constitution compliance. Target compliance is evaluated directly from target BPS and canonical catalog tiers; Phase 7 never fabricates a future portfolio snapshot, balance, value, or price. Reallocation is the sum of positive deltas, not both transfer sides.

Plans preserve vault, chain, portfolio block, constitution block, selected MARA proposal/action/asset, evidence references, and constitution limits. Portfolio and constitution reads are not called same-block unless they are. Portfolio, MARA, risk, vault/account, or constitution provenance changes clear visible advice or plans.

Phase 7 creates no token quantities, trades, routes, approvals, calldata, execution timing, or future-risk prediction. Future execution must reread authoritative chain state, implement authoritative cumulative daily accounting, and independently revalidate the plan.

A Phase 8 event-driven risk change invalidates prior MARA and adaptation context keys. Old plans are not mutated or presented as current. Sentinel does not create plans; the user must explicitly rerun MARA and explicitly generate a new simulation.

Phase 9 hypothetical yield projections do not alter the current portfolio or adaptation context, do not invalidate an existing plan, and do not create an Adaptation Plan.
