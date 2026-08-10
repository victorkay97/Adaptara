# X Layer Testnet Deployment Plan

Phase 12A prepared this reproducible deployment plan without broadcasting. Its **NOT EXECUTED — PHASE 12A** markers preserve the state at preparation time; the Phase 12B record below is the current source of deployment facts.

## Phase 12B deployment record

The base contracts were successfully deployed on X Layer Testnet, chain ID `1952`, at `2026-08-10T15:47:43Z` by `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E`. Confirmed addresses are AssetRegistry `0xd211E4d1e1049d800d5360A078d52B0fcDD74684`, AdaptiveVaultFactory `0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e`, sTRSY `0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc`, sXAU `0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A`, and sAAPLx `0x009e2dfEa3FE134BcE3F769aA3E6C287823af184`. The public transaction record is in `deployments/xlayer-testnet.json`.

The demo vault was created successfully at `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4` by configuration transaction `0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4`. Its owner and guardian are the demo owner, `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E`; its agent executor is the zero address; and its AssetRegistry binding is confirmed as `0xd211E4d1e1049d800d5360A078d52B0fcDD74684`.

The vault was successfully seeded with multiplier `2`: 8 USD₮0, 0.06 sTRSY, 0.002 sXAU, and 0.01 sAAPLx. At the explicitly demo/non-live reference prices, this is the documented $20 reference portfolio with a 40/30/20/10 allocation. The owner retains 2 USD₮0. The exact approval amounts were consumed and all four owner-to-vault allowances are zero. The vault remains unpaused, the Financial Constitution remains zero/uninitialized, and the demo-owner nonce after seeding is `18`. No Builder Code has been registered and explorer verification remains pending. All later planned steps below remain unexecuted.

## Phase 12C1 read-only application wiring

The browser application is configured for the confirmed X Layer Testnet AssetRegistry, AdaptiveVaultFactory, official test USD₮0, and three sandbox-token addresses through the documented public environment variables. Adaptara Vault discovery remains owner-driven through `AdaptiveVaultFactory.vaultOf(owner)`; the demo vault is not a product fallback. Live reads use ERC-20 `balanceOf` and `decimals` against the discovered vault, retain demo/non-live reference-price disclosures, and interpret the current all-zero Financial Constitution as not activated. Policy writes are deliberately disabled in the Phase 12C1 application path until Phase 12C2. This wiring adds no transaction, signing, Builder Code, executor, or autonomous authority; Builder Code is not integrated or registered.

## A. Prerequisites

