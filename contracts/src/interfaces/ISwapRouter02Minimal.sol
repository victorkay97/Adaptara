// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice SwapRouter02 v1.1.0 V3 single-hop boundary. This ABI intentionally has no deadline field.
interface ISwapRouter02Minimal {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
