// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AdaptiveManagedVaultFactoryV1} from "../src/AdaptiveManagedVaultFactoryV1.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {IAdaptaraAdapter} from "../src/interfaces/IAdaptaraAdapter.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";

contract RegistryMockProvider is IAdaptaraValuationProvider {
    function getValuation(address) external pure returns (Valuation memory) {
        return Valuation(1e18, 1, true);
    }
}

contract RegistryMockAdapter is IAdaptaraAdapter {
    function swap(SwapRequest calldata) external pure returns (uint256) {
        return 0;
    }
}

contract Phase13CRegistriesTest is Test {
    function testFactoryDiscoversOneManagedVaultPerOwnerWithoutChangingLegacyFactory() public {
        AssetRegistry assets = new AssetRegistry(1 days, address(this));
        RegistryMockProvider prices = new RegistryMockProvider();
        ProtocolAdapterRegistryV1 adapters = new ProtocolAdapterRegistryV1(1 days, address(this));
        AdaptiveManagedVaultFactoryV1 factory = new AdaptiveManagedVaultFactoryV1(assets, prices, adapters, 1 hours);
        address owner = makeAddr("owner");
        address guardian = makeAddr("guardian");
        address executor = makeAddr("executor");
        vm.prank(owner);
        address created = factory.createManagedVault(guardian, executor);
        assertEq(factory.managedVaultOf(owner), created);
        assertTrue(factory.isManagedVault(created));
        assertEq(AdaptiveManagedVaultV1(created).owner(), owner);
        assertEq(AdaptiveManagedVaultV1(created).guardian(), guardian);
        vm.expectRevert(
            abi.encodeWithSelector(AdaptiveManagedVaultFactoryV1.ManagedVaultAlreadyExists.selector, owner, created)
        );
        vm.prank(owner);
        factory.createManagedVault(address(0), address(0));
    }

    function testProtocolRegistrySeparatesAuditedSupportFromVaultEnablement() public {
        ProtocolAdapterRegistryV1 registry = new ProtocolAdapterRegistryV1(1 days, address(this));
        RegistryMockAdapter adapter = new RegistryMockAdapter();
        bytes32 kind = keccak256("swap");
        bytes32 version = keccak256("v1");
        registry.registerAdapter(address(adapter), kind, version);
        (bytes32 actualKind, bytes32 actualVersion, bool supported) = registry.adapterInfo(address(adapter));
        assertEq(actualKind, kind);
        assertEq(actualVersion, version);
        assertTrue(supported);
        registry.disableAdapter(address(adapter));
        (,, supported) = registry.adapterInfo(address(adapter));
        assertFalse(supported);
        RegistryMockAdapter second = new RegistryMockAdapter();
        vm.expectRevert();
        vm.prank(makeAddr("attacker"));
        registry.registerAdapter(address(second), kind, version);
    }
}
