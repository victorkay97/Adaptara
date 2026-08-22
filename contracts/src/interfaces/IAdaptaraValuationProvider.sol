// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Narrow onchain valuation boundary. Phase 13B uses local test implementations only.
interface IAdaptaraValuationProvider {
    struct Valuation {
        uint256 priceE18;
        uint64 updatedAt;
        bool valid;
    }

    function getValuation(address asset) external view returns (Valuation memory);
}
