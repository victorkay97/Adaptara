# Adaptara Project Specification

## Purpose and problem

Adaptara is an adaptive, policy-bounded AI wealth agent for tokenized real-world assets on X Layer. Tokenized portfolios need continuous interpretation, but an LLM is not safe transaction authority. Adaptara separates recommendations from deterministic permission and onchain execution.

> AI decides what should happen. X Layer guarantees what is allowed to happen.

## High-level solution

Portfolio and market data will feed a deterministic risk engine and an AI recommendation layer. An adaptation engine will turn valid recommendations into proposals. Smart contracts will enforce the user's confirmed financial policy before execution. Blockchain state remains authoritative.

## User modes

- **Connect / Intelligence:** analyze supported holdings in an existing wallet without custody or autonomous execution.
- **Vault / Managed:** create an isolated, non-upgradeable multi-asset vault governed by an owner-confirmed mandate. This mode is future work.

## Future sandbox assets

- USD0 reserve
- sTRSY
- sXAU
- sAAPLx

sTRSY, sXAU, and sAAPLx will be sandbox instruments with no redemption rights and no real-world value.

## Risk tiers

- **Defensive:** prioritizes reserves and reduced volatility.
- **Balanced:** balances resilience and measured opportunity.
- **Aggressive:** permits more volatility within explicit hard limits.

Phase 1 contains no portfolio, agent, vault, risk, yield, or rebalancing business logic.
