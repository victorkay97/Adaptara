// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAssetRegistry {
    enum RiskTier {
        Reserve,
        Defensive,
        Balanced,
        Aggressive
    }

    struct AssetConfig {
        bool supported;
        RiskTier baselineRiskTier;
    }

    function isSupported(address asset) external view returns (bool);

    function getAssetConfig(address asset) external view returns (AssetConfig memory);
}
