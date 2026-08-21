// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraAdapter} from "../src/interfaces/IAdaptaraAdapter.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";

contract MockValuationProvider is IAdaptaraValuationProvider {
    mapping(address => Valuation) internal valuations;

    function set(address asset, uint256 priceE18, uint64 updatedAt, bool valid) external {
        valuations[asset] = Valuation(priceE18, updatedAt, valid);
    }

    function getValuation(address asset) external view returns (Valuation memory) {
        return valuations[asset];
    }
}

contract MockSwapAdapter is IAdaptaraAdapter {
    enum Mode {
        Success,
        Lie,
        NoOutput,
        PartialOutput,
        WrongAsset,
        Overpull,
        Reenter,
        RevertAlways
    }

    Mode public mode;
    address public wrongAsset;
    bool public reentryBlocked;

    function configure(Mode mode_, address wrongAsset_) external {
        mode = mode_;
        wrongAsset = wrongAsset_;
        reentryBlocked = false;
    }

    function swap(SwapRequest calldata request) external returns (uint256 reported) {
        if (mode == Mode.RevertAlways) revert("mock adapter revert");
        uint256 pull = mode == Mode.Overpull ? request.amountIn + 1 : request.amountIn;
        require(IERC20(request.assetIn).transferFrom(request.vault, address(this), pull), "mock input transfer");
        if (mode == Mode.Reenter) {
            AdaptiveManagedVaultV1.SwapIntent memory nested = AdaptiveManagedVaultV1.SwapIntent({
                assetIn: request.assetIn,
                assetOut: request.assetOut,
                adapter: address(this),
                amountIn: 1,
                minimumAmountOut: 1,
                deadline: request.deadline,
                intentId: keccak256(abi.encode(request.intentId))
            });
            (bool success, bytes memory data) =
                request.vault.call(abi.encodeCall(AdaptiveManagedVaultV1.executeAdaptiveSwap, (nested)));
            reentryBlocked = !success && bytes4(data) == ReentrancyGuard.ReentrancyGuardReentrantCall.selector;
        }
        uint256 output = request.amountIn;
        if (mode == Mode.NoOutput) output = 0;
        if (mode == Mode.PartialOutput) output = request.minimumAmountOut - 1;
        if (mode == Mode.WrongAsset) require(IERC20(wrongAsset).transfer(request.vault, output), "mock wrong output");
        else if (output != 0) require(IERC20(request.assetOut).transfer(request.vault, output), "mock output transfer");
        reported = mode == Mode.Lie ? output + 1 : output;
    }
}