- Baseline: commit `c32ec6521e90509849ea61883bbde120ac114bf8`, branch `phase-12-xlayer-deployment-submission`.
- Target: X Layer Testnet, chain ID `1952`, test OKB gas, primary RPC `https://testrpc.xlayer.tech/terigon`, fallback `https://xlayertestrpc.okx.com/terigon`.
- Use a reviewed Foundry/Cast keystore in Phase 12B (preferred) or an ephemeral shell `PRIVATE_KEY`. Never commit or print a key. Scripts contain no key.
- Manually fund the deployment/demo wallet with test OKB from the [official X Layer faucet](https://web3.okx.com/xlayer/faucet). Faucet assets have no real value. **NOT EXECUTED — PHASE 12A**.
- Official project test USD₮0 is `0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c` with 6 expected decimals. Current official X Layer/OKX payment documentation directs users to the X Layer Faucet for both test OKB and test USD₮0. Claim test USD₮0 manually, verify this exact address, and check the resulting balance before choosing the seed scale; do not deploy a substitute or claim a peg. **NOT EXECUTED — PHASE 12A**.

## B. Read-only preflight

Set only public values, then run `npm run preflight:xlayer`. Required: `DEPLOYER_ADDRESS`; optional override: `XLAYER_TESTNET_RPC_URL`. The script verifies RPC responsiveness, chain 1952, nonzero deployer, nonzero test OKB balance, USD₮0 bytecode and 6 decimals, distinct configured deployment addresses, and bytecode at any configured address. It never requests a private key.

Before a fresh deployment, leave deployment-address variables unset. If an actual manifest already exists, stop and decide explicitly whether a new isolated environment is intended. Rerunning deployment creates new contracts; there is no rollback, proxy, or upgrade path.

## C. Deployment

Actual constructors, from repository source:

- `AssetRegistry(uint48 adminTransferDelay, address initialAdmin)`
- `SandboxAssetToken(string name_, string symbol_, address initialHolder_, uint256 initialSupply_)`
- `AdaptiveVaultFactory(IAssetRegistry registry)`
- factory-created `AdaptiveVault(address initialOwner, address initialGuardian, address initialAgentExecutor, IAssetRegistry registry)`

`contracts/script/DeployXLayerTestnet.s.sol` will, in order: deploy `AssetRegistry` with a one-day admin-transfer delay; deploy fixed supplies of sTRSY, sXAU, and sAAPLx to the deployer; register official USD₮0 as Reserve and the sandbox tokens as Defensive, Balanced, and Aggressive; then deploy `AdaptiveVaultFactory` with the registry. Registration uses the static baseline tier, never dynamic risk. **NOT EXECUTED — PHASE 12A**.

Simulate without `--broadcast` first. Only Phase 12B may run the reviewed command with `--broadcast`. Record confirmed addresses and transaction hashes in `deployments/xlayer-testnet.json`; never edit the example template into fake deployed values.

## D. Configuration

`ConfigureXLayerTestnet.s.sol` checks chain, factory bytecode, and `vaultOf(demoOwner) == address(0)` before creating a vault. The exact API is `createVault(address guardian, address agentExecutor)`, and owner is always `msg.sender`. Use the demo owner as guardian and zero address as executor. The postcondition requires the created vault owner to equal `DEMO_OWNER_ADDRESS`. **NOT EXECUTED — PHASE 12A**.

## E. Financial Constitution

Recommended candidate: reserve minimum 2,000 BPS; single-asset maximum 6,000; aggressive maximum 3,000; daily reallocation maximum 1,000. Phase 6 feasibility accepts it: one Reserve asset has 6,000 BPS capacity and total permitted capacity is 10,000 BPS. Do not initialize automatically: leaving the zero policy initially lets the owner demonstrate the normal owner-signed UI activation and avoids obscuring product authority. **NOT EXECUTED — PHASE 12A**.

## F. Seed funding

`SeedXLayerTestnet.s.sol` uses only ERC-20 `approve` and `AdaptiveVault.deposit`. Demo reference prices are fixed sandbox inputs—not live prices—of USD₮0 $1, sTRSY $100, sXAU $2,000, and sAAPLx $200 (all eight-decimal integer references). `SEED_SCALE_MULTIPLIER=1` represents a $10 reference portfolio: 4 USD₮0, 0.03 sTRSY, 0.001 sXAU, and 0.005 sAAPLx. Any positive integer multiplier scales all four quantities together and preserves the exact 40/30/20/10 allocation. The earlier 4,000/30/1/5 example is multiplier 1,000, not a funding assumption. In Phase 12B, first read the demo owner's actual test USD₮0 balance, then explicitly choose an affordable multiplier. The script is not an optimizer and fetches no prices. The result satisfies the candidate policy, includes positive sTRSY for Yield Intelligence, and keeps sAAPLx at 1,000 BPS. Balances remain actual ERC-20 `balanceOf` state; no USD values are injected. **NOT EXECUTED — PHASE 12A**.

## G. Frontend environment wiring

Do this only after confirmed deployments, then rebuild:

| Manifest value | Environment variable | Consumer |
|---|---|---|
| `assetRegistry` | `NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS` | registry configuration/read boundaries |
| `vaultFactory` | `NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS` | vault discovery in `features/portfolio/readers.ts` |
| `sandboxTokens.sTRSY` | `NEXT_PUBLIC_STRSY_ADDRESS` | `features/portfolio/catalog.ts` |
| `sandboxTokens.sXAU` | `NEXT_PUBLIC_SXAU_ADDRESS` | `features/portfolio/catalog.ts` |
| `sandboxTokens.sAAPLx` | `NEXT_PUBLIC_SAAPLX_ADDRESS` | `features/portfolio/catalog.ts` |
| official USD₮0 constant | `NEXT_PUBLIC_TEST_USDT0_ADDRESS` | `lib/chain/xlayer.ts`, then catalog |

No frontend address is changed in Phase 12A. **NOT EXECUTED — PHASE 12A**.

## H. Contract verification

Compiler metadata: Solidity `0.8.28`, optimizer enabled, 200 runs, no explicit EVM version (compiler default), non-upgradeable contracts. Verify `AssetRegistry`, `AdaptiveVaultFactory`, each `SandboxAssetToken`, and the factory-created `AdaptiveVault` using explorer-supported Standard JSON input from Foundry build metadata. Constructor arguments are those listed in section C; record each exact deployed value. Submit no verification API request or frontend API secret in Phase 12A. **NOT EXECUTED — PHASE 12A**.

## I. Builder Code registration and integration (Phase 12C design only)

The [official X Layer integration guide](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/builder-codes/integration) requires Viem 2.45.0 or newer and identifies the X Layer Testnet Builder Code contract as `0x33907e98d7392d95212b05ab03f091e02d7815bf`; testnet registration calls `registerAuto`. Keep this address in deployment/integration configuration only. Register manually and explicitly after deployment stability; never place it in `AdaptiveVault`, `AssetRegistry`, or another financial-domain contract. **NOT EXECUTED — PHASE 12A**.

Resolved dependencies: direct Viem `2.55.11`, Wagmi `2.19.5`; `ox` is not direct but is transitively present (`0.14.33`, `0.9.17`, `0.6.9`, `0.6.7`). No Viem upgrade is required. Phase 12C should review adding direct `ox`, lockfile/audit impact, Wagmi client typing, wallet connector behavior, and all transaction tests before change.

Attribution belongs only on the wallet-backed client sending X Layer transactions (currently the owner-only `setPolicy` write), using `ox/erc8021` `Attribution.toDataSuffix`. It never belongs in Solidity and never creates a second transaction. Future tests must prove suffix enabled/disabled behavior, unchanged ABI semantics, wrong-chain exclusion, one-transaction behavior, and that MARA/Sentinel remain unable to transact. **NOT EXECUTED — PHASE 12A**.

## J. Browser verification

After Phase 12B wiring, verify chain prompt, vault discovery, onchain `balanceOf`/decimals, exact allocation, risk/sentinel/MARA/adaptation/yield disclosures, owner-only policy signature, receipt, and reread. Sandbox assets have no redemption rights, investment value, backing, or real-world ownership claim. **NOT EXECUTED — PHASE 12A**.

## K. Rollback and limitations

Contracts are non-upgradeable and non-proxied. Registry entries cannot be registered twice and can only be disabled. Factory permits one vault per owner. A mistaken deployment cannot be rolled back; deploy a reviewed fresh environment and update the manifest explicitly. There is no pooling, ERC-4626, router, swap, generic execution, or autonomous agent authority. Adaptation and Yield remain simulation-only; MARA is advisory; Sentinel is non-executing.
