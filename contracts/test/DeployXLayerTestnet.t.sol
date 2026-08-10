// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeployXLayerTestnet} from "../script/DeployXLayerTestnet.s.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract DeployXLayerTestnetHarness is DeployXLayerTestnet {
    function deployLocal(address initialHolder, address officialUsdt0) external returns (Deployment memory) {
        return _deploy(address(this), initialHolder, officialUsdt0);
    }
}

contract DeployXLayerTestnetTest is Test {
    function testLocalDeploymentUsesExpectedRegistryFactoryAndTokenConfiguration() public {
        MockERC20 officialUsdt0 = new MockERC20("Official Test USD0", "USD0");
        DeployXLayerTestnetHarness script = new DeployXLayerTestnetHarness();
        DeployXLayerTestnet.Deployment memory deployment = script.deployLocal(address(this), address(officialUsdt0));

        assertTrue(deployment.registry.isSupported(address(officialUsdt0)));
        assertTrue(deployment.registry.isSupported(address(deployment.strsy)));
        assertTrue(deployment.registry.isSupported(address(deployment.sxau)));
        assertTrue(deployment.registry.isSupported(address(deployment.saaplx)));
        assertEq(
            uint256(deployment.registry.getAssetConfig(address(officialUsdt0)).baselineRiskTier),
            uint256(IAssetRegistry.RiskTier.Reserve)
        );
        assertEq(
            uint256(deployment.registry.getAssetConfig(address(deployment.strsy)).baselineRiskTier),
            uint256(IAssetRegistry.RiskTier.Defensive)
        );
        assertEq(
            uint256(deployment.registry.getAssetConfig(address(deployment.sxau)).baselineRiskTier),
            uint256(IAssetRegistry.RiskTier.Balanced)
        );
        assertEq(
            uint256(deployment.registry.getAssetConfig(address(deployment.saaplx)).baselineRiskTier),
            uint256(IAssetRegistry.RiskTier.Aggressive)
        );
        assertEq(address(deployment.factory.assetRegistry()), address(deployment.registry));
        assertEq(deployment.strsy.balanceOf(address(this)), 1_000_000 ether);
    }

    function testDemoVaultRolesUseOwnerAsGuardianAndNoExecutor() public {
        MockERC20 officialUsdt0 = new MockERC20("Official Test USD0", "USD0");
        DeployXLayerTestnetHarness script = new DeployXLayerTestnetHarness();
        DeployXLayerTestnet.Deployment memory deployment = script.deployLocal(address(this), address(officialUsdt0));

        address vaultAddress = deployment.factory.createVault(address(this), address(0));
        AdaptiveVault vault = AdaptiveVault(payable(vaultAddress));
        assertEq(vault.owner(), address(this));
        assertEq(vault.guardian(), address(this));
        assertEq(vault.agentExecutor(), address(0));
        assertEq(address(vault.assetRegistry()), address(deployment.registry));
    }

    function testDeploymentRejectsZeroDeployerAndAddressWithoutCode() public {
        DeployXLayerTestnetHarness script = new DeployXLayerTestnetHarness();
        MockERC20 officialUsdt0 = new MockERC20("Official Test USD0", "USD0");
        vm.expectRevert("initial holder is zero");
        script.deployLocal(address(0), address(officialUsdt0));
        vm.expectRevert("official test USD0 has no code");
        script.deployLocal(address(this), makeAddr("eoa"));
    }
}
