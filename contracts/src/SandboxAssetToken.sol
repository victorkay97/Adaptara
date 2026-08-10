// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply ERC-20 for Adaptara's X Layer testnet sandbox only.
/// @dev The token conveys no redemption right, investment value, backing, or real-world ownership claim.
contract SandboxAssetToken is ERC20 {
    constructor(string memory name_, string memory symbol_, address initialHolder_, uint256 initialSupply_)
        ERC20(name_, symbol_)
    {
        _mint(initialHolder_, initialSupply_);
    }
}
