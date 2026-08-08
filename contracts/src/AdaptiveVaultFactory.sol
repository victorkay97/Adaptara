// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AdaptiveVault} from "./AdaptiveVault.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";

/// @notice Creates and indexes one isolated vault per owner.
contract AdaptiveVaultFactory {
    error ZeroAddress();
    error VaultAlreadyExists(address owner, address vault);

    event VaultCreated(address indexed owner, address indexed vault, address indexed guardian, address agentExecutor);

    IAssetRegistry public immutable assetRegistry;
    mapping(address owner => address vault) public vaultOf;
    mapping(address vault => bool createdByFactory) public isVault;

    constructor(IAssetRegistry registry) {
        if (address(registry) == address(0)) revert ZeroAddress();
        assetRegistry = registry;
    }

    function createVault(address guardian, address agentExecutor) external returns (address vault) {
        address owner = msg.sender;
        address existingVault = vaultOf[owner];
        if (existingVault != address(0)) revert VaultAlreadyExists(owner, existingVault);

        vault = address(new AdaptiveVault(owner, guardian, agentExecutor, assetRegistry));
        vaultOf[owner] = vault;
        isVault[vault] = true;
        emit VaultCreated(owner, vault, guardian, agentExecutor);
    }
}
