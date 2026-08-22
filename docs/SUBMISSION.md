# Adaptara Hackathon Submission

## Project

**Adaptara**

## One-liner

Adaptara is a policy-bound adaptive portfolio-management system where MARA interprets portfolio and market intelligence, deterministic planning specifies bounded actions, and independently governed X Layer Vaults enforce each owner's Financial Constitution.

## Problem

Tokenized-asset portfolios require continuous interpretation across holdings, market conditions, events, risk, and yield opportunities. Giving the same AI unrestricted transaction authority creates an unsafe concentration of intelligence and control. Users need adaptive assistance without surrendering custody or explicit policy boundaries.

## Solution

Adaptara separates the system into clear authority layers:

```text
portfolio and market/event state
  -> MARA direction and explanation
  -> deterministic exact planning
  -> Financial Constitution allow/block
  -> typed protocol execution
  -> Vault post-state validation
```

Users choose what capital to delegate into isolated Vaults. Blockchain state remains authoritative for ownership, custody, balances, policy, mode, and confirmed activity. AI output never directly becomes transaction authority.

## Why AI

MARA, the Market Adaptive Risk Agent, is Adaptara's observation, interpretation, and recommendation layer. It connects portfolio composition with supplied market, news/event, risk, policy, and relevant yield context, explains what may deserve attention, and proposes a direction.

MARA is not decorative, but it is deliberately not sovereign. It cannot sign, select arbitrary calldata, choose exact basis points or routes, bypass the Constitution, or guarantee returns. Deterministic code validates MARA's structured output and calculates the exact bounded plan.

## Why X Layer

X Layer provides the authoritative execution and evidence layer for Adaptara:

- isolated onchain Vault custody and owner policy;
- low-cost public transaction evidence on Testnet and Mainnet;
- Chainlink-based production valuation with sequencer/freshness safeguards;
- typed Uniswap V3 and Aave V3 integrations;
- registered Builder Code and mined ERC-8021 attribution proof;
- additive V1/V2 discovery for independently governed Vaults.

## Key differentiators

- Intelligence is separated from deterministic planning and transaction authority.
- Each Vault has its own Constitution, mode, pause, replay, turnover, yield accounting, and custody state.
- Typed adapter interfaces avoid arbitrary protocol calldata.
- Policy and post-state validation fail atomically.
- V2 adds bounded Multi-Vault enumeration without replacing V1 or introducing proxies.
- Demo Mode exposes the complete intended product journey without requiring assets or public writes.

## Demo flow

1. Start in Home, the portfolio command center.
2. Review wallet-centric holdings and deterministic risk in Portfolio.
3. Inspect independently governed Vaults and selected-Vault context.
4. Ask MARA to explain the supplied portfolio and risk evidence.
5. Review the deterministic plan and Constitution allow/block result.
6. Inspect truthful Activity provenance or the explicit unavailable state.
7. Open the Testnet Builder registration and mined ERC-8021 proof.

No production transaction is required for judging.

## Demo Mode

Demo Mode exists for judges who do not hold X Layer assets or do not want to connect a wallet. It uses clearly labelled simulations for the portfolio, Vaults, market/news events, MARA intelligence, deterministic plans, Constitution decisions, and Activity. These fixtures never enter Live Mode discovery, counts, balances, or authoritative event history.

## Testnet deployment evidence

The initial working milestone was deployed on X Layer Testnet, chain ID `1952`, on `2026-08-10` with recorded timestamp `2026-08-10T15:47:43Z`. It proved the earlier isolated-Vault architecture, test-asset portfolio reads, active Financial Constitution, Builder Code registration, and ERC-8021 attribution.

| Item | Evidence |
|---|---|
| AssetRegistry | `0xd211E4d1e1049d800d5360A078d52B0fcDD74684` |
| AdaptiveVaultFactory | `0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e` |
| Demo AdaptiveVault | `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4` |
| Builder Code | `tl5ce7n7gk5a5pzk` |
| Vault creation | `0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4` |
| Constitution activation | `0x92d8a51ae653027dccf22ef4b7d361996163c031a23d442290f8548f8d1a640b` |
| Builder registration | `0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef` |
| ERC-8021 proof | `0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e` |

The Testnet architecture is an earlier milestone and is not described as byte-for-byte identical to Mainnet. Its sTRSY, sXAU, and sAAPLx assets are simulations with no backing, collateral, redemption, or ownership rights.

## Mainnet deployment evidence

The production-hardened architecture is deployed on X Layer Mainnet, chain ID `196`.

| Contract | Address |
|---|---|
| AssetRegistry | `0xd211E4d1e1049d800d5360A078d52B0fcDD74684` |
| ChainlinkValuationProviderV1 | `0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc` |
| ProtocolAdapterRegistryV1 | `0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A` |
| UniswapV3SwapAdapterV1 | `0x009e2dfEa3FE134BcE3F769aA3E6C287823af184` |
| AaveV3YieldAdapterV1 | `0xd7c2662e436Bd1D50A6AA033C05DB905A2dddc83` |
| AdaptiveManagedVaultFactoryV1 | `0xE0969F6F0C0cFEE3F34132466f84CF45e883DcA5` |
| AdaptiveManagedVaultFactoryV2 | `0x98dE37855b85993C0cA6746b667BA01f2894efad` |
| V2 creation helper | `0x9550049F7896599630D6eE7D6D3E5F72b9A1DA0C` |

