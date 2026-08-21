# Multi-Vault V2 implementation status

Status: **deployed and post-deployment verified on X Layer Mainnet; frontend discovery activated read-only; public writes disabled**.

The confirmed factory is `0x98dE37855b85993C0cA6746b667BA01f2894efad`, deployed in transaction `0x6c407bc749b62565e4b8c1380605f036d35f6a178ebe9ee5fd63e083f6b5549c` at block `68,405,395`. Its factory-bound helper is `0x9550049F7896599630D6eE7D6D3E5F72b9A1DA0C`. Production discovery reads both the preserved V1 factory and this V2 factory; no creation or other public write path is enabled.

The deployed `AdaptiveManagedVaultFactoryV1` is one-Vault-per-owner. Its `managedVaultOf` mapping stores one address per owner and `createManagedVault` reverts with `ManagedVaultAlreadyExists` when that slot is populated. V1 must remain unchanged.

The recommended additive next phase is `AdaptiveManagedVaultFactoryV2` with:

- `mapping(address owner => address[] vaults)` plus `isManagedVault` membership;
- indexed `ManagedVaultCreated(owner, vault, ownerVaultIndex, guardian, executor)` events;
- bounded pagination (`vaultCount`, `vaultAt`, or paginated `vaultsOf`) rather than an unbounded production getter;
- the same immutable registry, valuation-provider, adapter-registry, and valuation-age dependencies;
- independent non-upgradeable Vault instances, each with its own owner, Constitution, mode, assets, and authority state;
- no custody, migration, or administrative authority over deployed V1 Vaults.

Frontend discovery should aggregate the existing V1 `managedVaultOf(owner)` result with V2 enumeration, deduplicate addresses, preserve factory/version provenance, and treat the Vault address as authoritative. User-friendly names should remain explicitly local/offchain metadata until a separately reviewed persistence design exists.

The Vault audit produced RESULT A: no new Vault custody implementation is required. V2 reuses `AdaptiveManagedVaultV1` and always supplies executor zero. The per-owner cap is 16. CREATE2 was rejected because indexed sequential deployment already supplies authoritative discovery while avoiding salt and collision complexity. Names remain non-persistent offchain display metadata keyed by Vault address.

Future V2 deployment can reference the six live shared contracts without changing the AssetRegistry, valuation provider, protocol registry, or V1 factory. The V2 factory itself is not an adapter and needs no registry entry.

Activity provenance is separated: factory/Vault logs are onchain authoritative; MARA and planner audit records are offchain; UI summaries are derived. A reverted Constitution violation cannot persist an onchain blocked event and must not be labelled as one.

Deployment used the dedicated `DeployAdaptiveManagedVaultFactoryV2XLayer.s.sol` script and referenced the existing live AssetRegistry, valuation provider, and protocol adapter registry. It deployed only the additive factory, whose constructor created its factory-bound creation helper; neither replaced or mutated an existing production contract. No production-admin or shared-governance transaction was required, and no shared registry/configuration mutation was part of V2 deployment. The frontend key is `NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS`; live-read-only production configuration resolves it to the verified factory while demo configuration remains unchanged unless explicitly overridden.
