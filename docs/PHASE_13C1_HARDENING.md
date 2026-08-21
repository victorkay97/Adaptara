# Phase 13C.1 — Security invariants, gas scaling, and registry enforcement

## Scope and status

This local, undeployed hardening phase adds no product feature or live integration. It closes the Phase 13C gas/invariant deferrals and makes the adapter trust intersection enforceable before Phase 13D. This is stateful invariant testing, not formal verification or an external audit.

Baseline: 105/105 Foundry tests and 462/462 frontend tests. No UI file was changed in Phase 13C.1.

## Exact gas scaling

`Phase13C1GasScalingTest` measures only the successful execution call, after equivalent setup. Every case has the stated number of registered, managed, nonzero 18-decimal assets; identical 1e18 prices; one reserve asset; remaining balanced assets; a one-token swap; the same policy; the same protocol-supported and owner-enabled adapter; and full pre/post portfolio enumeration.

| Managed assets | Owner-approved | Adaptive |
|---:|---:|---:|
| 4 | 365,650 | 365,928 |
| 8 | 418,171 | 418,449 |
| 16 | 523,340 | 523,618 |
| 24 | 628,678 | 628,956 |
| 32 | 734,185 | 734,463 |

Observed growth is approximately linear at about 13.2k gas per additional managed asset. Code and trace review identify the dominant cost as two complete `_validatePortfolio` passes, each reading balance, valuation, decimals, and registry classification; the post-state pass also checks every single-asset exposure. No asset list is supplied by the executor and no asset can be skipped. At less than 735k gas in this deterministic worst-count case, the existing cap of 32 remains recommended and no optimization is justified. This report makes no claim about an exact X Layer block limit; production deployment must verify the then-current network limit and retain operational headroom.

## Stateful invariant harness

Foundry configuration: 128 runs, depth 64, 8,192 handler calls per invariant. Five invariants pass with zero invariant failures. The handler exercises bounded successful/unsuccessful swaps, owner/Adaptive paths, mode changes, autonomous and vault pause changes, executor rotation, valid/zero/stale/future/invalid valuation states, replay attempts, and one-to-three-day transitions.

Proved across generated sequences:

- owner and immutable registry authority do not drift; the current executor matches the last authorized rotation;
- successful swap checkpoints satisfy reserve, single-asset, and aggressive limits;
- daily turnover stays at or below the configured bound and reverted calls roll state back;
- successful IDs are consumed and retain nonzero, adapter-bound, actual-delta records;
- replay of a successful ID fails;
- vault-to-adapter allowance is always zero after handler actions;
- the swap-only adapter fixture retains no managed token custody.

The focused Phase 13A–13C unit tests continue to cover rejected execution, non-consumption after revert, exact initiator/path, old-executor revocation, mode/pause semantics, hostile adapter rollback, and valuation restoration.

## Adapter registry decision

Before this phase, `ProtocolAdapterRegistryV1` was an informational delayed-admin catalog and `AdaptiveManagedVaultV1` consulted only the owner allowlist. Because the managed-vault contracts are undeployed and entirely uncommitted, the vault and factory now pin an immutable `IProtocolAdapterRegistry`. Shared pre-execution validation requires both `protocolAdapterRegistry.isSupportedAdapter(adapter)` and `allowedAdapters[adapter]`.

Protocol governance is the delayed-transfer project admin for the hackathon and may be a project multisig in production. Registration is address-and-version explicit and write-once; disabling is explicit. The owner controls only its local enablement. Executor, MARA, and observation providers control neither set.

Tests prove owner-enabled but protocol-unsupported rejection, protocol-supported plus owner-enabled success, post-disable rejection, delayed-admin access control, and explicit address/version registration.

## Token compatibility

Supported execution assumes a registered contract with stable decimals at or below 36, reliable `balanceOf`, standards-compatible exact approvals, non-rebasing balances during a call, and no transfer callbacks that can obtain authority. Fee-on-transfer inputs fail the exact received/input-delta checks. Output is measured from actual vault deltas. Unsupported approval behavior, unreliable deltas, rebasing, hooks, decimals above 36, or anomalous transfers fail or remain explicitly unsupported. No support was expanded in this phase.

## Cross-phase findings

- `AutonomousMandateV1` accepts typed intent metadata but moves no assets.
- `AdaptiveManagedVaultV1` is the only managed execution boundary and exposes no arbitrary target/calldata/delegatecall surface.
- `ChainlinkValuationProviderV1` is write-once configured and fails closed for invalid, zero, negative, future, incomplete, and unsupported-precision reports.
- OKX market/news/RWA providers, cache, relevance logic, and MARA proposed intents are TypeScript-only observation components. They import no vault writer and cannot call `executeAdaptiveSwap`.
- Proposed observation intents contain no amount, calldata, signature, target, or execution authority.
- Exact approvals are reset to zero; no unlimited approval exists.

## Phase 13D prerequisites

Phase 13D must retain the immutable registry intersection, typed adapter interface, exact allowance/reset, actual-delta accounting, replay protection, full portfolio pre/post validation, and server-only observation boundary. Before any live action: verify current X Layer gas/block constraints from official sources; select and audit one concrete adapter/address/version; implement deterministic quote/amount construction independent of MARA; test real router failure/callback/token behavior locally or on a fork; pin production feed proxies and freshness; define deployment/admin/multisig procedures; and complete deployment-specific threat review. No live execution is authorized by this document.
