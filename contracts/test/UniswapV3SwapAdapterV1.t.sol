// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {UniswapV3SwapAdapterV1} from "../src/UniswapV3SwapAdapterV1.sol";
import {IAdaptaraAdapter} from "../src/interfaces/IAdaptaraAdapter.sol";
import {IUniswapV3FactoryMinimal} from "../src/interfaces/IUniswapV3FactoryMinimal.sol";
import {ISwapRouter02Minimal} from "../src/interfaces/ISwapRouter02Minimal.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract MockV3Pool {}

contract MockV3Factory is IUniswapV3FactoryMinimal {
    mapping(bytes32 => address) internal pools;

    function setPool(address a, address b, uint24 fee, address pool) external {
        pools[keccak256(abi.encode(a, b, fee))] = pool;
        pools[keccak256(abi.encode(b, a, fee))] = pool;
    }

    function getPool(address a, address b, uint24 fee) external view returns (address) {
        return pools[keccak256(abi.encode(a, b, fee))];
    }
}

contract MockSwapRouter02 is ISwapRouter02Minimal {
    uint256 public output = 1 ether;
    uint256 public pullBps = 10_000;
    uint256 public reportedOverride;
    ExactInputSingleParams public last;
    bool public attemptReentry;
    bool public reentryBlocked;

    function configure(uint256 output_, uint256 pullBps_, uint256 reportedOverride_) external {
        output = output_;
        pullBps = pullBps_;
        reportedOverride = reportedOverride_;
    }

    function setReentry(bool enabled) external {
        attemptReentry = enabled;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        last = params;
        if (attemptReentry) {
            IAdaptaraAdapter.SwapRequest memory request = IAdaptaraAdapter.SwapRequest(
                params.recipient, params.tokenIn, params.tokenOut, 1, 1, uint64(block.timestamp), keccak256("nested")
            );
            (bool ok,) = msg.sender.call(abi.encodeCall(IAdaptaraAdapter.swap, (request)));
            reentryBlocked = !ok;
        }
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn * pullBps / 10_000);
        require(output >= params.amountOutMinimum, "Too little received");
        IERC20(params.tokenOut).transfer(params.recipient, output);
        return reportedOverride == 0 ? output : reportedOverride;
    }
}

