// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Pure deterministic checkpoint arithmetic used by the Vault yield pipeline.
library YieldAccountingV1 {
    struct Settlement {
        uint256 accrued;
        uint256 retained;
        uint256 reserveAmount;
        uint256 newBasis;
    }

    function settle(uint256 currentPosition, uint256 accountedBasis, uint16 reserveBps)
        internal
        pure
        returns (Settlement memory result)
    {
        if (currentPosition <= accountedBasis) return Settlement(0, 0, 0, currentPosition);
        result.accrued = currentPosition - accountedBasis;
        result.reserveAmount = Math.mulDiv(result.accrued, reserveBps, 10_000);
        result.retained = result.accrued - result.reserveAmount;
        result.newBasis = currentPosition - result.reserveAmount;
    }
}
