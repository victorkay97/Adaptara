# Phase 13D.2 — X Layer mainnet fork proof

Status: PASS at pinned X Layer mainnet block `67,800,182`; public execution remains disabled.

## Read-only provenance and deployment proof

Official X Layer documentation lists public mainnet RPC endpoints `https://rpc.xlayer.tech` and `https://xlayerrpc.okx.com`, chain ID `196`. The proof used the primary endpoint strictly for reads and local Foundry forking. No RPC write method was invoked. The observed block gas limit was `210,000,000`; this is a block observation, not a permanent network guarantee.

Official Uniswap documentation reconfirmed Factory `0x4B2ab38DBF28D31D467aA8993f6c2585981D6804`, QuoterV2 `0xd1b797d92d87b688193a2b976efc8d577d204343`, and SwapRouter02 `0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca`. At the pinned block their runtime code lengths were respectively `24,535`, `8,273`, and `24,497` bytes.

The v1.1.0 router ABI remained the seven-field, no-deadline `exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))`. Local execution through that selector succeeded against the deployed router.

## Direct pool and quote

Candidate checks covered WOKB/USD₮0, xETH/USD₮0, xBTC/USD₮0, USDG/USD₮0, and WOKB/xETH across canonical fees 100, 500, 3000, and 10000 where the discovery pass completed. Multiple direct pools were found. The proof selected:

- tokenIn: xETH `0xE7B000003A45145decf8a28FC755aD5eC5EA025A`, 18 decimals
- tokenOut: USD₮0 `0x779Ded0c9e1022225f8E0630b35a9b54bE713736`, 6 decimals
- fee: `500` (0.05%)
- pool: `0x77ef18adF35f62B2Ad442e4370cDbC7fe78B7dcC`
- pool code length: `22,142` bytes
- token0: USD₮0; token1: xETH
- liquidity: `31,865,079,772,795,550`
- slot0 initialized: true; sqrtPriceX96 `1,823,113,958,338,783,978,006,427,504,841,363`; tick `200,884`

The deterministic amount fixture was `1,000,000,000,000,000` xETH base units (0.001 xETH), matching the planner rule that amount is fixed before quoting. Real QuoterV2 returned `1,887,616` USD₮0 base units. With owner maximum slippage `100` BPS, the conservative minimum was `1,868,739`.

## Successful real-router local execution

The fork locally deployed AssetRegistry, deterministic valuation fixture, ProtocolAdapterRegistryV1, UniswapV3SwapAdapterV1, and AdaptiveManagedVaultV1 while using the real Factory, QuoterV2, Router, pool, and token contracts. Funding used Foundry `deal()` against local fork state only.

Pre-balances were `10,000,000,000,000,000` xETH units and `20,000,000` USD₮0 units. The Vault spent exactly `1,000,000,000,000,000` xETH units and received `1,887,616` USD₮0 units. Post-balances were `9,000,000,000,000,000` and `21,887,616`. Adapter custody, adapter→router allowance, and Vault→adapter allowance ended at zero. Replay was consumed once, turnover was `486` BPS, the execution record persisted, and post-state Constitution validation passed. Under the policy valuation fixture, reserve/largest exposure was approximately `5,630` BPS and aggressive exposure was zero.

Measured successful real-router path gas was `560,972` inside the test measurement (`549,384` reported for the test function). It is far below the observed block gas limit. The existing 32-asset validation benchmark remains the more important worst-case portfolio-scaling constraint.

## Atomic rollback and negative proof

The same real router, pool, and adapter were used with maximum single-asset exposure reduced to `5,400` BPS. The router swap occurred inside the Vault transaction, post-state validation failed, and the entire transaction reverted. Both Vault balances remained unchanged; adapter custody and both allowances remained zero; replay remained available; turnover remained zero; and no execution result persisted.

A minimum above the real quote reverted with no balances, replay, turnover, allowance, or record committed. Other fork tests proved expired intent rejection, Advisory rejection, executor rejection in ApprovalRequired, owner-approved success, authorized Adaptive success, random/revoked executor rejection, autonomous and Vault pause rejection, immediate protocol-disable rejection, owner-disable rejection, and missing-pool/wrong-fee configuration rejection. Router and recipient remain immutable/derived rather than runtime inputs.

Policy valuation in this proof was a deterministic trusted fixture. The result is accurately classified as **real protocol execution mechanics on a mainnet fork + deterministic policy valuation fixture**, not production Chainlink-feed proof.

## Decisions

- X Layer Mainnet RPC: AVAILABLE
- Verified Uniswap deployment: PASS
- Direct real pool: FOUND
- Quoter: PASS
- Real-router fork swap: PASS
- Atomic Constitution rollback: PASS
- Adapter production architecture: GO
- Public transaction: NOT AUTHORIZED
- Phase 13E: GO

X Layer Testnet Uniswap remains NOT CONFIRMED. `BROADCAST_DISABLED_PHASE_13D` remains active. No wallet prompt, signature, public write, real-fund movement, deployment, commit, or push occurred.
