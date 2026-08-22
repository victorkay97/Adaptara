# Adaptara

**Adaptive intelligence for onchain wealth.**

Adaptara is a policy-bound adaptive portfolio-management system on X Layer. Users choose capital to delegate into independently governed Vaults. MARA interprets portfolio, market, event, risk, and relevant yield intelligence; deterministic planning converts that direction into exact bounded actions; and each Vault's onchain Financial Constitution determines what is allowed.

Tokenized portfolios need continuous interpretation, but useful intelligence should not receive unrestricted control of capital. Adaptara separates intelligence, planning, permission, and execution: MARA proposes direction, deterministic code calculates exact actions, typed integrations constrain protocol access, and the Vault validates policy and post-state. AI has no signing key and cannot bypass the owner or Constitution.

Judges can use **Demo Mode** without a wallet or assets to experience the complete simulated flow, or connect in **Live Mode** to inspect real X Layer portfolio and Vault state. Live production discovery is currently read-only and all public transaction submission remains disabled.

X Layer gives Adaptara a low-cost, publicly verifiable authority layer for isolated custody, policy enforcement, typed protocol integration, and the Testnet-to-Mainnet deployment evidence judges can inspect directly.

## Product overview

Adaptara combines adaptive intelligence with deterministic, onchain authority boundaries:

> MARA proposes what may help. Deterministic planning specifies the action. X Layer and the Financial Constitution decide what is allowed.

The primary application surfaces are:

- **Home:** portfolio-wide command center.
- **Portfolio:** wallet-centric holdings and deterministic risk.
- **Vaults:** independently governed managed-capital units.
- **Activity:** authoritative activity where verified ingestion exists; otherwise a truthful empty or unavailable state.

MARA is contextual across the product rather than a separate navigation destination.

## Core flow

```text
User wallet
  -> user selects capital
  -> independently governed Vault
  -> Financial Constitution
  -> MARA intelligence and direction
  -> deterministic exact planning
  -> Constitution allow/block
  -> typed execution
  -> post-state validation
```

Blockchain state is authoritative for Vault identity, ownership, custody, balances, policy, mode, and confirmed execution. No LLM output directly becomes transaction authority.

## MARA

MARA, the **Market Adaptive Risk Agent**, is a substantive observation and intelligence layer. It interprets supplied portfolio state, market and news/event context, deterministic risk, policy, and relevant yield conditions, then explains what matters and recommends a direction.

MARA does not choose transaction calldata, exact basis points, protocol routes, or signing accounts. Its structured output is treated as untrusted input and validated before deterministic planning. MARA cannot guarantee profits, prevent losses, predict prices reliably, or create risk-free yield.

## Financial Constitution

Every managed Vault has an independent Financial Constitution. It expresses explicit limits such as reserve floors, single-asset exposure, aggressive exposure, action size, protocol allocation, and yield disposition. A proposed action must satisfy the applicable policy before and after execution or the complete transaction reverts.

The Constitution is not an AI prompt. It is deterministic owner-controlled state enforced at the Vault boundary.

## Multi-Vault

The additive `AdaptiveManagedVaultFactoryV2` is deployed and post-deployment verified on X Layer Mainnet. It:

- supports up to 16 Vaults per owner with bounded enumeration;
- preserves owner, Vault address, generation, and owner-relative index provenance;
- reuses the non-upgradeable `AdaptiveManagedVaultV1` implementation;
- creates each Vault with executor zero;
- isolates custody, Constitution, management mode, pause state, replay state, turnover accounting, and yield accounting;
- retains no post-creation fund authority.

The existing V1 factory remains supported. Frontend discovery aggregates V1 and V2 and deduplicates by authoritative Vault address. There is no separate Vault V2 implementation and no proxy-based Vault architecture.

## Live Mode and Demo Mode

