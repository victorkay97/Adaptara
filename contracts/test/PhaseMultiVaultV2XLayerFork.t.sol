// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AdaptiveManagedVaultFactoryV2} from "../src/AdaptiveManagedVaultFactoryV2.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {IProtocolAdapterRegistry} from "../src/interfaces/IProtocolAdapterRegistry.sol";

interface IV2Quoter {
    struct Params {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }
    function quoteExactInputSingle(Params memory) external returns (uint256, uint160, uint32, uint256);
}

contract PhaseMultiVaultV2XLayerForkTest is Test {
    uint256 constant BLOCK = 68_399_076;
    address constant ASSETS = 0xd211E4d1e1049d800d5360A078d52B0fcDD74684;
    address constant VALUATION = 0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc;
    address constant PROTOCOLS = 0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A;
    address constant UNISWAP = 0x009e2dfEa3FE134BcE3F769aA3E6C287823af184;
    address constant AAVE = 0xd7c2662e436Bd1D50A6AA033C05DB905A2dddc83;
    address constant QUOTER = 0xD1b797D92d87B688193A2B976eFc8D577D204343;
    address constant XETH = 0xE7B000003A45145decf8a28FC755aD5eC5EA025A;
    address constant USDT = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;

    address owner = makeAddr("v2-owner");
    AdaptiveManagedVaultFactoryV2 factory;
    AdaptiveManagedVaultV1 vaultA;
    AdaptiveManagedVaultV1 vaultB;

    function setUp() public {
        vm.createSelectFork(vm.envOr("XLAYER_MAINNET_RPC_URL", string("https://rpc.xlayer.tech")), BLOCK);
        factory = new AdaptiveManagedVaultFactoryV2(
            IAssetRegistry(ASSETS), IAdaptaraValuationProvider(VALUATION), IProtocolAdapterRegistry(PROTOCOLS), 90_000
        );
        vm.startPrank(owner);
        vaultA = AdaptiveManagedVaultV1(payable(factory.createManagedVault(address(0))));
        vaultB = AdaptiveManagedVaultV1(payable(factory.createManagedVault(address(0))));
        _configure(vaultA, true);
        _configure(vaultB, false);
        vm.stopPrank();
        deal(XETH, address(vaultA), 0.01 ether);
        deal(USDT, address(vaultA), 20_000_000);
        deal(USDT, address(vaultB), 100_000_000);
    }

    function testLiveTopologyAndIndependentUniswapThenAave() public {
        assertEq(address(vaultA.assetRegistry()), ASSETS);
        assertEq(address(vaultB.valuationProvider()), VALUATION);
        uint256 bBefore = IERC20(USDT).balanceOf(address(vaultB));
        uint256 amount = 0.001 ether;
        (uint256 quote,,,) = IV2Quoter(QUOTER).quoteExactInputSingle(IV2Quoter.Params(XETH, USDT, amount, 500, 0));
        uint64 day = uint64(block.timestamp / 1 days);
        vm.prank(owner);
        vaultA.executeOwnerApprovedSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                XETH, USDT, UNISWAP, amount, quote, uint64(block.timestamp + 60), keccak256("shared-id")
            )
        );
        assertEq(IERC20(XETH).allowance(address(vaultA), UNISWAP), 0);
        assertEq(IERC20(USDT).balanceOf(address(vaultB)), bBefore);
        uint16 turnoverA = vaultA.dailyTurnoverBps(day);
        assertGt(turnoverA, 0);
        assertEq(vaultB.dailyTurnoverBps(day), 0);
        (uint16 reserveA,,,) = vaultA.policy();
        (uint16 reserveB,,,) = vaultB.policy();
        assertEq(reserveA, 2_000);
        assertEq(reserveB, 4_000);

        uint256 supply = vaultB.planYieldSupply(AAVE, USDT);
        assertGt(supply, 0);
        vm.prank(owner);
        vaultB.executeOwnerApprovedYieldSupply(
            AdaptiveManagedVaultV1.YieldIntent(AAVE, USDT, supply, uint64(block.timestamp + 60), keccak256("shared-id"))
        );
        assertTrue(vaultA.consumedIntentIds(keccak256("shared-id")));
        assertTrue(vaultB.consumedIntentIds(keccak256("shared-id")));
        assertEq(vaultA.dailyTurnoverBps(day), turnoverA);
        assertGt(vaultB.dailyTurnoverBps(day), 0);
        assertEq(IERC20(USDT).allowance(address(vaultB), AAVE), 0);
        assertEq(IERC20(XETH).balanceOf(address(vaultA)), 0.009 ether);
        (,,, uint256 principal,,,,,) = vaultB.yieldPosition();
        assertGt(principal, 0);
        vm.prank(owner);
        vaultA.pause();
        assertTrue(vaultA.paused());
        assertFalse(vaultB.paused());
    }

    function testCrossVaultAndFactoryAuthorityFailClosed() public {
        address attacker = makeAddr("attacker");
        vm.expectRevert();
        vm.prank(attacker);
        vaultA.withdraw(USDT, attacker, 1);
        vm.expectRevert();
        vm.prank(address(factory));
        vaultB.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(0, 0, 0, 0));
        assertEq(vaultA.agentExecutor(), address(0));
        assertEq(vaultB.agentExecutor(), address(0));
    }

    function _configure(AdaptiveManagedVaultV1 vault, bool swapVault) private {
        vault.addManagedAsset(USDT);
        if (swapVault) vault.addManagedAsset(XETH);
        vault.setAllowedAdapter(swapVault ? UNISWAP : AAVE, true);
        vault.setPolicy(
            AdaptiveManagedVaultV1.VaultPolicy(swapVault ? 2_000 : 4_000, swapVault ? 8_000 : 10_000, 10_000, 3_000)
        );
        vault.setExecutionPolicy(
            AdaptiveManagedVaultV1.ExecutionPolicy(2_000, 3_000, swapVault ? 500 : 150, 300, false)
        );
        vault.setYieldPolicy(AdaptiveManagedVaultV1.YieldPolicy(3_000, 7_000, 3_000, 1, !swapVault));
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
    }
}
