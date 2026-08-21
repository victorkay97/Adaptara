// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {AdaptiveManagedVaultV1} from "../src/AdaptiveManagedVaultV1.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProtocolAdapterRegistryV1} from "../src/ProtocolAdapterRegistryV1.sol";
import {IAssetRegistry} from "../src/interfaces/IAssetRegistry.sol";
import {IAdaptaraAdapter} from "../src/interfaces/IAdaptaraAdapter.sol";
import {IAdaptaraValuationProvider} from "../src/interfaces/IAdaptaraValuationProvider.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract InvariantPrices is IAdaptaraValuationProvider {
    mapping(address => Valuation) public values;

    function set(address asset, uint256 price, uint64 time, bool valid) external {
        values[asset] = Valuation(price, time, valid);
    }

    function getValuation(address asset) external view returns (Valuation memory) {
        return values[asset];
    }
}

contract InvariantAdapter is IAdaptaraAdapter {
    address immutable sink = address(0xbeef);

    function swap(SwapRequest calldata r) external returns (uint256) {
        require(MockERC20(r.assetIn).transferFrom(r.vault, sink, r.amountIn), "input transfer");
        MockERC20(r.assetOut).mint(r.vault, r.amountIn);
        return r.amountIn;
    }
}

contract Phase13C1Handler is Test {
    AdaptiveManagedVaultV1 public vault;
    InvariantPrices public prices;
    InvariantAdapter public adapter;
    MockERC20[4] public tokens;
    address public owner;
    address public currentExecutor;
    address public previousExecutor;
    bytes32 public lastSuccessfulIntent;
    uint256 public nonce;
    bool public constitutionCheckpoint;

    constructor(
        AdaptiveManagedVaultV1 vault_,
        InvariantPrices prices_,
        InvariantAdapter adapter_,
        MockERC20[4] memory tokens_,
        address owner_,
        address executor_
    ) {
        vault = vault_;
        prices = prices_;
        adapter = adapter_;
        tokens = tokens_;
        owner = owner_;
        currentExecutor = executor_;
    }

    function setMode(uint8 raw) external {
        vm.prank(owner);
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode(bound(raw, 0, 2)));
        constitutionCheckpoint = false;
    }

    function setAutonomousPause(bool paused) external {
        vm.prank(owner);
        vault.setAutonomousPaused(paused);
    }

    function setVaultPause(bool paused) external {
        vm.prank(owner);
        if (paused && !vault.paused()) vault.pause();
        else if (!paused && vault.paused()) vault.unpause();
    }

    function rotateExecutor(address candidate) external {
        candidate = address(uint160(bound(uint160(candidate), 0x1000, type(uint160).max)));
        if (candidate == owner) return;
        previousExecutor = currentExecutor;
        currentExecutor = candidate;
        vm.prank(owner);
        vault.setAgentExecutor(candidate);
    }

    function setValuation(uint8 index, uint8 condition) external {
        MockERC20 token = tokens[bound(index, 0, 3)];
        condition = uint8(bound(condition, 0, 4));
        if (condition == 0) prices.set(address(token), 1e18, uint64(block.timestamp), true);
        else if (condition == 1) prices.set(address(token), 0, uint64(block.timestamp), true);
        else if (condition == 2) prices.set(address(token), 1e18, uint64(block.timestamp - 2 hours), true);
        else if (condition == 3) prices.set(address(token), 1e18, uint64(block.timestamp + 1), true);
        else prices.set(address(token), 1e18, uint64(block.timestamp), false);
        constitutionCheckpoint = false;
    }

    function advanceDay(uint8 daysForward) external {
        vm.warp(block.timestamp + bound(daysForward, 1, 3) * 1 days);
        for (uint256 i; i < 4; ++i) {
            prices.set(address(tokens[i]), 1e18, uint64(block.timestamp), true);
        }
        constitutionCheckpoint = false;
    }

    function attemptSwap(uint8 from, uint8 to, uint96 rawAmount, bool asOwner) external {
        from = uint8(bound(from, 0, 3));
        to = uint8(bound(to, 0, 3));
        if (from == to) to = (to + 1) % 4;
        uint256 amount = bound(uint256(rawAmount), 1, 5 ether);
        bytes32 id = keccak256(abi.encode(++nonce, from, to));
        AdaptiveManagedVaultV1.SwapIntent memory intent = AdaptiveManagedVaultV1.SwapIntent(
            address(tokens[from]),
            address(tokens[to]),
            address(adapter),
            amount,
            amount,
            uint64(block.timestamp + 60),
            id
        );
        address caller = asOwner ? owner : currentExecutor;
        vm.prank(caller);
        (bool success,) = address(vault)
            .call(
                asOwner
                    ? abi.encodeCall(vault.executeOwnerApprovedSwap, intent)
                    : abi.encodeCall(vault.executeAdaptiveSwap, intent)
            );
        if (success) {
            lastSuccessfulIntent = id;
            constitutionCheckpoint = true;
        }
        assertEq(tokens[from].allowance(address(vault), address(adapter)), 0);
    }

    function replayLast(bool asOwner) external {
        if (lastSuccessfulIntent == bytes32(0)) return;
        AdaptiveManagedVaultV1.ExecutionResult memory record = vault.executionResult(lastSuccessfulIntent);
        AdaptiveManagedVaultV1.SwapIntent memory intent = AdaptiveManagedVaultV1.SwapIntent(
            record.assetIn,
            record.assetOut,
            record.adapter,
            record.actualAmountIn,
            record.actualAmountOut,
            uint64(block.timestamp + 60),
            lastSuccessfulIntent
        );
        vm.prank(asOwner ? owner : currentExecutor);
        (bool success,) = address(vault)
            .call(
                asOwner
                    ? abi.encodeCall(vault.executeOwnerApprovedSwap, intent)
                    : abi.encodeCall(vault.executeAdaptiveSwap, intent)
            );
        assertFalse(success);
    }
}

