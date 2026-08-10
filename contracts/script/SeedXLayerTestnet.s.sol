// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";

/// @notice Optional Phase 12B seed script using only approve and the vault's narrow deposit API.
/// @dev At fixed demo references USD0=$1, sTRSY=$100, sXAU=$2,000, and sAAPLx=$200,
///      each scale unit represents $10 and preserves the 40/30/20/10 allocation exactly.
contract SeedXLayerTestnet is Script {
    address internal constant OFFICIAL_USDT0 = 0x9e29b3AaDa05Bf2D2c827Af80Bd28Dc0b9b4FB0c;

    function run() external {
        require(block.chainid == 1952, "wrong chain: expected 1952");
        AdaptiveVault vault = AdaptiveVault(payable(vm.envAddress("DEMO_VAULT_ADDRESS")));
        address demoOwner = vm.envAddress("DEMO_OWNER_ADDRESS");
        uint256 scaleMultiplier = vm.envUint("SEED_SCALE_MULTIPLIER");
        require(scaleMultiplier != 0, "SEED_SCALE_MULTIPLIER is zero");
        address[4] memory assets = [
            vm.envAddress("TEST_USDT0_ADDRESS"),
            vm.envAddress("STRSY_ADDRESS"),
            vm.envAddress("SXAU_ADDRESS"),
            vm.envAddress("SAAPLX_ADDRESS")
        ];
        uint256[4] memory amounts = seedAmounts(scaleMultiplier);
        _seed(vault, demoOwner, assets, amounts);
    }

    function seedAmounts(uint256 scaleMultiplier) public pure returns (uint256[4] memory) {
        require(scaleMultiplier != 0, "SEED_SCALE_MULTIPLIER is zero");
        return [
            uint256(4e6) * scaleMultiplier,
            uint256(0.03 ether) * scaleMultiplier,
            uint256(0.001 ether) * scaleMultiplier,
            uint256(0.005 ether) * scaleMultiplier
        ];
    }

    function _validateSeed(AdaptiveVault vault, address demoOwner, address[4] memory assets, uint256[4] memory amounts)
        internal
        view
    {
        require(address(vault).code.length != 0, "vault has no code");
        require(demoOwner != address(0), "DEMO_OWNER_ADDRESS is zero");
        require(vault.owner() == demoOwner, "demo owner does not own vault");
        require(assets[0] == OFFICIAL_USDT0, "USD0 address is not canonical");
        require(!vault.paused(), "vault is paused");
        IAssetRegistry registry = vault.assetRegistry();
        for (uint256 i; i < assets.length; ++i) {
            require(assets[i] != address(0), "asset is zero");
            for (uint256 j = i + 1; j < assets.length; ++j) {
                require(assets[i] != assets[j], "duplicate asset address");
            }
            require(assets[i].code.length != 0, "asset has no code");
            require(registry.isSupported(assets[i]), "asset is unsupported");
            IAssetRegistry.AssetConfig memory config = registry.getAssetConfig(assets[i]);
            require(config.baselineRiskTier == _expectedTier(i), "asset baseline tier mismatch");
            uint8 expectedDecimals = i == 0 ? 6 : 18;
            require(IERC20Metadata(assets[i]).decimals() == expectedDecimals, "asset decimals mismatch");
            require(IERC20(assets[i]).balanceOf(demoOwner) >= amounts[i], "owner funding is insufficient");
        }
    }

    function _seed(AdaptiveVault vault, address demoOwner, address[4] memory assets, uint256[4] memory amounts)
        internal
    {
        _validateSeed(vault, demoOwner, assets, amounts);
        vm.startBroadcast(demoOwner);
        for (uint256 i; i < assets.length; ++i) {
            IERC20(assets[i]).approve(address(vault), amounts[i]);
            vault.deposit(assets[i], amounts[i]);
        }
        vm.stopBroadcast();
    }

    function _expectedTier(uint256 index) private pure returns (IAssetRegistry.RiskTier) {
        if (index == 0) return IAssetRegistry.RiskTier.Reserve;
        if (index == 1) return IAssetRegistry.RiskTier.Defensive;
        if (index == 2) return IAssetRegistry.RiskTier.Balanced;
        return IAssetRegistry.RiskTier.Aggressive;
    }
}
