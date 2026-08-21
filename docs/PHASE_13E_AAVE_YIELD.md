# Phase 13E — Aave X Layer yield

Status: local implementation complete; real X Layer fork supply/withdraw PASS at block `67,800,182`; public execution disabled.

## Verified deployment

The official Aave Address Book identifies Pool `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116`, Protocol Data Provider `0x6C505C31714f14e8af2A03633EB2Cdfb4959138F`, Oracle `0x91FC11136d5615575a0fC5981Ab5C0C54418E2C6`, USDT `0x779Ded0c9e1022225f8E0630b35a9b54bE713736`, and aUSDT `0xF356ae412dB5df43BD3a10746f7ad4e1C4De4297` on chain 196. At the pinned block, Pool, Data Provider, and aUSDT had bytecode. Data Provider reads showed 6 decimals, active, not frozen, not paused, supply cap 48,000,000 USDT, and approximately 1,828.5 USDT supplied. The narrow ABI is `supply(address,uint256,address,uint16)` and `withdraw(address,uint256,address) returns (uint256)`.

## Policy and planner

`YieldPolicy` adds an explicit maximum strategy exposure, earned-yield compound/reserve split summing to 10,000 BPS, minimum settlement threshold, and enable flag. The existing split semantics are preserved: they apply only to earned protocol yield, not principal allocation. The deterministic planner selects the minimum of liquid reserve above the Constitution minimum, remaining strategy capacity, maximum single-action capacity, remaining daily turnover capacity, and the Vault's actual underlying balance. Neither MARA nor the executor supplies an independent amount.

Minimum reserve means underlying reserve physically liquid in the Vault. aUSDT is a separate yield-deployed stable position and cannot satisfy that minimum. Concentration aggregates liquid USDT plus aUSDT underlying-equivalent exposure; it does not double count the supplied underlying. The position is not classified aggressive.

## Adapter, custody, and accounting

`AaveV3YieldAdapterV1` pins chain 196, Pool, USDT, and aUSDT. It exposes only typed supply and withdraw; no arbitrary Pool, asset, recipient, calldata, borrow, flash loan, collateral, leverage, or debt surface exists. Supply uses exact Vault→adapter and adapter→Pool approvals, referral code zero, and mints aUSDT to the Vault. Withdraw temporarily transfers the exact approved aUSDT amount through the adapter because Aave burns the caller's aTokens, then always returns USDT to the Vault. Final underlying/aToken custody and allowances are zero.

`principalSupplied` changes only for principal supply/withdraw. `accountedBasis` checkpoints the recognized position. Accrued yield is `max(current aToken balance - accountedBasis, 0)`. Settlement leaves the compound share supplied, withdraws the reserve share, then checkpoints the remaining position, preventing double counting. A position below basis produces zero yield; principal is never swept as yield. Dust below the owner-configured threshold reverts.

## Proof and limitations

Real Pool supply of 20 USDT decreased liquid USDT by exactly 20 USDT and produced 19.999999 aUSDT due to legitimate Aave ray rounding. A bounded 5 USDT withdrawal returned exactly 5 USDT. Supply gas was 537,396; withdrawal gas was 206,366, both far below the observed 210,000,000 block gas limit. Protocol/owner gates, pause, caller authorization, exact planner amount, and atomic rollback were tested.

Yield split arithmetic and checkpointing are proven deterministically for 100/0, 0/100, 10/90, and 70/30, including fuzz conservation and repeated settlement. Real index-accrual tests use local time advancement and remain in the fork suite, but the public RPC became intermittent during the final run; no Aave storage was modified and no fake APR was used.

Supply rates can change. Protocol yield is not guaranteed. No wallet prompt, signature, public transaction, deployment, real-fund movement, commit, or push occurred. `BROADCAST_DISABLED_PHASE_13D` remains active.
