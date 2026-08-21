# Phase 13D.1 — direct Uniswap V3 execution proof

Status: local typed-adapter proof passed; Phase 13D.2 subsequently passed a pinned X Layer mainnet fork proof; uncommitted, undeployed, and incapable of public execution.

## Decision and official provenance

OKX execution remains NO-GO because its public X Layer routing documentation does not provide deterministic calldata semantics sufficient for Adaptara's no-arbitrary-call invariant. OKX remains an observation and intelligence source.

Official Uniswap X Layer documentation identifies chain ID `196`, V3 Factory `0x4B2ab38DBF28D31D467aA8993f6c2585981D6804`, QuoterV2 `0xd1b797d92d87b688193a2b976efc8d577d204343`, SwapRouter02 `0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca`, Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`, Universal Router v2.0 `0x5507749f2c558bb3e162c6e90c314c092e7372ff`, and Universal Router v2.1 `0xda00ae15d3a71466517129255255db7c0c0956d3`. The documented deployed packages are `@uniswap/v3-core@1.0.0`, `@uniswap/v3-periphery@1.0.0`, and `@uniswap/swap-router-contracts@1.1.0`.

SwapRouter02 v1.1.0 defines:

`exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)`

There is no deadline field. Adaptara enforces the existing typed intent deadline before the call and pins `sqrtPriceLimitX96` to zero.

## Narrow adapter

`UniswapV3SwapAdapterV1` has immutable router, factory, and deployment-chain values. It supports ERC-20 → ERC-20 direct, single-hop, exact-input swaps only. It exposes no arbitrary target, bytes, path, Universal Router command, Permit2, native token, V2, V4, multihop, or cross-chain surface.

The protocol pair administrator configures a directional pair once with one fee. Configuration verifies `factory.getPool(tokenIn, tokenOut, fee)` returns deployed code and emits an event. MARA, executor, and Vault owner cannot select the fee through an intent. Router changes require a new adapter version, protocol approval, and owner opt-in. The existing protocol-supported ∩ owner-enabled check remains authoritative.

Custody is Vault → exact adapter approval → exact adapter pull → exact router approval → typed router call, with recipient fixed to the Vault. The adapter rejects pre-existing input/output custody, resets router allowance, returns unexpected residual input/output, and requires zero residual custody. The Vault separately resets adapter allowance and verifies actual balance deltas; router return values are not authoritative.

## Planner, quote, and commitment

The deterministic planner fixes `amountIn` before QuoterV2. QuoterV2 is read/simulation evidence only and cannot change input or authoritative USD valuation. Minimum output is `floor(quote × (10,000 − owner slippage bps) / 10,000)`. Plan and quote expiry fail closed. Chainlink/Adaptara valuation remains authoritative for action size, turnover, reserve, concentration, and aggressive exposure.

The versioned direct-V3 commitment binds plan, Vault, chain, adapter, router, pool, pair, fee, exact input, minimum output, and expiry. It has no opaque calldata hash because the adapter constructs typed calldata.

## Evidence and limitations

Twelve local adapter tests cover chain-196 pinning, typed routing fields, fixed recipient and price limit, admin-only write-once pair configuration, missing/unsupported pair, zero/expired requests, exact approvals and zero reset, residual return, zero custody, spoofed router returns, slippage rollback, and reentrancy rejection. Five frontend tests cover conservative minimum rounding, invalid/stale/missing-pool quotes, immutable planner input, and typed commitment mutations.

The configured RPC was inspected without printing it and returned chain ID `1952`; it is testnet, not mainnet. Therefore no mainnet fork was attempted. On testnet the documented mainnet Factory, QuoterV2, and SwapRouter02 addresses have no bytecode. X Layer Testnet Uniswap is **NOT CONFIRMED** and no fake public deployment was made.

Phase 13D.2 resolved the remaining fork blocker at pinned mainnet block `67,800,182`: deployed contracts, a real direct xETH/USD₮0 pool, QuoterV2, real-router execution, allowance/custody cleanup, and atomic Constitution rollback all passed. See `docs/PHASE_13D2_XLAYER_FORK_PROOF.md`. Public transaction remains **NOT AUTHORIZED**.

Future dependency graph: `AssetRegistry → ChainlinkValuationProviderV1 → ProtocolAdapterRegistryV1 → UniswapV3SwapAdapterV1 → AdaptiveManagedVaultFactoryV1 → AdaptiveManagedVaultV1 instances`.

No real funds, wallet prompt, signature, public transaction, deployment, commit, or push occurred.