contract AdaptiveManagedVaultV1Test is Test {
    address internal owner = makeAddr("owner");
    address internal executor = makeAddr("executor");
    address internal guardian = makeAddr("guardian");
    address internal attacker = makeAddr("attacker");
    AssetRegistry internal registry;
    MockValuationProvider internal provider;
    AdaptiveManagedVaultV1 internal vault;
    MockSwapAdapter internal adapter;
    ProtocolAdapterRegistryV1 internal adapterRegistry;
    MockERC20 internal reserve;
    MockERC20 internal defensive;
    MockERC20 internal balanced;
    MockERC20 internal aggressive;
    MockERC20 internal unknown;

    function setUp() public {
        vm.warp(10 days);
        registry = new AssetRegistry(1 days, address(this));
        provider = new MockValuationProvider();
        reserve = new MockERC20("Reserve", "RSV");
        defensive = new MockERC20("Defensive", "DEF");
        balanced = new MockERC20("Balanced", "BAL");
        aggressive = new MockERC20("Aggressive", "AGR");
        unknown = new MockERC20("Unknown", "UNK");
        registry.registerAsset(address(reserve), IAssetRegistry.RiskTier.Reserve);
        registry.registerAsset(address(defensive), IAssetRegistry.RiskTier.Defensive);
        registry.registerAsset(address(balanced), IAssetRegistry.RiskTier.Balanced);
        registry.registerAsset(address(aggressive), IAssetRegistry.RiskTier.Aggressive);
        adapter = new MockSwapAdapter();
        adapterRegistry = new ProtocolAdapterRegistryV1(1 days, address(this));
        adapterRegistry.registerAdapter(address(adapter), keccak256("swap"), keccak256("v1"));
        vault = new AdaptiveManagedVaultV1(owner, guardian, executor, registry, provider, adapterRegistry, 1 hours);
        _configureAssetsAndPolicies();
        _fundPortfolio();
        reserve.mint(address(adapter), 1_000 ether);
        defensive.mint(address(adapter), 1_000 ether);
        balanced.mint(address(adapter), 1_000 ether);
        aggressive.mint(address(adapter), 1_000 ether);
    }

    function testApprovalRequiredOwnerSwapSucceedsAndRecordsActualResult() public {
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 10 ether, "owner");
        vm.expectEmit(true, false, true, false, address(vault));
        emit AdaptiveManagedVaultV1.SwapExecuted(
            intent.intentId,
            bytes32(0),
            owner,
            address(adapter),
            address(balanced),
            address(reserve),
            10 ether,
            10 ether,
            AdaptiveManagedVaultV1.ExecutionPath.OwnerApproval
        );
        vm.prank(owner);
        AdaptiveManagedVaultV1.ExecutionResult memory result = vault.executeOwnerApprovedSwap(intent);
        assertEq(result.actualAmountIn, 10 ether);
        assertEq(result.actualAmountOut, 10 ether);
        assertEq(balanced.balanceOf(address(vault)), 10 ether);
        assertEq(reserve.balanceOf(address(vault)), 60 ether);
        assertEq(balanced.allowance(address(vault), address(adapter)), 0);
        assertTrue(vault.consumedIntentIds(intent.intentId));
        assertEq(vault.executionResult(intent.intentId).initiator, owner);
    }

    function testAdaptiveExecutorSwapSucceedsAtDeadlineBoundary() public {
        _enableAdaptive();
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 10 ether, "adaptive");
        intent.deadline = uint64(block.timestamp);
        vm.prank(executor);
        AdaptiveManagedVaultV1.ExecutionResult memory result = vault.executeAdaptiveSwap(intent);
        assertEq(uint256(result.path), uint256(AdaptiveManagedVaultV1.ExecutionPath.AdaptiveExecutor));
        assertEq(result.initiator, executor);
    }

    function testModeAndCallerAuthorizationFailClosed() public {
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intent(address(balanced), address(reserve), 1 ether, "mode");
        vm.expectRevert();
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        vm.expectRevert();
        vm.prank(executor);
        vault.executeOwnerApprovedSwap(intent);
        _enableAdaptive();
        vm.expectRevert(abi.encodeWithSelector(AdaptiveManagedVaultV1.UnauthorizedExecutor.selector, owner));
        vm.prank(owner);
        vault.executeAdaptiveSwap(intent);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveManagedVaultV1.UnauthorizedExecutor.selector, attacker));
        vm.prank(attacker);
        vault.executeAdaptiveSwap(intent);
    }

    function testRevocationAndBothPauseLayersStopAdaptiveExecution() public {
        _enableAdaptive();
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 1 ether, "revoked");
        vm.prank(owner);
        vault.setAgentExecutor(address(0));
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        vault.setAgentExecutor(executor);
        vm.prank(owner);
        vault.setAutonomousPaused(true);
        vm.expectRevert(AdaptiveManagedVaultV1.AutonomousManagementPaused.selector);
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        vault.setAutonomousPaused(false);
        vm.prank(guardian);
        vault.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
    }

    function testUnknownAssetsAndAdapterReject() public {
        _enableAdaptive();
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intent(address(unknown), address(reserve), 1 ether, "in");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(balanced), address(unknown), 1 ether, "out");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(balanced), address(reserve), 1 ether, "adapter");
        intent.adapter = address(new MockSwapAdapter());
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
    }

    function testProtocolAndOwnerAdapterApprovalAreBothRequired() public {
        MockSwapAdapter unreviewed = new MockSwapAdapter();
        vm.prank(owner);
        vault.setAllowedAdapter(address(unreviewed), true);
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 1 ether, "registry-intersection");
        intent.adapter = address(unreviewed);
        vm.expectRevert(
            abi.encodeWithSelector(AdaptiveManagedVaultV1.AdapterNotProtocolSupported.selector, address(unreviewed))
        );
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
        adapterRegistry.registerAdapter(address(unreviewed), keccak256("swap"), keccak256("v1"));
        reserve.mint(address(unreviewed), 10 ether);
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
        adapterRegistry.disableAdapter(address(unreviewed));
        intent.intentId = keccak256("disabled");
        vm.expectRevert(
            abi.encodeWithSelector(AdaptiveManagedVaultV1.AdapterNotProtocolSupported.selector, address(unreviewed))
        );
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
    }

    function testExpiredReplayZeroAndSameAssetReject() public {
        _enableAdaptive();
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intent(address(balanced), address(reserve), 1 ether, "time");
        intent.deadline = uint64(block.timestamp - 1);
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(balanced), address(reserve), 1 ether, "once");
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(reserve), address(reserve), 1 ether, "same");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(balanced), address(reserve), 0, "zero");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
    }

    function testActionDailyAndSlippageLimitsUseAuthoritativeValue() public {
        _enableAdaptive();
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(defensive), 20 ether, "boundary");
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(defensive), address(reserve), 11 ether, "daily");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.warp(block.timestamp + 1 days);
        _refreshPrices();
        intent = _intent(address(defensive), address(reserve), 20 ether + 1, "action");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        intent = _intent(address(defensive), address(reserve), 1 ether, "slippage");
        intent.minimumAmountOut = 989_999_999_999_999_999;
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
    }

    function testStaleMissingAndZeroValuationRejectOwnerAndExecutor() public {
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        provider.set(address(reserve), 1 ether, uint64(block.timestamp - 1 hours - 1), true);
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intent(address(balanced), address(reserve), 1 ether, "stale");
        vm.expectRevert();
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
        provider.set(address(reserve), 0, uint64(block.timestamp), true);
        vm.expectRevert();
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
        provider.set(address(reserve), 1 ether, uint64(block.timestamp), false);
        vm.expectRevert();
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(intent);
    }

    function testReserveViolationRevertsEveryEffectAtomically() public {
        _enableAdaptive();
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(reserve), address(balanced), 15 ether, "reserve-fail");
        uint256 reserveBefore = reserve.balanceOf(address(vault));
        uint256 balancedBefore = balanced.balanceOf(address(vault));
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        assertEq(reserve.balanceOf(address(vault)), reserveBefore);
        assertEq(balanced.balanceOf(address(vault)), balancedBefore);
        assertFalse(vault.consumedIntentIds(intent.intentId));
        assertEq(vault.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
        assertEq(vault.executionResult(intent.intentId).executedAt, 0);
        assertEq(reserve.allowance(address(vault), address(adapter)), 0);
    }

    function testSingleAssetAndAggressivePostStateViolationsRevert() public {
        _enableAdaptive();
        vm.prank(owner);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(0, 50_00, 10_000, 30_00));
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 0.01 ether, "single-one-bps-over");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(0, 10_000, 20_00, 30_00));
        intent = _intent(address(balanced), address(aggressive), 15 ether, "aggressive");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
    }

    function testExactConstitutionBoundarySucceeds() public {
        _enableAdaptive();
        vm.prank(owner);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(40_00, 60_00, 20_00, 30_00));
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(reserve), address(aggressive), 10 ether, "exact");
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        assertEq(reserve.balanceOf(address(vault)), 40 ether);
        assertEq(aggressive.balanceOf(address(vault)), 20 ether);
    }

    function testMaliciousAdapterOutputLieNoOutputPartialAndWrongAssetRollback() public {
        _enableAdaptive();
        MockSwapAdapter.Mode[4] memory modes = [
            MockSwapAdapter.Mode.Lie,
            MockSwapAdapter.Mode.NoOutput,
            MockSwapAdapter.Mode.PartialOutput,
            MockSwapAdapter.Mode.WrongAsset
        ];
        for (uint256 i; i < modes.length; ++i) {
            adapter.configure(modes[i], address(unknown));
            unknown.mint(address(adapter), 10 ether);
            AdaptiveManagedVaultV1.SwapIntent memory intent =
                _intent(address(balanced), address(reserve), 1 ether, bytes32(i + 100));
            uint256 beforeBalance = balanced.balanceOf(address(vault));
            vm.expectRevert();
            vm.prank(executor);
            vault.executeAdaptiveSwap(intent);
            assertEq(balanced.balanceOf(address(vault)), beforeBalance);
            assertFalse(vault.consumedIntentIds(intent.intentId));
            assertEq(balanced.allowance(address(vault), address(adapter)), 0);
        }
    }

    function testOverpullAndDeliberateRevertRollbackWithoutAllowance() public {
        _enableAdaptive();
        MockSwapAdapter.Mode[2] memory modes = [MockSwapAdapter.Mode.Overpull, MockSwapAdapter.Mode.RevertAlways];
        for (uint256 i; i < modes.length; ++i) {
            adapter.configure(modes[i], address(0));
            AdaptiveManagedVaultV1.SwapIntent memory intent =
                _intent(address(balanced), address(reserve), 1 ether, bytes32(i + 200));
            vm.expectRevert();
            vm.prank(executor);
            vault.executeAdaptiveSwap(intent);
            assertFalse(vault.consumedIntentIds(intent.intentId));
            assertEq(balanced.allowance(address(vault), address(adapter)), 0);
        }
    }

    function testReentrancyAttemptIsBlockedAndOuterTypedSwapCanFinish() public {
        _enableAdaptive();
        adapter.configure(MockSwapAdapter.Mode.Reenter, address(0));
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 1 ether, "reenter");
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        assertTrue(adapter.reentryBlocked());
    }

    function testExecutorHasNoPolicyAllowlistWithdrawalOrArbitraryCallAuthority() public {
        _enableAdaptive();
        vm.startPrank(executor);
        vm.expectRevert();
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(0, 0, 0, 0));
        vm.expectRevert();
        vault.setAllowedAdapter(attacker, true);
        vm.expectRevert();
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Advisory);
        vm.expectRevert();
        vault.withdraw(address(reserve), executor, 1);
        (bool success,) = address(vault).call(abi.encodeWithSignature("execute(address,bytes)", attacker, bytes("")));
        assertFalse(success);
        vm.stopPrank();
    }

    function testPersonalWalletFundsAndProviderAuthorityRemainOutsideExecutor() public {
        _enableAdaptive();
        balanced.mint(owner, 100 ether);
        AdaptiveManagedVaultV1.SwapIntent memory intent =
            _intent(address(balanced), address(reserve), 1 ether, "personal");
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        assertEq(balanced.balanceOf(owner), 100 ether);
        assertEq(address(vault.valuationProvider()), address(provider));
    }

    function testSiblingReplayAndTurnoverAccountingAreIndependentAfterRealSwaps() public {
        AdaptiveManagedVaultV1 sibling =
            new AdaptiveManagedVaultV1(owner, guardian, executor, registry, provider, adapterRegistry, 1 hours);
        vm.startPrank(owner);
        sibling.addManagedAsset(address(reserve));
        sibling.addManagedAsset(address(defensive));
        sibling.addManagedAsset(address(balanced));
        sibling.addManagedAsset(address(aggressive));
        sibling.setAllowedAdapter(address(adapter), true);
        sibling.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(40_00, 60_00, 20_00, 30_00));
        sibling.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(20_00, 30_00, 100, 300, false));
        sibling.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        vm.stopPrank();
        reserve.mint(address(sibling), 50 ether);
        defensive.mint(address(sibling), 20 ether);
        balanced.mint(address(sibling), 20 ether);
        aggressive.mint(address(sibling), 10 ether);

        bytes32 sharedId = keccak256("sibling-scoped-intent");
        uint64 day = uint64(block.timestamp / 1 days);
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(_intent(address(balanced), address(reserve), 10 ether, sharedId));
        uint16 vaultTurnover = vault.dailyTurnoverBps(day);
        assertGt(vaultTurnover, 0);
        assertEq(sibling.dailyTurnoverBps(day), 0);
        assertTrue(vault.consumedIntentIds(sharedId));
        assertFalse(sibling.consumedIntentIds(sharedId));

        vm.prank(owner);
        sibling.executeOwnerApprovedSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                address(balanced),
                address(reserve),
                address(adapter),
                5 ether,
                5 ether,
                uint64(block.timestamp + 60),
                sharedId
            )
        );
        assertEq(vault.dailyTurnoverBps(day), vaultTurnover);
        assertGt(sibling.dailyTurnoverBps(day), 0);
        assertTrue(sibling.consumedIntentIds(sharedId));
    }

    function _configureAssetsAndPolicies() private {
        vm.startPrank(owner);
        vault.addManagedAsset(address(reserve));
        vault.addManagedAsset(address(defensive));
        vault.addManagedAsset(address(balanced));
        vault.addManagedAsset(address(aggressive));
        vault.setAllowedAdapter(address(adapter), true);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(40_00, 60_00, 20_00, 30_00));
        vault.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(20_00, 30_00, 100, 300, true));
        vm.stopPrank();
        _refreshPrices();
    }

    function _refreshPrices() private {
        provider.set(address(reserve), 1 ether, uint64(block.timestamp), true);
        provider.set(address(defensive), 1 ether, uint64(block.timestamp), true);
        provider.set(address(balanced), 1 ether, uint64(block.timestamp), true);
        provider.set(address(aggressive), 1 ether, uint64(block.timestamp), true);
    }

    function _fundPortfolio() private {
        reserve.mint(address(vault), 50 ether);
        defensive.mint(address(vault), 20 ether);
        balanced.mint(address(vault), 20 ether);
        aggressive.mint(address(vault), 10 ether);
    }

    function _enableAdaptive() private {
        vm.startPrank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Adaptive);
        vault.setAutonomousPaused(false);
        vm.stopPrank();
    }

    function _intent(address assetIn, address assetOut, uint256 amount, bytes32 id)
        private
        view
        returns (AdaptiveManagedVaultV1.SwapIntent memory)
    {
        return AdaptiveManagedVaultV1.SwapIntent(
            assetIn, assetOut, address(adapter), amount, amount, uint64(block.timestamp + 60), id
        );
    }
}
