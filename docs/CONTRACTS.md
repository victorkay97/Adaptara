# Phase 2 Contracts

## `AdaptiveManagedVaultFactoryV2` (local, not deployed)

The additive V2 factory reuses `AdaptiveManagedVaultV1`, fixes shared dependencies immutably, always creates with `executor = address(0)`, caps owners at 16 Vaults, exposes bounded enumeration and provenance, and emits indexed owner/Vault/index creation evidence. A factory-bound `AdaptiveManagedVaultDeployerV2` holds the reused Vault V1 creation code so both deployed runtimes remain below EIP-170; it rejects every caller except its immutable factory. Neither component has proxy, implementation-selection, shared-configuration mutation, or post-creation Vault authority.

## `AdaptiveManagedVaultV1` (Phase 13B, local/test only)

The new versioned vault combines isolated custody with one typed swap pathway. Advisory permits no agent execution. Approval Required permits only an owner-originated swap, while Adaptive permits only the current restricted executor and requires autonomous management to be enabled and unpaused. Both paths enter the same internal policy and execution pipeline; owner approval never bypasses validation.

Managed assets form an owner-controlled append-only array bounded at 32 entries, so an executor cannot omit a holding from post-state validation. Adapters form an owner-controlled allowlist bounded at 16. The registry and valuation provider are immutable. There is no generic target/bytes call, delegatecall, executor withdrawal, or executor configuration function.

The vault approves exactly `amountIn`, invokes `IAdaptaraAdapter.swap`, resets allowance, and verifies actual input and output balance deltas. It rejects fee-on-transfer input behavior, output below the typed minimum, and adapter return values inconsistent with actual output. It then evaluates all managed balances with fresh provider values and `AssetRegistry.baselineRiskTier`, enforcing reserve, per-asset, and aggressive limits atomically.

No factory or deployment script creates this contract in Phase 13B.

## `AutonomousMandateV1` (Phase 13A, not deployed)

This additive contract binds to one existing `AdaptiveVault` through a minimal typed authority interface. It stores owner-configured management mode, emergency pause, bounded asset/adapter allowlists, and execution-policy fields. The current vault executor may reserve only a typed, fresh, allowlisted swap intent while Adaptive mode is enabled and both layers are unpaused. Reservation prevents replay and accounts daily turnover; it performs no token, vault, or adapter call.

`IAdaptaraAdapter` defines the typed swap boundary without arbitrary calldata. It is not invoked by Phase 13A; Phase 13B invokes it only from the versioned local/test managed vault. Deployment manifests, scripts, factory behavior, and the live vault remain unchanged.

All Phase 2 contracts are non-upgradeable and compiled with Solidity 0.8.28. They implement custody and authorization boundaries only; no component performs trading, valuation, oracle access, or AI-driven execution.

## `AssetRegistry`

The shared registry identifies deployed token contracts accepted by normal vault deposits and stores each asset's typed `baselineRiskTier`: Reserve, Defensive, Balanced, or Aggressive. This is immutable starting/product metadata, not the future Risk Engine's dynamic `currentRiskTier`. Its single delayed default administrator may register a contract address once and later disable it. EOAs and zero addresses are rejected. Disabled assets cannot be deposited normally. Registration cannot be overwritten or reused to change the baseline tier.

Privileged functions: `registerAsset` and `disableAsset`, both restricted to `DEFAULT_ADMIN_ROLE`. Default-admin replacement follows OpenZeppelin's delayed two-step rules. MARA and vault executors receive no registry role.

## `AdaptiveVaultFactory`

The factory deploys and indexes at most one vault for each caller. `createVault(guardian, agentExecutor)` derives the owner from `msg.sender`, preventing third parties from consuming another user's slot. It records `vaultOf(owner)` and `isVault(vault)` only during actual creation. Guardian and executor are optional and may deliberately be zero. The shared registry reference must be nonzero and is immutable.

The factory never custodies tokens and has no authority over deployed vaults, their policy, or their roles.

## `AdaptiveVault`

Each vault is an isolated multi-ERC-20 custody boundary for one owner. It issues no shares, does not use ERC-4626, and has no generic call, delegatecall, approval, or execution interface.

Normal `deposit` requires a registry-supported asset, a nonzero amount, and an unpaused vault. `withdraw` is owner-only and limited to supported assets. `recoverToken` is owner-only and supports disabled or unsupported ERC-20s so accidental direct transfers cannot become trapped; currently supported assets must use `withdraw`. Both owner outflow functions remain available while paused. Direct native-currency transfers are rejected; `recoverNativeCurrency` lets only the owner recover a forced balance using OpenZeppelin `Address.sendValue`.

The owner may set or revoke the future agent executor and guardian, update policy storage, pause, and unpause. A guardian may only pause. Guardian may equal owner because it adds no new privilege. Every nonzero executor must differ from owner and guardian, and the executor has no privileged Phase 2 callable operation. Ownership transfer and renunciation are disabled so the factory mapping remains authoritative and assets cannot be abandoned. Any later ownership-transfer feature must be an atomic, factory-aware protocol.

All token transfers use `SafeERC20` and are protected by `ReentrancyGuard`. The vault maintains no shadow balance; token contract balances are authoritative.

## Policy storage

Each vault stores four owner-controlled basis-point values, each independently constrained to `0..10,000`:

- `minimumReserveBps`
- `maximumSingleAssetExposureBps`
- `maximumAggressiveExposureBps`
- `maximumDailyReallocationBps`

Phase 2 stores and emits policy but does not pretend to enforce allocation percentages without price/oracle infrastructure. Later execution paths must read these onchain values and enforce them deterministically.
