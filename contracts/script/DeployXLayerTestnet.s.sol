// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AdaptiveVaultFactory} from "../src/AdaptiveVaultFactory.sol";
import {SandboxAssetToken} from "../src/SandboxAssetToken.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @notice Phase 12B deployment script. Phase 12A validates it without --broadcast.
contract DeployXLayerTestnet is Script {
    uint256 internal constant XLAYER_TESTNET_CHAIN_ID = 1952;
    address internal constant TEST_USDT0 = 0x9e29b3AaDa05Bf2D2c827Af80Bd28Dc0b9b4FB0c;
    uint48 internal constant ADMIN_TRANSFER_DELAY = 1 days;
    uint256 internal constant SANDBOX_SUPPLY = 1_000_000 ether;

    struct Deployment {
        AssetRegistry registry;
        SandboxAssetToken strsy;
        SandboxAssetToken sxau;
        SandboxAssetToken saaplx;
        AdaptiveVaultFactory factory;
    }

    function run() external returns (Deployment memory deployment) {
        require(block.chainid == XLAYER_TESTNET_CHAIN_ID, "wrong chain: expected 1952");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        require(deployer != address(0), "DEPLOYER_ADDRESS is zero");
        require(TEST_USDT0.code.length != 0, "official test USD0 has no code");
        require(IERC20Metadata(TEST_USDT0).decimals() == 6, "official test USD0 decimals mismatch");
        vm.startBroadcast(deployer);
        deployment = _deploy(deployer, deployer, TEST_USDT0);
        vm.stopBroadcast();
        _log(deployment);
    }

    function _deploy(address registryAdmin, address initialHolder, address officialUsdt0)
        internal
        returns (Deployment memory deployment)
    {
        require(registryAdmin != address(0), "registry admin is zero");
        require(initialHolder != address(0), "initial holder is zero");
        require(officialUsdt0.code.length != 0, "official test USD0 has no code");
        deployment.registry = new AssetRegistry(ADMIN_TRANSFER_DELAY, registryAdmin);
        deployment.strsy =
            new SandboxAssetToken("Adaptara Sandbox Treasury Exposure", "sTRSY", initialHolder, SANDBOX_SUPPLY);
        deployment.sxau = new SandboxAssetToken("Adaptara Sandbox Gold Exposure", "sXAU", initialHolder, SANDBOX_SUPPLY);
        deployment.saaplx =
            new SandboxAssetToken("Adaptara Sandbox Apple Exposure", "sAAPLx", initialHolder, SANDBOX_SUPPLY);
        deployment.registry.registerAsset(officialUsdt0, IAssetRegistry.RiskTier.Reserve);
        deployment.registry.registerAsset(address(deployment.strsy), IAssetRegistry.RiskTier.Defensive);
        deployment.registry.registerAsset(address(deployment.sxau), IAssetRegistry.RiskTier.Balanced);
        deployment.registry.registerAsset(address(deployment.saaplx), IAssetRegistry.RiskTier.Aggressive);
        deployment.factory = new AdaptiveVaultFactory(deployment.registry);
    }

    function _log(Deployment memory deployment) private view {
        console2.log("AssetRegistry", address(deployment.registry));
        console2.log("sTRSY", address(deployment.strsy));
        console2.log("sXAU", address(deployment.sxau));
        console2.log("sAAPLx", address(deployment.saaplx));
        console2.log("AdaptiveVaultFactory", address(deployment.factory));
        console2.log("Rerunning with --broadcast creates a separate deployment.");
    }
}
