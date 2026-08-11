# Adaptara

**Adaptive intelligence for onchain wealth.**

Adaptara is a policy-bounded wealth intelligence system for tokenized-asset and RWA-style portfolios on X Layer, demonstrated with transparent sandbox RWA assets. It combines live testnet portfolio reads, deterministic risk and policy checks, and MARA—an advisory AI agent—without giving AI a signing key or unrestricted transaction authority.

## What Adaptara Is

Adaptara helps a wallet owner understand an evolving portfolio, reason about risk, compare it with explicit owner-defined limits, and review possible adaptations. Each user has an isolated, non-upgradeable vault. Onchain ownership, balances, supported assets, and the Financial Constitution remain authoritative.

## The Core Idea

> AI decides what should happen.
>
> X Layer guarantees what is allowed to happen.

MARA analyzes and recommends. Deterministic application logic validates portfolio state, risk, feasibility, and compliance. The owner controls the only current application write—updating the Financial Constitution through their wallet—and the contracts remain the final authority.

## Why It Matters

Crypto and tokenized-asset portfolios are difficult to interpret continuously. Automation becomes dangerous when the same intelligence that proposes an action also has unrestricted authority to move money. Adaptara separates adaptive intelligence from deterministic permission, giving owners useful recommendations without surrendering custody or policy boundaries.

## How Adaptara Works

The product is designed around this loop:

**Observe → Analyze → Classify → Adapt → Validate → Execute → Reinvest**

- **Observe:** live/read-only X Layer wallet and vault discovery, balances, and decimals.
- **Analyze:** deterministic risk assessment plus advisory MARA and Sentinel context.
- **Classify:** deterministic, reconstructable risk scoring.
- **Adapt:** deterministic offchain allocation recommendations and simulations.
- **Validate:** deterministic portfolio, Constitution, feasibility, and compliance checks.
- **Execute:** the contracts expose owner-controlled deposit, withdrawal, and recovery operations, while the current application write path is the owner-confirmed Financial Constitution update. No trading, rebalancing, or autonomous execution router exists.
- **Reinvest:** Yield Intelligence currently simulates compounding only; it does not deploy capital or claim earned yield.

## MARA

MARA—the **Market Adaptive Risk Agent**—interprets portfolio state, explains sandbox RWA exposure, reasons about risk, considers bounded event context, and produces strategy recommendations. Its structured output is validated deterministically before display. A semantic validation failure may receive at most one server-owned corrective generation, for a maximum of two application model attempts; provider failures are not application-remediated.

MARA has no private key, signer, wallet tools, arbitrary transaction authority, or autonomous execution path. It cannot choose BPS or transaction routes. Actionable `reduce_exposure` and `diversify` proposals must identify the specific exposure to reduce; when evidence does not support one, `review` or `maintain` remains a legitimate no-action direction. It does not guarantee returns or claim reliable price prediction.

## Deterministic Risk Engine

The risk engine scores six weighted dimensions using integer basis-point arithmetic:

| Dimension | Weight |
|---|---:|
| Volatility | 20% |
| Liquidity | 20% |
| Reference deviation | 15% |
| Issuer/collateral/base quality | 20% |
| Concentration | 15% |
| Market/event stress | 10% |

Inputs, contributions, weights, rounding, and tier thresholds are preserved so every result is reconstructable. Current non-concentration inputs are deterministic demo fixtures, not live market measurements or predictions.

## Financial Constitution

The Financial Constitution is the vault owner's deterministic safety boundary between recommendation and any future execution. The active demo Constitution is:

- 20% minimum reserve
- 60% maximum single-asset exposure
- 30% maximum baseline-Aggressive exposure
- 10% maximum daily reallocation

The policy is stored onchain. Only the connected vault owner can submit the reviewed `setPolicy` write; MARA, Sentinel, guardian, executor, and server cannot change it. The current contracts store the Constitution but do not implement trading or rebalance execution.

## X Layer Architecture

Adaptara is deployed on **X Layer Testnet**, chain ID `1952`.

```text
Wallet owner
    ├─ reads ─> AdaptiveVaultFactory ─> isolated AdaptiveVault
    │                                      │
    │                                      └─> AssetRegistry
    └─ confirms owner-controlled policy writes

Portfolio state ─> deterministic risk ─> MARA advisory
                ─> Constitution checks ─> adaptation simulation
```