| Mode | Purpose | Data and authority |
|---|---|---|
| Live Mode | Inspect real X Layer wallet and Vault state | Real onchain discovery and reads; currently read-only for public users |
| Demo Mode | Let judges experience the full intended journey without assets or wallet risk | Explicitly simulated portfolio, Vaults, market/news events, MARA intelligence, plans, Constitution outcomes, and Activity |

Demo fixtures never enter live discovery, live Vault counts, production portfolio state, or authoritative Activity. Demo Mode exists so a judge can explore the product without owning X Layer assets or approving transactions.

## X Layer Testnet to Mainnet

Adaptara's architecture evolved between its initial working Testnet milestone and the current production-hardened Mainnet system. The deployments are related evidence stages, not byte-for-byte identical architectures.

| Stage | Network | Date | What was proven | Evidence |
|---|---|---|---|---|
| Initial deployment | X Layer Testnet, chain 1952 | 2026-08-10 | Isolated Vault, factory discovery, test-asset portfolio reads, Financial Constitution, Builder Code, and mined ERC-8021 attribution | Public contracts and four successful evidence transactions below |
| Production hardening | X Layer Mainnet, chain 196 | 2026-08-16 to 2026-08-19 | Chainlink valuation, typed Uniswap execution, typed Aave yield, shared registries, governance handover, and additive Multi-Vault V2 | Production manifest and V2 deployment transaction below |

## Architecture

```text
Portfolio + market/news/event inputs
              |
              v
      deterministic risk state
              |
              v
       MARA advisory direction
              |
              v
   deterministic planner and route validation
              |
              v
 Financial Constitution -> allow or atomically block
              |
              v
 typed Uniswap / typed Aave integration
              |
              v
 isolated Managed Vault + post-state validation
```

Mainnet valuation is Chainlink-based with sequencer and freshness checks. Execution accepts typed protocol intents rather than arbitrary protocol calldata. The configured swap route is xETH to USDT through Uniswap V3 fee tier 500; the reverse route is unconfigured. Aave integration is typed for USDT yield. Protocol-earned yield is variable and is never described as guaranteed.

## Mainnet deployment

X Layer Mainnet, chain ID `196`:

| Contract | Address |
|---|---|
| AssetRegistry | `0xd211E4d1e1049d800d5360A078d52B0fcDD74684` |
| ChainlinkValuationProviderV1 | `0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc` |
| ProtocolAdapterRegistryV1 | `0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A` |
| UniswapV3SwapAdapterV1 | `0x009e2dfEa3FE134BcE3F769aA3E6C287823af184` |
| AaveV3YieldAdapterV1 | `0xd7c2662e436Bd1D50A6AA033C05DB905A2dddc83` |
| AdaptiveManagedVaultFactoryV1 | `0xE0969F6F0C0cFEE3F34132466f84CF45e883DcA5` |
| AdaptiveManagedVaultFactoryV2 | `0x98dE37855b85993C0cA6746b667BA01f2894efad` |
| Factory-bound V2 helper | `0x9550049F7896599630D6eE7D6D3E5F72b9A1DA0C` |

