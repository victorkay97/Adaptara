// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAdaptaraYieldAdapter {
    struct SupplyRequest {
        address vault;
        address underlying;
        uint256 amount;
        uint64 deadline;
        bytes32 intentId;
    }

    struct WithdrawRequest {
        address vault;
        address underlying;
        uint256 amount;
        uint64 deadline;
        bytes32 intentId;
    }

    function underlying() external view returns (address);
    function aToken() external view returns (address);
    function supply(SupplyRequest calldata request) external returns (uint256 positionIncrease);
    function withdraw(WithdrawRequest calldata request) external returns (uint256 underlyingReturned);
}
