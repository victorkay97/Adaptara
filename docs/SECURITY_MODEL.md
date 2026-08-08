# Security Model

AI is untrusted and may be mistaken, manipulated, or compromised. A backend is not sufficient authority over funds. Recommendations require typed proposals, deterministic validation, and contract-level policy enforcement. Users must explicitly confirm financial policy. Secrets remain server-only; testnet configuration fails closed when invalid.

## Rules for later contract phases

1. No arbitrary external-call function for the AI executor.
2. Agent executor follows least privilege.
3. Vault owner retains withdrawal and control authority.
4. Agent cannot change ownership.
5. Agent cannot change oracle configuration.
6. Agent cannot change financial policies.
7. Every rebalance is validated onchain.
8. Oracle staleness is checked.
9. Unsupported assets revert.
10. Emergency pause is implemented later.
11. Contracts remain non-upgradeable for the hackathon.
12. User vaults are isolated per user, not pooled.

Phase 1 is testnet-only, includes no management logic, and makes no production-security claim.
