// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AdaptiveManagedVaultFactoryV2} from "../src/AdaptiveManagedVaultFactoryV2.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract InvariantValuation is IAdaptaraValuationProvider {
    function getValuation(address) external view returns (Valuation memory) {
        return Valuation(1 ether, uint64(block.timestamp), true);
    }
}

contract MultiVaultV2Handler is Test {
    AdaptiveManagedVaultFactoryV2 public immutable factory;
    address public immutable ownerA;
    address public immutable ownerB;
    MockERC20 public immutable custodyToken;
    bytes32 public constant PROBE_INTENT = keccak256("multi-vault-invariant-probe");

    constructor(AdaptiveManagedVaultFactoryV2 factory_) {
        factory = factory_;
        ownerA = makeAddr("inv-a");
        ownerB = makeAddr("inv-b");
        custodyToken = new MockERC20("Invariant custody", "ICV");
    }

    function create(uint256 ownerSeed) external {
        address owner = ownerSeed % 2 == 0 ? ownerA : ownerB;
        if (factory.vaultCount(owner) == factory.MAX_VAULTS_PER_OWNER()) return;
        vm.prank(owner);
        address vault = factory.createManagedVault(address(0));
        custodyToken.mint(vault, 1 ether);
    }

    function attemptCrossVaultMutation(uint256 ownerSeed, uint256 indexSeed) external {
        address owner = ownerSeed % 2 == 0 ? ownerA : ownerB;
        uint256 count = factory.vaultCount(owner);
        if (count == 0) return;
        AdaptiveManagedVaultV1 vault = AdaptiveManagedVaultV1(payable(factory.vaultAt(owner, indexSeed % count)));
        try vault.withdraw(address(custodyToken), address(this), 1) {} catch {}
        try vault.pause() {} catch {}
        try vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(1, 1, 1, 1)) {} catch {}
    }
}

contract PhaseMultiVaultV2Invariants is StdInvariant, Test {
    AdaptiveManagedVaultFactoryV2 factory;
    MultiVaultV2Handler handler;

    function setUp() public {
        AssetRegistry assets = new AssetRegistry(1 days, address(this));
        ProtocolAdapterRegistryV1 protocols = new ProtocolAdapterRegistryV1(1 days, address(this));
        factory = new AdaptiveManagedVaultFactoryV2(assets, new InvariantValuation(), protocols, 1 hours);
        handler = new MultiVaultV2Handler(factory);
        targetContract(address(handler));
    }

    function invariantEnumerationOwnershipProvenanceAndUniqueness() public view {
        _check(handler.ownerA());
        _check(handler.ownerB());
    }

    function _check(address owner) private view {
        uint256 count = factory.vaultCount(owner);
        assertLe(count, factory.MAX_VAULTS_PER_OWNER());
        for (uint256 i; i < count; ++i) {
            address vault = factory.vaultAt(owner, i);
            assertTrue(factory.isManagedVault(vault));
            assertEq(factory.ownerOfVault(vault), owner);
            assertEq(AdaptiveManagedVaultV1(payable(vault)).owner(), owner);
            assertEq(AdaptiveManagedVaultV1(payable(vault)).agentExecutor(), address(0));
            assertFalse(AdaptiveManagedVaultV1(payable(vault)).paused());
            assertFalse(AdaptiveManagedVaultV1(payable(vault)).consumedIntentIds(handler.PROBE_INTENT()));
            assertEq(AdaptiveManagedVaultV1(payable(vault)).dailyTurnoverBps(uint64(block.timestamp / 1 days)), 0);
            assertEq(handler.custodyToken().balanceOf(vault), 1 ether);
            (uint16 reserve,,,) = AdaptiveManagedVaultV1(payable(vault)).policy();
            assertEq(reserve, 0);
            for (uint256 j; j < i; ++j) {
                assertTrue(vault != factory.vaultAt(owner, j));
            }
        }
    }
}
