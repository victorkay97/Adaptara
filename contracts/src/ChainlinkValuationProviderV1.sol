// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IAdaptaraValuationProvider} from "./interfaces/IAdaptaraValuationProvider.sol";
import {IAdaptaraValuationProviderV2} from "./interfaces/IAdaptaraValuationProviderV2.sol";

interface IChainlinkAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

/// @notice Production-shaped, undeployed Chainlink proxy normalizer. Feed addresses are never hardcoded.
contract ChainlinkValuationProviderV1 is
    AccessControlDefaultAdminRules,
    IAdaptaraValuationProvider,
    IAdaptaraValuationProviderV2
{
    uint8 public constant MAX_FEED_DECIMALS = 36;

    struct FeedConfig {
        address proxy;
        bytes32 sourceId;
        uint32 maximumAge;
        bool configured;
    }
    mapping(address => FeedConfig) public feedConfig;
    IChainlinkAggregatorV3 public immutable sequencerUptimeFeed;
    uint32 public immutable sequencerGracePeriod;

    error InvalidFeed();
    error FeedAlreadyConfigured(address asset);
    event FeedConfigured(address indexed asset, address indexed proxy, bytes32 indexed sourceId);

    constructor(uint48 adminTransferDelay, address initialAdmin, address sequencerFeed, uint32 gracePeriod)
        AccessControlDefaultAdminRules(adminTransferDelay, initialAdmin)
    {
        if (sequencerFeed == address(0) || sequencerFeed.code.length == 0 || gracePeriod == 0) revert InvalidFeed();
        sequencerUptimeFeed = IChainlinkAggregatorV3(sequencerFeed);
        sequencerGracePeriod = gracePeriod;
    }

    /// @dev Configuration is write-once. Migration requires a new version/provider deployment.
    function configureFeed(address asset, address proxy, bytes32 sourceId, uint32 maximumAge)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (
            asset == address(0) || proxy == address(0) || proxy.code.length == 0 || sourceId == bytes32(0)
                || maximumAge == 0
        ) {
            revert InvalidFeed();
        }
        if (feedConfig[asset].configured) revert FeedAlreadyConfigured(asset);
        feedConfig[asset] = FeedConfig(proxy, sourceId, maximumAge, true);
        emit FeedConfigured(asset, proxy, sourceId);
    }

    function getValuation(address asset) external view returns (Valuation memory) {
        Report memory report = getReport(asset);
        return Valuation(report.priceE18, report.observedAt, report.valid);
    }

    function getReport(address asset) public view returns (Report memory report) {
        if (!_sequencerSafe()) return report;
        FeedConfig memory config = feedConfig[asset];
        if (!config.configured) return report;
        IChainlinkAggregatorV3 feed = IChainlinkAggregatorV3(config.proxy);
        uint8 decimals = feed.decimals();
        if (decimals > MAX_FEED_DECIMALS) return report;
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        if (
            roundId == 0 || answer <= 0 || updatedAt == 0 || updatedAt > block.timestamp || updatedAt > type(uint64).max
                || answeredInRound < roundId || block.timestamp - updatedAt > config.maximumAge
        ) return report;
        uint256 unsignedAnswer = uint256(answer);
        uint256 priceE18 = decimals <= 18
            ? Math.mulDiv(unsignedAnswer, 10 ** (18 - decimals), 1)
            : Math.mulDiv(unsignedAnswer, 1, 10 ** (decimals - 18));
        if (priceE18 == 0) return report;
        return Report(priceE18, uint64(updatedAt), roundId, config.sourceId, MarketStatus.NotApplicable, true);
    }

    function _sequencerSafe() private view returns (bool) {
        try sequencerUptimeFeed.latestRoundData() returns (
            uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
        ) {
            return roundId != 0 && answer == 0 && startedAt != 0 && startedAt <= block.timestamp && updatedAt != 0
                && updatedAt <= block.timestamp && answeredInRound >= roundId
                && block.timestamp - startedAt > sequencerGracePeriod;
        } catch {
            return false;
        }
    }
}