- [V2 deployment transaction](https://www.oklink.com/x-layer/tx/0x6c407bc749b62565e4b8c1380605f036d35f6a178ebe9ee5fd63e083f6b5549c), block `68405395`
- Production governance handover: **complete**
- Production admin: `0xf4ac7c9ad5a809240291a4f2e4cbe9189b14cdf4`

## Testnet evidence

The earlier X Layer Testnet deployment was recorded at `2026-08-10T15:47:43Z`. It demonstrates real X Layer transactions and the original isolated-Vault architecture.

| Evidence | Address or transaction |
|---|---|
| AssetRegistry | `0xd211E4d1e1049d800d5360A078d52B0fcDD74684` |
| [AdaptiveVaultFactory](https://www.oklink.com/x-layer-testnet/address/0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e) | `0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e` |
| [Demo AdaptiveVault](https://www.oklink.com/x-layer-testnet/address/0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4) | `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4` |
| [Vault creation](https://www.oklink.com/x-layer-testnet/tx/0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4) | Block `37925674` |
| [Constitution activation](https://www.oklink.com/x-layer-testnet/tx/0x92d8a51ae653027dccf22ef4b7d361996163c031a23d442290f8548f8d1a640b) | Block `37935569` |
| [Builder registration](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef) | Block `37942149` |
| [ERC-8021 proof](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e) | Block `37947454` |

Registered Builder Code: **`tl5ce7n7gk5a5pzk`**. Builder attribution is transaction metadata and grants no financial authority. Testnet sandbox assets have no backing, collateral, redemption, or ownership rights.

## Security and authority model

- Owners retain custody and control what capital enters each isolated Vault.
- Vaults are non-upgradeable and do not pool users.
- No generic execute, arbitrary call, or `delegatecall` authority exists.
- MARA, Sentinel, and the application server have no signing authority.
- Typed adapters constrain protocol operations; LLM output cannot supply arbitrary calldata.
- Missing, stale, malformed, unsupported, paused, or policy-violating state fails closed.
- Guardian, executor, pause, replay, turnover, Constitution, and custody state are isolated per Vault.
- Governance handover to the production admin is complete.
- ERC-8021 attribution is metadata only.

See [Security Model](docs/SECURITY_MODEL.md), [Security Review](docs/SECURITY_REVIEW.md), and [Multi-Vault V2 status](docs/MULTI_VAULT_V2_RECOMMENDATION.md).

## Current production status

- V1 and V2 read-only Vault discovery: **live**
- Public Create Vault submission: **disabled**
- Public deposit, withdrawal, policy, mode, swap, Aave, and executor writes: **disabled**
- Adaptive execution: **disabled**
- Production Activity ingestion: limited; the UI does not fabricate history
- Demo Mode: available with explicitly simulated states

The deployed contracts contain production-hardened capabilities, but judges cannot execute production transactions through the public application during this controlled rollout.

## Validation

- Foundry: **160/160 passed across 21 suites**
- Multi-Vault V2 unit: **7/7 passed**
- Multi-Vault fork proof: **2/2 passed**
- Invariants: **128 runs, 8,192 calls, zero invariant reverts**
- Fuzz campaigns: passed
- Frontend: **591 tests passed across 67 files**
- ESLint, TypeScript typecheck, Next.js production build, and `git diff --check`: passed

## Running locally

Prerequisites: Node.js 20.9 or newer, npm, and Foundry.

```bash
git submodule update --init --recursive
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`. Public `NEXT_PUBLIC_*` values must never contain secrets; `OPENAI_API_KEY` is server-only and belongs only in ignored local configuration.

Useful validation commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:contracts
```

## How a judge can try Adaptara

1. Open the live application or run it locally.
2. Use Demo Mode to explore the complete simulated Home, Portfolio, Vaults, MARA, Constitution, Activity, adaptation, and yield journey without a wallet.
3. Use Live Mode to connect a wallet and inspect real X Layer portfolio and unified V1/V2 Vault discovery.
4. Review the Testnet Builder registration and mined ERC-8021 proof.
5. Do not submit transactions; production public writes remain intentionally disabled.

See the [Submission Brief](docs/SUBMISSION.md) and [Demo Guide](docs/DEMO_GUIDE.md).

## Hackathon and submission links

- **Live app:** https://adaptara.vercel.app/
- **Demo mode URL:** TODO BEFORE SUBMISSION
- **GitHub:** https://github.com/victorkay97/Adaptara
- **Whitepaper:** https://adaptara.vercel.app/whitepaper
- **Demo video:** TODO BEFORE SUBMISSION
- **Project X account/post:** TODO BEFORE SUBMISSION
- **Team:** TODO BEFORE SUBMISSION

Adaptara is experimental software, not investment advice. It does not guarantee returns, loss prevention, yield, or future performance.
