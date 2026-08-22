// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DeployXLayerMainnet} from "../script/DeployXLayerMainnet.s.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";

interface IQuoterFresh {
    struct P {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }
    function quoteExactInputSingle(P memory) external returns (uint256, uint160, uint32, uint256);
}

contract Phase13G2FreshDeploymentForkTest is Test {
    uint256 constant BLOCK = 67_873_770;
    address constant XETH = 0xE7B000003A45145decf8a28FC755aD5eC5EA025A;
    address constant USDT = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    address constant QUOTER = 0xD1b797D92d87B688193A2B976eFc8D577D204343;
    address user = makeAddr("production-user");
    address finalAdmin = makeAddr("production-admin-test-only");
    DeployXLayerMainnet.Deployment deployed;
    AdaptiveManagedVaultV1 vault;

    function setUp() public {
        vm.createSelectFork(vm.envOr("XLAYER_MAINNET_RPC_URL", string("https://rpc.xlayer.tech")), BLOCK);
        DeployXLayerMainnet script = new DeployXLayerMainnet();
        deployed = script.deployForFork(finalAdmin);
        vm.prank(user);
        vault = AdaptiveManagedVaultV1(payable(deployed.factory.createManagedVault(address(0), address(0))));
        assertEq(vault.owner(), user);
        assertEq(vault.agentExecutor(), address(0));
        vm.startPrank(user);
        vault.addManagedAsset(XETH);
        vault.addManagedAsset(USDT);
        vault.setAllowedAdapter(address(deployed.uniswap), true);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(4_000, 6_000, 10_000, 3_000));
        vault.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(2_000, 3_000, 120, 300, true));
        vault.setYieldPolicy(AdaptiveManagedVaultV1.YieldPolicy(3_000, 7_000, 3_000, 1, true));
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        vm.stopPrank();
        deal(XETH, user, 0.02 ether);
        deal(USDT, user, 40_000_000);
        vm.startPrank(user);
        IERC20(XETH).approve(address(vault), 0.01 ether);
        vault.deposit(XETH, 0.01 ether);
        IERC20(USDT).approve(address(vault), 20_000_000);
        vault.deposit(USDT, 20_000_000);
        vm.stopPrank();
    }

    function testFreshApprovalRequiredLifecycleAndUnsupportedReverse() public {
        uint256 amount = 0.001 ether;
        (uint256 quote,,,) = IQuoterFresh(QUOTER).quoteExactInputSingle(IQuoterFresh.P(XETH, USDT, amount, 500, 0));
        bytes32 id = keccak256("fresh-forward");
        vm.prank(user);
        vault.executeOwnerApprovedSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                XETH, USDT, address(deployed.uniswap), amount, quote, uint64(block.timestamp + 60), id
            )
        );
        assertTrue(vault.consumedIntentIds(id));
        assertEq(IERC20(XETH).allowance(address(vault), address(deployed.uniswap)), 0);
        uint256 beforeUsdt = IERC20(USDT).balanceOf(address(vault));
        bytes32 reverseId = keccak256("fresh-reverse");
        vm.expectRevert();
        vm.prank(user);
        vault.executeOwnerApprovedSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                USDT, XETH, address(deployed.uniswap), 1_000_000, 1, uint64(block.timestamp + 60), reverseId
            )
        );
        assertEq(IERC20(USDT).balanceOf(address(vault)), beforeUsdt);
        assertFalse(vault.consumedIntentIds(reverseId));
        vm.prank(user);
        vault.pause();
        vm.prank(user);
        vault.withdraw(USDT, user, 1_000_000);
    }

    function testAdminCannotControlUserAndConstitutionFailureRollsBack() public {
        vm.expectRevert();
        vm.prank(finalAdmin);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Adaptive);
        vm.expectRevert();
        vm.prank(finalAdmin);
        vault.withdraw(USDT, finalAdmin, 1);
        vm.prank(user);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(4_000, 5_400, 10_000, 3_000));
        bytes32 id = keccak256("fresh-policy-fail");
        uint256 xb = IERC20(XETH).balanceOf(address(vault));
        uint256 ub = IERC20(USDT).balanceOf(address(vault));
        vm.expectRevert();
        vm.prank(user);
        vault.executeOwnerApprovedSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                XETH, USDT, address(deployed.uniswap), 0.001 ether, 1, uint64(block.timestamp + 60), id
            )
        );
        assertEq(IERC20(XETH).balanceOf(address(vault)), xb);
        assertEq(IERC20(USDT).balanceOf(address(vault)), ub);
        assertFalse(vault.consumedIntentIds(id));
    }
}
