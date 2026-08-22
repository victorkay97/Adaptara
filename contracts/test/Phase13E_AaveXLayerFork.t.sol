// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AaveV3YieldAdapterV1} from "../src/AaveV3YieldAdapterV1.sol";

contract YieldForkValuation is IAdaptaraValuationProvider {
    function getValuation(address) external view returns (Valuation memory) {
        return Valuation(1 ether, uint64(block.timestamp), true);
    }
}

contract Phase13EAaveXLayerForkTest is Test {
    uint256 constant FORK_BLOCK = 67_873_770;
    address constant POOL = 0xE3F3Caefdd7180F884c01E57f65Df979Af84f116;
    address constant DATA_PROVIDER = 0x6C505C31714f14e8af2A03633EB2Cdfb4959138F;
    address constant USDT = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    address constant AUSDT = 0xF356ae412dB5df43BD3a10746f7ad4e1C4De4297;
    address owner = makeAddr("yield-owner");
    address executor = makeAddr("yield-executor");
    AssetRegistry assets;
    ProtocolAdapterRegistryV1 protocols;
    AaveV3YieldAdapterV1 adapter;
    AdaptiveManagedVaultV1 vault;

    function setUp() public {
        vm.createSelectFork(vm.envOr("XLAYER_MAINNET_RPC_URL", string("https://rpc.xlayer.tech")), FORK_BLOCK);
        assertEq(block.chainid, 196);
        assertGt(POOL.code.length, 0);
        assertGt(DATA_PROVIDER.code.length, 0);
        assertGt(AUSDT.code.length, 0);
        vm.mockCall(
            DATA_PROVIDER,
            abi.encodeWithSignature("getReserveConfigurationData(address)", USDT),
            abi.encode(
                uint256(6), uint256(7000), uint256(7500), uint256(10750), uint256(1000), true, true, false, true, false
            )
        );
        vm.mockCall(DATA_PROVIDER, abi.encodeWithSignature("getPaused(address)", USDT), abi.encode(false));
        vm.mockCall(
            DATA_PROVIDER,
            abi.encodeWithSignature("getReserveCaps(address)", USDT),
            abi.encode(uint256(100_000_000), uint256(48_000_000))
        );
        vm.mockCall(AUSDT, abi.encodeWithSignature("totalSupply()"), abi.encode(uint256(1_828_500_000)));
        assets = new AssetRegistry(1 days, owner);
        protocols = new ProtocolAdapterRegistryV1(1 days, owner);
        adapter = new AaveV3YieldAdapterV1();
        vm.startPrank(owner);
        assets.registerAsset(USDT, IAssetRegistry.RiskTier.Reserve);
        protocols.registerAdapter(address(adapter), keccak256("aave-v3-yield"), keccak256("v1"));
        vm.stopPrank();
        vault = new AdaptiveManagedVaultV1(
            owner, address(0), executor, assets, new YieldForkValuation(), protocols, 1 hours
        );
        vm.startPrank(owner);
        vault.addManagedAsset(USDT);
        vault.setAllowedAdapter(address(adapter), true);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(40_00, 10_000, 0, 30_00));
        vault.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(20_00, 30_00, 0, 300, true));
        vault.setYieldPolicy(AdaptiveManagedVaultV1.YieldPolicy(30_00, 70_00, 30_00, 1, true));
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Adaptive);
        vault.setAutonomousPaused(false);
        vm.stopPrank();
        deal(USDT, address(vault), 100_000_000);
    }

    function testCurrentMainnetCapacityAvailableAndWithdrawSurfaceRemainsDistinct() public {
        vm.clearMockedCalls();
        (bool available, uint256 remaining) = adapter.supplyAvailability(1_000_000);
        assertTrue(available);
        assertGt(remaining, 47_000_000_000_000);
        assertEq(adapter.aToken(), AUSDT);
    }

    function testRealAaveSupplyAndWithdrawWithCleanup() public {
        uint256 planned = vault.planYieldSupply(address(adapter), USDT);
        assertEq(planned, 20_000_000);
        uint256 gasBefore = gasleft();
        vm.prank(executor);
        uint256 minted = vault.executeAdaptiveYieldSupply(_intent(planned, "supply"));
        emit log_named_uint("aave_supply_gas", gasBefore - gasleft());
        assertApproxEqAbs(minted, planned, 1);
        assertEq(IERC20(USDT).balanceOf(address(vault)), 80_000_000);
        assertApproxEqAbs(IERC20(AUSDT).balanceOf(address(vault)), planned, 1);
        _clean();
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        gasBefore = gasleft();
        vm.prank(owner);
        uint256 returned = vault.executeOwnerApprovedYieldWithdraw(_intent(5_000_000, "withdraw"));
        emit log_named_uint("aave_withdraw_gas", gasBefore - gasleft());
        assertEq(returned, 5_000_000);
        assertEq(IERC20(USDT).balanceOf(address(vault)), 85_000_000);
        _clean();
    }

    function testPolicyViolatingSupplyRollsBackReplayTurnoverAndPosition() public {
        uint256 planned = vault.planYieldSupply(address(adapter), USDT);
        bytes32 id = keccak256("too-much");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveYieldSupply(_intentWithId(planned + 1, id));
        assertEq(IERC20(USDT).balanceOf(address(vault)), 100_000_000);
        assertEq(IERC20(AUSDT).balanceOf(address(vault)), 0);
        assertFalse(vault.consumedIntentIds(id));
        assertEq(vault.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
    }

    function testAuthorizationPauseAndRegistryGates() public {
        uint256 planned = vault.planYieldSupply(address(adapter), USDT);
        vm.expectRevert();
        vm.prank(makeAddr("random"));
        vault.executeAdaptiveYieldSupply(_intent(planned, "random"));
        vm.prank(owner);
        vault.setAutonomousPaused(true);
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveYieldSupply(_intent(planned, "paused"));
        vm.prank(owner);
        protocols.disableAdapter(address(adapter));
        vm.expectRevert();
        vault.planYieldSupply(address(adapter), USDT);
    }

    function testRealAccrualSettlementSeventyThirtyAndNoDoubleCount() public {
        _supplyThenAccrue();
        uint256 earned = vault.accruedYield();
        assertGt(earned, 0);
        uint256 liquidBefore = IERC20(USDT).balanceOf(address(vault));
        uint256 gasBefore = gasleft();
        vm.prank(owner);
        (uint256 retained, uint256 reserveAmount) = vault.settleOwnerApprovedYield(_intent(0, "settle-70-30"));
        emit log_named_uint("aave_settlement_gas", gasBefore - gasleft());
        assertEq(retained + reserveAmount, earned);
        assertEq(reserveAmount, earned * 30_00 / 10_000);
        assertEq(IERC20(USDT).balanceOf(address(vault)) - liquidBefore, reserveAmount);
        assertEq(vault.accruedYield(), 0);
        vm.expectRevert(AdaptiveManagedVaultV1.NoAccruedYield.selector);
        vm.prank(owner);
        vault.settleOwnerApprovedYield(_intent(0, "settle-again"));
        _clean();
    }

    function testCompoundOneHundredRetainsAllAndCheckpoints() public {
        _setSplit(10_000, 0);
        _supplyThenAccrue();
        uint256 liquidBefore = IERC20(USDT).balanceOf(address(vault));
        vm.prank(owner);
        (uint256 retained, uint256 reserveAmount) = vault.settleOwnerApprovedYield(_intent(0, "compound-all"));
        assertGt(retained, 0);
        assertEq(reserveAmount, 0);
        assertEq(IERC20(USDT).balanceOf(address(vault)), liquidBefore);
        assertEq(vault.accruedYield(), 0);
    }

    function testReserveOneHundredAndTenNinetyRounding() public {
        _setSplit(0, 10_000);
        _supplyThenAccrue();
        uint256 earned = vault.accruedYield();
        vm.prank(owner);
        (uint256 retained, uint256 reserveAmount) = vault.settleOwnerApprovedYield(_intent(0, "reserve-all"));
        assertEq(retained, 0);
        assertEq(reserveAmount, earned);
    }

    function testTenNinetyExactFloorRounding() public {
        _setSplit(1_000, 9_000);
        _supplyThenAccrue();
        uint256 earned = vault.accruedYield();
        vm.prank(owner);
        (uint256 retained, uint256 reserveAmount) = vault.settleOwnerApprovedYield(_intent(0, "ten-ninety"));
        assertEq(reserveAmount, earned * 9_000 / 10_000);
        assertEq(retained, earned - reserveAmount);
    }

    function _supplyThenAccrue() private {
        uint256 planned = vault.planYieldSupply(address(adapter), USDT);
        vm.prank(executor);
        vault.executeAdaptiveYieldSupply(_intent(planned, "accrual-supply"));
        vm.warp(block.timestamp + 365 days);
        vm.roll(block.number + 1);
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
    }

    function _setSplit(uint16 compoundBps, uint16 reserveBps) private {
        vm.prank(owner);
        vault.setYieldPolicy(AdaptiveManagedVaultV1.YieldPolicy(30_00, compoundBps, reserveBps, 1, true));
    }

    function _clean() private view {
        assertEq(IERC20(USDT).balanceOf(address(adapter)), 0);
        assertEq(IERC20(AUSDT).balanceOf(address(adapter)), 0);
        assertEq(IERC20(USDT).allowance(address(vault), address(adapter)), 0);
        assertEq(IERC20(AUSDT).allowance(address(vault), address(adapter)), 0);
        assertEq(IERC20(USDT).allowance(address(adapter), POOL), 0);
    }

    function _intent(uint256 amount, string memory name)
        private
        view
        returns (AdaptiveManagedVaultV1.YieldIntent memory)
    {
        return _intentWithId(amount, keccak256(bytes(name)));
    }

    function _intentWithId(uint256 amount, bytes32 id)
        private
        view
        returns (AdaptiveManagedVaultV1.YieldIntent memory)
    {
        return AdaptiveManagedVaultV1.YieldIntent(address(adapter), USDT, amount, uint64(block.timestamp + 60), id);
    }
}
