# Adaptara — Hackathon Submission

## One-line pitch

Adaptara combines advisory AI with an owner-defined onchain Constitution for safer, adaptive tokenized-asset portfolio intelligence on X Layer.

## Short description

Adaptara is a policy-bounded wealth intelligence system deployed on X Layer Testnet. It reads an owner's isolated vault, values a transparent sandbox RWA portfolio, calculates deterministic risk, and uses MARA—the Market Adaptive Risk Agent—to explain exposure and recommend adaptations. Recommendations never become transaction authority: the owner's Financial Constitution is stored onchain, the only application write is owner-controlled, and MARA receives no signing key. Sentinel contributes bounded advisory event context, while Adaptation and Yield Intelligence remain deterministic simulations. A registered Builder Code and mined ERC-8021 attributed transaction provide reproducible X Layer builder evidence.

## Problem

Tokenized portfolios need continuous interpretation, but an AI system becomes dangerous when its recommendations and authority over funds are combined. Owners need adaptive intelligence without surrendering custody, explicit risk limits, or deterministic control.

## Solution

Adaptara separates intelligence from authority. Live X Layer reads establish portfolio facts, deterministic logic calculates risk and compliance, MARA explains and recommends, and an owner-defined onchain Financial Constitution defines the permitted boundary. Current token movement and policy writes remain explicitly owner-controlled.

## What makes Adaptara different

Adaptara pairs adaptive intelligence with a deterministic onchain Constitution:

> AI decides what should happen.
>
> X Layer guarantees what is allowed to happen.

The AI can reason about changing conditions, but cannot sign, bypass policy, or arbitrarily call contracts.

## How AI is used

MARA—the Market Adaptive Risk Agent—receives privacy-minimized portfolio, risk, policy, and bounded event context. It interprets exposure, explains sandbox RWA characteristics, reasons about risk, and produces structured strategy recommendations. Its output is untrusted until strict application validation and remains advisory. MARA has no wallet key, signing capability, transaction tools, guaranteed-return claim, or price-prediction authority.

## How X Layer is used

Adaptara is deployed on X Layer Testnet, chain ID `1952`. `AdaptiveVaultFactory` discovers one isolated vault per owner, `AssetRegistry` defines supported assets and baseline tiers, and `AdaptiveVault` holds real testnet ERC-20 balances and the owner's Financial Constitution. Portfolio reads are live/read-only. At the contract level, deposit, withdrawal, recovery, and `setPolicy` are owner-controlled onchain actions; the current application write path exposes only the owner-confirmed `setPolicy` update. No pooled vault or trading router exists.

## Builder Code / ERC-8021

Adaptara's registered Builder Code is **`tl5ce7n7gk5a5pzk`**.

- [Registration transaction](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef)
- [Mined ERC-8021 proof](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e)

The proof's suffix decodes to `codes = ["tl5ce7n7gk5a5pzk"]`, `id = 0`, and OKLink displays the registered code. Attribution is metadata on the existing owner transaction; it creates no financial authority.

## Architecture

```text
X Layer balances + registry
          ↓
Deterministic portfolio and risk state
          ↓
MARA advisory + Sentinel context
          ↓
Deterministic adaptation simulation
          ↓
Financial Constitution validation
          ↓
Owner-controlled onchain actions only
```

Blockchain state is authoritative for ownership, balances, policy, and confirmed transactions.

## Security model

Each owner has an isolated, non-upgradeable vault. Ownership transfer and renunciation are disabled, users are not pooled, deposits are restricted to registry-supported assets, and owner withdrawal/recovery paths remain available. There is no generic execute, arbitrary call, or `delegatecall` authority. Guardian and executor roles are collision-protected; the demo executor is zero. MARA and Sentinel cannot transact, and Builder attribution is metadata only.

## Demo

1. Connect the demo owner on X Layer Testnet and discover the factory-created vault.
2. Show live balances and the demo/non-live $20 reference portfolio at 40/30/20/10.
3. Review deterministic risk, active Constitution, and compliance.
4. Review MARA, Sentinel, Adaptation, and Yield with their advisory/simulation boundaries.
5. Open the Builder registration and mined attribution proof.
6. Close with the separation between AI recommendations and owner/contract authority.

## Evidence

| Item | Address or evidence |
|---|---|
| Demo owner | `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E` |
| AssetRegistry | `0xd211E4d1e1049d800d5360A078d52B0fcDD74684` |
| AdaptiveVaultFactory | `0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e` |
| Demo AdaptiveVault | `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4` |
| Official test USD₮0 | `0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c` |
| sTRSY | `0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc` |
| sXAU | `0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A` |
| sAAPLx | `0x009e2dfEa3FE134BcE3F769aA3E6C287823af184` |
| Vault creation | [Transaction, block 37925674](https://www.oklink.com/x-layer-testnet/tx/0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4) |
| Constitution activation | [Transaction, block 37935569](https://www.oklink.com/x-layer-testnet/tx/0x92d8a51ae653027dccf22ef4b7d361996163c031a23d442290f8548f8d1a640b) |
| Builder registration | [Transaction, block 37942149](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef) |
| ERC-8021 proof | [Transaction, block 37947454](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e) |

Contracts are deployed but explorer source verification remains pending. Validation currently passes 402 TypeScript tests and 67 Foundry tests across seven suites.

## Limitations

Adaptara is testnet hackathon software. sTRSY, sXAU, and sAAPLx are sandbox tokens with no backing, ownership, collateral, redemption, or guaranteed value. Reference prices are demo/non-live inputs, not market or oracle prices. Adaptara has no autonomous execution, AI signing authority, real RWA redemption, live yield execution, reliable price prediction, pooled custody, or trading/rebalancing router.

## Links still required

- **GitHub:** TBD — public repository URL required
- **Live app:** TBD — deployed application URL required
- **Demo video:** TBD — demo-video URL required
- **Team:** TBD — authoritative team information required
