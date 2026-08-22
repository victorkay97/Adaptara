// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AdaptiveManagedVaultFactoryV2} from "../src/AdaptiveManagedVaultFactoryV2.sol";
import {AdaptiveManagedVaultDeployerV2} from "../src/AdaptiveManagedVaultDeployerV2.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";

contract V2ValuationMock is IAdaptaraValuationProvider {
    function getValuation(address) external view returns (Valuation memory) {
        return Valuation(1 ether, uint64(block.timestamp), true);
    }
}

contract AdaptiveManagedVaultFactoryV2Test is Test {
    AssetRegistry assets;
    ProtocolAdapterRegistryV1 protocols;
    AdaptiveManagedVaultFactoryV2 factory;
    address ownerA = makeAddr("owner-a");
    address ownerB = makeAddr("owner-b");

    function setUp() public {
        assets = new AssetRegistry(1 days, address(this));
        protocols = new ProtocolAdapterRegistryV1(1 days, address(this));
        factory = new AdaptiveManagedVaultFactoryV2(assets, new V2ValuationMock(), protocols, 1 hours);
    }

    function testSameOwnerCreatesThreeUniqueIndependentVaults() public {
        address[3] memory created;
        for (uint256 i; i < 3; ++i) {
            vm.prank(ownerA);
            created[i] = factory.createManagedVault(address(0));
        }
        assertEq(factory.vaultCount(ownerA), 3);
        for (uint256 i; i < 3; ++i) {
            assertEq(factory.vaultAt(ownerA, i), created[i]);
            assertTrue(factory.isManagedVault(created[i]));
            assertEq(factory.ownerOfVault(created[i]), ownerA);
            assertEq(AdaptiveManagedVaultV1(created[i]).owner(), ownerA);
            assertEq(AdaptiveManagedVaultV1(created[i]).agentExecutor(), address(0));
        }
        assertTrue(created[0] != created[1] && created[1] != created[2] && created[0] != created[2]);
    }

    function testOwnersNeverCrossEnumerationsOrAuthority() public {
        vm.prank(ownerA);
        address a = factory.createManagedVault(address(0));
        vm.prank(ownerB);
        address b = factory.createManagedVault(address(0));
        assertEq(factory.vaultAt(ownerA, 0), a);
        assertEq(factory.vaultAt(ownerB, 0), b);
        vm.expectRevert();
        vm.prank(ownerA);
        AdaptiveManagedVaultV1(b).setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Advisory);
        vm.expectRevert();
        vm.prank(address(factory));
        AdaptiveManagedVaultV1(a).withdraw(address(1), ownerA, 1);
    }

    function testCreationHelperRejectsEveryNonFactoryCaller() public {
        AdaptiveManagedVaultDeployerV2 deployer = factory.vaultDeployer();
        vm.expectRevert(abi.encodeWithSelector(AdaptiveManagedVaultDeployerV2.UnauthorizedCaller.selector, ownerA));
        vm.prank(ownerA);
        deployer.deploy(ownerA, address(0));
    }

    function testConstitutionModePauseReplayAndTurnoverAreInstanceLocal() public {
        vm.startPrank(ownerA);
        address a = factory.createManagedVault(address(0));
        address b = factory.createManagedVault(address(0));
        AdaptiveManagedVaultV1(a).setPolicy(AdaptiveManagedVaultV1.VaultPolicy(2_000, 5_000, 3_000, 1_000));
        AdaptiveManagedVaultV1(b).setPolicy(AdaptiveManagedVaultV1.VaultPolicy(4_000, 3_500, 1_000, 500));
        AdaptiveManagedVaultV1(a).setManagementMode(AdaptiveManagedVaultV1.ManagementMode.ApprovalRequired);
        AdaptiveManagedVaultV1(b).setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Advisory);
        AdaptiveManagedVaultV1(a).pause();
        vm.stopPrank();
        (uint16 reserveA,,,) = AdaptiveManagedVaultV1(a).policy();
        (uint16 reserveB,,,) = AdaptiveManagedVaultV1(b).policy();
        assertEq(reserveA, 2_000);
        assertEq(reserveB, 4_000);
        assertTrue(AdaptiveManagedVaultV1(a).paused());
        assertFalse(AdaptiveManagedVaultV1(b).paused());
        assertFalse(AdaptiveManagedVaultV1(a).consumedIntentIds(keccak256("same")));
        assertFalse(AdaptiveManagedVaultV1(b).consumedIntentIds(keccak256("same")));
        assertEq(AdaptiveManagedVaultV1(a).dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
        assertEq(AdaptiveManagedVaultV1(b).dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
    }

    function testPaginationAndCap() public {
        for (uint256 i; i < factory.MAX_VAULTS_PER_OWNER(); ++i) {
            vm.prank(ownerA);
            factory.createManagedVault(address(0));
        }
        address[] memory page = factory.vaultsOf(ownerA, 5, 4);
        assertEq(page.length, 4);
        assertEq(page[0], factory.vaultAt(ownerA, 5));
        vm.expectRevert(abi.encodeWithSelector(AdaptiveManagedVaultFactoryV2.VaultLimitReached.selector, ownerA));
        vm.prank(ownerA);
        factory.createManagedVault(address(0));
    }

    function testFuzzCreationOrdering(uint8 countSeed) public {
        uint256 count = bound(countSeed, 1, factory.MAX_VAULTS_PER_OWNER());
        for (uint256 i; i < count; ++i) {
            vm.prank(ownerA);
            address vault = factory.createManagedVault(address(0));
            assertEq(factory.vaultAt(ownerA, i), vault);
        }
        assertEq(factory.vaultCount(ownerA), count);
    }

    function testDeploymentCreationAndRuntimeSizeEvidence() public {
        uint256 gasBefore = gasleft();
        AdaptiveManagedVaultFactoryV2 measured =
            new AdaptiveManagedVaultFactoryV2(assets, new V2ValuationMock(), protocols, 1 hours);
        emit log_named_uint("factory-v2-deployment-gas", gasBefore - gasleft());
        emit log_named_uint("factory-v2-runtime-bytes", address(measured).code.length);
        assertLt(address(measured).code.length, 24_576);
        emit log_named_uint("vault-deployer-v2-runtime-bytes", address(measured.vaultDeployer()).code.length);
        assertLt(address(measured.vaultDeployer()).code.length, 24_576);

        gasBefore = gasleft();
        vm.prank(ownerA);
        address first = measured.createManagedVault(address(0));
        emit log_named_uint("first-vault-creation-gas", gasBefore - gasleft());
        emit log_named_uint("vault-v1-runtime-bytes", first.code.length);
        assertLt(first.code.length, 24_576);

        gasBefore = gasleft();
        vm.prank(ownerA);
        measured.createManagedVault(address(0));
        emit log_named_uint("second-vault-creation-gas", gasBefore - gasleft());

        for (uint256 i = 2; i < measured.MAX_VAULTS_PER_OWNER() - 1; ++i) {
            vm.prank(ownerA);
            measured.createManagedVault(address(0));
        }
        gasBefore = gasleft();
        vm.prank(ownerA);
        measured.createManagedVault(address(0));
        emit log_named_uint("near-cap-vault-creation-gas", gasBefore - gasleft());
        assertEq(measured.vaultCount(ownerA), measured.MAX_VAULTS_PER_OWNER());

        gasBefore = gasleft();
        measured.vaultsOf(ownerA, 8, 8);
        emit log_named_uint("bounded-eight-vault-enumeration-gas", gasBefore - gasleft());
    }
}
