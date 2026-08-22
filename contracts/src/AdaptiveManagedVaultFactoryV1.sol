// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AdaptiveManagedVaultV1} from "./AdaptiveManagedVaultV1.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "./interfaces/IAdaptaraValuationProvider.sol";
import {IProtocolAdapterRegistry} from "./interfaces/IProtocolAdapterRegistry.sol";

/// @notice Additive one-managed-vault-per-owner discovery; legacy factory remains unchanged.
contract AdaptiveManagedVaultFactoryV1 {
    error ZeroAddress();
    error ManagedVaultAlreadyExists(address owner, address vault);
    event ManagedVaultCreated(address indexed owner, address indexed vault, address guardian, address executor);

    IAssetRegistry public immutable assetRegistry;
    IAdaptaraValuationProvider public immutable valuationProvider;
    IProtocolAdapterRegistry public immutable protocolAdapterRegistry;
    uint32 public immutable maximumValuationAge;
    mapping(address => address) public managedVaultOf;
    mapping(address => bool) public isManagedVault;

    constructor(
        IAssetRegistry registry,
        IAdaptaraValuationProvider provider,
        IProtocolAdapterRegistry adapters,
        uint32 maxAge
    ) {
        if (address(registry) == address(0) || address(provider) == address(0) || address(adapters) == address(0)) revert ZeroAddress();
        assetRegistry = registry;
        valuationProvider = provider;
        protocolAdapterRegistry = adapters;
        maximumValuationAge = maxAge;
    }

    function createManagedVault(address guardian, address executor) external returns (address vault) {
        address existing = managedVaultOf[msg.sender];
        if (existing != address(0)) revert ManagedVaultAlreadyExists(msg.sender, existing);
        vault = address(
            new AdaptiveManagedVaultV1(
                msg.sender,
                guardian,
                executor,
                assetRegistry,
                valuationProvider,
                protocolAdapterRegistry,
                maximumValuationAge
            )
        );
        managedVaultOf[msg.sender] = vault;
        isManagedVault[vault] = true;
        emit ManagedVaultCreated(msg.sender, vault, guardian, executor);
    }
}
