# X Layer Testnet Deployment Plan

Phase 12A prepared this reproducible deployment plan without broadcasting. Its **NOT EXECUTED — PHASE 12A** markers preserve the state at preparation time; the Phase 12B record below is the current source of deployment facts.

## Phase 12B deployment record

The base contracts were successfully deployed on X Layer Testnet, chain ID `1952`, at `2026-08-10T15:47:43Z` by `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E`. Confirmed addresses are AssetRegistry `0xd211E4d1e1049d800d5360A078d52B0fcDD74684`, AdaptiveVaultFactory `0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e`, sTRSY `0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc`, sXAU `0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A`, and sAAPLx `0x009e2dfEa3FE134BcE3F769aA3E6C287823af184`. The public transaction record is in `deployments/xlayer-testnet.json`.

The demo vault was created successfully at `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4` by configuration transaction `0x6405dbbf131d7bfad89c2c5257cf5c2e94733fa81b2a5f55f9dc886e9b216dd4`. Its owner and guardian are the demo owner, `0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E`; its agent executor is the zero address; and its AssetRegistry binding is confirmed as `0xd211E4d1e1049d800d5360A078d52B0fcDD74684`.

The vault was successfully seeded with multiplier `2`: 8 USD₮0, 0.06 sTRSY, 0.002 sXAU, and 0.01 sAAPLx. At the explicitly demo/non-live reference prices, this is the documented $20 reference portfolio with a 40/30/20/10 allocation. The owner retains 2 USD₮0. The exact approval amounts were consumed and all four owner-to-vault allowances are zero. The vault remains unpaused, the Financial Constitution remains zero/uninitialized, and the demo-owner nonce after seeding is `18`. No Builder Code has been registered and explorer verification remains pending. All later planned steps below remain unexecuted.

## Phase 12C1 read-only application wiring

The browser application is configured for the confirmed X Layer Testnet AssetRegistry, AdaptiveVaultFactory, official test USD₮0, and three sandbox-token addresses through the documented public environment variables. Adaptara Vault discovery remains owner-driven through `AdaptiveVaultFactory.vaultOf(owner)`; the demo vault is not a product fallback. Live reads use ERC-20 `balanceOf` and `decimals` against the discovered vault, retain demo/non-live reference-price disclosures, and interpret the current all-zero Financial Constitution as not activated. Policy writes are deliberately disabled in the Phase 12C1 application path until Phase 12C2. This wiring adds no transaction, signing, Builder Code, executor, or autonomous authority; Builder Code is not integrated or registered.

## Phase 12C2A Constitution activation readiness

The exact candidate policy—2,000 BPS reserve minimum, 6,000 BPS single-asset maximum, 3,000 BPS aggressive maximum, and 1,000 BPS daily reallocation limit—has been validated, found feasible, checked as compliant with the seeded 40/30/20/10 demo allocation, ABI-encoded and decoded, and successfully simulated read-only against the deployed vault. No signature or transaction was requested, the live UI remains write-disabled, the onchain policy remains zero/uninitialized, and Builder Code attribution remains outside this step.

## Phase 12C2B owner write UI capability

The live dashboard now opts into the reviewed owner-only Constitution write capability for the upcoming explicit human-controlled activation. The panel remains default-deny and submission still requires the connected vault owner, X Layer Testnet, a wallet client, a loaded policy, and a valid, feasible, dirty draft. No signature or `setPolicy` transaction has occurred, the onchain policy remains zero/uninitialized, and Builder Code remains unintegrated and unregistered.

## Phase 12C2 Financial Constitution activation record

The demo owner successfully activated the Financial Constitution with transaction `0x92d8a51ae653027dccf22ef4b7d361996163c031a23d442290f8548f8d1a640b` in block `37935569`. The successful zero-value transaction used sender nonce `18`; the post-activation owner nonce is `19`. It set the exact policy to 2,000 BPS minimum reserve, 6,000 BPS maximum single-asset exposure, 3,000 BPS maximum baseline-Aggressive exposure, and 1,000 BPS maximum daily reallocation. The application confirmed the receipt and reread the active policy, and an independent read-only RPC reconciliation confirmed the transaction, `PolicyUpdated` event, and current onchain values.

The seeded 40/30/20/10 demo portfolio remains compliant: reserve is 4,000 BPS against a 2,000 BPS minimum, the largest position is 4,000 BPS against a 6,000 BPS maximum, and baseline-Aggressive exposure is 1,000 BPS against a 3,000 BPS maximum. The vault remains unpaused, its guardian remains the demo owner, and its agent executor remains zero. This policy-only operation moved no token balance. Its calldata ended after the fourth ABI word, with no ERC-8021 or Builder Code attribution; Builder Code remains unintegrated and unregistered.

