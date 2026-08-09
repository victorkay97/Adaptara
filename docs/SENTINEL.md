# Adaptara Sentinel — Phase 8

Sentinel `phase-8.v1` is a user-triggered deterministic event-stress pipeline. Its Phase 8 provider is a demo/non-live fixture feed; no live web, news API, database, crawler, scheduler, or background worker is implemented.

Observations contain bounded identifiers, publication time, original demo text, canonical affected assets, a locked event type, and categorical severity. Observation IDs must be unique within a provider response, and every report grouped under one `eventKey` must use the same event type. They are grouped only by stable `eventKey`; no LLM or text similarity is used.

Current corroboration is calculated independently for each event key and affected asset using active reports only. At least two distinct active `sourceId` values are required for `corroborated-active`. When there are no active reports but at least two distinct historical sources, status is `corroborated-expired`; every other combination is `uncorroborated`. Thus one active source plus one expired source is informational only. Current severity is the highest severity among active reports for that asset only.

The active window is strictly less than 72 hours at an explicit `asOf`; exactly 72 hours is expired. More than five minutes of future skew is rejected. Severity maps to low 2,500, medium 5,000, high 7,500, and critical 10,000 BPS. Each asset uses the maximum active corroborated event stress, never a sum.

Sentinel overlays only Phase 4 `marketEventStressScoreBps` as `max(base, sentinel)`. It actually influences portfolio risk only when this raises the input for a current holding whose balance is known and greater than zero. A no-op scan preserves the snapshot risk timestamp and existing MARA/adaptation identities; an influencing scan uses the Sentinel `asOf`. Sentinel cannot lower risk, predict prices, alter another factor or formula, call MARA, create an adaptation plan, sign, or send a transaction. The accepted `calculatePortfolioRisk` remains the sole calculator.

Scan state is scoped to source, account, chain, block, and canonical assets. A completion from an old context is ignored synchronously. Providers implement `SentinelProvider.scan(assetIds, asOf)`; any future live provider requires a separate source-trust, SSRF, privacy, and operational review.
