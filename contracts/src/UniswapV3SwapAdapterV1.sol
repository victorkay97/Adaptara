// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAdaptaraAdapter} from "./interfaces/IAdaptaraAdapter.sol";
import {IUniswapV3FactoryMinimal} from "./interfaces/IUniswapV3FactoryMinimal.sol";
import {ISwapRouter02Minimal} from "./interfaces/ISwapRouter02Minimal.sol";

/// @notice Versioned, direct single-hop ERC-20 SwapRouter02 adapter for X Layer.
contract UniswapV3SwapAdapterV1 is IAdaptaraAdapter, AccessControlDefaultAdminRules, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant XLAYER_CHAIN_ID = 196;
    bytes32 public constant PAIR_ADMIN_ROLE = keccak256("PAIR_ADMIN_ROLE");

    ISwapRouter02Minimal public immutable swapRouter;
    IUniswapV3FactoryMinimal public immutable factory;
    uint256 public immutable deploymentChainId;
    mapping(bytes32 pairKey => uint24 fee) public pairFee;

    error ZeroAddress();
    error WrongChain(uint256 actual, uint256 expected);
    error UnauthorizedVault(address caller, address vault);
    error Expired(uint64 deadline, uint64 currentTime);
    error InvalidSwap();
    error UnsupportedPair(address tokenIn, address tokenOut);
    error PairAlreadyConfigured(address tokenIn, address tokenOut);
    error PoolMissing(address tokenIn, address tokenOut, uint24 fee);
    error ResidualCustody(address token, uint256 amount);

    event PairConfigured(address indexed tokenIn, address indexed tokenOut, uint24 fee, address indexed pool);

    constructor(address admin, ISwapRouter02Minimal router_, IUniswapV3FactoryMinimal factory_)
        AccessControlDefaultAdminRules(1 days, admin)
    {
        if (block.chainid != XLAYER_CHAIN_ID) revert WrongChain(block.chainid, XLAYER_CHAIN_ID);
        if (admin == address(0) || address(router_) == address(0) || address(factory_) == address(0)) {
            revert ZeroAddress();
        }
        if (address(router_).code.length == 0 || address(factory_).code.length == 0) revert ZeroAddress();
        swapRouter = router_;
        factory = factory_;
        deploymentChainId = XLAYER_CHAIN_ID;
        _grantRole(PAIR_ADMIN_ROLE, admin);
    }

    function configurePair(address tokenIn, address tokenOut, uint24 fee) external onlyRole(PAIR_ADMIN_ROLE) {
        if (tokenIn == address(0) || tokenOut == address(0) || tokenIn == tokenOut || fee == 0) revert InvalidSwap();
        bytes32 key = _pairKey(tokenIn, tokenOut);
        if (pairFee[key] != 0) revert PairAlreadyConfigured(tokenIn, tokenOut);
        address pool = factory.getPool(tokenIn, tokenOut, fee);
        if (pool == address(0) || pool.code.length == 0) revert PoolMissing(tokenIn, tokenOut, fee);
        pairFee[key] = fee;
        emit PairConfigured(tokenIn, tokenOut, fee, pool);
    }

    function swap(SwapRequest calldata request) external nonReentrant returns (uint256 actualAmountOut) {
        if (block.chainid != deploymentChainId) revert WrongChain(block.chainid, deploymentChainId);
        if (msg.sender != request.vault) revert UnauthorizedVault(msg.sender, request.vault);
        if (request.deadline < block.timestamp) revert Expired(request.deadline, uint64(block.timestamp));
        if (
            request.assetIn == address(0) || request.assetOut == address(0) || request.assetIn == request.assetOut
                || request.amountIn == 0 || request.minimumAmountOut == 0
        ) revert InvalidSwap();
        uint24 fee = pairFee[_pairKey(request.assetIn, request.assetOut)];
        if (fee == 0) revert UnsupportedPair(request.assetIn, request.assetOut);
        if (factory.getPool(request.assetIn, request.assetOut, fee) == address(0)) {
            revert PoolMissing(request.assetIn, request.assetOut, fee);
        }

        IERC20 tokenIn = IERC20(request.assetIn);
        IERC20 tokenOut = IERC20(request.assetOut);
        _requireNoCustody(tokenIn, request.assetIn);
        _requireNoCustody(tokenOut, request.assetOut);
        tokenIn.safeTransferFrom(request.vault, address(this), request.amountIn);
        tokenIn.forceApprove(address(swapRouter), request.amountIn);
        actualAmountOut = swapRouter.exactInputSingle(
            ISwapRouter02Minimal.ExactInputSingleParams({
                tokenIn: request.assetIn,
                tokenOut: request.assetOut,
                fee: fee,
                recipient: request.vault,
                amountIn: request.amountIn,
                amountOutMinimum: request.minimumAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        tokenIn.forceApprove(address(swapRouter), 0);
        uint256 residualInput = tokenIn.balanceOf(address(this));
        if (residualInput != 0) tokenIn.safeTransfer(request.vault, residualInput);
        uint256 residualOutput = tokenOut.balanceOf(address(this));
        if (residualOutput != 0) tokenOut.safeTransfer(request.vault, residualOutput);
        _requireNoCustody(tokenIn, request.assetIn);
        _requireNoCustody(tokenOut, request.assetOut);
    }

    function _requireNoCustody(IERC20 token, address tokenAddress) private view {
        uint256 balance = token.balanceOf(address(this));
        if (balance != 0) revert ResidualCustody(tokenAddress, balance);
    }

    function _pairKey(address tokenIn, address tokenOut) private pure returns (bytes32) {
        return keccak256(abi.encode(tokenIn, tokenOut));
    }
}
