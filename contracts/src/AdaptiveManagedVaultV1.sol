// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";
import {IAdaptaraAdapter} from "./interfaces/IAdaptaraAdapter.sol";
import {IAdaptaraValuationProvider} from "./interfaces/IAdaptaraValuationProvider.sol";
import {IProtocolAdapterRegistry} from "./interfaces/IProtocolAdapterRegistry.sol";
import {IAdaptaraYieldAdapter} from "./interfaces/IAdaptaraYieldAdapter.sol";
import {YieldAccountingV1} from "./YieldAccountingV1.sol";

/// @notice Versioned, local/test Phase 13B managed vault with typed atomic swap execution.
contract AdaptiveManagedVaultV1 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint8 public constant MAX_MANAGED_ASSETS = 32;
    uint8 public constant MAX_ALLOWED_ADAPTERS = 16;

    enum ManagementMode {
        Advisory,
        ApprovalRequired,
        Adaptive
    }
    enum ExecutionPath {
        OwnerApproval,
        AdaptiveExecutor
    }

    struct VaultPolicy {
        uint16 minimumReserveBps;
        uint16 maximumSingleAssetExposureBps;
        uint16 maximumAggressiveExposureBps;
        uint16 maximumDailyReallocationBps;
    }

    struct ExecutionPolicy {
        uint16 maximumSingleActionBps;
        uint16 maximumDailyTurnoverBps;
        uint16 maximumSlippageBps;
        uint32 maximumIntentLifetime;
        bool autonomousManagementEnabled;
    }

    struct SwapIntent {
        address assetIn;
        address assetOut;
        address adapter;
        uint256 amountIn;
        uint256 minimumAmountOut;
        uint64 deadline;
        bytes32 intentId;
    }

    struct YieldPolicy {
        uint16 maximumYieldStrategyBps;
        uint16 compoundBps;
        uint16 reserveBps;
        uint256 minimumSettlementAmount;
        bool enabled;
    }

    struct YieldIntent {
        address adapter;
        address underlying;
        uint256 amount;
        uint64 deadline;
        bytes32 intentId;
    }

    struct YieldPosition {
        address adapter;
        address underlying;
        address aToken;
        uint256 principalSupplied;
        uint256 accountedBasis;
        uint256 cumulativeSettledYield;
        uint256 cumulativeReserveReturned;
        uint256 cumulativeRetainedYield;
        uint64 lastSettlementTime;
    }

    struct ExecutionResult {
        bytes32 intentHash;
        address initiator;
        address assetIn;
        address assetOut;
        address adapter;
        uint256 actualAmountIn;
        uint256 actualAmountOut;
        uint64 executedAt;
        ExecutionPath path;
    }

    struct PreExecutionState {
        uint64 nowTimestamp;
        uint64 day;
        uint16 usedTurnoverBps;
        uint16 actionBps;
    }

    error ZeroAddress();
    error ZeroAmount();
    error InvalidBps(uint256 value);
    error InvalidIntentLifetime();
    error RoleCollision(address account);
    error UnauthorizedPause(address caller);
    error WrongManagementMode(ManagementMode mode);
    error UnauthorizedExecutor(address caller);
    error AutonomousManagementPaused();
    error AutonomousManagementDisabled();
    error PolicyNotConfigured();
    error AssetNotManaged(address asset);
    error AdapterNotAllowed(address adapter);
    error AdapterNotProtocolSupported(address adapter);
    error AllowlistLimitReached();
    error InvalidSwapAssets();
    error IntentExpired(uint64 deadline, uint64 currentTime);
    error IntentLifetimeExceeded(uint64 deadline, uint64 maximumDeadline);
    error IntentAlreadyConsumed(bytes32 intentId);
    error InvalidIntentId();
    error InsufficientBalance(address asset, uint256 requested, uint256 available);
    error ValuationUnavailable(address asset);
    error ValuationStale(address asset, uint64 updatedAt);
    error InvalidTokenDecimals(address asset, uint8 decimals);
    error ZeroPortfolioValue();
    error ActionLimitExceeded(uint256 actionValue, uint256 maximumValue);
    error DailyTurnoverExceeded(uint16 requestedBps, uint16 remainingBps);
    error SlippagePolicyViolated(uint256 minimumAmountOut, uint256 requiredMinimum);
    error ActualInputMismatch(uint256 expected, uint256 actual);
    error InsufficientActualOutput(uint256 actual, uint256 minimum);
    error AdapterOutputMismatch(uint256 reported, uint256 actual);
    error MinimumReserveViolated(uint16 actualBps, uint16 minimumBps);
    error SingleAssetExposureViolated(address asset, uint16 actualBps, uint16 maximumBps);
    error AggressiveExposureViolated(uint16 actualBps, uint16 maximumBps);
    error OwnershipTransferDisabled();
    error OwnershipRenunciationDisabled();
    error YieldPolicyNotConfigured();
    error YieldStrategyMismatch();
    error YieldStrategyExposureViolated(uint16 actualBps, uint16 maximumBps);
    error NoAccruedYield();
    error SettlementBelowMinimum(uint256 amount, uint256 minimum);

    event Deposited(address indexed asset, address indexed depositor, uint256 amount);
    event Withdrawn(address indexed asset, address indexed recipient, uint256 amount);
    event ExecutorChanged(address indexed previousExecutor, address indexed newExecutor);
    event GuardianChanged(address indexed previousGuardian, address indexed newGuardian);
    event ManagementModeChanged(ManagementMode previousMode, ManagementMode newMode);
    event AutonomousManagementPauseChanged(bool paused);
    event ManagedAssetAdded(address indexed asset);
    event AllowedAdapterChanged(address indexed adapter, bool allowed);
    event VaultPolicyUpdated(
        uint16 minimumReserveBps,
        uint16 maximumSingleAssetExposureBps,
        uint16 maximumAggressiveExposureBps,
        uint16 maximumDailyReallocationBps
    );
    event ExecutionPolicyUpdated(
        uint16 maximumSingleActionBps,
        uint16 maximumDailyTurnoverBps,
        uint16 maximumSlippageBps,
        uint32 maximumIntentLifetime,
        bool autonomousManagementEnabled
    );
    event SwapExecuted(
        bytes32 indexed intentId,
        bytes32 indexed intentHash,
        address indexed initiator,
        address adapter,
        address assetIn,
        address assetOut,
        uint256 actualAmountIn,
        uint256 actualAmountOut,
        ExecutionPath path
    );
    event YieldPolicyUpdated(
        uint16 maximumYieldStrategyBps,
        uint16 compoundBps,
        uint16 reserveBps,
        uint256 minimumSettlementAmount,
        bool enabled
    );
    event YieldSupplied(
        bytes32 indexed intentId,
        address indexed adapter,
        address indexed underlying,
        uint256 amount,
        uint256 positionIncrease
    );
    event YieldWithdrawn(bytes32 indexed intentId, address indexed adapter, address indexed underlying, uint256 amount);
    event YieldSettled(
        bytes32 indexed intentId,
        address indexed adapter,
        uint256 accruedYield,
        uint256 retainedAmount,
        uint256 reserveAmount
    );

    IAssetRegistry public immutable assetRegistry;
    IAdaptaraValuationProvider public immutable valuationProvider;
    IProtocolAdapterRegistry public immutable protocolAdapterRegistry;
    uint32 public immutable maximumValuationAge;
    address public guardian;
    address public agentExecutor;
    ManagementMode public managementMode;
    bool public autonomousPaused = true;
    bool public vaultPolicyConfigured;
    bool public executionPolicyConfigured;
    VaultPolicy public policy;
    ExecutionPolicy public executionPolicy;
    address[] private _managedAssets;
    uint8 public allowedAdapterCount;
    mapping(address => bool) public isManagedAsset;
    mapping(address => bool) public allowedAdapters;
    mapping(bytes32 => bool) public consumedIntentIds;
    mapping(bytes32 => ExecutionResult) private _executionResults;
    mapping(uint64 => uint16) public dailyTurnoverBps;
    YieldPolicy public yieldPolicy;
    bool public yieldPolicyConfigured;
    YieldPosition public yieldPosition;

    constructor(
        address initialOwner,
        address initialGuardian,
        address initialExecutor,
        IAssetRegistry registry,
        IAdaptaraValuationProvider provider,
        IProtocolAdapterRegistry adapterRegistry,
        uint32 maxValuationAge
    ) Ownable(initialOwner) {
        if (
            address(registry) == address(0) || address(provider) == address(0) || address(registry).code.length == 0
                || address(provider).code.length == 0 || address(adapterRegistry) == address(0)
                || address(adapterRegistry).code.length == 0
        ) revert ZeroAddress();
        if (maxValuationAge == 0) revert InvalidIntentLifetime();
        _validateExecutor(initialExecutor, initialOwner, initialGuardian);
        assetRegistry = registry;
        valuationProvider = provider;
        protocolAdapterRegistry = adapterRegistry;
        maximumValuationAge = maxValuationAge;
        guardian = initialGuardian;
        agentExecutor = initialExecutor;
    }

    modifier onlyManagedAsset(address asset) {
        if (!isManagedAsset[asset]) revert AssetNotManaged(asset);
        _;
    }

    function managedAssets() external view returns (address[] memory) {
        return _managedAssets;
    }

    function executionResult(bytes32 intentId) external view returns (ExecutionResult memory) {
        return _executionResults[intentId];
    }

    function addManagedAsset(address asset) external onlyOwner {
        if (asset == address(0) || asset.code.length == 0 || !assetRegistry.isSupported(asset)) {
            revert AssetNotManaged(asset);
        }
        if (isManagedAsset[asset]) return;
        if (_managedAssets.length == MAX_MANAGED_ASSETS) revert AllowlistLimitReached();
        isManagedAsset[asset] = true;
        _managedAssets.push(asset);
        emit ManagedAssetAdded(asset);
    }

    function setAllowedAdapter(address adapter, bool allowed) external onlyOwner {
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

    function setPolicy(VaultPolicy calldata newPolicy) external onlyOwner {
        _validateBps(newPolicy.minimumReserveBps);
        _validateBps(newPolicy.maximumSingleAssetExposureBps);
        _validateBps(newPolicy.maximumAggressiveExposureBps);
        _validateBps(newPolicy.maximumDailyReallocationBps);
        policy = newPolicy;
        vaultPolicyConfigured = true;
        emit VaultPolicyUpdated(
            newPolicy.minimumReserveBps,
            newPolicy.maximumSingleAssetExposureBps,
            newPolicy.maximumAggressiveExposureBps,
            newPolicy.maximumDailyReallocationBps
        );
    }

    function setExecutionPolicy(ExecutionPolicy calldata newPolicy) external onlyOwner {
        _validateBps(newPolicy.maximumSingleActionBps);
        _validateBps(newPolicy.maximumDailyTurnoverBps);
        _validateBps(newPolicy.maximumSlippageBps);
        if (newPolicy.maximumIntentLifetime == 0) revert InvalidIntentLifetime();
        executionPolicy = newPolicy;
        executionPolicyConfigured = true;
        emit ExecutionPolicyUpdated(
            newPolicy.maximumSingleActionBps,
            newPolicy.maximumDailyTurnoverBps,
            newPolicy.maximumSlippageBps,
            newPolicy.maximumIntentLifetime,
            newPolicy.autonomousManagementEnabled
        );
    }

    function setYieldPolicy(YieldPolicy calldata newPolicy) external onlyOwner {
        _validateBps(newPolicy.maximumYieldStrategyBps);
        _validateBps(newPolicy.compoundBps);
        _validateBps(newPolicy.reserveBps);
        if (uint256(newPolicy.compoundBps) + newPolicy.reserveBps != BPS_DENOMINATOR) {
            revert InvalidBps(uint256(newPolicy.compoundBps) + newPolicy.reserveBps);
        }
        yieldPolicy = newPolicy;
        yieldPolicyConfigured = true;
        emit YieldPolicyUpdated(
            newPolicy.maximumYieldStrategyBps,
            newPolicy.compoundBps,
            newPolicy.reserveBps,
            newPolicy.minimumSettlementAmount,
            newPolicy.enabled
        );
    }

    /// @notice Exact safe supply amount from liquid reserve, strategy cap, action cap, and remaining daily turnover.
    function planYieldSupply(address adapter, address underlying) public view returns (uint256 amount) {
        _validateYieldStrategy(adapter, underlying);
        (uint256 totalValue, uint256 liquidReserveValue,) = _validatePortfolio(false);
        uint256 positionValue = _yieldPositionValue();
        totalValue += positionValue;
        uint256 minimumLiquid = Math.mulDiv(totalValue, policy.minimumReserveBps, BPS_DENOMINATOR, Math.Rounding.Ceil);
        if (liquidReserveValue <= minimumLiquid) return 0;
        uint256 excessLiquid = liquidReserveValue - minimumLiquid;
        uint256 strategyCap = Math.mulDiv(totalValue, yieldPolicy.maximumYieldStrategyBps, BPS_DENOMINATOR);
        uint256 strategyHeadroom = positionValue >= strategyCap ? 0 : strategyCap - positionValue;
        uint256 actionCap = Math.mulDiv(totalValue, executionPolicy.maximumSingleActionBps, BPS_DENOMINATOR);
        uint16 dailyMaximum = executionPolicy.maximumDailyTurnoverBps < policy.maximumDailyReallocationBps
            ? executionPolicy.maximumDailyTurnoverBps
            : policy.maximumDailyReallocationBps;
        uint16 used = dailyTurnoverBps[uint64(block.timestamp / 1 days)];
        uint256 turnoverCap = Math.mulDiv(totalValue, dailyMaximum - used, BPS_DENOMINATOR);
        uint256 value = Math.min(Math.min(excessLiquid, strategyHeadroom), Math.min(actionCap, turnoverCap));
        amount = _convertValueToAmount(underlying, value);
        uint256 balance = IERC20(underlying).balanceOf(address(this));
        if (amount > balance) amount = balance;
    }

    function executeOwnerApprovedYieldSupply(YieldIntent calldata intent)
        external
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        if (managementMode != ManagementMode.ApprovalRequired) revert WrongManagementMode(managementMode);
        return _supplyYield(intent);
    }

    function executeAdaptiveYieldSupply(YieldIntent calldata intent) external nonReentrant returns (uint256) {
        _validateAdaptiveCaller();
        return _supplyYield(intent);
    }

    function executeOwnerApprovedYieldWithdraw(YieldIntent calldata intent)
        external
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        if (managementMode != ManagementMode.ApprovalRequired) revert WrongManagementMode(managementMode);
        return _withdrawYield(intent);
    }

    function executeAdaptiveYieldWithdraw(YieldIntent calldata intent) external nonReentrant returns (uint256) {
        _validateAdaptiveCaller();
        return _withdrawYield(intent);
    }

    function settleOwnerApprovedYield(YieldIntent calldata intent)
        external
        onlyOwner
        nonReentrant
        returns (uint256, uint256)
    {
        if (managementMode != ManagementMode.ApprovalRequired) revert WrongManagementMode(managementMode);
        return _settleYield(intent);
    }

    function settleAdaptiveYield(YieldIntent calldata intent) external nonReentrant returns (uint256, uint256) {
        _validateAdaptiveCaller();
        return _settleYield(intent);
    }

    function accruedYield() public view returns (uint256) {
        if (yieldPosition.aToken == address(0)) return 0;
        uint256 current = IERC20(yieldPosition.aToken).balanceOf(address(this));
        return current > yieldPosition.accountedBasis ? current - yieldPosition.accountedBasis : 0;
    }

    function setManagementMode(ManagementMode newMode) external onlyOwner {
        ManagementMode previous = managementMode;
        managementMode = newMode;
        emit ManagementModeChanged(previous, newMode);
    }

    function setAutonomousPaused(bool paused_) external onlyOwner {
        autonomousPaused = paused_;
        emit AutonomousManagementPauseChanged(paused_);
    }

    function setAgentExecutor(address newExecutor) external onlyOwner {
        _validateExecutor(newExecutor, owner(), guardian);
        address previous = agentExecutor;
        agentExecutor = newExecutor;
        emit ExecutorChanged(previous, newExecutor);
    }

    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian != address(0) && newGuardian == agentExecutor) revert RoleCollision(newGuardian);
        address previous = guardian;
        guardian = newGuardian;
        emit GuardianChanged(previous, newGuardian);
    }

    function pause() external {
        if (msg.sender != owner() && msg.sender != guardian) revert UnauthorizedPause(msg.sender);
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function deposit(address asset, uint256 amount) external whenNotPaused nonReentrant onlyManagedAsset(asset) {
        if (amount == 0) revert ZeroAmount();
        uint256 beforeBalance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(asset).balanceOf(address(this)) - beforeBalance;
        if (received != amount) revert ActualInputMismatch(amount, received);
        emit Deposited(asset, msg.sender, amount);
    }

    function withdraw(address asset, address recipient, uint256 amount)
        external
        onlyOwner
        nonReentrant
        onlyManagedAsset(asset)
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 available = IERC20(asset).balanceOf(address(this));
        if (amount > available) revert InsufficientBalance(asset, amount, available);
        IERC20(asset).safeTransfer(recipient, amount);
        emit Withdrawn(asset, recipient, amount);
    }

    function executeOwnerApprovedSwap(SwapIntent calldata intent)
        external
        onlyOwner
        nonReentrant
        returns (ExecutionResult memory)
    {
        if (managementMode != ManagementMode.ApprovalRequired) revert WrongManagementMode(managementMode);
        return _executeSwap(intent, ExecutionPath.OwnerApproval);
    }

    function executeAdaptiveSwap(SwapIntent calldata intent) external nonReentrant returns (ExecutionResult memory) {
        if (managementMode != ManagementMode.Adaptive) revert WrongManagementMode(managementMode);
        if (msg.sender != agentExecutor || msg.sender == address(0)) revert UnauthorizedExecutor(msg.sender);
        if (autonomousPaused) revert AutonomousManagementPaused();
        if (!executionPolicy.autonomousManagementEnabled) revert AutonomousManagementDisabled();
        return _executeSwap(intent, ExecutionPath.AdaptiveExecutor);
    }

    function _executeSwap(SwapIntent calldata intent, ExecutionPath path)
        private
        whenNotPaused
        returns (ExecutionResult memory result)
    {
        PreExecutionState memory state = _validateBeforeExecution(intent);
        consumedIntentIds[intent.intentId] = true;
        dailyTurnoverBps[state.day] = state.usedTurnoverBps + state.actionBps;
        (uint256 actualIn, uint256 actualOut) = _callAdapterAndVerify(intent);
        _validatePortfolio(true);

        bytes32 intentHash = keccak256(abi.encode(address(this), block.chainid, intent));
        result = ExecutionResult(
            intentHash,
            msg.sender,
            intent.assetIn,
            intent.assetOut,
            intent.adapter,
            actualIn,
            actualOut,
            state.nowTimestamp,
            path
        );
        _executionResults[intent.intentId] = result;
        emit SwapExecuted(
            intent.intentId,
            intentHash,
            msg.sender,
            intent.adapter,
            intent.assetIn,
            intent.assetOut,
            actualIn,
            actualOut,
            path
        );
    }

    function _validateBeforeExecution(SwapIntent calldata intent)
        private
        view
        returns (PreExecutionState memory state)
    {
        if (!vaultPolicyConfigured || !executionPolicyConfigured) {
            revert PolicyNotConfigured();
        }
        if (intent.assetIn == address(0) || intent.assetOut == address(0) || intent.assetIn == intent.assetOut) {
            revert InvalidSwapAssets();
        }
        if (!isManagedAsset[intent.assetIn]) revert AssetNotManaged(intent.assetIn);
        if (!isManagedAsset[intent.assetOut]) revert AssetNotManaged(intent.assetOut);
        if (!allowedAdapters[intent.adapter]) revert AdapterNotAllowed(intent.adapter);
        if (!protocolAdapterRegistry.isSupportedAdapter(intent.adapter)) {
            revert AdapterNotProtocolSupported(intent.adapter);
        }
        if (intent.amountIn == 0 || intent.minimumAmountOut == 0) revert ZeroAmount();
        if (intent.intentId == bytes32(0)) revert InvalidIntentId();
        if (consumedIntentIds[intent.intentId]) revert IntentAlreadyConsumed(intent.intentId);
        state.nowTimestamp = uint64(block.timestamp);
        if (intent.deadline < state.nowTimestamp) revert IntentExpired(intent.deadline, state.nowTimestamp);
        uint64 maximumDeadline = state.nowTimestamp + executionPolicy.maximumIntentLifetime;
        if (intent.deadline > maximumDeadline) revert IntentLifetimeExceeded(intent.deadline, maximumDeadline);

        (uint256 totalValueBefore,,) = _validatePortfolio(false);
        uint256 actionValue = _assetValue(intent.assetIn, intent.amountIn);
        uint256 maximumActionValue =
            Math.mulDiv(totalValueBefore, executionPolicy.maximumSingleActionBps, BPS_DENOMINATOR);
        if (actionValue > maximumActionValue) revert ActionLimitExceeded(actionValue, maximumActionValue);
        state.actionBps = uint16(Math.mulDiv(actionValue, BPS_DENOMINATOR, totalValueBefore, Math.Rounding.Ceil));
        uint16 dailyMaximum = executionPolicy.maximumDailyTurnoverBps < policy.maximumDailyReallocationBps
            ? executionPolicy.maximumDailyTurnoverBps
            : policy.maximumDailyReallocationBps;
        state.day = uint64(block.timestamp / 1 days);
        state.usedTurnoverBps = dailyTurnoverBps[state.day];
        uint16 remaining = dailyMaximum - state.usedTurnoverBps;
        if (state.actionBps > remaining) revert DailyTurnoverExceeded(state.actionBps, remaining);
        uint256 fairOutput = _convertValueToAmount(intent.assetOut, actionValue);
        uint256 requiredMinimum =
            Math.mulDiv(fairOutput, BPS_DENOMINATOR - executionPolicy.maximumSlippageBps, BPS_DENOMINATOR);
        if (intent.minimumAmountOut < requiredMinimum) {
            revert SlippagePolicyViolated(intent.minimumAmountOut, requiredMinimum);
        }
    }

    function _supplyYield(YieldIntent calldata intent) private whenNotPaused returns (uint256 positionIncrease) {
        _validateYieldIntent(intent);
        uint256 planned = planYieldSupply(intent.adapter, intent.underlying);
        if (planned == 0 || intent.amount != planned) revert ActionLimitExceeded(intent.amount, planned);
        (uint256 totalValue,,) = _validatePortfolio(false);
        uint256 positionValue = _yieldPositionValue();
        totalValue += positionValue;
        uint16 actionBps = uint16(
            Math.mulDiv(_assetValue(intent.underlying, intent.amount), BPS_DENOMINATOR, totalValue, Math.Rounding.Ceil)
        );
        uint64 day = uint64(block.timestamp / 1 days);
        consumedIntentIds[intent.intentId] = true;
        dailyTurnoverBps[day] += actionBps;
        IAdaptaraYieldAdapter adapter = IAdaptaraYieldAdapter(intent.adapter);
        address positionToken = adapter.aToken();
        uint256 underlyingBefore = IERC20(intent.underlying).balanceOf(address(this));
        uint256 positionBefore = IERC20(positionToken).balanceOf(address(this));
        IERC20(intent.underlying).forceApprove(intent.adapter, intent.amount);
        positionIncrease = adapter.supply(
            IAdaptaraYieldAdapter.SupplyRequest(
                address(this), intent.underlying, intent.amount, intent.deadline, intent.intentId
            )
        );
        IERC20(intent.underlying).forceApprove(intent.adapter, 0);
        uint256 actualIn = underlyingBefore - IERC20(intent.underlying).balanceOf(address(this));
        uint256 actualPosition = IERC20(positionToken).balanceOf(address(this)) - positionBefore;
        if (actualIn != intent.amount) revert ActualInputMismatch(intent.amount, actualIn);
        if (actualPosition != positionIncrease) revert AdapterOutputMismatch(positionIncrease, actualPosition);
        if (yieldPosition.adapter == address(0)) {
            yieldPosition.adapter = intent.adapter;
            yieldPosition.underlying = intent.underlying;
            yieldPosition.aToken = positionToken;
        }
        yieldPosition.principalSupplied += actualIn;
        yieldPosition.accountedBasis += actualPosition;
        _validateEconomicPortfolio();
        emit YieldSupplied(intent.intentId, intent.adapter, intent.underlying, actualIn, actualPosition);
    }

    function _withdrawYield(YieldIntent calldata intent) private whenNotPaused returns (uint256 returned) {
        _validateYieldIntent(intent);
        if (intent.adapter != yieldPosition.adapter || intent.underlying != yieldPosition.underlying) {
            revert YieldStrategyMismatch();
        }
        uint256 positionBalance = IERC20(yieldPosition.aToken).balanceOf(address(this));
        if (intent.amount == 0 || intent.amount > positionBalance) {
            revert InsufficientBalance(yieldPosition.aToken, intent.amount, positionBalance);
        }
        consumedIntentIds[intent.intentId] = true;
        IERC20(yieldPosition.aToken).forceApprove(intent.adapter, intent.amount);
        returned = IAdaptaraYieldAdapter(intent.adapter)
            .withdraw(
                IAdaptaraYieldAdapter.WithdrawRequest(
                    address(this), intent.underlying, intent.amount, intent.deadline, intent.intentId
                )
            );
        IERC20(yieldPosition.aToken).forceApprove(intent.adapter, 0);
        uint256 principalReduction = Math.min(returned, yieldPosition.principalSupplied);
        yieldPosition.principalSupplied -= principalReduction;
        yieldPosition.accountedBasis = positionBalance > intent.amount ? positionBalance - intent.amount : 0;
        _validateEconomicPortfolio();
        emit YieldWithdrawn(intent.intentId, intent.adapter, intent.underlying, returned);
    }

    function _settleYield(YieldIntent calldata intent)
        private
        whenNotPaused
        returns (uint256 retained, uint256 reserveAmount)
    {
        _validateYieldIntent(intent);
        if (
            intent.adapter != yieldPosition.adapter || intent.underlying != yieldPosition.underlying
                || intent.amount != 0
        ) revert YieldStrategyMismatch();
        uint256 earned = accruedYield();
        if (earned == 0) revert NoAccruedYield();
        if (earned < yieldPolicy.minimumSettlementAmount) {
            revert SettlementBelowMinimum(earned, yieldPolicy.minimumSettlementAmount);
        }
        YieldAccountingV1.Settlement memory settlement = YieldAccountingV1.settle(
            IERC20(yieldPosition.aToken).balanceOf(address(this)), yieldPosition.accountedBasis, yieldPolicy.reserveBps
        );
        reserveAmount = settlement.reserveAmount;
        retained = settlement.retained;
        consumedIntentIds[intent.intentId] = true;
        if (reserveAmount != 0) {
            IERC20(yieldPosition.aToken).forceApprove(intent.adapter, reserveAmount);
            uint256 returned = IAdaptaraYieldAdapter(intent.adapter)
                .withdraw(
                    IAdaptaraYieldAdapter.WithdrawRequest(
                        address(this), intent.underlying, reserveAmount, intent.deadline, intent.intentId
                    )
                );
            IERC20(yieldPosition.aToken).forceApprove(intent.adapter, 0);
            if (returned != reserveAmount) revert ActualInputMismatch(reserveAmount, returned);
        }
        yieldPosition.accountedBasis = IERC20(yieldPosition.aToken).balanceOf(address(this));
        yieldPosition.cumulativeSettledYield += earned;
        yieldPosition.cumulativeReserveReturned += reserveAmount;
        yieldPosition.cumulativeRetainedYield += retained;
        yieldPosition.lastSettlementTime = uint64(block.timestamp);
        _validateEconomicPortfolio();
        emit YieldSettled(intent.intentId, intent.adapter, earned, retained, reserveAmount);
    }

    function _validateYieldIntent(YieldIntent calldata intent) private view {
        _validateYieldStrategy(intent.adapter, intent.underlying);
        if (intent.intentId == bytes32(0)) revert InvalidIntentId();
        if (consumedIntentIds[intent.intentId]) revert IntentAlreadyConsumed(intent.intentId);
        uint64 current = uint64(block.timestamp);
        if (intent.deadline < current) revert IntentExpired(intent.deadline, current);
        if (intent.deadline > current + executionPolicy.maximumIntentLifetime) {
            revert IntentLifetimeExceeded(intent.deadline, current + executionPolicy.maximumIntentLifetime);
        }
    }

    function _validateYieldStrategy(address adapter, address underlying) private view {
        if (!vaultPolicyConfigured || !executionPolicyConfigured || !yieldPolicyConfigured || !yieldPolicy.enabled) {
            revert YieldPolicyNotConfigured();
        }
        if (!isManagedAsset[underlying]) revert AssetNotManaged(underlying);
        if (!allowedAdapters[adapter]) revert AdapterNotAllowed(adapter);
        if (!protocolAdapterRegistry.isSupportedAdapter(adapter)) revert AdapterNotProtocolSupported(adapter);
        if (IAdaptaraYieldAdapter(adapter).underlying() != underlying) revert YieldStrategyMismatch();
    }

    function _validateAdaptiveCaller() private view {
        if (managementMode != ManagementMode.Adaptive) revert WrongManagementMode(managementMode);
        if (msg.sender != agentExecutor || msg.sender == address(0)) revert UnauthorizedExecutor(msg.sender);
        if (autonomousPaused) revert AutonomousManagementPaused();
        if (!executionPolicy.autonomousManagementEnabled) revert AutonomousManagementDisabled();
    }

    function _yieldPositionValue() private view returns (uint256) {
        if (yieldPosition.aToken == address(0)) return 0;
        return _assetValue(yieldPosition.underlying, IERC20(yieldPosition.aToken).balanceOf(address(this)));
    }

    function _validateEconomicPortfolio() private view {
        (uint256 liquidTotal, uint256 liquidReserve, uint256 aggressive) = _validatePortfolio(false);
        uint256 positionValue = _yieldPositionValue();
        uint256 total = liquidTotal + positionValue;
        uint16 reserveBps = uint16(Math.mulDiv(liquidReserve, BPS_DENOMINATOR, total));
        if (reserveBps < policy.minimumReserveBps) revert MinimumReserveViolated(reserveBps, policy.minimumReserveBps);
        uint16 strategyBps = uint16(Math.mulDiv(positionValue, BPS_DENOMINATOR, total, Math.Rounding.Ceil));
        if (strategyBps > yieldPolicy.maximumYieldStrategyBps) {
            revert YieldStrategyExposureViolated(strategyBps, yieldPolicy.maximumYieldStrategyBps);
        }
        uint256 underlyingEconomic = _assetValue(
            yieldPosition.underlying, IERC20(yieldPosition.underlying).balanceOf(address(this))
        ) + positionValue;
        uint16 concentration = uint16(Math.mulDiv(underlyingEconomic, BPS_DENOMINATOR, total, Math.Rounding.Ceil));
        if (concentration > policy.maximumSingleAssetExposureBps) {
            revert SingleAssetExposureViolated(
                yieldPosition.underlying, concentration, policy.maximumSingleAssetExposureBps
            );
        }
        uint16 aggressiveBps = uint16(Math.mulDiv(aggressive, BPS_DENOMINATOR, total, Math.Rounding.Ceil));
        if (aggressiveBps > policy.maximumAggressiveExposureBps) {
            revert AggressiveExposureViolated(aggressiveBps, policy.maximumAggressiveExposureBps);
        }
    }

    function _callAdapterAndVerify(SwapIntent calldata intent) private returns (uint256 actualIn, uint256 actualOut) {
        uint256 inBefore = IERC20(intent.assetIn).balanceOf(address(this));
        uint256 outBefore = IERC20(intent.assetOut).balanceOf(address(this));
        if (intent.amountIn > inBefore) revert InsufficientBalance(intent.assetIn, intent.amountIn, inBefore);
        IERC20(intent.assetIn).forceApprove(intent.adapter, intent.amountIn);
        uint256 reported = IAdaptaraAdapter(intent.adapter)
            .swap(
                IAdaptaraAdapter.SwapRequest({
                vault: address(this),
                assetIn: intent.assetIn,
                assetOut: intent.assetOut,
                amountIn: intent.amountIn,
                minimumAmountOut: intent.minimumAmountOut,
                deadline: intent.deadline,
                intentId: intent.intentId
            })
            );
        IERC20(intent.assetIn).forceApprove(intent.adapter, 0);
        uint256 inAfter = IERC20(intent.assetIn).balanceOf(address(this));
        uint256 outAfter = IERC20(intent.assetOut).balanceOf(address(this));
        actualIn = inBefore - inAfter;
        actualOut = outAfter - outBefore;
        if (actualIn != intent.amountIn) revert ActualInputMismatch(intent.amountIn, actualIn);
        if (actualOut < intent.minimumAmountOut) revert InsufficientActualOutput(actualOut, intent.minimumAmountOut);
        if (reported != actualOut) revert AdapterOutputMismatch(reported, actualOut);
    }

    function _validatePortfolio(bool enforcePolicy)
        private
        view
        returns (uint256 totalValue, uint256 reserveValue, uint256 aggressiveValue)
    {
        uint256 length = _managedAssets.length;
        uint256[] memory values = new uint256[](length);
        for (uint256 i; i < length; ++i) {
            address asset = _managedAssets[i];
            uint256 value = _assetValue(asset, IERC20(asset).balanceOf(address(this)));
            values[i] = value;
            totalValue += value;
            IAssetRegistry.AssetConfig memory config = assetRegistry.getAssetConfig(asset);
            if (!config.supported) revert ValuationUnavailable(asset);
            if (config.baselineRiskTier == IAssetRegistry.RiskTier.Reserve) reserveValue += value;
            if (config.baselineRiskTier == IAssetRegistry.RiskTier.Aggressive) aggressiveValue += value;
        }
        if (totalValue == 0) revert ZeroPortfolioValue();
        if (!enforcePolicy) return (totalValue, reserveValue, aggressiveValue);
        uint16 reserveBps = uint16(Math.mulDiv(reserveValue, BPS_DENOMINATOR, totalValue));
        if (reserveBps < policy.minimumReserveBps) revert MinimumReserveViolated(reserveBps, policy.minimumReserveBps);
        for (uint256 i; i < length; ++i) {
            uint16 exposureBps = uint16(Math.mulDiv(values[i], BPS_DENOMINATOR, totalValue, Math.Rounding.Ceil));
            if (exposureBps > policy.maximumSingleAssetExposureBps) {
                revert SingleAssetExposureViolated(_managedAssets[i], exposureBps, policy.maximumSingleAssetExposureBps);
            }
        }
        uint16 aggressiveBps = uint16(Math.mulDiv(aggressiveValue, BPS_DENOMINATOR, totalValue, Math.Rounding.Ceil));
        if (aggressiveBps > policy.maximumAggressiveExposureBps) {
            revert AggressiveExposureViolated(aggressiveBps, policy.maximumAggressiveExposureBps);
        }
    }

    function _assetValue(address asset, uint256 amount) private view returns (uint256) {
        IAdaptaraValuationProvider.Valuation memory valuation = valuationProvider.getValuation(asset);
        if (!valuation.valid || valuation.priceE18 == 0 || valuation.updatedAt > block.timestamp) {
            revert ValuationUnavailable(asset);
        }
        if (block.timestamp - valuation.updatedAt > maximumValuationAge) {
            revert ValuationStale(asset, valuation.updatedAt);
        }
        uint8 decimals = IERC20Metadata(asset).decimals();
        if (decimals > 36) revert InvalidTokenDecimals(asset, decimals);
        return Math.mulDiv(amount, valuation.priceE18, 10 ** decimals);
    }

    function _convertValueToAmount(address asset, uint256 valueE18) private view returns (uint256) {
        IAdaptaraValuationProvider.Valuation memory valuation = valuationProvider.getValuation(asset);
        if (!valuation.valid || valuation.priceE18 == 0 || valuation.updatedAt > block.timestamp) {
            revert ValuationUnavailable(asset);
        }
        if (block.timestamp - valuation.updatedAt > maximumValuationAge) {
            revert ValuationStale(asset, valuation.updatedAt);
        }
        uint8 decimals = IERC20Metadata(asset).decimals();
        if (decimals > 36) revert InvalidTokenDecimals(asset, decimals);
        return Math.mulDiv(valueE18, 10 ** decimals, valuation.priceE18);
    }

    function transferOwnership(address) public pure override {
        revert OwnershipTransferDisabled();
    }

    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }

    function _validateBps(uint256 value) private pure {
        if (value > BPS_DENOMINATOR) revert InvalidBps(value);
    }

    function _validateExecutor(address executor, address vaultOwner, address vaultGuardian) private pure {
        if (executor != address(0) && (executor == vaultOwner || executor == vaultGuardian)) {
            revert RoleCollision(executor);
        }
    }
}
