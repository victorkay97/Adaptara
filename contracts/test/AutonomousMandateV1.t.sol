// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AutonomousMandateV1} from "../src/AutonomousMandateV1.sol";
import {IAdaptiveVaultAuthority} from "../src/interfaces/IAdaptiveVaultAuthority.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract AdapterFixture {}

contract AutonomousMandateV1Test is Test {
    address internal owner = makeAddr("owner");
    address internal executor = makeAddr("executor");
    address internal guardian = makeAddr("guardian");
    address internal attacker = makeAddr("attacker");
    AssetRegistry internal registry;
    AdaptiveVault internal vault;
    AutonomousMandateV1 internal mandate;
    MockERC20 internal assetIn;
    MockERC20 internal assetOut;
    AdapterFixture internal adapter;

    function setUp() public {
        registry = new AssetRegistry(1 days, address(this));
        assetIn = new MockERC20("Asset In", "AIN");
        assetOut = new MockERC20("Asset Out", "AOUT");
        adapter = new AdapterFixture();
        registry.registerAsset(address(assetIn), IAssetRegistry.RiskTier.Reserve);
        registry.registerAsset(address(assetOut), IAssetRegistry.RiskTier.Balanced);
        vault = new AdaptiveVault(owner, guardian, executor, registry);
        mandate = new AutonomousMandateV1(IAdaptiveVaultAuthority(address(vault)));
    }

    function testDefaultsFailClosed() public view {
        assertEq(uint256(mandate.managementMode()), uint256(AutonomousMandateV1.ManagementMode.Advisory));
        assertTrue(mandate.autonomousPaused());
        assertFalse(mandate.policyConfigured());
    }

    function testOwnerConfiguresPolicyModeAllowlistsAndPause() public {
        vm.startPrank(owner);
        mandate.setExecutionPolicy(_policy(true));
        mandate.setAllowedAsset(address(assetIn), true);
        mandate.setAllowedAsset(address(assetOut), true);
        mandate.setAllowedAdapter(address(adapter), true);
        mandate.setManagementMode(AutonomousMandateV1.ManagementMode.Adaptive);
        mandate.setAutonomousPaused(false);
        vm.stopPrank();
        assertTrue(mandate.policyConfigured());
        assertEq(mandate.allowedAssetCount(), 2);
        assertEq(mandate.allowedAdapterCount(), 1);
        assertFalse(mandate.autonomousPaused());
    }

    function testNonOwnerAndExecutorCannotModifyAuthorityOrPolicy() public {
        address[2] memory callers = [attacker, executor];
        for (uint256 i; i < callers.length; ++i) {
            vm.startPrank(callers[i]);
            vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.NotVaultOwner.selector, callers[i]));
            mandate.setExecutionPolicy(_policy(true));
            vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.NotVaultOwner.selector, callers[i]));
            mandate.setAllowedAdapter(address(adapter), true);
            vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.NotVaultOwner.selector, callers[i]));
            mandate.setAllowedAsset(address(assetIn), true);
            vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.NotVaultOwner.selector, callers[i]));
            mandate.setAutonomousPaused(false);
            vm.stopPrank();
        }
    }

    function testYieldSplitAndPolicyBoundsAreEnforced() public {
        AutonomousMandateV1.ExecutionPolicy memory invalid = _policy(true);
        invalid.yieldReserveBps = 4_999;
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.InvalidYieldSplit.selector, 9_999));
        vm.prank(owner);
        mandate.setExecutionPolicy(invalid);
        invalid = _policy(true);
        invalid.maximumSlippageBps = 10_001;
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.InvalidBps.selector, 10_001));
        vm.prank(owner);
        mandate.setExecutionPolicy(invalid);
    }

    function testAdvisoryAndApprovalRequiredRejectAutonomousPath() public {
        _configure(false);
        vm.expectRevert(
            abi.encodeWithSelector(
                AutonomousMandateV1.WrongManagementMode.selector, AutonomousMandateV1.ManagementMode.Advisory
            )
        );
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(500, uint64(block.timestamp + 60), bytes32("advisory")));
        vm.prank(owner);
        mandate.setManagementMode(AutonomousMandateV1.ManagementMode.ApprovalRequired);
        vm.expectRevert(
            abi.encodeWithSelector(
                AutonomousMandateV1.WrongManagementMode.selector, AutonomousMandateV1.ManagementMode.ApprovalRequired
            )
        );
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(500, uint64(block.timestamp + 60), bytes32("approval")));
    }

    function testAdaptiveAuthorizedFreshAllowedIntentIsAcceptedWithoutAssetMovement() public {
        _configure(true);
        assetIn.mint(address(vault), 100 ether);
        uint256 beforeBalance = assetIn.balanceOf(address(vault));
        bytes32 id = bytes32("accepted");
        vm.prank(executor);
        bytes32 intentHash = mandate.acceptSwapIntent(_intent(1_000, uint64(block.timestamp + 60), id));
        assertTrue(intentHash != bytes32(0));
        assertTrue(mandate.acceptedIntentIds(id));
        assertEq(mandate.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 1_000);
        assertEq(assetIn.balanceOf(address(vault)), beforeBalance);
        assertEq(assetOut.balanceOf(address(vault)), 0);
    }

    function testUnauthorizedAndRevokedExecutorsAreRejected() public {
        _configure(true);
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.UnauthorizedExecutor.selector, attacker));
        vm.prank(attacker);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("bad")));
        vm.prank(owner);
        vault.setAgentExecutor(address(0));
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.UnauthorizedExecutor.selector, executor));
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("revoked")));
    }

    function testOwnerAndGuardianPauseVaultButOnlyOwnerUnpausesBothLayers() public {
        _configure(true);
        vm.prank(guardian);
        vault.pause();
        vm.expectRevert(AutonomousMandateV1.VaultPaused.selector);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("paused")));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, executor));
        vm.prank(executor);
        vault.unpause();
        vm.prank(owner);
        vault.unpause();
        vm.prank(owner);
        mandate.setAutonomousPaused(true);
        vm.expectRevert(AutonomousMandateV1.AutonomousManagementPaused.selector);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("mandate-paused")));
    }

    function testDisabledOrMissingPolicyFailsClosed() public {
        vm.startPrank(owner);
        mandate.setManagementMode(AutonomousMandateV1.ManagementMode.Adaptive);
        mandate.setAutonomousPaused(false);
        vm.stopPrank();
        vm.expectRevert(AutonomousMandateV1.PolicyNotConfigured.selector);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("missing")));
        vm.prank(owner);
        mandate.setExecutionPolicy(_policy(false));
        vm.expectRevert(AutonomousMandateV1.AutonomousManagementDisabled.selector);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("disabled")));
    }

    function testUnknownAssetAndAdapterAreRejected() public {
        _configure(true);
        MockERC20 unknown = new MockERC20("Unknown", "UNK");
        AutonomousMandateV1.SwapIntent memory intent = _intent(1, uint64(block.timestamp + 60), bytes32("asset"));
        intent.assetOut = address(unknown);
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.AssetNotAllowed.selector, address(unknown)));
        vm.prank(executor);
        mandate.acceptSwapIntent(intent);
        intent = _intent(1, uint64(block.timestamp + 60), bytes32("adapter"));
        intent.adapter = address(new AdapterFixture());
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.AdapterNotAllowed.selector, intent.adapter));
        vm.prank(executor);
        mandate.acceptSwapIntent(intent);
    }

    function testActionSlippageAndDailyLimitsIncludingBoundaries() public {
        _configure(true);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(2_000, uint64(block.timestamp + 60), bytes32("boundary")));
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.DailyTurnoverExceeded.selector, 1_001, 1_000));
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1_001, uint64(block.timestamp + 60), bytes32("daily")));
        AutonomousMandateV1.SwapIntent memory intent = _intent(2_001, uint64(block.timestamp + 60), bytes32("action"));
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.ActionLimitExceeded.selector, 2_001, 2_000));
        vm.prank(executor);
        mandate.acceptSwapIntent(intent);
        intent = _intent(1, uint64(block.timestamp + 60), bytes32("slippage"));
        intent.slippageBps = 101;
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.SlippageLimitExceeded.selector, 101, 100));
        vm.prank(executor);
        mandate.acceptSwapIntent(intent);
    }

    function testExpiryFreshBoundaryExpiredAndTooDistant() public {
        _configure(true);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp), bytes32("boundary")));
        vm.warp(block.timestamp + 1);
        vm.expectRevert();
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp - 1), bytes32("expired")));
        vm.expectRevert();
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 301), bytes32("distant")));
    }

    function testReplayRejectedAndDailyTurnoverResetsByUtcDay() public {
        _configure(true);
        bytes32 id = bytes32("once");
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), id));
        vm.expectRevert(abi.encodeWithSelector(AutonomousMandateV1.IntentAlreadyAccepted.selector, id));
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), id));
        vm.warp(((block.timestamp / 1 days) + 1) * 1 days);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(2_000, uint64(block.timestamp + 60), bytes32("next-day")));
    }

    function testNoArbitraryCallOrWithdrawalSurfaceExists() public {
        _configure(true);
        bytes4[3] memory selectors = [
            bytes4(keccak256("execute(address,bytes)")),
            bytes4(keccak256("delegatecall(address,bytes)")),
            bytes4(keccak256("withdraw(address,address,uint256)"))
        ];
        for (uint256 i; i < selectors.length; ++i) {
            vm.prank(executor);
            (bool success,) = address(mandate).call(abi.encodeWithSelector(selectors[i], address(adapter), bytes("")));
            assertFalse(success);
        }
    }

    function testMandateCannotPullPersonalWalletFundsOrApproveAdapters() public {
        _configure(true);
        assetIn.mint(owner, 100 ether);
        vm.prank(executor);
        mandate.acceptSwapIntent(_intent(1, uint64(block.timestamp + 60), bytes32("no-movement")));
        assertEq(assetIn.balanceOf(owner), 100 ether);
        assertEq(assetIn.allowance(owner, address(mandate)), 0);
        assertEq(assetIn.allowance(address(vault), address(adapter)), 0);
    }

    function _configure(bool adaptive) private {
        vm.startPrank(owner);
        mandate.setExecutionPolicy(_policy(true));
        mandate.setAllowedAsset(address(assetIn), true);
        mandate.setAllowedAsset(address(assetOut), true);
        mandate.setAllowedAdapter(address(adapter), true);
        mandate.setAutonomousPaused(false);
        if (adaptive) mandate.setManagementMode(AutonomousMandateV1.ManagementMode.Adaptive);
        vm.stopPrank();
    }

    function _policy(bool enabled) private pure returns (AutonomousMandateV1.ExecutionPolicy memory) {
        return AutonomousMandateV1.ExecutionPolicy({
            maximumSingleActionBps: 2_000,
            maximumDailyTurnoverBps: 3_000,
            maximumSlippageBps: 100,
            yieldCompoundBps: 5_000,
            yieldReserveBps: 5_000,
            maximumIntentLifetime: 300,
            autonomousManagementEnabled: enabled
        });
    }

    function _intent(uint16 exposureBps, uint64 deadline, bytes32 id)
        private
        view
        returns (AutonomousMandateV1.SwapIntent memory)
    {
        return AutonomousMandateV1.SwapIntent({
            kind: AutonomousMandateV1.ActionKind.Swap,
            assetIn: address(assetIn),
            assetOut: address(assetOut),
            adapter: address(adapter),
            amountIn: 1 ether,
            minimumAmountOut: 1,
            actionExposureBps: exposureBps,
            slippageBps: 100,
            deadline: deadline,
            intentId: id
        });
    }
}
