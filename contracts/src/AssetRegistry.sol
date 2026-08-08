// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";

/// @notice Administrative allowlist of ERC-20 assets accepted by Adaptara vaults.
/// @dev The sole default admin is deliberately subject to OpenZeppelin's delayed two-step transfer rules.
contract AssetRegistry is AccessControlDefaultAdminRules, IAssetRegistry {
    error ZeroAddress();
    error AssetHasNoCode(address asset);
    error AssetAlreadyRegistered(address asset);
    error AssetNotRegistered(address asset);
    error AssetAlreadyDisabled(address asset);

    event AssetRegistered(address indexed asset, RiskTier indexed baselineRiskTier);
    event AssetDisabled(address indexed asset);

    mapping(address asset => AssetConfig config) private _assetConfigs;
    mapping(address asset => bool registered) private _registered;

    constructor(uint48 adminTransferDelay, address initialAdmin)
        AccessControlDefaultAdminRules(adminTransferDelay, initialAdmin)
    {}

    function registerAsset(address asset, RiskTier baselineRiskTier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (asset == address(0)) revert ZeroAddress();
        if (asset.code.length == 0) revert AssetHasNoCode(asset);
        if (_registered[asset]) revert AssetAlreadyRegistered(asset);

        _registered[asset] = true;
        _assetConfigs[asset] = AssetConfig({supported: true, baselineRiskTier: baselineRiskTier});
        emit AssetRegistered(asset, baselineRiskTier);
    }

    function disableAsset(address asset) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_registered[asset]) revert AssetNotRegistered(asset);
        if (!_assetConfigs[asset].supported) revert AssetAlreadyDisabled(asset);

        _assetConfigs[asset].supported = false;
        emit AssetDisabled(asset);
    }

    function isSupported(address asset) external view returns (bool) {
        return _assetConfigs[asset].supported;
    }

    function getAssetConfig(address asset) external view returns (AssetConfig memory) {
        if (!_registered[asset]) revert AssetNotRegistered(asset);
        return _assetConfigs[asset];
    }
}
