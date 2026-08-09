// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SystemVersion} from "../src/SystemVersion.sol";

contract SystemVersionTest is Test {
    function testVersionIsPhaseSeven() public {
        SystemVersion systemVersion = new SystemVersion();
        assertEq(systemVersion.version(), "phase-7");
    }
}
