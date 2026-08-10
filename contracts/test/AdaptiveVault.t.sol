// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {FalseReturnERC20, RevertingERC20, NoReturnERC20, RejectingNativeRecipient} from "./mocks/AdversarialERC20.sol";

contract AdaptiveVaultTest is Test {
    AssetRegistry internal registry;
    AdaptiveVault internal vault;
    MockERC20 internal supported;
    MockERC20 internal unsupported;
    address internal owner = makeAddr("owner");
    address internal guardian = makeAddr("guardian");
    address internal agent = makeAddr("agent");
    address internal user = makeAddr("user");
    address internal recipient = makeAddr("recipient");

    function setUp() public {
        registry = new AssetRegistry(1 days, address(this));
        supported = new MockERC20("Supported Test Token", "STT");
        unsupported = new MockERC20("Unsupported Test Token", "UTT");
        registry.registerAsset(address(supported), IAssetRegistry.RiskTier.Defensive);
        vault = new AdaptiveVault(owner, guardian, agent, registry);
        supported.mint(user, type(uint128).max);
        vm.prank(user);
        supported.approve(address(vault), type(uint256).max);
    }

    function _deposit(uint256 amount) internal {
        vm.prank(user);
        vault.deposit(address(supported), amount);
    }

    function testSupportedDepositTransfersTokensAndEmitsEvent() public {
        vm.expectEmit(true, true, false, true, address(vault));
        emit AdaptiveVault.Deposited(address(supported), user, 100 ether);
        _deposit(100 ether);
        assertEq(supported.balanceOf(address(vault)), 100 ether);
    }

    function testUnsupportedAndZeroDepositsRevert() public {
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.UnsupportedAsset.selector, address(unsupported)));
        vault.deposit(address(unsupported), 1);
        vm.expectRevert(AdaptiveVault.ZeroAmount.selector);
        vault.deposit(address(supported), 0);
    }

    function testDisabledAssetDepositReverts() public {
        registry.disableAsset(address(supported));
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.UnsupportedAsset.selector, address(supported)));
        vault.deposit(address(supported), 1);
    }

    function testDisabledDepositedAssetCanBeRecoveredWithoutBeingTrapped() public {
        _deposit(100);
        registry.disableAsset(address(supported));

        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.UnsupportedAsset.selector, address(supported)));
        vm.prank(owner);
        vault.withdraw(address(supported), recipient, 100);

        vm.prank(owner);
        vault.recoverToken(address(supported), recipient, 100);
        assertEq(supported.balanceOf(address(vault)), 0);
        assertEq(supported.balanceOf(recipient), 100);
    }

    function testFuzzDeposit(uint128 amount) public {
        vm.assume(amount > 0);
        _deposit(amount);
        assertEq(supported.balanceOf(address(vault)), amount);
    }

    function testHostileTokenFailuresNeverReportSuccessfulMovement() public {
        FalseReturnERC20 falseToken = new FalseReturnERC20();
        RevertingERC20 revertingToken = new RevertingERC20();
        registry.registerAsset(address(falseToken), IAssetRegistry.RiskTier.Defensive);
        registry.registerAsset(address(revertingToken), IAssetRegistry.RiskTier.Defensive);

        falseToken.mint(user, 10);
        vm.expectRevert();
        vm.prank(user);
        vault.deposit(address(falseToken), 1);
        assertEq(falseToken.balanceOf(address(vault)), 0);

        revertingToken.mint(user, 10);
        vm.expectRevert(bytes("hostile transferFrom"));
        vm.prank(user);
        vault.deposit(address(revertingToken), 1);
        assertEq(revertingToken.balanceOf(address(vault)), 0);
    }

    function testSafeERC20AcceptsStandardsCompatibleNoReturnToken() public {
        NoReturnERC20 token = new NoReturnERC20();
        registry.registerAsset(address(token), IAssetRegistry.RiskTier.Defensive);
        token.mint(user, 10);
        vm.prank(user);
        token.approve(address(vault), 10);
        vm.prank(user);
        vault.deposit(address(token), 10);
        assertEq(token.balanceOf(address(vault)), 10);
        vm.prank(owner);
        vault.withdraw(address(token), recipient, 4);
        assertEq(token.balanceOf(recipient), 4);
    }

    function testHostileOutgoingTokenTransfersFailClosed() public {
        FalseReturnERC20 falseToken = new FalseReturnERC20();
        RevertingERC20 revertingToken = new RevertingERC20();
        registry.registerAsset(address(falseToken), IAssetRegistry.RiskTier.Defensive);
        registry.registerAsset(address(revertingToken), IAssetRegistry.RiskTier.Defensive);
        falseToken.mint(address(vault), 10);
        revertingToken.mint(address(vault), 10);

        vm.expectRevert();
        vm.prank(owner);
        vault.withdraw(address(falseToken), recipient, 1);
        assertEq(falseToken.balanceOf(address(vault)), 10);
        assertEq(falseToken.balanceOf(recipient), 0);

        vm.expectRevert(bytes("hostile transfer"));
        vm.prank(owner);
        vault.withdraw(address(revertingToken), recipient, 1);
        assertEq(revertingToken.balanceOf(address(vault)), 10);
        assertEq(revertingToken.balanceOf(recipient), 0);
    }

    function testOwnerWithdrawsAndEmitsEvent() public {
        _deposit(100);
        vm.expectEmit(true, true, false, true, address(vault));
        emit AdaptiveVault.Withdrawn(address(supported), recipient, 40);
        vm.prank(owner);
        vault.withdraw(address(supported), recipient, 40);
        assertEq(supported.balanceOf(recipient), 40);
        assertEq(supported.balanceOf(address(vault)), 60);
    }

    function testNonOwnerRolesCannotWithdraw() public {
        _deposit(100);
        address[3] memory callers = [agent, guardian, user];
        for (uint256 i; i < callers.length; ++i) {
            vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]));
            vm.prank(callers[i]);
            vault.withdraw(address(supported), recipient, 1);
        }
        assertEq(supported.balanceOf(address(vault)), 100);
    }

    function testWithdrawalValidation() public {
        _deposit(10);
        vm.startPrank(owner);
        vm.expectRevert(AdaptiveVault.ZeroAmount.selector);
        vault.withdraw(address(supported), recipient, 0);
        vm.expectRevert(AdaptiveVault.ZeroAddress.selector);
        vault.withdraw(address(supported), address(0), 1);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.InsufficientBalance.selector, address(supported), 11, 10));
        vault.withdraw(address(supported), recipient, 11);
        vm.stopPrank();
    }

    function testFuzzOwnerWithdrawal(uint128 deposited, uint128 withdrawn) public {
        vm.assume(deposited > 0);
        withdrawn = uint128(bound(withdrawn, 1, deposited));
        _deposit(deposited);
        vm.prank(owner);
        vault.withdraw(address(supported), recipient, withdrawn);
        assertEq(supported.balanceOf(recipient), withdrawn);
        assertEq(supported.balanceOf(address(vault)), deposited - withdrawn);
    }

    function testOwnerRecoversUnsupportedTokenAndEvent() public {
        unsupported.mint(address(vault), 50);
        vm.expectEmit(true, true, false, true, address(vault));
        emit AdaptiveVault.TokenRecovered(address(unsupported), recipient, 50);
        vm.prank(owner);
        vault.recoverToken(address(unsupported), recipient, 50);
        assertEq(unsupported.balanceOf(recipient), 50);
    }

    function testSupportedTokenCannotBypassNormalWithdrawalPath() public {
        _deposit(1);
        vm.expectRevert(
            abi.encodeWithSelector(AdaptiveVault.SupportedAssetMustUseWithdraw.selector, address(supported))
        );
        vm.prank(owner);
        vault.recoverToken(address(supported), recipient, 1);
    }

    function testNonOwnerRolesCannotRecover() public {
        unsupported.mint(address(vault), 3);
        address[3] memory callers = [agent, guardian, user];
        for (uint256 i; i < callers.length; ++i) {
            vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]));
            vm.prank(callers[i]);
            vault.recoverToken(address(unsupported), callers[i], 1);
        }
    }

    function testOwnerControlsExecutorAndGuardian() public {
        address newAgent = makeAddr("newAgent");
        address newGuardian = makeAddr("newGuardian");
        vm.startPrank(owner);
        vm.expectEmit(true, true, false, true, address(vault));
        emit AdaptiveVault.ExecutorChanged(agent, newAgent);
        vault.setAgentExecutor(newAgent);
        vm.expectEmit(true, true, false, true, address(vault));
        emit AdaptiveVault.GuardianChanged(guardian, newGuardian);
        vault.setGuardian(newGuardian);
        vm.stopPrank();
        assertEq(vault.agentExecutor(), newAgent);
        assertEq(vault.guardian(), newGuardian);
    }

    function testExecutorCannotChangeItselfAndZeroExecutorIsDeliberateRevocation() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, agent));
        vm.prank(agent);
        vault.setAgentExecutor(user);
        vm.prank(owner);
        vault.setAgentExecutor(address(0));
        assertEq(vault.agentExecutor(), address(0));
    }

    function testConstructorRejectsExecutorOwnerAndGuardianCollisions() public {
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.ExecutorRoleCollision.selector, owner));
        new AdaptiveVault(owner, guardian, owner, registry);

        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.ExecutorRoleCollision.selector, guardian));
        new AdaptiveVault(owner, guardian, guardian, registry);
    }

    function testSetExecutorRejectsOwnerAndGuardianCollisions() public {
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.ExecutorRoleCollision.selector, owner));
        vault.setAgentExecutor(owner);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.ExecutorRoleCollision.selector, guardian));
        vault.setAgentExecutor(guardian);
        vm.stopPrank();
    }

    function testSetGuardianRejectsExecutorCollisionButAllowsOwnerGuardian() public {
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.GuardianRoleCollision.selector, agent));
        vault.setGuardian(agent);
        vault.setGuardian(owner);
        vm.stopPrank();
        assertEq(vault.guardian(), owner);
        assertEq(vault.agentExecutor(), agent);
    }

    function testZeroGuardianAndExecutorRemainValidRevocations() public {
        vm.startPrank(owner);
        vault.setAgentExecutor(address(0));
        vault.setGuardian(address(0));
        vm.stopPrank();
        assertEq(vault.agentExecutor(), address(0));
        assertEq(vault.guardian(), address(0));
    }

    function testGuardianAndOwnerCanPauseButOnlyOwnerCanUnpause() public {
        vm.prank(guardian);
        vault.pause();
        assertTrue(vault.paused());
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, guardian));
        vm.prank(guardian);
        vault.unpause();
        vm.prank(owner);
        vault.unpause();
        vm.prank(owner);
        vault.pause();
        assertTrue(vault.paused());
    }

    function testRandomUserAndExecutorCannotPause() public {
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.UnauthorizedPause.selector, user));
        vm.prank(user);
        vault.pause();
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.UnauthorizedPause.selector, agent));
        vm.prank(agent);
        vault.pause();
    }

    function testPauseBlocksDepositsButOwnerOutflowsRemainAvailable() public {
        _deposit(100);
        unsupported.mint(address(vault), 20);
        vm.prank(guardian);
        vault.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(user);
        vault.deposit(address(supported), 1);
        vm.startPrank(owner);
        vault.withdraw(address(supported), recipient, 100);
        vault.recoverToken(address(unsupported), recipient, 20);
        vm.stopPrank();
        assertEq(supported.balanceOf(address(vault)), 0);
        assertEq(unsupported.balanceOf(address(vault)), 0);
    }

    function testOwnerUpdatesPolicyAndEmitsEvent() public {
        AdaptiveVault.VaultPolicy memory newPolicy = AdaptiveVault.VaultPolicy(2000, 5000, 2500, 1000);
        vm.expectEmit(false, false, false, true, address(vault));
        emit AdaptiveVault.PolicyUpdated(2000, 5000, 2500, 1000);
        vm.prank(owner);
        vault.setPolicy(newPolicy);
        (uint16 reserve, uint16 singleAsset, uint16 aggressive, uint16 daily) = vault.policy();
        assertEq(reserve, 2000);
        assertEq(singleAsset, 5000);
        assertEq(aggressive, 2500);
        assertEq(daily, 1000);
    }

    function testNonOwnerRolesCannotUpdatePolicy() public {
        AdaptiveVault.VaultPolicy memory newPolicy = AdaptiveVault.VaultPolicy(1, 2, 3, 4);
        address[3] memory callers = [agent, guardian, user];
        for (uint256 i; i < callers.length; ++i) {
            vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]));
            vm.prank(callers[i]);
            vault.setPolicy(newPolicy);
        }
    }

    function testEachInvalidPolicyFieldReverts() public {
        for (uint256 field; field < 4; ++field) {
            uint16[4] memory values;
            values[field] = 10_001;
            AdaptiveVault.VaultPolicy memory invalidPolicy =
                AdaptiveVault.VaultPolicy(values[0], values[1], values[2], values[3]);
            vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.InvalidPolicyValue.selector, 10_001));
            vm.prank(owner);
            vault.setPolicy(invalidPolicy);
        }
    }

    function testFuzzValidPolicyValues(uint16 a, uint16 b, uint16 c, uint16 d) public {
        a = uint16(bound(a, 0, 10_000));
        b = uint16(bound(b, 0, 10_000));
        c = uint16(bound(c, 0, 10_000));
        d = uint16(bound(d, 0, 10_000));
        vm.prank(owner);
        vault.setPolicy(AdaptiveVault.VaultPolicy(a, b, c, d));
        (uint16 storedA, uint16 storedB, uint16 storedC, uint16 storedD) = vault.policy();
        assertLe(storedA, 10_000);
        assertLe(storedB, 10_000);
        assertLe(storedC, 10_000);
        assertLe(storedD, 10_000);
    }

    function testNativeCurrencyIsRejected() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        (bool success, bytes memory revertData) = address(vault).call{value: 1 ether}("");
        assertFalse(success);
        assertEq(revertData, abi.encodeWithSelector(AdaptiveVault.NativeCurrencyNotAccepted.selector));
        assertEq(address(vault).balance, 0);
    }

    function testOwnerRecoversForcedNativeCurrency() public {
        vm.deal(address(vault), 2 ether);
        uint256 recipientBefore = recipient.balance;
        vm.expectEmit(true, false, false, true, address(vault));
        emit AdaptiveVault.NativeCurrencyRecovered(recipient, 1 ether);
        vm.prank(owner);
        vault.recoverNativeCurrency(payable(recipient), 1 ether);
        assertEq(recipient.balance, recipientBefore + 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }

    function testRejectedNativeRecoveryRevertsWithoutLoss() public {
        RejectingNativeRecipient rejectingRecipient = new RejectingNativeRecipient();
        vm.deal(address(vault), 2 ether);
        vm.expectRevert(bytes("native rejected"));
        vm.prank(owner);
        vault.recoverNativeCurrency(payable(address(rejectingRecipient)), 1 ether);
        assertEq(address(vault).balance, 2 ether);
        assertEq(address(rejectingRecipient).balance, 0);
    }

    function testNonOwnerRolesCannotRecoverNativeCurrency() public {
        vm.deal(address(vault), 3 ether);
        address[3] memory callers = [agent, guardian, user];
        for (uint256 i; i < callers.length; ++i) {
            vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, callers[i]));
            vm.prank(callers[i]);
            vault.recoverNativeCurrency(payable(callers[i]), 1 ether);
        }
        assertEq(address(vault).balance, 3 ether);
    }

    function testNativeRecoveryValidation() public {
        vm.deal(address(vault), 1 ether);
        vm.startPrank(owner);
        vm.expectRevert(AdaptiveVault.ZeroAddress.selector);
        vault.recoverNativeCurrency(payable(address(0)), 1);
        vm.expectRevert(AdaptiveVault.ZeroAmount.selector);
        vault.recoverNativeCurrency(payable(recipient), 0);
        vm.expectRevert(abi.encodeWithSelector(AdaptiveVault.InsufficientNativeBalance.selector, 2 ether, 1 ether));
        vault.recoverNativeCurrency(payable(recipient), 2 ether);
        vm.stopPrank();
    }

    function testOwnershipTransferIsDisabled() public {
        vm.expectRevert(AdaptiveVault.OwnershipTransferDisabled.selector);
        vm.prank(owner);
        vault.transferOwnership(user);
        assertEq(vault.owner(), owner);
    }

    function testOwnershipRenunciationIsDisabled() public {
        vm.expectRevert(AdaptiveVault.OwnershipRenunciationDisabled.selector);
        vm.prank(owner);
        vault.renounceOwnership();
        assertEq(vault.owner(), owner);
    }
}
