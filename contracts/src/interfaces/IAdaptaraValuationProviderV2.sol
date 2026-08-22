// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAdaptaraValuationProviderV2 {
    enum MarketStatus {
        NotApplicable,
        Open,
        Closed,
        Unknown,
        Unsupported
    }

    struct Report {
        uint256 priceE18;
        uint64 observedAt;
        uint80 roundId;
        bytes32 sourceId;
        MarketStatus marketStatus;
        bool valid;
    }

    function getReport(address asset) external view returns (Report memory);
}