contract Phase13C1InvariantTest is StdInvariant, Test {
    AdaptiveManagedVaultV1 vault;
    InvariantPrices prices;
    InvariantAdapter adapter;
    Phase13C1Handler handler;
    MockERC20[4] tokens;
    address owner = makeAddr("owner");
    address executor = makeAddr("executor");

    function setUp() public {
        vm.warp(10 days);
        AssetRegistry assets = new AssetRegistry(1 days, address(this));
        prices = new InvariantPrices();
        adapter = new InvariantAdapter();
        ProtocolAdapterRegistryV1 adapters = new ProtocolAdapterRegistryV1(1 days, address(this));
        adapters.registerAdapter(address(adapter), keccak256("swap"), keccak256("v1"));
        for (uint256 i; i < 4; ++i) {
            tokens[i] = new MockERC20("Invariant", "INV");
            assets.registerAsset(address(tokens[i]), IAssetRegistry.RiskTier(i));
        }
        vault = new AdaptiveManagedVaultV1(owner, address(0), executor, assets, prices, adapters, 1 hours);
        vm.startPrank(owner);
        for (uint256 i; i < 4; ++i) {
            vault.addManagedAsset(address(tokens[i]));
        }
        vault.setAllowedAdapter(address(adapter), true);
        vault.setPolicy(AdaptiveManagedVaultV1.VaultPolicy(20_00, 40_00, 35_00, 60_00));
        vault.setExecutionPolicy(AdaptiveManagedVaultV1.ExecutionPolicy(10_00, 60_00, 100, 300, true));
        vault.setManagementMode(AdaptiveManagedVaultV1.ManagementMode.Adaptive);
        vault.setAutonomousPaused(false);
        vm.stopPrank();
        for (uint256 i; i < 4; ++i) {
            tokens[i].mint(address(vault), 100 ether);
            prices.set(address(tokens[i]), 1e18, uint64(block.timestamp), true);
        }
        handler = new Phase13C1Handler(vault, prices, adapter, tokens, owner, executor);
        targetContract(address(handler));
    }

    function invariant_AuthorityAndPinnedRegistry() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.agentExecutor(), handler.currentExecutor());
        assertTrue(address(vault.protocolAdapterRegistry()) != address(0));
    }

    function invariant_NoResidualAllowanceOrAdapterCustody() public view {
        for (uint256 i; i < 4; ++i) {
            assertEq(tokens[i].allowance(address(vault), address(adapter)), 0);
            assertEq(tokens[i].balanceOf(address(adapter)), 0);
        }
    }

    function invariant_ReplayAndRecordTruth() public view {
        bytes32 id = handler.lastSuccessfulIntent();
        if (id == bytes32(0)) return;
        assertTrue(vault.consumedIntentIds(id));
        AdaptiveManagedVaultV1.ExecutionResult memory r = vault.executionResult(id);
        assertEq(r.intentHash == bytes32(0), false);
        assertEq(r.adapter, address(adapter));
        assertTrue(r.initiator == owner || r.initiator != address(0));
        assertEq(r.actualAmountIn, r.actualAmountOut);
    }

    function invariant_TurnoverBounded() public view {
        uint16 used = vault.dailyTurnoverBps(uint64(block.timestamp / 1 days));
        assertLe(used, 60_00);
    }

    function invariant_ConstitutionAfterSuccessfulSwap() public view {
        if (!handler.constitutionCheckpoint()) return;
        uint256 total;
        uint256 reserve;
        uint256 aggressive;
        for (uint256 i; i < 4; ++i) {
            uint256 b = tokens[i].balanceOf(address(vault));
            total += b;
            if (i == 0) reserve = b;
            if (i == 3) aggressive = b;
        }
        for (uint256 i; i < 4; ++i) {
            uint256 b = tokens[i].balanceOf(address(vault));
            assertLe((b * 10_000 + total - 1) / total, 40_00);
        }
        assertGe(reserve * 10_000 / total, 20_00);
        assertLe((aggressive * 10_000 + total - 1) / total, 35_00);
    }
}
