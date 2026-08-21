// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AdaptiveManagedVaultV1} from "./AdaptiveManagedVaultV1.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "./interfaces/IAdaptaraValuationProvider.sol";
import {IProtocolAdapterRegistry} from "./interfaces/IProtocolAdapterRegistry.sol";

/// @notice Factory-bound creation helper that keeps Vault V1 creation code outside the V2 factory runtime.
contract AdaptiveManagedVaultDeployerV2 {
    error UnauthorizedCaller(address caller);

    address public immutable factory;
    IAssetRegistry public immutable assetRegistry;
    IAdaptaraValuationProvider public immutable valuationProvider;
    IProtocolAdapterRegistry public immutable protocolAdapterRegistry;
    uint32 public immutable maximumValuationAge;

    constructor(
        IAssetRegistry registry,
        IAdaptaraValuationProvider provider,
        IProtocolAdapterRegistry adapters,
        uint32 maxAge
    ) {
        factory = msg.sender;
        assetRegistry = registry;
        valuationProvider = provider;
        protocolAdapterRegistry = adapters;
        maximumValuationAge = maxAge;
    }

    function deploy(address owner, address guardian) external returns (address vault) {
        if (msg.sender != factory) revert UnauthorizedCaller(msg.sender);
        vault = address(
            new AdaptiveManagedVaultV1(
                owner,
                guardian,
                address(0),
                assetRegistry,
                valuationProvider,
                protocolAdapterRegistry,
                maximumValuationAge
            )
        );
    }
}
