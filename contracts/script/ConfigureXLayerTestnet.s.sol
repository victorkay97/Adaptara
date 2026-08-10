// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {AdaptiveVaultFactory} from "../src/AdaptiveVaultFactory.sol";

/// @notice Phase 12B demo-vault creation. It deliberately does not set policy or seed balances.
contract ConfigureXLayerTestnet is Script {
    function run() external returns (address vault) {
        require(block.chainid == 1952, "wrong chain: expected 1952");
        address demoOwner = vm.envAddress("DEMO_OWNER_ADDRESS");
        AdaptiveVaultFactory factory = AdaptiveVaultFactory(vm.envAddress("ADAPTARA_FACTORY_ADDRESS"));
        vault = _configure(factory, demoOwner);
        console2.log("Demo vault", vault);
    }

    function _configure(AdaptiveVaultFactory factory, address demoOwner) internal returns (address vault) {
        _validateConfiguration(factory, demoOwner);
        vm.startBroadcast(demoOwner);
        vault = factory.createVault(demoOwner, address(0));
        vm.stopBroadcast();
        require(AdaptiveVault(payable(vault)).owner() == demoOwner, "broadcaster must equal demo owner");
    }

    function _validateConfiguration(AdaptiveVaultFactory factory, address demoOwner) internal view {
        require(demoOwner != address(0), "DEMO_OWNER_ADDRESS is zero");
        require(address(factory).code.length != 0, "factory has no code");
        require(factory.vaultOf(demoOwner) == address(0), "demo owner already has a vault");
    }
}
