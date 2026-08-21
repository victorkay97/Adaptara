# Phase 13G deployment readiness

## Authority and transaction preparation

All production-shaped writes are owner initiated and prepared as exact chain-196 requests. Preparation never submits. Managed Vault creation targets only `AdaptiveManagedVaultFactoryV1`. Funding is two visible requests: exact ERC-20 approval, then typed Vault `deposit`; max approval is forbidden. Constitution, executor assignment/rotation/revocation, and Adaptive pause are owner-only typed calls. MARA cannot call any builder.

Discovery distinguishes none, legacy-only, managed, both, and unavailable. A legacy Vault is not treated as an `AdaptiveManagedVaultV1`. After a future confirmed deposit, the client must reread both token balances at a confirmed block rather than trusting submission.

Adaptive activation requires a saved Constitution, explicit executor address, owner-approved assignment, Adaptive mode, and a separate owner-approved unpause. Public execution remains disabled.

## Governance

The user owns the personal Vault and funds. The executor receives only the execution role. The protocol admin controls shared adapter support, never user withdrawals or Constitutions. Initial registry administration must name a nonzero deployer and the configured delay; production transition should use a 2-of-3 or 3-of-5 multisig. Signer identities are intentionally unspecified. The multisig controls shared registries/providers, not personal Vault ownership.

## Valuation readiness

Managed assets are xETH and USDT. Official, chain-196 Chainlink feed addresses and documented freshness expectations were not established with sufficient confidence during this phase. Both assets therefore remain `liveManagement: false`; missing, stale, future, zero, or invalid reports already fail closed in `ChainlinkValuationProviderV1`. Demo sandbox assets remain analysis/demo-only. This is an explicit deployment blocker, not an inferred feed mapping.

## External provenance

- Uniswap Factory, Router02, and QuoterV2: official Uniswap X Layer deployment documentation; fork-verified in Phase 13D.2.
- Aave Pool and Protocol Data Provider: official Aave Address Book; reserve state fork-verified in Phase 13E.
- USDT and xETH token/pool addresses: the same fork-proven Phase 13D.2/13E fixtures.
- Chainlink feeds: unresolved; no address is accepted until official chain-196 provenance is recorded.

## Deployment order and dry run

Deploy AssetRegistry, ChainlinkValuationProviderV1, ProtocolAdapterRegistryV1, the typed Uniswap and Aave adapters, then AdaptiveManagedVaultFactoryV1. Register assets/feeds and protocol adapters, verify external code and Uniswap pool/Aave reserve state, then allow users to create personal Vaults. Existing testnet scripts are not production scripts and must not be reused as mainnet configuration. Dry runs are Forge tests/fork simulations only; no Phase 13G script broadcasts.

`npm run predeploy:adaptara` is read-only and needs no key. It rejects wrong chain, missing RPC/config, placeholders, and assets not cleared for live management. The checked-in template deliberately returns `BLOCKED`.

## Operations and recovery

Typed health states are healthy, degraded, stale, unavailable, paused, and blocked. Monitor executor heartbeat, observation providers, RPC, valuation age, adapter registry support, Vault pause, repeat reverts, quote freshness, Uniswap pool availability, and Aave active/frozen/paused state. Any required dependency outside `healthy` disables Adaptive execution.

Recovery is owner controlled: pause Adaptive, revoke the executor, switch to Approval Required, withdraw Aave positions to liquid Vault capital, and withdraw Vault assets to the owner. Aave pause blocks new supply; unavailable router/pool blocks swaps; unavailable executor blocks autonomy; stale valuation blocks all valued execution.

## Threat review

A compromised executor remains bounded by typed adapters, protocol and owner allowlists, valuation, reserve, concentration, action/turnover, slippage, replay, and pause checks. A compromised frontend cannot make contracts accept an unsupported target or policy violation, but it can present a deceptive signing request; the UI must identify chain, target, permission, asset/amount, and whether funds move. A compromised protocol admin can change shared support after its delayed authority path but cannot own or withdraw from user Vaults. Predeployment must verify chain ID, runtime code, expected contract behavior, pool existence, active Aave reserve, and authoritative feeds. Remaining blockers are verified feeds, deployed Adaptara addresses, named admin/multisig, executor operational custody/monitoring, and final independent security review.

## OKX Agentic Wallet finding

Current official OKX material lists Agentic Wallet support for X Layer chain 196 and documents signing/payment flows. It is technically plausible as a restricted server-side executor identity, but the reviewed material did not establish sufficient production controls for Adaptara's required simulation, custody, rotation, and monitoring guarantees. Phase 13G therefore defines only an explicit executor-address boundary. No OKX signer adapter, key activation, or broadcast path is enabled.