## Phase 12C3 ERC-8021 client integration

ERC-8021 attribution client support is implemented using direct `ox/erc8021` and a per-transaction Viem `dataSuffix` on the existing owner-only `setPolicy` write. The isolated helper validates one optional public Adaptara Builder Code and generates the suffix with `Attribution.toDataSuffix`; no wallet, signing, financial-contract, MARA, or Sentinel authority was added. Deterministic tests and a read-only test-fixture simulation confirmed that the 132-byte `setPolicy` calldata remains unchanged before the trailing suffix and that one writer call remains one transaction.

No Builder Code has been registered or configured, no attributed transaction has been sent, and the manifest's Builder Code fields remain null. The active Constitution remains 2,000/6,000/3,000/1,000 BPS and the owner nonce remains `19`. Registration via testnet `registerAuto` is reserved for Phase 12C4.

## Phase 12C4A Builder Code registration readiness

The official X Layer documentation identifies the Testnet Builder Code registry as `0x33907e98d7392d95212b05ab03f091e02d7815bf` and directs Testnet builders to `registerAuto`. OKLink's verified-contract API establishes that this address is an ERC-1967 proxy whose implementation at readiness block `37940622` was the verified `BuilderCodes` contract at `0xa2a72a5f635e2476166e06c6a6a73114ffcd810d`. The implementation ABI proves the exact nonpayable call is `registerAuto(address initialPayoutAddress) returns (string code)`. Using the demo owner as both sender and payout address produces selector `0x50b4368a` and exact 36-byte calldata `0x50b4368a0000000000000000000000007bc8489c39a750ccfa6c06d5d6db5f682976234e`, with zero native value.

Before simulation, the demo owner held zero registry NFTs and auto-registration was enabled. A fixed-block read-only `eth_call` succeeded, and a read-only gas estimate was `112709`; an optional trace corroborated a proxy delegatecall plus simulated `Transfer`, `CodeRegistered`, and `PayoutAddressUpdated` logs. The simulation-only return `1u79g4xb7ocejnca` is not an authoritative Builder Code and must not be configured: verified source derives it from the owner, payout address, block number, `prevrandao`, and a collision nonce. After an eventual separately approved broadcast, recover the authoritative Builder Code from the confirmed `CodeRegistered(uint256 indexed tokenId, string code)` event. The Solidity return value is observable during `eth_call` simulation, but a normal state-changing wallet write does not expose that return value through the transaction receipt. Require receipt success; identify exactly the relevant registry registration logs; decode `CodeRegistered`; validate the code as a 16-character Builder Code; require `toTokenId(code)` to equal the emitted token ID, `ownerOf(tokenId)` and `payoutAddress(tokenId)` to equal the demo owner, and `isRegistered(code)` to be true; require a `Transfer` mint from the zero address to the demo owner; and require `PayoutAddressUpdated` to agree with the demo owner. No registration, signature, transaction, application configuration, or manifest update occurred in Phase 12C4A.

## Phase 12C4B Builder Code registration record

The demo owner successfully registered Adaptara's X Layer Testnet Builder Code with the zero-value owner-controlled `registerAuto(address initialPayoutAddress)` transaction `0x62d2c221dc73a44502e78529d5add9ad4cca51329377beab6064d51d041b61ef`. The canonical receipt is in block `37942149`, block hash `0xb76e21dd1c666d1b2a44b19af2aff05377d89ea240f2ef6efa6e4f2e4b0ee784`, and consumed nonce `19`; the post-registration owner nonce is `20`. The call used the demo owner as payout argument, exact calldata `0x50b4368a0000000000000000000000007bc8489c39a750ccfa6c06d5d6db5f682976234e`, and no ERC-8021 attribution suffix.

The confirmed `CodeRegistered` event and independent state reads establish the authoritative registered code as `tl5ce7n7gk5a5pzk`, with token ID `154752298414394082485795608522094836331`. The receipt also contains the matching ERC-721 `Transfer` mint from the zero address to the demo owner and `PayoutAddressUpdated` to the demo owner. `ownerOf(tokenId)` and `payoutAddress(tokenId)` equal the demo owner, `isRegistered(code)` is true, and the owner's Builder NFT balance is `1`. The earlier `1u79g4xb7ocejnca` value was simulation-only and is not the registered code. The vault remains unpaused with zero agent executor and Financial Constitution 2,000/6,000/3,000/1,000 BPS. `NEXT_PUBLIC_ADAPTARA_BUILDER_CODE` remains unconfigured, and no attributed transaction has yet been sent; application activation is reserved for Phase 12C4C.

