// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract AssetRegistryTest is Test {
    AssetRegistry internal registry;
    address internal admin = makeAddr("admin");
    address internal agent = makeAddr("agent");
    address internal asset;

    function setUp() public {
        registry = new AssetRegistry(2 days, admin);
        asset = address(new MockERC20("Registry Test Token", "RTT"));
    }

    function testAdminRegistersAssetAndConfigurationIsQueryable() public {
        vm.expectEmit(true, true, false, true, address(registry));
        emit AssetRegistry.AssetRegistered(asset, IAssetRegistry.RiskTier.Defensive);
        vm.prank(admin);
        registry.registerAsset(asset, IAssetRegistry.RiskTier.Defensive);

        assertTrue(registry.isSupported(asset));
        IAssetRegistry.AssetConfig memory config = registry.getAssetConfig(asset);
        assertTrue(config.supported);
        assertEq(uint256(config.baselineRiskTier), uint256(IAssetRegistry.RiskTier.Defensive));
    }

    function testNonAdminAndAgentCannotRegisterAsset() public {
        vm.expectRevert();
        vm.prank(agent);
        registry.registerAsset(asset, IAssetRegistry.RiskTier.Reserve);
    }

    function testAdminDisablesAsset() public {
        vm.startPrank(admin);
        registry.registerAsset(asset, IAssetRegistry.RiskTier.Balanced);
        vm.expectEmit(true, false, false, true, address(registry));
        emit AssetRegistry.AssetDisabled(asset);
        registry.disableAsset(asset);
        vm.stopPrank();

        assertFalse(registry.isSupported(asset));
    }

    function testRegisterZeroAddressReverts() public {
        vm.expectRevert(AssetRegistry.ZeroAddress.selector);
        vm.prank(admin);
        registry.registerAsset(address(0), IAssetRegistry.RiskTier.Reserve);
    }

    function testRegisterEoaReverts() public {
        address eoa = makeAddr("eoa");
        vm.expectRevert(abi.encodeWithSelector(AssetRegistry.AssetHasNoCode.selector, eoa));
        vm.prank(admin);
        registry.registerAsset(eoa, IAssetRegistry.RiskTier.Reserve);
    }

    function testDuplicateRegistrationRevertsEvenAfterDisable() public {
        vm.startPrank(admin);
        registry.registerAsset(asset, IAssetRegistry.RiskTier.Reserve);
        registry.disableAsset(asset);
        vm.expectRevert(abi.encodeWithSelector(AssetRegistry.AssetAlreadyRegistered.selector, asset));
        registry.registerAsset(asset, IAssetRegistry.RiskTier.Aggressive);
        vm.stopPrank();
    }

    function testDisablingUnknownAssetReverts() public {
        vm.expectRevert(abi.encodeWithSelector(AssetRegistry.AssetNotRegistered.selector, asset));
        vm.prank(admin);
        registry.disableAsset(asset);
    }

    function testAgentCannotDisableAssetOrChangeRegistryAdmin() public {
        vm.prank(admin);
        registry.registerAsset(asset, IAssetRegistry.RiskTier.Reserve);

        vm.expectRevert();
        vm.prank(agent);
        registry.disableAsset(asset);

        vm.expectRevert();
        vm.prank(agent);
        registry.beginDefaultAdminTransfer(agent);
    }
}
