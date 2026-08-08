# Intended Architecture

```text
User -> Wallet -> Portfolio Engine -> Market/Oracle Data
     -> Deterministic Risk Engine -> AI Agent -> Adaptation Engine
     -> Rebalance Proposal -> Policy Validation -> Execution Router
     -> Adaptive Vault -> X Layer
```

The deterministic risk engine operates independently of the LLM. AI recommendations must become structured proposals and pass onchain policy validation before execution. Blockchain state is authoritative for ownership, balances, financial policy, and executed transactions; backend records and AI output cannot override it. The future vault is multi-asset and not primarily ERC-4626. Phase 1 implements only chain and wallet foundations.
