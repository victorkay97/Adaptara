// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal authority surface consumed by the additive Phase 13A mandate.
interface IAdaptiveVaultAuthority {
    function owner() external view returns (address);
    function agentExecutor() external view returns (address);
    function paused() external view returns (bool);
}
