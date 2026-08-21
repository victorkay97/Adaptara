# Architecture

## Multi-Vault V2 (deployed, read-only frontend activation)

Factory V2 delegates construction to an immutable, factory-bound creation helper solely to keep the factory and reused Vault V1 creation-code runtimes below EIP-170. The helper cannot be called by owners or arbitrary accounts, cannot select an implementation, and receives the same immutable shared dependencies as the factory.

`AdaptiveManagedVaultV1` is safe to instantiate repeatedly because custody, owner, Constitution, mode, pause, replay, turnover, assets, adapter permissions, and yield accounting are instance-local. The additive `AdaptiveManagedVaultFactoryV2` creates those existing non-upgradeable Vaults with executor zero, caps each owner at 16, provides bounded enumeration, and retains no post-creation authority. The verified X Layer Mainnet factory at `0x98dE37855b85993C0cA6746b667BA01f2894efad` is enabled only for reads. Frontend discovery aggregates live V1 `managedVaultOf(owner)` with V2 enumeration and keeps address plus generation together as selected-Vault context. Public writes remain disabled.

Phase 13F presents the system as `Connect → Understand → Delegate → Constrain → Activate → Observe → Adapt → Yield → Verify`. Intelligence Mode analyzes the existing wallet without authority. Managed Mode is bounded by an owner-controlled isolated Vault and Financial Constitution. MARA chooses advisory direction; deterministic code chooses amounts; Uniswap rebalancing and Aave yield remain subordinate tools. See `docs/PHASE_13F_PRODUCT_FLOW.md`.

Phase 13E adds a deterministic Aave V3 X Layer USDT supply strategy beside the Uniswap adapter. MARA remains advisory; the project-owned planner derives the exact deployable amount from liquid reserve, strategy exposure, action, and turnover bounds. The managed Vault retains the aUSDT position, accounts principal and accrued protocol yield in underlying units, applies the owner's compound/reserve split, and validates liquid reserve plus aggregated USDT economic exposure after each action. Public execution remains disabled. See `docs/PHASE_13E_AAVE_YIELD.md`.

```text
Market / News -> MARA -> deterministic planner -> Financial Constitution
                                                  |              |
                                           Uniswap adapter  Aave yield adapter
                                                  |              |
                                             rebalance      supply / settle
                                                  +------ Managed Vault
                                                          -> post-state validation
```

Phase 13D adds deterministic planning, normalized OKX exact-in route validation, route commitments, and a simulation-only executor boundary. It deliberately adds no router-calling adapter because current public X Layer router calldata semantics are insufficiently documented for Adaptara's typed no-arbitrary-call guarantee. See `docs/PHASE_13D_EXECUTION.md`.

Phase 13C.1 pins the delayed-admin protocol adapter registry immutably in each managed vault and its factory. Execution uses the intersection of protocol-supported and owner-enabled adapters. Gas and invariant evidence is recorded in `docs/PHASE_13C1_HARDENING.md`.

## Phase 13B local restricted execution layer

`AdaptiveManagedVaultV1` is an additive, non-upgradeable managed-vault architecture for local tests. The deployed `AdaptiveVault`, its factory, `vaultOf(owner)` discovery, and the Phase 13A mandate remain unchanged. A new version is required because the deployed vault has no managed-asset enumeration, valuation authority, typed adapter entry point, bounded approval pathway, or atomic post-state hook; an external proxy could not safely move its custody without bypassing vault enforcement.

The V1 managed vault retains custody and calls one owner-allowlisted typed `IAdaptaraAdapter.swap` implementation. It grants only the exact input allowance, calls the adapter under `nonReentrant`, resets allowance to zero, derives input/output from actual vault balance deltas, and then values every configured managed asset. Only after minimum output and the reserve, single-asset, and aggressive-exposure invariants pass does it store an execution result and emit `SwapExecuted`. Any failure reverts the complete transaction.

```text
typed SwapIntent
    -> owner gate (Approval Required) OR current executor gate (Adaptive)
    -> shared validation and authoritative value precheck
    -> atomically consume ID + reserve UTC-day turnover
    -> exact adapter allowance + typed swap + allowance reset
    -> actual vault balance deltas
    -> bounded full-portfolio valuation/classification
    -> Constitution validation
    -> execution record and event, or complete revert
```

