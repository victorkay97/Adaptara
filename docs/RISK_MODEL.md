# Deterministic Risk Model

Phase 4 measures the current factor-based risk profile of a fully valued Adaptara-supported portfolio. It is read-only, deterministic advisory data: it does not predict price or return and has no authority to move funds.

## Scale, factors, and weights

Authoritative calculations use integer BPS on a 0–10,000 scale (0.00–100.00 risk). The locked weights are volatility 2,000; liquidity 2,000; reference/oracle deviation 1,500; issuer/collateral/base risk 2,000; portfolio concentration 1,500; and market/event stress 1,000. They total exactly 10,000.

Volatility, liquidity, reference deviation, issuer/collateral, and market/event stress are normalized external inputs. Phase 4 uses deterministic demo fixtures only. These are not live measurements or market truth. Future liquidity data may incorporate depth, spread, and maximum executable size; future reference deviation may compare execution prices with trusted oracle prices; future issuer inputs may consider issuer, collateral, reserves, token design, and redemption risk. None of those live integrations exist in Phase 4.

Concentration is derived only from the complete Phase 3 allocation: `concentrationScoreBps = allocationBps`. This transparent MVP model is not a universal financial-risk law and cannot be overridden by a signal provider.

## Scoring and rounding

Each factor contribution is `floor(factorScoreBps × factorWeightBps / 10,000)`. An asset score is the sum of its six returned contributions. A complete portfolio score is `floor(Σ(assetRiskScoreBps × allocationBps) / 10,000)`, using Phase 3 allocations without normalization. The returned breakdown preserves factor ID, input, weight, contribution, and source, so every score is reconstructable.

Current tier thresholds are Defensive 0–3,499, Balanced 3,500–6,499, and Aggressive 6,500–10,000. `baselineRiskTier` remains static product metadata, while `currentRiskTier` is derived from the calculated score. Reserve is never a dynamic tier.

## Completeness and trust boundary

Only a `valued` Phase 3 snapshot with meaningful nonzero holdings, non-null allocations, and allocations totaling exactly 10,000 can produce a complete portfolio risk score. Partial or unavailable valuation withholds the score. Missing signals are never treated as zero: completed asset assessments may remain visible, but the portfolio status is partial (or unavailable when none can be assessed) and its score/tier are null. Zero-balance assets are omitted.

Malformed, fractional, negative, or above-maximum inputs fail closed; values are never clamped. The demo provider uses fixed values, makes no network calls, and has no randomness or time-dependent scoring.

Risk Engine output is advisory data. It cannot move funds. Future execution must independently pass policy, contract, and oracle validation. MARA cannot define weights or mutate an assessment; changed inputs require a new assessment.

In Phase 8, market/event stress may be `max(existing base event stress, active corroborated Sentinel event stress)`. The demo/non-live overlay cannot reduce base risk and changes no weights, contribution math, concentration, thresholds, or other factor.
