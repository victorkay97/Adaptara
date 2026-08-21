// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Typed swap-only adapter boundary. It deliberately accepts no arbitrary calldata.
interface IAdaptaraAdapter {
    struct SwapRequest {
        address vault;
        address assetIn;
        address assetOut;
        uint256 amountIn;
        uint256 minimumAmountOut;
        uint64 deadline;
        bytes32 intentId;
    }

    /// @dev The calling vault independently verifies actual balance deltas and post-action policy.
    function swap(SwapRequest calldata request) external returns (uint256 actualAmountOut);
}
