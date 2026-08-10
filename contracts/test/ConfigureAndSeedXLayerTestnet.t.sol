// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ConfigureXLayerTestnet} from "../script/ConfigureXLayerTestnet.s.sol";
import {SeedXLayerTestnet} from "../script/SeedXLayerTestnet.s.sol";
import {AdaptiveVault} from "../src/AdaptiveVault.sol";
import {AdaptiveVaultFactory} from "../src/AdaptiveVaultFactory.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";

contract DecimalToken is ERC20 {
    uint8 private immutable _tokenDecimals;

    constructor(string memory symbol_, uint8 decimals_) ERC20(symbol_, symbol_) {
        _tokenDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract ConfigureHarness is ConfigureXLayerTestnet {
    function configureLocal(AdaptiveVaultFactory factory, address demoOwner) external returns (address) {
        return _configure(factory, demoOwner);
    }
}

contract SeedHarness is SeedXLayerTestnet {
    function validateLocal(AdaptiveVault vault, address demoOwner, address[4] memory assets, uint256[4] memory amounts)
        external
        view
    {
        _validateSeed(vault, demoOwner, assets, amounts);
    }

    function seedLocal(AdaptiveVault vault, address demoOwner, address[4] memory assets, uint256[4] memory amounts)
        external
    {
        _seed(vault, demoOwner, assets, amounts);
    }
}

contract ConfigureAndSeedXLayerTestnetTest is Test {
    address internal constant OFFICIAL_USDT0 = 0x9e29b3AaDa05Bf2D2c827Af80Bd28Dc0b9b4FB0c;
    address internal demoOwner = makeAddr("demoOwner");
    AssetRegistry internal registry;
    AdaptiveVaultFactory internal factory;
    AdaptiveVault internal vault;
    DecimalToken internal strsy;
    DecimalToken internal sxau;
    DecimalToken internal saaplx;
    SeedHarness internal seed;
    address[4] internal assets;

    function setUp() public {
        registry = new AssetRegistry(1 days, address(this));
        factory = new AdaptiveVaultFactory(registry);
        DecimalToken usdt0Implementation = new DecimalToken("USD0", 6);
        vm.etch(OFFICIAL_USDT0, address(usdt0Implementation).code);
        strsy = new DecimalToken("sTRSY", 18);
        sxau = new DecimalToken("sXAU", 18);
        saaplx = new DecimalToken("sAAPLx", 18);
        assets = [OFFICIAL_USDT0, address(strsy), address(sxau), address(saaplx)];
        registry.registerAsset(assets[0], IAssetRegistry.RiskTier.Reserve);
        registry.registerAsset(assets[1], IAssetRegistry.RiskTier.Defensive);
        registry.registerAsset(assets[2], IAssetRegistry.RiskTier.Balanced);
        registry.registerAsset(assets[3], IAssetRegistry.RiskTier.Aggressive);
        vm.prank(demoOwner);
        vault = AdaptiveVault(payable(factory.createVault(demoOwner, address(0))));
        seed = new SeedHarness();
        uint256[4] memory amounts = seed.seedAmounts(1);
        for (uint256 i; i < assets.length; ++i) {
            DecimalToken(assets[i]).mint(demoOwner, amounts[i]);
        }
    }

    function testConfigureCreatesExpectedDemoVaultRoles() public {
        AdaptiveVaultFactory freshFactory = new AdaptiveVaultFactory(registry);
        ConfigureHarness configure = new ConfigureHarness();
        address created = configure.configureLocal(freshFactory, demoOwner);
        AdaptiveVault configuredVault = AdaptiveVault(payable(created));
        assertEq(configuredVault.owner(), demoOwner);
        assertEq(configuredVault.guardian(), demoOwner);
        assertEq(configuredVault.agentExecutor(), address(0));
    }

    function testSeedRejectsDemoOwnerVaultOwnerMismatchBeforeAction() public {
        uint256[4] memory amounts = seed.seedAmounts(1);
        vm.expectRevert("demo owner does not own vault");
        seed.validateLocal(vault, makeAddr("wrongOwner"), assets, amounts);
        assertEq(DecimalToken(assets[0]).allowance(demoOwner, address(vault)), 0);
    }

    function testSeedRejectsUnsupportedTokenBeforeDeposit() public {
        DecimalToken unsupported = new DecimalToken("unsupported", 18);
        assets[2] = address(unsupported);
        uint256[4] memory amounts = seed.seedAmounts(1);
        unsupported.mint(demoOwner, amounts[2]);
        vm.expectRevert("asset is unsupported");
        seed.validateLocal(vault, demoOwner, assets, amounts);
        assertEq(unsupported.balanceOf(address(vault)), 0);
    }

    function testSeedRejectsWrongDecimalsBeforeDeposit() public {
        DecimalToken wrongDecimals = new DecimalToken("wrong", 6);
        registry.registerAsset(address(wrongDecimals), IAssetRegistry.RiskTier.Balanced);
        assets[2] = address(wrongDecimals);
        uint256[4] memory amounts = seed.seedAmounts(1);
        wrongDecimals.mint(demoOwner, amounts[2]);
        vm.expectRevert("asset decimals mismatch");
        seed.validateLocal(vault, demoOwner, assets, amounts);
        assertEq(wrongDecimals.balanceOf(address(vault)), 0);
    }

    function testSeedRejectsSwappedSandboxTierSlotsBeforeDeposit() public {
        (assets[1], assets[2]) = (assets[2], assets[1]);
        uint256[4] memory amounts = seed.seedAmounts(1);
        vm.expectRevert("asset baseline tier mismatch");
        seed.validateLocal(vault, demoOwner, assets, amounts);
        for (uint256 i; i < assets.length; ++i) {
            assertEq(DecimalToken(assets[i]).balanceOf(address(vault)), 0);
        }
    }

    function testHappyPathSeedsExactBalancesFromDemoOwner() public {
        uint256[4] memory amounts = seed.seedAmounts(1);
        uint256[4] memory ownerBalancesBefore;
        for (uint256 i; i < assets.length; ++i) {
            ownerBalancesBefore[i] = DecimalToken(assets[i]).balanceOf(demoOwner);
        }

        seed.seedLocal(vault, demoOwner, assets, amounts);

        for (uint256 i; i < assets.length; ++i) {
            assertEq(DecimalToken(assets[i]).balanceOf(address(vault)), amounts[i]);
            assertEq(DecimalToken(assets[i]).balanceOf(demoOwner), ownerBalancesBefore[i] - amounts[i]);
        }
    }

    function testScaleOneProducesExactRawAmounts() public view {
        uint256[4] memory amounts = seed.seedAmounts(1);
        assertEq(amounts[0], 4 * 10 ** 6);
        assertEq(amounts[1], 3 * 10 ** 16);
        assertEq(amounts[2], 1 * 10 ** 15);
        assertEq(amounts[3], 5 * 10 ** 15);
    }
}