The factory creates and indexes one isolated vault per owner. The registry defines the supported asset set and static baseline risk tiers. Vaults are non-upgradeable, do not pool users, and expose no generic execution router.

| Deployment | Address |
|---|---|
| Demo owner | `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E` |
| AssetRegistry | `0xd211E4d1e1049d800d5360A078d52B0fcDD74684` |
| AdaptiveVaultFactory | `0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e` |
| Demo AdaptiveVault | `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4` |
| Official test USD₮0 | `0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c` |
| sTRSY | `0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc` |
| sXAU | `0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A` |
| sAAPLx | `0x009e2dfEa3FE134BcE3F769aA3E6C287823af184` |

Contracts are deployed but explorer source verification remains pending.

## Builder Code / ERC-8021

Adaptara's registered X Layer Testnet Builder Code is **`tl5ce7n7gk5a5pzk`**.

- [Builder Code registration transaction](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef) — block `37942149`
- [Mined ERC-8021 attribution proof](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e) — block `37947454`

The proof transaction contains the registered ERC-8021 suffix, which decodes to `codes = ["tl5ce7n7gk5a5pzk"]` and schema `id = 0`. OKLink recognizes the transaction as attributed to this code. Attribution is transaction metadata on the existing owner write; it adds no contract authority or second transaction.

## Demo Portfolio

| Asset | Balance | Demo/non-live reference | Reference value | Allocation |
|---|---:|---:|---:|---:|
| USD₮0 | 8 | $1 | $8 | 40% |
| sTRSY | 0.06 | $100 | $6 | 30% |
| sXAU | 0.002 | $2,000 | $4 | 20% |
| sAAPLx | 0.01 | $200 | $2 | 10% |
| **Total** |  |  | **$20** | **100%** |

These references are demo/non-live inputs. They are not live prices, oracle prices, backing claims, verified pegs, or redemption values.

## Sandbox RWA Assets

sTRSY, sXAU, and sAAPLx are fixed-supply testnet demonstration assets. They provide no redemption rights, real-world ownership rights, issuer backing, collateral claim, or guaranteed investment value.

## Sentinel

Sentinel provides advisory event monitoring over a bounded, server-side deterministic demo/non-live fixture feed. It uses no external news/web source or OpenAI. Corroboration and expiry determine whether an event may influence the deterministic market-stress factor, but events never directly move money. Sentinel cannot call MARA, generate Adaptation, or execute. When a scan changes deterministic risk context, the previous MARA advisory and dependent Adaptation Plan are invalidated; both require fresh explicit user actions.

## Adaptation Engine

The Adaptation Engine converts eligible MARA direction and a targeted exposure into a deterministic allocation simulation. Adaptara—not MARA—chooses the receiver and exact BPS, bounded by the 500-BPS application step and active Constitution daily limit. Null-target `reduce_exposure`/`diversify` directions fail closed; `maintain`/`review` may correctly produce no action. Diversify prefers eligible non-Aggressive receivers before baseline-Aggressive receivers. The Constitution remains the final policy gate, `executionAuthority` remains `none`, and no rebalance, trade, or router exists.

## Yield Intelligence

Yield Intelligence is a deterministic sandbox compounding simulation for the current sTRSY demo principal using a fixed demo annualized rate. The rate is not sourced from a live protocol. The simulation does not project future USD returns, connect to a yield protocol, deploy capital, alter vault balances, or claim earned, guaranteed, redeemable, or claimable yield.

## Security Model

- One isolated vault per owner; no pooled-user custody design
- Non-upgradeable contracts with ownership transfer and renunciation disabled
- No generic arbitrary execution, arbitrary call, or `delegatecall` authority
- No AI private key or autonomous MARA/Sentinel transaction authority
- Owner-only Constitution writes with wallet confirmation, receipt confirmation, and onchain reread
- Guardian limited to emergency pause; only the owner can unpause
- Guardian/executor identity-collision protections and deliberate zero-role revocation
- Registry-supported asset deposits, owner withdrawals, and owner-only recovery paths
- ERC-8021 Builder attribution is metadata only

See [Security Model](docs/SECURITY_MODEL.md) and [Security Review](docs/SECURITY_REVIEW.md) for the complete boundaries.

