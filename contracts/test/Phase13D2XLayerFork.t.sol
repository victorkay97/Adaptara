// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {UniswapV3SwapAdapterV1} from "../src/UniswapV3SwapAdapterV1.sol";
import {IUniswapV3FactoryMinimal} from "../src/interfaces/IUniswapV3FactoryMinimal.sol";
import {ISwapRouter02Minimal} from "../src/interfaces/ISwapRouter02Minimal.sol";

interface IQuoterV2Fork {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }
    function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
        external
        returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);
}

contract ForkValuationProvider is IAdaptaraValuationProvider {
    mapping(address => Valuation) internal values;

    function set(address asset, uint256 price, uint64 updatedAt) external {
        values[asset] = Valuation(price, updatedAt, true);
    }

    function getValuation(address asset) external view returns (Valuation memory) {
        return values[asset];
    }
}

contract Phase13D2XLayerForkTest is Test {
    uint256 internal constant FORK_BLOCK = 67_873_770;
    address internal constant FACTORY = 0x4B2ab38DBF28D31D467aA8993f6c2585981D6804;
    address internal constant QUOTER = 0xD1b797D92d87B688193A2B976eFc8D577D204343;
    address internal constant ROUTER = 0x4f0C28f5926AFDA16bf2506D5D9e57Ea190f9bcA;
    address internal constant XETH = 0xE7B000003A45145decf8a28FC755aD5eC5EA025A;
    address internal constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    address internal constant POOL = 0x77ef18adF35f62B2Ad442e4370cDbC7fe78B7dcC;
    uint24 internal constant FEE = 500;
    uint256 internal constant AMOUNT_IN = 0.001 ether;
    uint16 internal constant SLIPPAGE_BPS = 100;
    address internal owner = makeAddr("forkOwner");
    address internal executor = makeAddr("forkExecutor");
    address internal guardian = makeAddr("forkGuardian");
    address internal random = makeAddr("forkRandom");
    AssetRegistry internal assets;
    ProtocolAdapterRegistryV1 internal protocols;
    ForkValuationProvider internal valuations;
    UniswapV3SwapAdapterV1 internal adapter;
    AdaptiveManagedVaultV1 internal vault;
    uint256 internal quote;
    uint256 internal minimumOut;

    function setUp() public {
        string memory rpc = vm.envOr("XLAYER_MAINNET_RPC_URL", string("https://rpc.xlayer.tech"));
        vm.createSelectFork(rpc, FORK_BLOCK);
        assertEq(block.chainid, 196);
        assertGt(FACTORY.code.length, 0);
        assertGt(QUOTER.code.length, 0);
        assertGt(ROUTER.code.length, 0);
        assertEq(IUniswapV3FactoryMinimal(FACTORY).getPool(XETH, USDT0, FEE), POOL);
        assertGt(POOL.code.length, 0);
        quote = _quote(AMOUNT_IN);
        minimumOut = quote * (10_000 - SLIPPAGE_BPS) / 10_000;
        assertGt(quote, 0);
        assertGt(minimumOut, 0);

        assets = new AssetRegistry(1 days, owner);
        protocols = new ProtocolAdapterRegistryV1(1 days, owner);
        valuations = new ForkValuationProvider();
        adapter = new UniswapV3SwapAdapterV1(owner, ISwapRouter02Minimal(ROUTER), IUniswapV3FactoryMinimal(FACTORY));
        vm.startPrank(owner);
        assets.registerAsset(XETH, IAssetRegistry.RiskTier.Balanced);
        assets.registerAsset(USDT0, IAssetRegistry.RiskTier.Reserve);
        protocols.registerAdapter(address(adapter), keccak256("uniswap-v3-direct"), keccak256("v1"));
        adapter.configurePair(XETH, USDT0, FEE);
        vm.stopPrank();
        vault = new AdaptiveManagedVaultV1(owner, guardian, executor, assets, valuations, protocols, 1 hours);
        valuations.set(XETH, 1_875_450_000_000_000_000_000, uint64(block.timestamp));
        valuations.set(USDT0, 1 ether, uint64(block.timestamp));
        vm.startPrank(owner);
        vault.addManagedAsset(XETH);
        vault.addManagedAsset(USDT0);
        vault.setAllowedAdapter(address(adapter), true);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(40_00, 60_00, 10_000, 30_00));
        vault.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(20_00, 30_00, SLIPPAGE_BPS, 300, true));
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Adaptive);
        vault.setAutonomousPaused(false);
        vm.stopPrank();
        deal(XETH, address(vault), 0.01 ether);
        deal(USDT0, address(vault), 20_000_000);
    }

    function testForkRealRouterAdaptiveSuccessAndCleanup() public {
        uint256 inBefore = IERC20(XETH).balanceOf(address(vault));
        uint256 outBefore = IERC20(USDT0).balanceOf(address(vault));
        uint256 gasBefore = gasleft();
        vm.prank(executor);
        AdaptiveManagedVaultV1.ExecutionResult memory result = vault.executeAdaptiveSwap(_intent("success"));
        uint256 gasUsed = gasBefore - gasleft();
        uint256 inAfter = IERC20(XETH).balanceOf(address(vault));
        uint256 outAfter = IERC20(USDT0).balanceOf(address(vault));
        assertEq(inBefore - inAfter, AMOUNT_IN);
        assertEq(result.actualAmountIn, AMOUNT_IN);
        assertEq(result.actualAmountOut, outAfter - outBefore);
        assertGe(result.actualAmountOut, minimumOut);
        assertEq(IERC20(XETH).balanceOf(address(adapter)), 0);
        assertEq(IERC20(USDT0).balanceOf(address(adapter)), 0);
        assertEq(IERC20(XETH).allowance(address(adapter), ROUTER), 0);
        assertEq(IERC20(XETH).allowance(address(vault), address(adapter)), 0);
        assertTrue(vault.consumedIntentIds(keccak256("success")));
        assertEq(vault.executionResult(keccak256("success")).actualAmountOut, result.actualAmountOut);
        assertGt(vault.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
        emit log_named_uint("fork_quote", quote);
        emit log_named_uint("fork_minimum", minimumOut);
        emit log_named_uint("fork_actual_out", result.actualAmountOut);
        emit log_named_uint("fork_gas", gasUsed);
    }

    function testForkApprovalRequiredOwnerSucceedsButExecutorFails() public {
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intent("owner-approved");
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        AdaptiveManagedVaultV1.ExecutionResult memory result = vault.executeOwnerApprovedSwap(intent);
        assertEq(result.actualAmountIn, AMOUNT_IN);
        assertGe(result.actualAmountOut, minimumOut);
        assertEq(IERC20(XETH).allowance(address(adapter), ROUTER), 0);
        assertEq(IERC20(XETH).allowance(address(vault), address(adapter)), 0);
    }

    function testForkReverseUsdtToXethFailsClosedAndIsNotConfigured() public {
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        uint256 amountIn = 1_000_000;
        (uint256 reverseQuote,,,) = IQuoterV2Fork(QUOTER)
            .quoteExactInputSingle(IQuoterV2Fork.QuoteExactInputSingleParams(USDT0, XETH, amountIn, FEE, 0));
        uint256 reverseMinimum = reverseQuote * (10_000 - SLIPPAGE_BPS) / 10_000;
        uint256 usdtBefore = IERC20(USDT0).balanceOf(address(vault));
        uint256 xethBefore = IERC20(XETH).balanceOf(address(vault));
        vm.expectRevert();
        vm.prank(owner);
        vault.executeOwnerApprovedSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                USDT0,
                XETH,
                address(adapter),
                amountIn,
                reverseMinimum,
                uint64(block.timestamp + 60),
                keccak256("reverse-owner-approved")
            )
        );
        assertEq(IERC20(USDT0).balanceOf(address(vault)), usdtBefore);
        assertEq(IERC20(XETH).balanceOf(address(vault)), xethBefore);
        assertEq(IERC20(USDT0).balanceOf(address(adapter)), 0);
        assertEq(IERC20(XETH).balanceOf(address(adapter)), 0);
        assertEq(IERC20(USDT0).allowance(address(adapter), ROUTER), 0);
        assertEq(IERC20(USDT0).allowance(address(vault), address(adapter)), 0);
        assertFalse(vault.consumedIntentIds(keccak256("reverse-owner-approved")));
        assertEq(vault.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
    }

    function testForkRealRouterConstitutionFailureRollsBackEverything() public {
        vm.prank(owner);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(40_00, 54_00, 10_000, 30_00));
        bytes32 id = keccak256("policy-fail");
        uint256 inBefore = IERC20(XETH).balanceOf(address(vault));
        uint256 outBefore = IERC20(USDT0).balanceOf(address(vault));
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(_intentWithId(id));
        assertEq(IERC20(XETH).balanceOf(address(vault)), inBefore);
        assertEq(IERC20(USDT0).balanceOf(address(vault)), outBefore);
        assertEq(IERC20(XETH).balanceOf(address(adapter)), 0);
        assertEq(IERC20(USDT0).balanceOf(address(adapter)), 0);
        assertEq(IERC20(XETH).allowance(address(adapter), ROUTER), 0);
        assertEq(IERC20(XETH).allowance(address(vault), address(adapter)), 0);
        assertFalse(vault.consumedIntentIds(id));
        assertEq(vault.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
        assertEq(vault.executionResult(id).executedAt, 0);
    }

    function testForkRealRouterSlippageFailureRollsBack() public {
        bytes32 id = keccak256("slippage-fail");
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intentWithId(id);
        intent.minimumAmountOut = quote + 1;
        uint256 beforeBalance = IERC20(XETH).balanceOf(address(vault));
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        assertEq(IERC20(XETH).balanceOf(address(vault)), beforeBalance);
        assertFalse(vault.consumedIntentIds(id));
        assertEq(vault.dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
        assertEq(IERC20(XETH).allowance(address(adapter), ROUTER), 0);
        assertEq(IERC20(XETH).allowance(address(vault), address(adapter)), 0);
    }

    function testForkAuthorityExpiryPauseAndRegistryGates() public {
        AdaptiveManagedVaultV1.SwapIntent memory intent = _intent("gates");
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Advisory);
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.startPrank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        vm.expectRevert();
        vault.executeAdaptiveSwap(
            AdaptiveManagedVaultV1.SwapIntent(
                XETH, USDT0, address(adapter), AMOUNT_IN, minimumOut, uint64(block.timestamp - 1), keccak256("expired")
            )
        );
        vm.stopPrank();
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Adaptive);
        vm.expectRevert();
        vm.prank(random);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        vault.setAgentExecutor(address(0));
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.startPrank(owner);
        vault.setAgentExecutor(executor);
        vault.setAutonomousPaused(true);
        vm.stopPrank();
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.startPrank(owner);
        vault.setAutonomousPaused(false);
        vault.pause();
        vm.stopPrank();
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
        vm.prank(owner);
        vault.unpause();
        vm.prank(owner);
        protocols.disableAdapter(address(adapter));
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(intent);
    }

    function testForkOwnerDisableAndWrongPairFailClosed() public {
        vm.prank(owner);
        vault.setAllowedAdapter(address(adapter), false);
        vm.expectRevert();
        vm.prank(executor);
        vault.executeAdaptiveSwap(_intent("owner-disabled"));
        vm.expectRevert();
        vm.prank(owner);
        adapter.configurePair(USDT0, XETH, 10_000);
    }

    function _quote(uint256 amountIn) private returns (uint256 amountOut) {
        (amountOut,,,) = IQuoterV2Fork(QUOTER)
            .quoteExactInputSingle(IQuoterV2Fork.QuoteExactInputSingleParams(XETH, USDT0, amountIn, FEE, 0));
    }

    function _intent(string memory label) private view returns (AdaptiveManagedVaultV1.SwapIntent memory) {
        return _intentWithId(keccak256(bytes(label)));
    }

    function _intentWithId(bytes32 id) private view returns (AdaptiveManagedVaultV1.SwapIntent memory) {
        return AdaptiveManagedVaultV1.SwapIntent(
            XETH, USDT0, address(adapter), AMOUNT_IN, minimumOut, uint64(block.timestamp + 60), id
        );
    }
}
