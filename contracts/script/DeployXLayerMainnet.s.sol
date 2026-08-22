// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ChainlinkValuationProviderV1} from "../src/ChainlinkValuationProviderV1.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {UniswapV3SwapAdapterV1} from "../src/UniswapV3SwapAdapterV1.sol";
import {AaveV3YieldAdapterV1} from "../src/AaveV3YieldAdapterV1.sol";
import {AdaptiveManagedVaultFactoryV1} from "../src/AdaptiveManagedVaultFactoryV1.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {ISwapRouter02Minimal} from "../src/interfaces/ISwapRouter02Minimal.sol";
import {IUniswapV3FactoryMinimal} from "../src/interfaces/IUniswapV3FactoryMinimal.sol";

contract DeployXLayerMainnet is Script {
    uint256 internal constant CHAIN_ID = 196;
    uint48 internal constant ADMIN_DELAY = 2 days;
    uint32 internal constant GRACE = 3600;
    uint32 internal constant MAX_AGE = 90_000;
    address internal constant SEQUENCER = 0x45c2b8C204568A03Dc7A2E32B71D67Fe97F908A9;
    address internal constant USDT = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    address internal constant XETH = 0xE7B000003A45145decf8a28FC755aD5eC5EA025A;
    address internal constant USDT_FEED = 0xb928a0678352005a2e51F614efD0b54C9830dB80;
    address internal constant ETH_FEED = 0x8b85b50535551F8E8cDAF78dA235b5Cf1005907b;
    address internal constant ROUTER = 0x4f0C28f5926AFDA16bf2506D5D9e57Ea190f9bcA;
    address internal constant UNI_FACTORY = 0x4B2ab38DBF28D31D467aA8993f6c2585981D6804;
    uint24 internal constant FEE = 500;

    struct Deployment {
        AssetRegistry assets;
        ChainlinkValuationProviderV1 valuations;
        ProtocolAdapterRegistryV1 protocols;
        UniswapV3SwapAdapterV1 uniswap;
        AaveV3YieldAdapterV1 aave;
        AdaptiveManagedVaultFactoryV1 factory;
    }

    function run() external returns (Deployment memory deployed) {
        address admin = vm.envAddress("ADAPTARA_PRODUCTION_ADMIN");
        address configurator = vm.envAddress("DEPLOYER_ADDRESS");
        require(admin != address(0), "PRODUCTION_ADMIN_REQUIRED");
        require(configurator != address(0) && configurator != admin, "INVALID_CONFIGURATOR");
        vm.startBroadcast(configurator);
        deployed = _deployAndConfigure(configurator, admin);
        vm.stopBroadcast();
    }

    /// @dev Test/fork entry point. The script contract is the temporary configurator in local execution only.
    function deployForFork(address finalAdmin) external returns (Deployment memory deployed) {
        return _deployAndConfigure(address(this), finalAdmin);
    }

    function _deployAndConfigure(address configurator, address finalAdmin)
        internal
        returns (Deployment memory deployed)
    {
        require(block.chainid == CHAIN_ID, "WRONG_CHAIN");
        require(configurator != address(0) && finalAdmin != address(0), "PRODUCTION_ADMIN_REQUIRED");
        _requireCode(SEQUENCER);
        _requireCode(USDT);
        _requireCode(XETH);
        _requireCode(USDT_FEED);
        _requireCode(ETH_FEED);
        _requireCode(ROUTER);
        _requireCode(UNI_FACTORY);
        address pool = IUniswapV3FactoryMinimal(UNI_FACTORY).getPool(XETH, USDT, FEE);
        _requireCode(pool);

        deployed.assets = new AssetRegistry(ADMIN_DELAY, configurator);
        deployed.valuations = new ChainlinkValuationProviderV1(ADMIN_DELAY, configurator, SEQUENCER, GRACE);
        deployed.protocols = new ProtocolAdapterRegistryV1(ADMIN_DELAY, configurator);
        deployed.uniswap = new UniswapV3SwapAdapterV1(
            configurator, ISwapRouter02Minimal(ROUTER), IUniswapV3FactoryMinimal(UNI_FACTORY)
        );
        deployed.aave = new AaveV3YieldAdapterV1();
        deployed.factory =
            new AdaptiveManagedVaultFactoryV1(deployed.assets, deployed.valuations, deployed.protocols, MAX_AGE);

        deployed.assets.registerAsset(USDT, IAssetRegistry.RiskTier.Reserve);
        deployed.assets.registerAsset(XETH, IAssetRegistry.RiskTier.Balanced);
        deployed.valuations.configureFeed(USDT, USDT_FEED, keccak256("chainlink-usdt-usd-xlayer"), MAX_AGE);
        deployed.valuations.configureFeed(XETH, ETH_FEED, keccak256("chainlink-eth-usd-xlayer"), MAX_AGE);
        deployed.protocols.registerAdapter(address(deployed.uniswap), keccak256("uniswap-v3-direct"), keccak256("v1"));
        deployed.protocols.registerAdapter(address(deployed.aave), keccak256("aave-v3-yield"), keccak256("v1"));
        deployed.uniswap.configurePair(XETH, USDT, FEE);
        deployed.uniswap.renounceRole(deployed.uniswap.PAIR_ADMIN_ROLE(), configurator);
        deployed.assets.beginDefaultAdminTransfer(finalAdmin);
        deployed.valuations.beginDefaultAdminTransfer(finalAdmin);
        deployed.protocols.beginDefaultAdminTransfer(finalAdmin);
        deployed.uniswap.beginDefaultAdminTransfer(finalAdmin);
    }

    function _requireCode(address target) private view {
        require(target != address(0) && target.code.length != 0, "EXTERNAL_CONTRACT_MISSING");
    }
}
