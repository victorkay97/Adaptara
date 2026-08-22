// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AdaptiveManagedVaultV1} from "./AdaptiveManagedVaultV1.sol";
import {AdaptiveManagedVaultDeployerV2} from "./AdaptiveManagedVaultDeployerV2.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";
import {IAdaptaraValuationProvider} from "./interfaces/IAdaptaraValuationProvider.sol";
import {IProtocolAdapterRegistry} from "./interfaces/IProtocolAdapterRegistry.sol";

/// @notice Additive bounded multi-Vault factory. It has no authority after construction.
contract AdaptiveManagedVaultFactoryV2 {
    uint256 public constant MAX_VAULTS_PER_OWNER = 16;

    error ZeroAddress();
    error VaultLimitReached(address owner);
    error VaultIndexOutOfBounds(address owner, uint256 index);
    error InvalidPageSize(uint256 requested);

    event ManagedVaultCreated(address indexed owner, address indexed vault, uint256 indexed ownerVaultIndex);

    IAssetRegistry public immutable assetRegistry;
    IAdaptaraValuationProvider public immutable valuationProvider;
    IProtocolAdapterRegistry public immutable protocolAdapterRegistry;
    uint32 public immutable maximumValuationAge;
    AdaptiveManagedVaultDeployerV2 public immutable vaultDeployer;

    mapping(address owner => address[] vaults) private _vaultsByOwner;
    mapping(address vault => bool registered) public isManagedVault;
    mapping(address vault => address owner) public ownerOfVault;

    constructor(
        IAssetRegistry registry,
        IAdaptaraValuationProvider provider,
        IProtocolAdapterRegistry adapters,
        uint32 maxAge
    ) {
        if (
            address(registry) == address(0) || address(provider) == address(0) || address(adapters) == address(0)
                || address(registry).code.length == 0 || address(provider).code.length == 0
                || address(adapters).code.length == 0 || maxAge == 0
        ) revert ZeroAddress();
        assetRegistry = registry;
        valuationProvider = provider;
        protocolAdapterRegistry = adapters;
        maximumValuationAge = maxAge;
        vaultDeployer = new AdaptiveManagedVaultDeployerV2(registry, provider, adapters, maxAge);
    }

    function createManagedVault(address guardian) external returns (address vault) {
        uint256 index = _vaultsByOwner[msg.sender].length;
        if (index == MAX_VAULTS_PER_OWNER) revert VaultLimitReached(msg.sender);
        vault = vaultDeployer.deploy(msg.sender, guardian);
        _vaultsByOwner[msg.sender].push(vault);
        isManagedVault[vault] = true;
        ownerOfVault[vault] = msg.sender;
        emit ManagedVaultCreated(msg.sender, vault, index);
    }

    function vaultCount(address owner) external view returns (uint256) {
        return _vaultsByOwner[owner].length;
    }

    function vaultAt(address owner, uint256 index) external view returns (address) {
        if (index >= _vaultsByOwner[owner].length) revert VaultIndexOutOfBounds(owner, index);
        return _vaultsByOwner[owner][index];
    }

    function vaultsOf(address owner, uint256 offset, uint256 limit) external view returns (address[] memory page) {
        if (limit == 0 || limit > MAX_VAULTS_PER_OWNER) revert InvalidPageSize(limit);
        uint256 length = _vaultsByOwner[owner].length;
        if (offset >= length) return new address[](0);
        uint256 end = offset + limit;
        if (end > length) end = length;
        page = new address[](end - offset);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _vaultsByOwner[owner][offset + i];
        }
    }
}
