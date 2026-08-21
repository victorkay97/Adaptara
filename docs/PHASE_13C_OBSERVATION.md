# Phase 13C — Valuation and observation boundary

Status: implemented locally and intentionally undeployed. No wallet, transaction, authenticated provider, or model call is part of this phase.

## Authority boundary

On-chain valuation is authoritative for managed-vault policy and execution. `ChainlinkValuationProviderV1` reads an administrator-configured Chainlink proxy, normalizes its answer to 18 decimals, preserves round/source/timestamp provenance through `IAdaptaraValuationProviderV2`, and fails closed for missing, zero, negative, future, incomplete, over-precision, or zero-after-normalization data. Feed configuration is write-once; migration requires a new provider version. No feed address is hardcoded.

Off-chain OKX market, news, and RWA data is observation-only. It may enrich MARA context and produce an expiring `ProposedSwapIntentV1`, but that type deliberately contains no amount, router target, calldata, signature, or execution authority. A deterministic planner must calculate any transaction fields later, and the vault remains the final on-chain policy gate. RWA discovery always returns eligibility `unknown`; discovery is not registry approval.

## Provider selection and verified interfaces

- Chainlink Data Feed proxy interface: `decimals()` and `latestRoundData()` through `AggregatorV3Interface`. Adaptara applies its own freshness and validity checks. Source: https://docs.chain.link/data-feeds/api-reference
- OKX DEX Market price info: `POST /api/v6/dex/market/price-info`; observations preserve chain/token/time provenance. Source: https://web3.okx.com/build/dev-docs/dex-api/dex-market-price
- OKX Social Analytics news by symbol: `GET /api/v6/dex/market/social/news/by-symbol`; observations preserve publisher, URL, timestamp, sentiment, importance, and related symbols. Source: https://web3.okx.com/build/dev-docs/dex-api/dex-market-social
- OKX RWA token discovery: `GET /api/v6/dex/market/rwa/tokens`; results remain discovery-only. Source: https://web3.okx.com/build/dev-docs/dex-api/dex-market-rwa

The repository implements schema validation, normalization, timeout classification, freshness expiry, relevance filtering, deterministic fixtures, and a short-lived cache with in-flight de-duplication. The authenticated OKX request/signing transport is intentionally injected and not invented here; credentials remain optional server-only placeholders.

## Registry and compatibility policy

`AdaptiveManagedVaultFactoryV1` adds one-managed-vault-per-owner discovery without modifying the legacy Phase 11 factory. `ProtocolAdapterRegistryV1` is the delayed-admin audited protocol catalog. Its support bit and a vault owner's adapter enablement are separate controls; Phase 13B vault execution remains restricted to its typed adapter interface and owner allowlist. A future vault version may consume the protocol registry directly after audit; this phase does not silently alter the locked V1 constructor.

Token assumptions are conservative: registered ERC-20 contract, stable decimals no greater than 36, standard balance/allowance behavior, no fee-on-transfer delta, no rebasing during execution, and no callback-based authority. Unsupported or anomalous behavior fails closed. Fee-on-transfer inputs are rejected by actual balance-delta checks; output and post-state are measured rather than trusted from adapter return data.

## Failure behavior

- Missing, invalid, stale, or future valuation: execution rejects.
- Market/news timeout or malformed response: provider status is unavailable; it is never translated to neutral/no-news.
- Stale off-chain evidence: excluded from current context and cannot create a proposal.
- Duplicate news: deduplicated by provider article ID.
- Provider outage: deterministic portfolio/risk truth remains available and MARA exposes the limitation.
- Adapter disabled at protocol or vault level: not eligible under the documented intersection model.

## Operations and recovery

Deployments must configure verified feed proxies/source IDs, protocol adapter metadata, and maximum valuation age explicitly. Monitor feed age, invalid rounds, provider timeout/error rate, partial batches, cache age, proposal expiry, and vault rejection events. Emergency response is fail closed: pause the vault/mandate, revoke the executor, disable the adapter, or migrate to a new versioned provider. Never rotate feed meaning behind an existing write-once configuration.

## Explicit deferrals

Authenticated OKX transport/signature construction, live provider calls, persistent observation storage, scheduled observation jobs, deterministic amount planning, protocol-registry enforcement in a new vault version, production feed/address selection, deployment, and autonomous execution remain deferred.