## Testing

- TypeScript: **437 passed** across **38 files**
- Foundry: **67 passed** across **7 suites**, 0 failed, 0 skipped
- ESLint: passed
- TypeScript typecheck: passed
- Production build: passed
- Read-only X Layer preflight: passed

Run the complete local suite with `npm run check`. The X Layer preflight is a separate read-only command because it requires public network configuration.

## Running Locally

Prerequisites: Node.js 20.9 or newer, npm, and Foundry.

```bash
git submodule update --init --recursive
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, copy the template with `Copy-Item .env.example .env.local`.

The template documents these public browser values:

- X Layer chain ID and primary/fallback RPC URLs
- official test USD₮0 address
- AssetRegistry, AdaptiveVaultFactory, and sandbox-token addresses
- optional WalletConnect project ID
- optional registered Adaptara Builder Code (`NEXT_PUBLIC_ADAPTARA_BUILDER_CODE=tl5ce7n7gk5a5pzk`)

Do not put secrets in `NEXT_PUBLIC_*` variables. `OPENAI_API_KEY`, if MARA is enabled, is server-only and must remain in the ignored `.env.local`; never commit it. The Chainlink and agent-executor fields in the template are inactive future-integration placeholders and are not required for the current demo. Any credentials or API secrets used by future integrations must remain server-only.

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:contracts
```

For the read-only deployment preflight, provide the public `DEPLOYER_ADDRESS` and configured public deployment addresses described in [X Layer Testnet Deployment](docs/XLAYER_TESTNET_DEPLOYMENT.md), then run `npm run preflight:xlayer`. It never requires a private key.

## Demo Walkthrough

1. Connect the demo wallet on X Layer Testnet.
2. Show factory discovery of the owner's isolated vault.
3. Inspect live onchain balances and the 40/30/20/10 demo allocation.
4. Review deterministic risk and Constitution compliance.
5. Request and review MARA's advisory analysis.
6. Review Adaptation while the current MARA advisory is current, then Yield Intelligence, and run Sentinel last. Yield's hypothetical simulation does not invalidate MARA or Adaptation; a risk-changing Sentinel scan invalidates stale MARA and Adaptation state rather than regenerating either automatically.
7. Show the active owner-controlled Financial Constitution.
8. Open the Builder registration and ERC-8021 proof transactions.
9. Explain that AI recommends, while the owner and contracts retain authority.

Judges do not need to mutate the live demo state. See the [Demo Guide](docs/DEMO_GUIDE.md) for a recording sequence.

## Deployment Evidence

| Evidence | Transaction | Block |
|---|---|---:|
| Vault creation | [View on OKLink](https://www.oklink.com/x-layer-testnet/tx/0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4) | `37925674` |
| Constitution activation | [View on OKLink](https://www.oklink.com/x-layer-testnet/tx/0x92d8a51ae653027dccf22ef4b7d361996163c031a23d442290f8548f8d1a640b) | `37935569` |
| Builder Code registration | [View on OKLink](https://www.oklink.com/x-layer-testnet/tx/0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef) | `37942149` |
| ERC-8021 attributed proof | [View on OKLink](https://www.oklink.com/x-layer-testnet/tx/0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e) | `37947454` |

The complete deployment manifest is [deployments/xlayer-testnet.json](deployments/xlayer-testnet.json), and the chronological evidence record is [docs/XLAYER_TESTNET_DEPLOYMENT.md](docs/XLAYER_TESTNET_DEPLOYMENT.md).

## Current Limitations

- Deployed on X Layer Testnet, not mainnet
- sTRSY, sXAU, and sAAPLx are sandbox assets with no backing or redemption rights
- Portfolio valuation uses demo/non-live references, not live or oracle prices
- No autonomous execution, AI signing authority, trading router, or rebalancing execution
- No live yield integration or earned-yield claim
- No price-prediction guarantee
- No pooled custody; each supported owner has an isolated vault
- Deployed contracts are currently explorer-unverified

## Hackathon Status / Submission Links

- **GitHub:** https://github.com/victorkay97/Adaptara
- **Live demo:** https://adaptara.vercel.app/
- **Demo video:** TBD — demo-video URL required
- **Team:** TBD — authoritative team information required

Adaptara is experimental hackathon software for testnet use only. It is not investment advice.
