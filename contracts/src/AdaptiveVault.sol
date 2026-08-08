// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";

/// @notice Isolated, non-upgradeable custody boundary for one owner.
contract AdaptiveVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address payable;

    uint16 public constant BPS_DENOMINATOR = 10_000;

    struct VaultPolicy {
        uint16 minimumReserveBps;
        uint16 maximumSingleAssetExposureBps;
        uint16 maximumAggressiveExposureBps;
        uint16 maximumDailyReallocationBps;
    }

    error ZeroAddress();
    error ZeroAmount();
    error UnsupportedAsset(address asset);
    error SupportedAssetMustUseWithdraw(address asset);
    error InsufficientBalance(address asset, uint256 requested, uint256 available);
    error InsufficientNativeBalance(uint256 requested, uint256 available);
    error ExecutorRoleCollision(address executor);
    error GuardianRoleCollision(address guardian);
    error UnauthorizedPause(address caller);
    error InvalidPolicyValue(uint256 value);
    error NativeCurrencyNotAccepted();
    error OwnershipRenunciationDisabled();
    error OwnershipTransferDisabled();

    event Deposited(address indexed asset, address indexed depositor, uint256 amount);
    event Withdrawn(address indexed asset, address indexed recipient, uint256 amount);
    event TokenRecovered(address indexed asset, address indexed recipient, uint256 amount);
    event NativeCurrencyRecovered(address indexed recipient, uint256 amount);
    event ExecutorChanged(address indexed previousExecutor, address indexed newExecutor);
    event GuardianChanged(address indexed previousGuardian, address indexed newGuardian);
    event PolicyUpdated(
        uint16 minimumReserveBps,
        uint16 maximumSingleAssetExposureBps,
        uint16 maximumAggressiveExposureBps,
        uint16 maximumDailyReallocationBps
    );
    event VaultPaused(address indexed caller);
    event VaultUnpaused(address indexed caller);

    IAssetRegistry public immutable assetRegistry;
    address public agentExecutor;
    address public guardian;
    VaultPolicy public policy;

    constructor(address initialOwner, address initialGuardian, address initialAgentExecutor, IAssetRegistry registry)
        Ownable(initialOwner)
    {
        if (address(registry) == address(0)) revert ZeroAddress();
        _validateExecutor(initialAgentExecutor, initialOwner, initialGuardian);
        assetRegistry = registry;
        guardian = initialGuardian;
        agentExecutor = initialAgentExecutor;
    }

    /// @notice Deposits a currently supported ERC-20. Direct token transfers are not tracked as deposits.
    function deposit(address asset, uint256 amount) external whenNotPaused nonReentrant {
        if (!assetRegistry.isSupported(asset)) revert UnsupportedAsset(asset);
        if (amount == 0) revert ZeroAmount();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(asset, msg.sender, amount);
    }

    /// @notice Lets the owner withdraw a supported portfolio asset, including while paused.
    function withdraw(address asset, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (!assetRegistry.isSupported(asset)) revert UnsupportedAsset(asset);
        _transferToken(asset, recipient, amount);
        emit Withdrawn(asset, recipient, amount);
    }

    /// @notice Lets the owner recover any ERC-20 sent accidentally, including unsupported tokens and while paused.
    function recoverToken(address asset, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (asset == address(0)) revert ZeroAddress();
        if (assetRegistry.isSupported(asset)) revert SupportedAssetMustUseWithdraw(asset);
        _transferToken(asset, recipient, amount);
        emit TokenRecovered(asset, recipient, amount);
    }

    /// @notice Disabled because abandoning ownership could permanently trap vault assets.
    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }

    /// @notice Disabled because factory ownership indexing must remain authoritative.
    function transferOwnership(address) public pure override {
        revert OwnershipTransferDisabled();
    }

    /// @notice Recovers native currency that was forcibly placed in the vault despite receive rejection.
    function recoverNativeCurrency(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 available = address(this).balance;
        if (amount > available) revert InsufficientNativeBalance(amount, available);

        recipient.sendValue(amount);
        emit NativeCurrencyRecovered(recipient, amount);
    }

    function setAgentExecutor(address newExecutor) external onlyOwner {
        _validateExecutor(newExecutor, owner(), guardian);
        address previousExecutor = agentExecutor;
        agentExecutor = newExecutor;
        emit ExecutorChanged(previousExecutor, newExecutor);
    }

    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian != address(0) && newGuardian == agentExecutor) revert GuardianRoleCollision(newGuardian);
        address previousGuardian = guardian;
        guardian = newGuardian;
        emit GuardianChanged(previousGuardian, newGuardian);
    }

    /// @notice Stores owner-defined limits. Enforcement is connected only when valuation and routing exist later.
    function setPolicy(VaultPolicy calldata newPolicy) external onlyOwner {
        _validateBps(newPolicy.minimumReserveBps);
        _validateBps(newPolicy.maximumSingleAssetExposureBps);
        _validateBps(newPolicy.maximumAggressiveExposureBps);
        _validateBps(newPolicy.maximumDailyReallocationBps);

        policy = newPolicy;
        emit PolicyUpdated(
            newPolicy.minimumReserveBps,
            newPolicy.maximumSingleAssetExposureBps,
            newPolicy.maximumAggressiveExposureBps,
            newPolicy.maximumDailyReallocationBps
        );
    }

    /// @notice Owner or guardian may halt deposits and future automated operations.
    function pause() external {
        if (msg.sender != owner() && msg.sender != guardian) revert UnauthorizedPause(msg.sender);
        _pause();
        emit VaultPaused(msg.sender);
    }

    /// @notice Only the owner may restore normal operation.
    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused(msg.sender);
    }

    receive() external payable {
        revert NativeCurrencyNotAccepted();
    }

    fallback() external payable {
        revert NativeCurrencyNotAccepted();
    }

    function _transferToken(address asset, address recipient, uint256 amount) private {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 available = IERC20(asset).balanceOf(address(this));
        if (amount > available) revert InsufficientBalance(asset, amount, available);
        IERC20(asset).safeTransfer(recipient, amount);
    }

    function _validateBps(uint256 value) private pure {
        if (value > BPS_DENOMINATOR) revert InvalidPolicyValue(value);
    }

    function _validateExecutor(address executor, address vaultOwner, address vaultGuardian) private pure {
        if (executor != address(0) && (executor == vaultOwner || executor == vaultGuardian)) {
            revert ExecutorRoleCollision(executor);
        }
    }
}
