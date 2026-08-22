// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAaveV3PoolMinimal} from "./interfaces/IAaveV3PoolMinimal.sol";
import {IAdaptaraYieldAdapter} from "./interfaces/IAdaptaraYieldAdapter.sol";

interface IAaveV3DataProviderMinimal {
    function getReserveConfigurationData(address asset)
        external
        view
        returns (uint256, uint256, uint256, uint256, uint256, bool, bool, bool, bool, bool);
    function getPaused(address asset) external view returns (bool);
    function getReserveCaps(address asset) external view returns (uint256, uint256);
}

/// @notice X Layer Aave V3 supply/withdraw-only adapter, pinned to one verified USDT reserve.
contract AaveV3YieldAdapterV1 is IAdaptaraYieldAdapter, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant XLAYER_CHAIN_ID = 196;
    address public constant AAVE_POOL = 0xE3F3Caefdd7180F884c01E57f65Df979Af84f116;
    address public constant USDT = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    address public constant AUSDT = 0xF356ae412dB5df43BD3a10746f7ad4e1C4De4297;
    address public constant DATA_PROVIDER = 0x6C505C31714f14e8af2A03633EB2Cdfb4959138F;

    address public immutable override underlying = USDT;
    address public immutable override aToken = AUSDT;
    IAaveV3PoolMinimal public immutable pool = IAaveV3PoolMinimal(AAVE_POOL);
    uint256 public immutable deploymentChainId;

    error WrongChain(uint256 actual, uint256 expected);
    error DeploymentMissing(address target);
    error UnauthorizedVault(address caller, address vault);
    error InvalidRequest();
    error Expired(uint64 deadline, uint64 currentTime);
    error ResidualCustody(address token, uint256 balance);
    error PositionDeltaMismatch(uint256 expected, uint256 actual);
    error NewSupplyUnavailable(uint256 requested, uint256 remainingCapacity);

    IAaveV3DataProviderMinimal public constant availability = IAaveV3DataProviderMinimal(DATA_PROVIDER);

    constructor() {
        if (block.chainid != XLAYER_CHAIN_ID) revert WrongChain(block.chainid, XLAYER_CHAIN_ID);
        if (AAVE_POOL.code.length == 0) revert DeploymentMissing(AAVE_POOL);
        if (USDT.code.length == 0) revert DeploymentMissing(USDT);
        if (AUSDT.code.length == 0) revert DeploymentMissing(AUSDT);
        deploymentChainId = block.chainid;
    }

    function supply(SupplyRequest calldata request) external nonReentrant returns (uint256 positionIncrease) {
        _validate(request.vault, request.underlying, request.amount, request.deadline);
        (bool available, uint256 remaining) = supplyAvailability(request.amount);
        if (!available) revert NewSupplyUnavailable(request.amount, remaining);
        IERC20 asset = IERC20(USDT);
        IERC20 position = IERC20(AUSDT);
        _requireZero(asset, USDT);
        _requireZero(position, AUSDT);
        uint256 beforePosition = position.balanceOf(request.vault);
        asset.safeTransferFrom(request.vault, address(this), request.amount);
        asset.forceApprove(AAVE_POOL, request.amount);
        pool.supply(USDT, request.amount, request.vault, 0);
        asset.forceApprove(AAVE_POOL, 0);
        positionIncrease = position.balanceOf(request.vault) - beforePosition;
        if (positionIncrease > request.amount || request.amount - positionIncrease > 1) {
            revert PositionDeltaMismatch(request.amount, positionIncrease);
        }
        _requireZero(asset, USDT);
        _requireZero(position, AUSDT);
    }

    function supplyAvailability(uint256 intendedAmount)
        public
        view
        returns (bool available, uint256 remainingCapacity)
    {
        (bool configured, uint256 decimals_) = _reserveCanSupply();
        if (!configured) return (false, 0);
        try availability.getReserveCaps(USDT) returns (uint256, uint256 supplyCap) {
            if (supplyCap == 0) return (true, type(uint256).max);
            uint256 cap = supplyCap * (10 ** decimals_);
            uint256 supplied = IERC20(AUSDT).totalSupply();
            if (supplied >= cap) return (false, 0);
            remainingCapacity = cap - supplied;
            return (intendedAmount <= remainingCapacity, remainingCapacity);
        } catch {
            return (false, 0);
        }
    }

    function _reserveCanSupply() private view returns (bool, uint256) {
        try availability.getReserveConfigurationData(USDT) returns (
            uint256 decimals_, uint256, uint256, uint256, uint256, bool, bool, bool, bool active, bool frozen
        ) {
            if (!active || frozen) return (false, 0);
            try availability.getPaused(USDT) returns (bool paused) {
                return (!paused, decimals_);
            } catch {
                return (false, 0);
            }
        } catch {
            return (false, 0);
        }
    }

    function withdraw(WithdrawRequest calldata request) external nonReentrant returns (uint256 underlyingReturned) {
        _validate(request.vault, request.underlying, request.amount, request.deadline);
        IERC20 asset = IERC20(USDT);
        IERC20 position = IERC20(AUSDT);
        _requireZero(asset, USDT);
        _requireZero(position, AUSDT);
        uint256 beforeUnderlying = asset.balanceOf(request.vault);
        position.safeTransferFrom(request.vault, address(this), request.amount);
        underlyingReturned = pool.withdraw(USDT, request.amount, request.vault);
        uint256 actual = asset.balanceOf(request.vault) - beforeUnderlying;
        if (actual != underlyingReturned || actual == 0) revert PositionDeltaMismatch(underlyingReturned, actual);
        _requireZero(asset, USDT);
        _requireZero(position, AUSDT);
    }

    function _validate(address vault, address asset, uint256 amount, uint64 deadline) private view {
        if (block.chainid != deploymentChainId) revert WrongChain(block.chainid, deploymentChainId);
        if (msg.sender != vault) revert UnauthorizedVault(msg.sender, vault);
        if (asset != USDT || amount == 0 || vault == address(0)) revert InvalidRequest();
        if (deadline < block.timestamp) revert Expired(deadline, uint64(block.timestamp));
    }

    function _requireZero(IERC20 token, address tokenAddress) private view {
        uint256 balance = token.balanceOf(address(this));
        if (balance != 0) revert ResidualCustody(tokenAddress, balance);
    }
}
