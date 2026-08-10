# Architecture

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
