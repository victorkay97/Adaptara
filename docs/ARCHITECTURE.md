# Architecture

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

## Intended later architecture

```text
User -> Wallet -> Portfolio Engine -> Market/Oracle Data
     -> Deterministic Risk Engine -> AI Agent -> Adaptation Engine
     -> Rebalance Proposal -> Policy Validation -> Execution Router
     -> Adaptive Vault -> X Layer
```

The deterministic risk engine operates independently of the LLM. AI recommendations must become structured proposals and pass onchain policy validation before execution. Blockchain state is authoritative for ownership, balances, financial policy, and executed transactions; backend records and AI output cannot override it. The vault is multi-asset, does not use ERC-4626, and issues no shares.
