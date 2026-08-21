// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {IProtocolAdapterRegistry} from "./interfaces/IProtocolAdapterRegistry.sol";

/// @notice Protocol-level audited adapter catalog; owner-vault enablement remains a separate decision.
contract ProtocolAdapterRegistryV1 is AccessControlDefaultAdminRules, IProtocolAdapterRegistry {
    struct AdapterInfo {
        bytes32 adapterType;
        bytes32 version;
        bool supported;
    }
    mapping(address => AdapterInfo) public adapterInfo;
    error InvalidAdapter();
    error AdapterAlreadyRegistered(address adapter);
    event AdapterRegistered(address indexed adapter, bytes32 indexed adapterType, bytes32 indexed version);
    event AdapterDisabled(address indexed adapter);

    constructor(uint48 delay, address admin) AccessControlDefaultAdminRules(delay, admin) {}

    function isSupportedAdapter(address adapter) external view returns (bool) {
        return adapterInfo[adapter].supported;
    }

    function registerAdapter(address adapter, bytes32 adapterType, bytes32 version)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (adapter == address(0) || adapter.code.length == 0 || adapterType == bytes32(0) || version == bytes32(0)) revert InvalidAdapter();
        if (adapterInfo[adapter].version != bytes32(0)) revert AdapterAlreadyRegistered(adapter);
        adapterInfo[adapter] = AdapterInfo(adapterType, version, true);
        emit AdapterRegistered(adapter, adapterType, version);
    }

    function disableAdapter(address adapter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        adapterInfo[adapter].supported = false;
        emit AdapterDisabled(adapter);
    }
}