Phase 13B valuation uses the immutable `IAdaptaraValuationProvider` boundary and existing `AssetRegistry.baselineRiskTier` classification. Tests use a local mock provider only. Missing, zero, future-dated, invalid, stale, unsupported, or malformed inputs fail closed. Production oracle selection, governance, and deployment remain later work.

## Phase 13A additive authority layer

```text
MARA (untrusted, no key)
        -> structured SwapIntent
        -> deterministic planner (future authoritative valuation)
        -> AutonomousMandateV1 (owner policy + reservation only)
        -> restricted executor / approved typed adapter (Phase 13B+)
        -> AdaptiveVault delegated capital
```

The live `AdaptiveVault` and `AdaptiveVaultFactory` are non-upgradeable and their existing `policy()` and `vaultOf(owner)` ABIs are consumed by the application. Phase 13A consequently uses an additive, explicitly versioned mandate rather than changing that deployed shape. Existing vault discovery, custody, withdrawals, Constitution reads/writes, simulations, and deployment manifests are unchanged. No Phase 13A contract is deployed or wired into the UI.

`AutonomousMandateV1` is a non-custodial authority record attached to one vault. It implements Advisory, Approval Required, and Adaptive modes; owner-only emergency controls; bounded owner allowlists; execution-policy storage; typed swap-intent validation; expiry; replay protection; and per-UTC-day turnover reservation. Only `Swap` is represented because yield supply, yield withdrawal, and profit sweep lack authoritative adapters/accounting today.

The Phase 13A stopping boundary remains intentional for the original `AutonomousMandateV1`: its acceptance does not call an adapter or move assets. Phase 13B execution exists only in the new local/test `AdaptiveManagedVaultV1`, where validation and consumption occur inside the same transaction. There is no accepted-then-later-executed gap in the managed-vault lifecycle.

## Phase 11 trust-boundary review

Phase 11 preserves the Phase 1-10 architecture. It hardens validation at existing boundaries only; it introduces no provider, signer, router, contract write, or execution path. Runtime domain objects remain untrusted unless their receiving module validates the assumptions it consumes.

## Phase 10 presentation layer

The Phase 10 application shell and portfolio workspace compose the existing Portfolio, Sentinel, Risk, MARA, Adaptation, Yield, and Financial Constitution modules. Source selection and readiness summaries are views over existing query/account state; they do not duplicate domain calculations or introduce RPC queries. The presentation layer is not an authority layer and cannot turn advisory or simulated output into transaction authority.

## Phase 2 onchain foundation

```text
AdaptiveVaultFactory
        |
        | creates one per owner
        v
AdaptiveVault ------> AssetRegistry
        |
        `------------ owner-stored policy primitives
```

`AdaptiveVaultFactory` creates and indexes isolated vaults without custody or administrative authority over them. A caller can create only its own vault, and Phase 2 vault ownership is non-transferable so the permanent owner-to-vault index cannot diverge. Each non-upgradeable `AdaptiveVault` has one owner, an optional guardian, an optional future agent-executor address, and a shared immutable registry reference. Assets are never pooled between users. A future ownership-transfer design, if required, must atomically update the factory as a factory-aware protocol.

The registry allowlist is administered separately with delayed default-admin transfer; MARA has no registry role. `AssetRegistry.baselineRiskTier` is static starting/product metadata. It is distinct from a future `RiskEngine.currentRiskTier`, which will be a dynamic adaptive classification. Phase 2 neither implements that engine nor permits dynamic tier updates.

Phase 2 contains no execution router, exchange, oracle, valuation, AI, or trading mechanism. The executor address is stored to establish the future authorization boundary but has no privileged callable financial operation.

## Portfolio Intelligence Layer

```text
Wallet / AdaptiveVault
        ↓
Supported Asset Catalog
        ↓
Onchain Balance Reader
        ↓
Reference Price Provider
        ↓
Deterministic Valuation Engine
        ↓
