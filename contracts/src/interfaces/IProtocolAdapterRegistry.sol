// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProtocolAdapterRegistry {
    function isSupportedAdapter(address adapter) external view returns (bool);
}
