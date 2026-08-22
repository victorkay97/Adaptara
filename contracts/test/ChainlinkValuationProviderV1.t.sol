// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ChainlinkValuationProviderV1} from "../src/ChainlinkValuationProviderV1.sol";
import {IAdaptaraValuationProviderV2} from "../src/interfaces/IAdaptaraValuationProviderV2.sol";

contract MockAggregatorV3 {
    uint8 public decimals;
    uint80 public roundId;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public answeredInRound;

    constructor(uint8 decimals_) {
        decimals = decimals_;
    }

    function set(uint80 roundId_, int256 answer_, uint256 updatedAt_, uint80 answeredInRound_) external {
        roundId = roundId_;
        answer = answer_;
        updatedAt = updatedAt_;
        answeredInRound = answeredInRound_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, answer, updatedAt, updatedAt, answeredInRound);
    }
}

contract ChainlinkValuationProviderV1Test is Test {
    ChainlinkValuationProviderV1 internal provider;
    MockAggregatorV3 internal sequencer;
    address internal asset = makeAddr("asset");
    bytes32 internal constant SOURCE = keccak256("chainlink-proxy-feed");

    function setUp() public {
        vm.warp(10 days);
        sequencer = new MockAggregatorV3(0);
        sequencer.set(1, 0, block.timestamp - 2 hours, 1);
        provider = new ChainlinkValuationProviderV1(1 days, address(this), address(sequencer), 1 hours);
    }

    function testNormalizesSixEightEighteenAndThirtySixDecimals() public {
        _assertNormalized(6, 123_456_789, 123_456_789 * 1e12, makeAddr("six"));
        _assertNormalized(8, 123_456_789, 1_234_567_890_000_000_000, makeAddr("eight"));
        _assertNormalized(18, 123_456_789, 123_456_789, makeAddr("eighteen"));
        _assertNormalized(36, 123_456_789 * 1e18, 123_456_789, makeAddr("thirty-six"));
    }

    function testMissingZeroNegativeFutureIncompleteAndUnsupportedDecimalsFailClosed() public {
        assertFalse(provider.getReport(asset).valid);
        _assertInvalid(18, 0, block.timestamp, 1, 1, makeAddr("zero"));
        _assertInvalid(18, -1, block.timestamp, 1, 1, makeAddr("negative"));
        _assertInvalid(18, 1e18, block.timestamp + 1, 1, 1, makeAddr("future"));
        _assertInvalid(18, 1e18, block.timestamp, 2, 1, makeAddr("incomplete"));
        _assertInvalid(37, 1e18, block.timestamp, 1, 1, makeAddr("decimals"));
    }

    function testConfigurationIsWriteOnceAndRequiresContractSourceAndAsset() public {
        MockAggregatorV3 feed = new MockAggregatorV3(8);
        provider.configureFeed(asset, address(feed), SOURCE, 1 hours);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkValuationProviderV1.FeedAlreadyConfigured.selector, asset));
        provider.configureFeed(asset, address(feed), SOURCE, 1 hours);
        vm.expectRevert(ChainlinkValuationProviderV1.InvalidFeed.selector);
        provider.configureFeed(address(0), address(feed), SOURCE, 1 hours);
        vm.expectRevert(ChainlinkValuationProviderV1.InvalidFeed.selector);
        provider.configureFeed(makeAddr("other"), makeAddr("eoa"), SOURCE, 1 hours);
    }

    function testNonAdminCannotConfigureFeed() public {
        MockAggregatorV3 feed = new MockAggregatorV3(8);
        vm.expectRevert();
        vm.prank(makeAddr("attacker"));
        provider.configureFeed(asset, address(feed), SOURCE, 1 hours);
    }

    function testFuzzNormalizationForEightDecimals(uint128 raw) public {
        vm.assume(raw > 0);
        MockAggregatorV3 feed = new MockAggregatorV3(8);
        address fuzzAsset = makeAddr("fuzz-asset");
        feed.set(1, int256(uint256(raw)), block.timestamp, 1);
        provider.configureFeed(fuzzAsset, address(feed), SOURCE, 1 hours);
        assertEq(provider.getReport(fuzzAsset).priceE18, uint256(raw) * 1e10);
    }

    function _assertNormalized(uint8 decimals, uint256 raw, uint256 expected, address testAsset) internal {
        MockAggregatorV3 feed = new MockAggregatorV3(decimals);
        feed.set(7, int256(raw), block.timestamp, 7);
        provider.configureFeed(testAsset, address(feed), SOURCE, 1 hours);
        IAdaptaraValuationProviderV2.Report memory report = provider.getReport(testAsset);
        assertTrue(report.valid);
        assertEq(report.priceE18, expected);
        assertEq(report.observedAt, block.timestamp);
        assertEq(report.roundId, 7);
        assertEq(report.sourceId, SOURCE);
        assertEq(uint256(report.marketStatus), uint256(IAdaptaraValuationProviderV2.MarketStatus.NotApplicable));
        assertEq(provider.getValuation(testAsset).priceE18, expected);
    }

    function _assertInvalid(uint8 decimals, int256 raw, uint256 time, uint80 round, uint80 answered, address testAsset)
        internal
    {
        MockAggregatorV3 feed = new MockAggregatorV3(decimals);
        feed.set(round, raw, time, answered);
        provider.configureFeed(testAsset, address(feed), SOURCE, 1 hours);
        assertFalse(provider.getReport(testAsset).valid);
    }

    function testSequencerDownGraceInvalidAndAfterGrace() public {
        MockAggregatorV3 feed = new MockAggregatorV3(8);
        feed.set(1, 100_000_000, block.timestamp, 1);
        provider.configureFeed(asset, address(feed), SOURCE, 1 hours);
        sequencer.set(2, 1, block.timestamp - 2 hours, 2);
        assertFalse(provider.getReport(asset).valid);
        sequencer.set(3, 0, block.timestamp - 1 hours, 3);
        assertFalse(provider.getReport(asset).valid);
        sequencer.set(4, 0, block.timestamp - 1 hours - 1, 4);
        assertTrue(provider.getReport(asset).valid);
        sequencer.set(0, 0, 0, 0);
        assertFalse(provider.getReport(asset).valid);
    }

    function testStaleFeedFailsClosedAtMaximumAgeBoundary() public {
        MockAggregatorV3 feed = new MockAggregatorV3(8);
        provider.configureFeed(asset, address(feed), SOURCE, 1 hours);
        feed.set(1, 100_000_000, block.timestamp - 1 hours, 1);
        assertTrue(provider.getReport(asset).valid);
        feed.set(2, 100_000_000, block.timestamp - 1 hours - 1, 2);
        assertFalse(provider.getReport(asset).valid);
    }
}
