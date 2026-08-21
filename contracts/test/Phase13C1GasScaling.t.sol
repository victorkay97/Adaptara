// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraAdapter} from "../src/interfaces/IAdaptaraAdapter.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ScalingPrices is IAdaptaraValuationProvider {
    function getValuation(address) external view returns (Valuation memory) {
        return Valuation(1e18, uint64(block.timestamp), true);
    }
}

contract ScalingAdapter is IAdaptaraAdapter {
    address immutable sink = address(0xdead);

    function swap(SwapRequest calldata r) external returns (uint256) {
        require(MockERC20(r.assetIn).transferFrom(r.vault, sink, r.amountIn), "input transfer");
        MockERC20(r.assetOut).mint(r.vault, r.amountIn);
        return r.amountIn;
    }
}

contract Phase13C1GasScalingTest is Test {
    address owner = makeAddr("owner");
    address executor = makeAddr("executor");
    event GasMeasured(uint256 indexed assets, bool indexed adaptive, uint256 gasUsed);

    function testGasScalingBothPaths() public {
        uint256[5] memory counts = [uint256(4), 8, 16, 24, 32];
        for (uint256 i; i < counts.length; ++i) {
            _measure(counts[i], false);
            _measure(counts[i], true);
        }
    }

    function _measure(uint256 count, bool adaptive) internal {
        AssetRegistry assets = new AssetRegistry(1 days, address(this));
        ScalingPrices prices = new ScalingPrices();
        ScalingAdapter adapter = new ScalingAdapter();
        ProtocolAdapterRegistryV1 adapters = new ProtocolAdapterRegistryV1(1 days, address(this));
        adapters.registerAdapter(address(adapter), keccak256("swap"), keccak256("v1"));
        AdaptiveManagedVaultV1 vault =
            new AdaptiveManagedVaultV1(owner, address(0), executor, assets, prices, adapters, 1 hours);
        MockERC20[] memory tokens = new MockERC20[](count);
        for (uint256 i; i < count; ++i) {
            tokens[i] = new MockERC20("Managed", "M");
            assets.registerAsset(
                address(tokens[i]), i == 0 ? IAssetRegistry.RiskTier.Reserve : IAssetRegistry.RiskTier.Balanced
            );
            vm.prank(owner);
            vault.addManagedAsset(address(tokens[i]));
            tokens[i].mint(address(vault), 100 ether);
        }
        vm.startPrank(owner);
        vault.setAllowedAdapter(address(adapter), true);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(0, 10_000, 10_000, 10_000));
        vault.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(10_000, 10_000, 100, 300, true));
        vault.setManagementMode(
            adaptive
                ? AdaptiveManagedVaultV1.ManagementMode.Adaptive
                : AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired
        );
        if (adaptive) vault.setAutonomousPaused(false);
        vm.stopPrank();
        AdaptiveManagedVaultV1.SwapIntent memory intent = AdaptiveManagedVaultV1.SwapIntent(
            address(tokens[1]),
            address(tokens[0]),
            address(adapter),
            1 ether,
            1 ether,
            uint64(block.timestamp + 60),
            keccak256(abi.encode(count, adaptive))
        );
        uint256 beforeGas = gasleft();
        vm.prank(adaptive ? executor : owner);
        if (adaptive) vault.executeAdaptiveSwap(intent);
        else vault.executeOwnerApprovedSwap(intent);
        emit GasMeasured(count, adaptive, beforeGas - gasleft());
        assertEq(tokens[1].allowance(address(vault), address(adapter)), 0);
    }
}