## Phase 12C4C2 browser attribution inspection record

The authoritative code `tl5ce7n7gk5a5pzk` was configured locally, and the actual `FinancialConstitutionPanel` → `updateVaultConstitution` → `walletClient.writeContract` path produced a MetaMask request on X Layer Testnet for nonce `20`, target demo vault `0xb49163f7A426c7f739F008AaAe062cCEc62EBEb4`, and temporary inspection-only policy 2,000/6,000/3,000/900 BPS. The wallet data contained selector `0x3c5ea516`, the expected base ABI values, and exact real ERC-8021 suffix `0x746c356365376e37676b356135707a6b100080218021802180218021802180218021`. The user cancelled the wallet request, no signature or broadcast occurred, and the draft was restored to the active 2,000/6,000/3,000/1,000 BPS policy; independent read-only verification confirmed nonce `20` and the unchanged policy. This proves the live application constructs the expected attributed wallet request, but it does not yet prove attribution in a mined transaction.

## Phase 12C4C3/C4 mined attribution proof

The zero-value proof transaction `0x7fdfecc0b989992c33e4e586f56a508bae2c0d5f4b70e650960267e54e56493e` succeeded on X Layer Testnet in canonical block `37947454`, block hash `0xae1921039e540e2da482cfbc2c51aad3f8a4cdd447b0bbe6370cc946c1f77b9b`, consuming owner nonce `20`; the post-transaction nonce is `21`. Its exact 166-byte input is `0x3c5ea51600000000000000000000000000000000000000000000000000000000000007d000000000000000000000000000000000000000000000000000000000000017700000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000000000000000000000000000000000000000003e8746c356365376e37676b356135707a6b100080218021802180218021802180218021`: the first 132 bytes decode to `setPolicy` with 2,000/6,000/3,000/1,000 BPS, and the final 34 bytes decode through `ox/erc8021` to the single registered code `tl5ce7n7gk5a5pzk` with schema ID `0`.

The receipt contains exactly one vault `PolicyUpdated(uint16,uint16,uint16,uint16)` event carrying 2,000/6,000/3,000/1,000 BPS. Fresh reads confirm the effective policy is unchanged, the owner and guardian remain the demo owner, the vault remains unpaused with zero agent executor and the same AssetRegistry, and raw vault balances remain USD₮0 `8000000`, sTRSY `60000000000000000`, sXAU `2000000000000000`, and sAAPLx `10000000000000000`. The current OKLink transaction page independently displays Builder Code `tl5ce7n7gk5a5pzk`, confirming external attribution indexing in addition to the mined-input protocol proof.

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

Resolved dependencies: direct Viem resolves to `2.55.11`, Wagmi resolves to `2.19.5`, and direct ox resolves to `0.14.33`; older ox copies remain transitive where required by connector dependencies. No Viem or Wagmi upgrade was required for the Phase 12C3 integration.

Attribution belongs only on the wallet-backed client sending X Layer transactions (currently the owner-only `setPolicy` write), using `ox/erc8021` `Attribution.toDataSuffix`. It never belongs in Solidity and never creates a second transaction. Future tests must prove suffix enabled/disabled behavior, unchanged ABI semantics, wrong-chain exclusion, one-transaction behavior, and that MARA/Sentinel remain unable to transact. **NOT EXECUTED — PHASE 12A**.

## J. Browser verification

After Phase 12B wiring, verify chain prompt, vault discovery, onchain `balanceOf`/decimals, exact allocation, risk/sentinel/MARA/adaptation/yield disclosures, owner-only policy signature, receipt, and reread. Sandbox assets have no redemption rights, investment value, backing, or real-world ownership claim. **NOT EXECUTED — PHASE 12A**.

## K. Rollback and limitations

Contracts are non-upgradeable and non-proxied. Registry entries cannot be registered twice and can only be disabled. Factory permits one vault per owner. A mistaken deployment cannot be rolled back; deploy a reviewed fresh environment and update the manifest explicitly. There is no pooling, ERC-4626, router, swap, generic execution, or autonomous agent authority. Adaptation and Yield remain simulation-only; MARA is advisory; Sentinel is non-executing.
