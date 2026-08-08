// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {AdaptiveVaultFactory} from "../src/AdaptiveVaultFactory.sol";

contract AdaptiveVaultFactoryTest is Test {
    AssetRegistry internal registry;
    AdaptiveVaultFactory internal factory;
    address internal owner = makeAddr("owner");
    address internal guardian = makeAddr("guardian");
    address internal agent = makeAddr("agent");

    function setUp() public {
        registry = new AssetRegistry(1 days, address(this));
        factory = new AdaptiveVaultFactory(registry);
    }

    function testCreatesAndIndexesVaultWithExpectedConfiguration() public {
        vm.expectEmit(true, false, true, false, address(factory));
        emit AdaptiveVaultFactory.VaultCreated(owner, address(0), guardian, agent);
        vm.prank(owner);
        address vaultAddress = factory.createVault(guardian, agent);
        AdaptiveVault vault = AdaptiveVault(payable(vaultAddress));

        assertEq(vault.owner(), owner);
        assertEq(vault.guardian(), guardian);
        assertEq(vault.agentExecutor(), agent);
        assertEq(address(vault.assetRegistry()), address(registry));
        assertEq(factory.vaultOf(owner), vaultAddress);
        assertTrue(factory.isVault(vaultAddress));
    }

    function testDuplicateOwnerVaultReverts() public {
        vm.startPrank(owner);
        address vault = factory.createVault(guardian, agent);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVaultFactory.VaultAlreadyExists.selector, owner, vault));
        factory.createVault(address(0), address(0));
        vm.stopPrank();
    }

    function testArbitraryAccountCannotConsumeAnotherUsersVaultSlot() public {
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        address attackerVault = factory.createVault(address(0), address(0));

        assertEq(factory.vaultOf(owner), address(0));
        assertEq(factory.vaultOf(attacker), attackerVault);

        vm.prank(owner);
        address ownerVault = factory.createVault(guardian, agent);
        assertEq(factory.vaultOf(owner), ownerVault);
        assertEq(AdaptiveVault(payable(ownerVault)).owner(), owner);
    }

    function testZeroRegistryReverts() public {
        vm.expectRevert(AdaptiveVaultFactory.ZeroAddress.selector);
        new AdaptiveVaultFactory(AssetRegistry(address(0)));
    }

    function testOptionalGuardianAndExecutorMayBeZero() public {
        vm.prank(owner);
        address vaultAddress = factory.createVault(address(0), address(0));
        AdaptiveVault vault = AdaptiveVault(payable(vaultAddress));
        assertEq(vault.guardian(), address(0));
        assertEq(vault.agentExecutor(), address(0));
    }

    function testVaultOwnershipApiCannotDivergeFactoryMapping() public {
        vm.prank(owner);
        address vaultAddress = factory.createVault(guardian, agent);
        AdaptiveVault vault = AdaptiveVault(payable(vaultAddress));

        vm.expectRevert(AdaptiveVault.OwnershipTransferDisabled.selector);
        vm.prank(owner);
        vault.transferOwnership(makeAddr("newOwner"));

        vm.expectRevert(AdaptiveVault.OwnershipRenunciationDisabled.selector);
        vm.prank(owner);
        vault.renounceOwnership();

        assertEq(vault.owner(), owner);
        assertEq(factory.vaultOf(owner), vaultAddress);
    }
}