PortfolioSnapshot
```

Phase 3 queries only the configured Adaptara-supported asset set; it is not a comprehensive token index. Wallet and vault snapshots remain separate and retain account, source, chain, block, capture-time, read-status, and price-source provenance. Balance and decimals calls are batched at one captured block where supported by the RPC. Onchain `balanceOf` remains authoritative and no shadow accounting is introduced.

The product catalog uses stable IDs rather than addresses as business identifiers. Addresses are environment-specific and optional. Static `baselineRiskTier` metadata remains distinct from the future dynamic risk engine. Reference pricing is behind an interface; the Phase 3 provider is explicitly demo-only and does not make oracle or peg claims.

## Phase 4 deterministic risk layer

```text
PortfolioSnapshot
       ↓
Risk Signal Provider
       ↓
Risk Engine
       ↓
AssetRiskAssessment
       ↓
PortfolioRiskAssessment
```

Risk imports immutable Phase 3 portfolio types; portfolio does not import risk. Five normalized factors come from an explicitly demo-only provider and concentration comes from Phase 3 allocation. Provider loading is separated from pure integer scoring. Incomplete valuation or signal coverage cannot produce a complete score.

## Intended later architecture

```text
User -> Wallet -> Portfolio Engine -> Market/Oracle Data
     -> Deterministic Risk Engine -> AI Agent -> Adaptation Engine
     -> Rebalance Proposal -> Policy Validation -> Execution Router
     -> Adaptive Vault -> X Layer
```

The deterministic risk engine operates independently of the LLM. AI recommendations must become structured proposals and pass onchain policy validation before execution. Blockchain state is authoritative for ownership, balances, financial policy, and executed transactions; backend records and AI output cannot override it. The vault is multi-asset, does not use ERC-4626, and issues no shares.
# Phase 5 MARA flow

```text
X Layer -> Portfolio Readers -> PortfolioSnapshot
        -> Deterministic Risk Engine -> PortfolioRiskAssessment
        -> MARA Context Builder -> OpenAI Responses API
        -> Strict Structured Output -> Application Post-Validation
        -> Advisory MARA UI
```

Dependencies remain `portfolio -> risk -> mara`; Portfolio and Risk do not import MARA. LLM interpretation is non-deterministic and advisory, while upstream facts remain authoritative.

## Phase 6 Financial Constitution

```text
PortfolioSnapshot -> Financial Constitution Compliance

AdaptiveVault -> Onchain Constitution Reader
              -> Financial Constitution UI
              -> Owner-signed policy update
```

The constitution module depends on portfolio/catalog facts; portfolio, risk, and MARA do not depend on constitution. Existing `AdaptiveVault.policy` is canonical when a vault exists. Reads are direct and pinned to one X Layer block without Multicall3. Drafts are local and non-authoritative. The sole write is the explicit owner-wallet `setPolicy` call after validation and confirmation.

## Phase 7 deterministic adaptation

```text
PortfolioSnapshot + Risk Assessment + MARA Advisory
       + Active Onchain Constitution
       ↓
Deterministic Adaptation Engine
       ↓
Validated Allocation Plan
       ↓
NO EXECUTION IN PHASE 7
```

The engine creates at most one exact-BPS donor-to-receiver allocation simulation. It has no signer, wallet client, transaction, token quantity, calldata, route, or execution authority.

Future only, not implemented: `Validated Allocation Plan -> future execution validation -> future permitted X Layer transaction`.

## Phase 8 Sentinel

```text
Demo/non-live event observations
       -> Sentinel validation and corroboration
       -> deterministic event stress
       -> Phase 4 risk engine
       -> MARA (explicit user action)
       -> Phase 7 deterministic simulation (explicit user action)
```

Sentinel has no wallet, signer, contract, transaction, MARA-call, or adaptation-plan authority.

## Phase 9 Yield Intelligence

```text
Authoritative vault PortfolioSnapshot
       -> canonical demo yield terms
       -> user-triggered deterministic compounding simulation
       -> token-unit projection (execution authority: none)
```

Yield Intelligence is a side simulation only. It never writes a projected balance back into the current portfolio and never fabricates future chain state. It is independent of Risk, Sentinel, MARA, the Financial Constitution, and Adaptation state.
# Phase 13C observation boundary

The production-shaped valuation and observation design is documented in `docs/PHASE_13C_OBSERVATION.md`. On-chain valuation is authoritative; off-chain market/news/RWA inputs are non-authoritative evidence and cannot directly reach execution.