V2 deployment transaction: `0x6c407bc749b62565e4b8c1380605f036d35f6a178ebe9ee5fd63e083f6b5549c`, block `68405395`. Production governance handover to `0xf4ac7c9ad5a809240291a4f2e4cbe9189b14cdf4` is complete.

## Security / authority model

- Owners decide what capital enters an isolated, non-upgradeable Vault.
- MARA, Sentinel, and the application server have no signing authority.
- No generic execute, arbitrary call, or `delegatecall` capability exists.
- Deterministic planners choose exact action parameters; typed adapters constrain protocol access.
- Chainlink price freshness and X Layer sequencer checks fail closed.
- Constitution and post-state violations revert atomically.
- V2 factory and helper retain no post-creation fund authority.
- Governance handover is complete; Builder attribution is metadata only.

Adaptara does not promise profits, loss prevention, risk-free returns, fixed yield, or reliable price prediction.

## Multi-Vault V2

Factory V2 is live and post-deployment verified. It supports up to 16 Vaults per owner with bounded enumeration and explicit owner/Vault/index provenance. It reuses `AdaptiveManagedVaultV1`; no Vault V2 implementation exists. Each Vault independently owns its Constitution, management mode, pause state, replay protection, turnover accounting, yield accounting, and custody. Executor is zero at creation. V1 remains supported, and the frontend performs unified read-only V1/V2 discovery.

## Current production status

- Live production portfolio and V1/V2 discovery: **read-only**
- Public Create Vault submission: **disabled**
- Public deposits, withdrawals, policy changes, mode changes, swaps, Aave actions, and executor changes: **disabled**
- Adaptive: **disabled**
- Production Activity ingestion: limited; no history is fabricated
- Demo Mode: available with explicitly simulated state

These are controlled-rollout safety boundaries. Judges can experience the complete intended journey in Demo Mode but cannot submit production transactions through the public application.

## Technical stack

- Solidity `0.8.28`, Foundry, OpenZeppelin
- Next.js 16, React 19, TypeScript
- Viem, Wagmi, Reown AppKit, OKX Universal Provider
- OpenAI-backed MARA with structured deterministic validation
- X Layer, Chainlink, Uniswap V3, Aave V3
- ERC-8021 Builder Code attribution

## Validation

- Foundry: **160/160 passed across 21 suites**
- Multi-Vault V2: **7/7 unit and 2/2 fork tests passed**
- Invariants: **128 runs, 8,192 calls, zero invariant reverts**
- Fuzz campaigns: passed
- Frontend: **591 tests passed across 67 files**
- ESLint, TypeScript typecheck, Next.js production build, and `git diff --check`: passed

## Explorer links

- [Testnet AdaptiveVaultFactory](https://www.oklink.com/x-layer-testnet/address/0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e)
- [Testnet demo AdaptiveVault](https://www.oklink.com/x-layer-testnet/address/0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4)
- [Testnet Vault creation](https://www.oklink.com/x-layer-testnet/tx/0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4)
- [Testnet Constitution activation](https://www.oklink.com/x-layer-testnet/tx/0x92d8a51ae653027dccf22ef4b7d361996163c031a23d442290f8548f8d1a640b)
- [Builder registration](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef)
- [Mined ERC-8021 proof](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e)
- [Mainnet Multi-Vault Factory V2](https://www.oklink.com/x-layer/address/0x98dE37855b85993C0cA6746b667BA01f2894efad)
- [Mainnet V2 deployment](https://www.oklink.com/x-layer/tx/0x6c407bc749b62565e4b8c1380605f036d35f6a178ebe9ee5fd63e083f6b5549c)

## Known limitations / controlled rollout

- Public production writes are intentionally disabled.
- Adaptive execution and public executor assignment are not activated.
- Production Activity ingestion remains limited.
- Demo Mode uses simulations rather than production balances or events.
- Live production discovery is read-only.
- Testnet contract source verification remains pending on the explorer.
- Protocol yield is variable and carries smart-contract, liquidity, oracle, and market risk.

## Prize / track positioning

Adaptara is positioned for AI-RWA, product-quality, innovation, user-value, and X Layer ecosystem tracks. Its contribution is the separation of useful AI interpretation from deterministic planning and onchain policy authority, combined with a judge-accessible simulated experience and reproducible Testnet-to-Mainnet evidence. This positioning does not assert eligibility, selection, or any guaranteed prize and does not reshape the product around trading-volume incentives.

## Submission links

- **Live app:** https://adaptara.vercel.app/
- **Demo Mode URL:** TODO BEFORE SUBMISSION
- **GitHub:** https://github.com/victorkay97/Adaptara
- **Whitepaper:** https://adaptara.vercel.app/whitepaper
- **Demo video:** TODO BEFORE SUBMISSION
- **Project X account/post:** TODO BEFORE SUBMISSION
- **Team:** TODO BEFORE SUBMISSION
