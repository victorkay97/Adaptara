// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Phase marker proving the Solidity toolchain is wired correctly.
contract SystemVersion {
    function version() external pure returns (string memory) {
        return "phase-4";
    }
}
