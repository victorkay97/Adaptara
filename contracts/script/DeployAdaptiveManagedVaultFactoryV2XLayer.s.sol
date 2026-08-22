// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AdaptiveManagedVaultFactoryV2} from "../src/AdaptiveManagedVaultFactoryV2.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {IProtocolAdapterRegistry} from "../src/interfaces/IProtocolAdapterRegistry.sol";

/// @notice Deploys only the additive V2 discovery factory. Requires separate human broadcast authorization.
contract DeployAdaptiveManagedVaultFactoryV2XLayer is Script {
    uint256 internal constant XLAYER_MAINNET_CHAIN_ID = 196;
    uint32 internal constant MAXIMUM_VALUATION_AGE = 90_000;
    address internal constant ASSET_REGISTRY = 0xd211E4d1e1049d800d5360A078d52B0fcDD74684;
    address internal constant VALUATION_PROVIDER = 0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc;
    address internal constant PROTOCOL_ADAPTER_REGISTRY = 0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A;

    function run() external returns (AdaptiveManagedVaultFactoryV2 deployed) {
        require(block.chainid == XLAYER_MAINNET_CHAIN_ID, "WRONG_CHAIN");
        require(ASSET_REGISTRY.code.length != 0, "ASSET_REGISTRY_MISSING");
        require(VALUATION_PROVIDER.code.length != 0, "VALUATION_PROVIDER_MISSING");
        require(PROTOCOL_ADAPTER_REGISTRY.code.length != 0, "PROTOCOL_REGISTRY_MISSING");
        vm.startBroadcast();
        deployed = new AdaptiveManagedVaultFactoryV2(
            IAssetRegistry(ASSET_REGISTRY),
            IAdaptaraValuationProvider(VALUATION_PROVIDER),
            IProtocolAdapterRegistry(PROTOCOL_ADAPTER_REGISTRY),
            MAXIMUM_VALUATION_AGE
        );
        vm.stopBroadcast();
        require(address(deployed.assetRegistry()) == ASSET_REGISTRY, "ASSET_REGISTRY_MISMATCH");
        require(address(deployed.valuationProvider()) == VALUATION_PROVIDER, "VALUATION_PROVIDER_MISMATCH");
        require(address(deployed.protocolAdapterRegistry()) == PROTOCOL_ADAPTER_REGISTRY, "PROTOCOL_REGISTRY_MISMATCH");
    }
}