contract UniswapV3SwapAdapterV1Test is Test {
    address admin = makeAddr("admin");
    address vault = makeAddr("vault");
    address attacker = makeAddr("attacker");
    MockERC20 tokenIn;
    MockERC20 tokenOut;
    MockV3Factory factory;
    MockSwapRouter02 router;
    UniswapV3SwapAdapterV1 adapter;
    MockV3Pool pool;

    function setUp() public {
        vm.chainId(196);
        tokenIn = new MockERC20("In", "IN");
        tokenOut = new MockERC20("Out", "OUT");
        factory = new MockV3Factory();
        router = new MockSwapRouter02();
        pool = new MockV3Pool();
        adapter = new UniswapV3SwapAdapterV1(admin, router, factory);
        factory.setPool(address(tokenIn), address(tokenOut), 500, address(pool));
        vm.prank(admin);
        adapter.configurePair(address(tokenIn), address(tokenOut), 500);
        tokenIn.mint(vault, 10 ether);
        tokenOut.mint(address(router), 100 ether);
        vm.prank(vault);
        tokenIn.approve(address(adapter), type(uint256).max);
    }

    function testTypedDirectSwapPinsRouterFeeRecipientAndLimit() public {
        vm.prank(vault);
        uint256 reported = adapter.swap(_request(2 ether, 0.9 ether));
        assertEq(reported, 1 ether);
        (address a, address b, uint24 fee, address recipient, uint256 amount, uint256 minimum, uint160 limit) =
            router.last();
        assertEq(a, address(tokenIn));
        assertEq(b, address(tokenOut));
        assertEq(fee, 500);
        assertEq(recipient, vault);
        assertEq(amount, 2 ether);
        assertEq(minimum, 0.9 ether);
        assertEq(limit, 0);
    }

    function testOnlyVaultCanInvokeItsRequest() public {
        vm.expectRevert();
        vm.prank(attacker);
        adapter.swap(_request(1 ether, 1 ether));
    }

    function testWrongChainCannotDeployOrExecute() public {
        vm.chainId(1952);
        vm.expectRevert(abi.encodeWithSelector(UniswapV3SwapAdapterV1.WrongChain.selector, 1952, 196));
        new UniswapV3SwapAdapterV1(admin, router, factory);
        vm.expectRevert(abi.encodeWithSelector(UniswapV3SwapAdapterV1.WrongChain.selector, 1952, 196));
        vm.prank(vault);
        adapter.swap(_request(1 ether, 1 ether));
    }

    function testOnlyAdminConfiguresAndPairIsWriteOnce() public {
        MockERC20 other = new MockERC20("Other", "OTHER");
        vm.expectRevert();
        vm.prank(attacker);
        adapter.configurePair(address(tokenIn), address(other), 3000);
        vm.expectRevert();
        vm.prank(admin);
        adapter.configurePair(address(tokenIn), address(tokenOut), 500);
    }

    function testMissingPoolAndUnsupportedDirectionFailClosed() public {
        MockERC20 other = new MockERC20("Other", "OTHER");
        vm.expectRevert();
        vm.prank(admin);
        adapter.configurePair(address(tokenIn), address(other), 500);
        vm.expectRevert();
        vm.prank(vault);
        adapter.swap(
            IAdaptaraAdapter.SwapRequest(
                vault, address(tokenOut), address(tokenIn), 1 ether, 1, uint64(block.timestamp), bytes32(uint256(9))
            )
        );
    }

    function testZeroAndExpiredFailClosed() public {
        vm.expectRevert();
        vm.prank(vault);
        adapter.swap(_request(0, 1));
        vm.warp(10);
        IAdaptaraAdapter.SwapRequest memory request = _request(1, 1);
        request.deadline = 9;
        vm.expectRevert();
        vm.prank(vault);
        adapter.swap(request);
    }

    function testExactRouterApprovalResetsAndCustodyIsZero() public {
        vm.prank(vault);
        adapter.swap(_request(2 ether, 1 ether));
        assertEq(tokenIn.allowance(address(adapter), address(router)), 0);
        assertEq(tokenIn.balanceOf(address(adapter)), 0);
        assertEq(tokenOut.balanceOf(address(adapter)), 0);
    }

    function testResidualInputIsReturnedAndAllowanceReset() public {
        router.configure(1 ether, 5_000, 0);
        uint256 before = tokenIn.balanceOf(vault);
        vm.prank(vault);
        adapter.swap(_request(2 ether, 1 ether));
        assertEq(tokenIn.balanceOf(vault), before - 1 ether);
        assertEq(tokenIn.balanceOf(address(adapter)), 0);
        assertEq(tokenIn.allowance(address(adapter), address(router)), 0);
    }

    function testRouterReturnCannotRedirectOrChangeActualOutput() public {
        router.configure(1 ether, 10_000, 99 ether);
        uint256 before = tokenOut.balanceOf(vault);
        vm.prank(vault);
        uint256 reported = adapter.swap(_request(1 ether, 1 ether));
        assertEq(reported, 99 ether);
        assertEq(tokenOut.balanceOf(vault) - before, 1 ether);
    }

    function testTooStrictMinimumAtomicallyReverts() public {
        uint256 before = tokenIn.balanceOf(vault);
        vm.expectRevert();
        vm.prank(vault);
        adapter.swap(_request(1 ether, 2 ether));
        assertEq(tokenIn.balanceOf(vault), before);
        assertEq(tokenIn.allowance(address(adapter), address(router)), 0);
    }

    function testRouterReentryIsBlocked() public {
        router.setReentry(true);
        vm.prank(vault);
        adapter.swap(_request(1 ether, 1 ether));
        assertTrue(router.reentryBlocked());
    }

    function testPreexistingCustodyFailsClosed() public {
        tokenIn.mint(address(adapter), 1);
        vm.expectRevert();
        vm.prank(vault);
        adapter.swap(_request(1 ether, 1 ether));
    }

    function _request(uint256 amount, uint256 minimum) private view returns (IAdaptaraAdapter.SwapRequest memory) {
        return IAdaptaraAdapter.SwapRequest(
            vault,
            address(tokenIn),
            address(tokenOut),
            amount,
            minimum,
            uint64(block.timestamp + 60),
            keccak256(abi.encode(amount, minimum))
        );
    }
}
