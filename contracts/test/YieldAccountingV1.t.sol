// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {YieldAccountingV1} from "../src/YieldAccountingV1.sol";

contract YieldAccountingV1Test is Test {
    function testZeroAndPositionBelowBasisNeverSweepPrincipal() public pure {
        YieldAccountingV1.Settlement memory zero = YieldAccountingV1.settle(100, 100, 9_000);
        assertEq(zero.accrued, 0);
        assertEq(YieldAccountingV1.settle(99, 100, 9_000).accrued, 0);
    }

    function testCompoundOneHundred() public pure {
        YieldAccountingV1.Settlement memory s = YieldAccountingV1.settle(110, 100, 0);
        assertEq(s.accrued, 10);
        assertEq(s.retained, 10);
        assertEq(s.reserveAmount, 0);
        assertEq(s.newBasis, 110);
    }

    function testReserveOneHundred() public pure {
        YieldAccountingV1.Settlement memory s = YieldAccountingV1.settle(110, 100, 10_000);
        assertEq(s.retained, 0);
        assertEq(s.reserveAmount, 10);
        assertEq(s.newBasis, 100);
    }

    function testTenNinetyAndSeventyThirtyFloorRounding() public pure {
        YieldAccountingV1.Settlement memory ten = YieldAccountingV1.settle(111, 100, 9_000);
        assertEq(ten.reserveAmount, 9);
        assertEq(ten.retained, 2);
        assertEq(ten.newBasis, 102);
        YieldAccountingV1.Settlement memory seventy = YieldAccountingV1.settle(111, 100, 3_000);
        assertEq(seventy.reserveAmount, 3);
        assertEq(seventy.retained, 8);
        assertEq(seventy.newBasis, 108);
    }

    function testCheckpointPreventsDoubleCountingAndAddedPrincipalWorks() public pure {
        YieldAccountingV1.Settlement memory first = YieldAccountingV1.settle(110, 100, 3_000);
        assertEq(YieldAccountingV1.settle(first.newBasis, first.newBasis, 3_000).accrued, 0);
        assertEq(YieldAccountingV1.settle(125, first.newBasis + 10, 3_000).accrued, 8);
    }

    function testFuzzSettlementConservesYield(uint128 position, uint128 basis, uint16 reserveBps) public pure {
        reserveBps = uint16(bound(reserveBps, 0, 10_000));
        YieldAccountingV1.Settlement memory s = YieldAccountingV1.settle(position, basis, reserveBps);
        assertEq(s.retained + s.reserveAmount, s.accrued);
        assertLe(s.reserveAmount, s.accrued);
    }
}
