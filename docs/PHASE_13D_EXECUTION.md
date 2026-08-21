# Phase 13D — OKX routing and deterministic execution readiness

Status: local, fixture-tested, uncommitted, undeployed, and incapable of broadcast.

## Verified network and API facts

Official X Layer documentation identifies mainnet chain ID 196 and testnet chain ID 1952. The current OKX Swap API supported-chain table lists X Layer at chainIndex 196; it does not list 1952. X Layer Testnet OKX Swap support is therefore **NOT CONFIRMED**, and Adaptara hard-fails network mismatches rather than falling back between networks.

The Classic Swap endpoint is `GET /api/v6/dex/aggregator/swap`. Phase 13D requests only `exactIn`; the deterministic planner supplies `amount`, and the managed vault is `userWalletAddress` because it owns the assets and must receive output/refunds. Responses contain dynamic `tx.to`, `tx.data`, `tx.value`, minimum receive, and optional approval data. OKX documents that some Uni v3 routes may consume only part of the input and automatically refund the remainder.

Authentication uses server-only `OK-ACCESS-KEY`, timestamp, passphrase, and Base64 HMAC-SHA256 over timestamp + uppercase method + path/query + body. The permitted clock difference is 30 seconds. Tests use injected fixtures only.

## Planner and route boundary

MARA's Phase 13C proposal supplies direction, target, evidence, rationale, confidence, and expiry—never amount, router, calldata, spender, recipient, value, or gas. `planDeterministicReduction` accepts authoritative server/on-chain state, rejects an unconstitutional target, calculates the required value reduction, bounds it by action and remaining turnover limits, and converts value to token units with conservative upward rounding. Its deterministic plan contains no calldata.

`SwapRouteProvider` isolates provider types. `OkxSwapRouteProvider` constructs exact-in requests solely from the plan and strictly parses one response. It preserves chain/token/amount/output/router/spender/recipient/value/calldata-hash/timing/safety provenance. `validateRoute` requires configured chain, router, approval target, exact tokens and amount, vault recipient, zero native value, policy slippage, price-impact limit, acceptable token-safety metadata, valid output, and freshness. Router and spender configuration must be explicit and provenance-backed; no address is populated here.

`routeCommitment` binds plan ID, vault, chain, assets, amount, minimum output, router, approval target, calldata hash, and expiry. Mutation changes the commitment. Arbitrary calldata is never stored as reusable authority and never reaches a signer/broadcaster in this phase.

## Adapter decision

**NO-GO for an on-chain OKX adapter.** The official Swap API describes `tx.data` only as call data and does not provide a sufficiently documented X Layer router ABI/function-selector family from which Adaptara can prove recipient, exact token/amount constraints, approval target, and refund destination before a low-level router call. No `OkxSwapAdapterV1`, low-level call, generic bytes executor, or dynamic approval was added. The existing typed vault adapter boundary remains unchanged.

Partial-input support is consequently architectural only: any future adapter must return refunds to the vault, verify actual input/output deltas, leave zero residual custody/allowance, and choose turnover semantics resistant to repeated partial-route gaming. The current vault requires actual input equal planned input; changing this requires a separately reviewed version, not a silent retrofit.

## Executor and readiness

`TransactionExecutor` separates address, simulation, and broadcast. `SimulationOnlyExecutor` can run an injected local simulation and unconditionally throws `BROADCAST_DISABLED_PHASE_13D`. No Agentic Wallet implementation was added because no wallet/provider integration is required to prove this boundary and no key-export design is acceptable.

`PreparedAdaptiveExecution` is secret-free, explicitly marks `broadcastAuthorized: false`, and records proposal, plan, vault, chain, normalized route, commitment, Constitution result, simulation result, and executor address. Phase 13D cannot mark execution complete.

## Deployment dependency and administration

```text
AssetRegistry + versioned ValuationProvider
                    ↓
ProtocolAdapterRegistryV1 ──→ future audited OKXSwapAdapter version
                    ↓
AdaptiveManagedVaultFactoryV1 ──→ AdaptiveManagedVaultV1/new reviewed version
                    ↓
restricted executor identity (simulation before any future submission)
```

Asset, protocol-adapter, router, spender, feed, adapter, registry, and factory addresses require a chain-scoped configuration containing address, version, source URL/document, verification timestamp, and code-hash where applicable. Empty or wrong-network configuration must block. Protocol/feed administration begins with an explicit delayed-transfer project admin and should migrate to a project multisig. Vault owner controls policy and local adapter enablement; owner/guardian can pause; only owner unpauses; executor has submission authority only.

## Remaining blockers

Before the first transaction: obtain and independently verify the current X Layer router ABI/source and selector semantics; confirm vault recipient/refund behavior; create and audit a versioned typed OKX adapter; decide and prove partial-input turnover accounting; run local/fork tests against exact deployed bytecode; populate provenance-backed router/spender/token/feed addresses; verify live X Layer gas constraints; integrate a non-exportable executor service; require simulation and transaction-field equality; complete deployment-specific threat review; and obtain explicit transaction authorization.
