// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {SandboxAssetToken} from "../src/SandboxAssetToken.sol";

contract SandboxAssetTokenTest is Test {
    address internal holder = makeAddr("holder");
    address internal recipient = makeAddr("recipient");
    uint256 internal constant SUPPLY = 1_000_000 ether;
    SandboxAssetToken internal token;

    function setUp() public {
        token = new SandboxAssetToken("Sandbox Treasury Exposure", "sTRSY", holder, SUPPLY);
    }

    function testInitialSupplyGoesOnlyToInitialHolder() public view {
        assertEq(token.balanceOf(holder), SUPPLY);
        assertEq(token.balanceOf(address(this)), 0);
        assertEq(token.balanceOf(recipient), 0);
    }

    function testTotalSupplyEqualsConstructorSupply() public view {
        assertEq(token.totalSupply(), SUPPLY);
    }

    function testStandardTransferWorks() public {
        vm.prank(holder);
        assertTrue(token.transfer(recipient, 25 ether));
        assertEq(token.balanceOf(holder), SUPPLY - 25 ether);
        assertEq(token.balanceOf(recipient), 25 ether);
    }

    function testDecimalsAreEighteen() public view {
        assertEq(token.decimals(), 18);
    }

    function testArbitraryAccountCannotMintMore() public {
        bytes memory mintCall = abi.encodeWithSignature("mint(address,uint256)", recipient, 1 ether);
        vm.prank(makeAddr("attacker"));
        (bool success,) = address(token).call(mintCall);
        assertFalse(success);
        assertEq(token.totalSupply(), SUPPLY);
    }

    function testNoRedemptionOrPrivilegedAssetClaimPath() public {
        bytes4[3] memory selectors = [
            bytes4(keccak256("redeem(uint256)")), bytes4(keccak256("claim()")), bytes4(keccak256("withdraw(uint256)"))
        ];
        for (uint256 i; i < selectors.length; ++i) {
            (bool success,) = address(token).call(abi.encodeWithSelector(selectors[i], 1 ether));
            assertFalse(success);
        }
        assertEq(token.totalSupply(), SUPPLY);
    }

    function testZeroInitialHolderIsRejected() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InvalidReceiver.selector, address(0)));
        new SandboxAssetToken("Sandbox Gold Exposure", "sXAU", address(0), SUPPLY);
    }
}
