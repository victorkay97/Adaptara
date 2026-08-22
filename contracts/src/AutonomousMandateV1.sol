// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAdaptiveVaultAuthority} from "./interfaces/IAdaptiveVaultAuthority.sol";

/// @notice Additive Phase 13A authority and typed-intent foundation for an existing AdaptiveVault.
/// @dev This contract deliberately has no custody, approvals, arbitrary calls, or adapter invocation.
contract AutonomousMandateV1 {
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint8 public constant MAX_ALLOWED_ASSETS = 32;
    uint8 public constant MAX_ALLOWED_ADAPTERS = 16;

    enum ManagementMode {
        Advisory,
        ApprovalRequired,
        Adaptive
    }

    enum ActionKind {
        Swap
    }

    struct ExecutionPolicy {
        uint16 maximumSingleActionBps;
        uint16 maximumDailyTurnoverBps;
        uint16 maximumSlippageBps;
        uint16 yieldCompoundBps;
        uint16 yieldReserveBps;
        uint32 maximumIntentLifetime;
        bool autonomousManagementEnabled;
    }

    struct SwapIntent {
        ActionKind kind;
        address assetIn;
        address assetOut;
        address adapter;
        uint256 amountIn;
        uint256 minimumAmountOut;
        uint16 actionExposureBps;
        uint16 slippageBps;
        uint64 deadline;
        bytes32 intentId;
    }

    error ZeroAddress();
    error NotVaultOwner(address caller);
    error UnauthorizedExecutor(address caller);
    error VaultPaused();
    error AutonomousManagementPaused();
    error AutonomousManagementDisabled();
    error WrongManagementMode(ManagementMode mode);
    error PolicyNotConfigured();
    error InvalidBps(uint256 value);
    error InvalidYieldSplit(uint256 totalBps);
    error InvalidIntentLifetime();
    error AssetNotAllowed(address asset);
    error AdapterNotAllowed(address adapter);
    error AllowlistLimitReached();
    error InvalidSwapAssets();
    error InvalidActionKind(ActionKind kind);
    error ZeroAmount();
    error InvalidMinimumAmountOut();
    error IntentExpired(uint64 deadline, uint64 currentTime);
    error IntentLifetimeExceeded(uint64 deadline, uint64 maximumDeadline);
    error ActionLimitExceeded(uint16 requestedBps, uint16 maximumBps);
    error SlippageLimitExceeded(uint16 requestedBps, uint16 maximumBps);
    error DailyTurnoverExceeded(uint16 requestedBps, uint16 remainingBps);
    error IntentAlreadyAccepted(bytes32 intentId);

    event ManagementModeChanged(ManagementMode previousMode, ManagementMode newMode);
    event AutonomousManagementPauseChanged(bool paused);
    event ExecutionPolicyUpdated(
        uint16 maximumSingleActionBps,
        uint16 maximumDailyTurnoverBps,
        uint16 maximumSlippageBps,
        uint16 yieldCompoundBps,
        uint16 yieldReserveBps,
        uint32 maximumIntentLifetime,
        bool autonomousManagementEnabled
    );
    event AllowedAssetChanged(address indexed asset, bool allowed);
    event AllowedAdapterChanged(address indexed adapter, bool allowed);
    event IntentAccepted(
        bytes32 indexed intentId,
        bytes32 indexed intentHash,
        address indexed executor,
        address adapter,
        address assetIn,
        address assetOut,
        uint256 amountIn,
        uint16 actionExposureBps,
        uint64 deadline
    );

    IAdaptiveVaultAuthority public immutable vault;
    ManagementMode public managementMode;
    ExecutionPolicy public executionPolicy;
    bool public policyConfigured;
    bool public autonomousPaused;
    uint8 public allowedAssetCount;
    uint8 public allowedAdapterCount;
    mapping(address => bool) public allowedAssets;
    mapping(address => bool) public allowedAdapters;
    mapping(bytes32 => bool) public acceptedIntentIds;
    mapping(uint64 => uint16) public dailyTurnoverBps;

    constructor(IAdaptiveVaultAuthority vault_) {
        if (address(vault_) == address(0) || address(vault_).code.length == 0) revert ZeroAddress();
        vault = vault_;
        managementMode = ManagementMode.Advisory;
        autonomousPaused = true;
    }

    modifier onlyVaultOwner() {
        if (msg.sender != vault.owner()) revert NotVaultOwner(msg.sender);
        _;
    }

    function setManagementMode(ManagementMode newMode) external onlyVaultOwner {
        ManagementMode previousMode = managementMode;
        managementMode = newMode;
        emit ManagementModeChanged(previousMode, newMode);
    }

    function setAutonomousPaused(bool paused_) external onlyVaultOwner {
        autonomousPaused = paused_;
        emit AutonomousManagementPauseChanged(paused_);
    }

    function setExecutionPolicy(ExecutionPolicy calldata newPolicy) external onlyVaultOwner {
        _validateBps(newPolicy.maximumSingleActionBps);
        _validateBps(newPolicy.maximumDailyTurnoverBps);
        _validateBps(newPolicy.maximumSlippageBps);
        _validateBps(newPolicy.yieldCompoundBps);
        _validateBps(newPolicy.yieldReserveBps);
        uint256 yieldTotal = uint256(newPolicy.yieldCompoundBps) + newPolicy.yieldReserveBps;
        if (yieldTotal != BPS_DENOMINATOR) revert InvalidYieldSplit(yieldTotal);
        if (newPolicy.maximumIntentLifetime == 0) revert InvalidIntentLifetime();

        executionPolicy = newPolicy;
        policyConfigured = true;
        emit ExecutionPolicyUpdated(
            newPolicy.maximumSingleActionBps,
            newPolicy.maximumDailyTurnoverBps,
            newPolicy.maximumSlippageBps,
            newPolicy.yieldCompoundBps,
            newPolicy.yieldReserveBps,
            newPolicy.maximumIntentLifetime,
            newPolicy.autonomousManagementEnabled
        );
    }

    function setAllowedAsset(address asset, bool allowed) external onlyVaultOwner {
        if (asset == address(0) || (allowed && asset.code.length == 0)) revert ZeroAddress();
        if (allowed == allowedAssets[asset]) return;
        if (allowed) {
            if (allowedAssetCount == MAX_ALLOWED_ASSETS) revert AllowlistLimitReached();
            unchecked {
                ++allowedAssetCount;
            }
        } else {
            unchecked {
                --allowedAssetCount;
            }
        }
        allowedAssets[asset] = allowed;
        emit AllowedAssetChanged(asset, allowed);
    }

    function setAllowedAdapter(address adapter, bool allowed) external onlyVaultOwner {
        if (adapter == address(0) || (allowed && adapter.code.length == 0)) revert ZeroAddress();
        if (allowed == allowedAdapters[adapter]) return;
        if (allowed) {
            if (allowedAdapterCount == MAX_ALLOWED_ADAPTERS) revert AllowlistLimitReached();
            unchecked {
                ++allowedAdapterCount;
            }
        } else {
            unchecked {
                --allowedAdapterCount;
            }
        }
        allowedAdapters[adapter] = allowed;
        emit AllowedAdapterChanged(adapter, allowed);
    }

    /// @notice Validates and reserves a typed intent for a later, separately reviewed execution layer.
    /// @dev Acceptance emits no claim that assets moved and invokes neither the vault nor the adapter.
    function acceptSwapIntent(SwapIntent calldata intent) external returns (bytes32 intentHash) {
        _validateAuthorityAndPolicy();
        _validateSwapIntent(intent);
        if (acceptedIntentIds[intent.intentId]) revert IntentAlreadyAccepted(intent.intentId);

        uint64 day = uint64(block.timestamp / 1 days);
        uint16 used = dailyTurnoverBps[day];
        uint16 remaining = executionPolicy.maximumDailyTurnoverBps - used;
        if (intent.actionExposureBps > remaining) {
            revert DailyTurnoverExceeded(intent.actionExposureBps, remaining);
        }

        acceptedIntentIds[intent.intentId] = true;
        dailyTurnoverBps[day] = used + intent.actionExposureBps;
        intentHash = keccak256(abi.encode(address(this), block.chainid, intent));
        emit IntentAccepted(
            intent.intentId,
            intentHash,
            msg.sender,
            intent.adapter,
            intent.assetIn,
            intent.assetOut,
            intent.amountIn,
            intent.actionExposureBps,
            intent.deadline
        );
    }

    function _validateAuthorityAndPolicy() private view {
        if (msg.sender != vault.agentExecutor() || msg.sender == address(0)) revert UnauthorizedExecutor(msg.sender);
        if (vault.paused()) revert VaultPaused();
        if (autonomousPaused) revert AutonomousManagementPaused();
        if (managementMode != ManagementMode.Adaptive) revert WrongManagementMode(managementMode);
        if (!policyConfigured) revert PolicyNotConfigured();
        if (!executionPolicy.autonomousManagementEnabled) revert AutonomousManagementDisabled();
    }

    function _validateSwapIntent(SwapIntent calldata intent) private view {
        if (intent.kind != ActionKind.Swap) revert InvalidActionKind(intent.kind);
        if (intent.assetIn == address(0) || intent.assetOut == address(0) || intent.assetIn == intent.assetOut) {
            revert InvalidSwapAssets();
        }
        if (!allowedAssets[intent.assetIn]) revert AssetNotAllowed(intent.assetIn);
        if (!allowedAssets[intent.assetOut]) revert AssetNotAllowed(intent.assetOut);
        if (!allowedAdapters[intent.adapter]) revert AdapterNotAllowed(intent.adapter);
        if (intent.amountIn == 0) revert ZeroAmount();
        if (intent.minimumAmountOut == 0) revert InvalidMinimumAmountOut();
        if (intent.actionExposureBps > executionPolicy.maximumSingleActionBps) {
            revert ActionLimitExceeded(intent.actionExposureBps, executionPolicy.maximumSingleActionBps);
        }
        if (intent.slippageBps > executionPolicy.maximumSlippageBps) {
            revert SlippageLimitExceeded(intent.slippageBps, executionPolicy.maximumSlippageBps);
        }
        uint64 nowTimestamp = uint64(block.timestamp);
        if (intent.deadline < nowTimestamp) revert IntentExpired(intent.deadline, nowTimestamp);
        uint64 maximumDeadline = nowTimestamp + executionPolicy.maximumIntentLifetime;
        if (intent.deadline > maximumDeadline) revert IntentLifetimeExceeded(intent.deadline, maximumDeadline);
        if (intent.intentId == bytes32(0)) revert IntentAlreadyAccepted(bytes32(0));
    }

    function _validateBps(uint256 value) private pure {
        if (value > BPS_DENOMINATOR) revert InvalidBps(value);
    }
}
