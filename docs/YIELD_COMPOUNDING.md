# Yield Intelligence and Compounding Simulation

Phase 9 implements the simulation-only `phase-9.v1` yield model. The sole canonical program, `demo-strsy-treasury-v1`, applies a 500-BPS (5.00%) sandbox annualized rate to eligible sTRSY held by an Adaptara Vault. Terms use daily compounding and a 365-day basis. USD®0, sXAU, and sAAPLx have no Phase 9 demo program; this is not a claim that their real yield is zero.

The provider is a deterministic local fixture. The rate is demo/non-live, is not market or protocol truth, is not guaranteed, and is never supplied by a user or MARA. Future real-protocol support requires separate adapter and security review.

## Exact arithmetic

All calculations use non-negative raw token quantities and integer `BigInt` arithmetic. Division rounds down and never manufactures fractional raw units. Supported user-selected horizons are exactly 30, 90, and 365 days.

`simpleYieldRaw = floor(principalRaw * annualRateBps * horizonDays / (10,000 * 365))`

Daily compounding begins with the raw principal, floors `balance * annualRateBps / (10,000 * 365)` each day, and adds that raw-unit yield to the simulated balance. Compounded yield is ending balance minus principal. `compoundingDeltaVsSimpleRaw` is compounded yield minus simple yield and may be positive, zero, or negative. For very small balances, independently flooring every daily increment can make the daily-compounded projection lower than the full-horizon simple projection; this compares calculation methods and does not indicate a market loss.

Output is token-denominated only. No future token price, USD value, portfolio value, earned yield, accrued yield, or claimable yield is calculated. A projection never becomes a future `PortfolioSnapshot`.

Operational projection requires exactly one meaningful, readable canonical sTRSY position with canonical catalog metadata and decimals in a single-block vault snapshot on X Layer Testnet (chain 1952), with non-null block provenance. Missing or duplicate positions, unknown or zero balances, unsupported or unconfigured assets, read/configuration errors, non-single-block reads, and metadata mismatches fail closed. Every successful result has `executionAuthority: "none"`.

One pure position evaluator supplies both projection eligibility and context identity. The context fingerprint includes vault/account, chain, block, block consistency, matching-position count, every canonical metadata field, principal, availability, balance decimals, program/version/rate, asset, and selected horizon. Any change hides the previous result. Projection is local and user-triggered; it performs no API, network, database, timer, signer, approval, protocol, contract write, or transaction operation.

Yield projection is a hypothetical side simulation. It does not change the authoritative portfolio, current risk, Sentinel state, MARA fingerprint/advisory, Financial Constitution compliance, or adaptation context/plan, and it does not automatically call MARA or Sentinel or create an Adaptation Plan.

Yield Intelligence remains discoverable inside the Adaptara Vault area when vault integration is unavailable, no vault has been created, or a vault read fails. In those states the canonical demo terms are visible, but simulation is disabled and no principal or projection is invented. Yield Intelligence is never presented as an operational wallet-holdings feature.
