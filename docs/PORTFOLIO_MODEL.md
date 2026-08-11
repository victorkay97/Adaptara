# Portfolio Model

Phase 3 established the **Adaptara-supported portfolio** model, not an index of every token an address may contain. This document preserves that layer's design while noting the current integrated product state.

## Assets and identifiers

Stable product IDs are `usdt0`, `strsy`, `sxau`, and `saaplx`. Metadata includes symbol, display name, role, static `baselineRiskTier`, expected decimals, sandbox state, optional deployed address, and optional reference-price identifier. USD₮0 is the configured reserve token. sTRSY, sXAU, and sAAPLx are sandbox concepts with no redemption rights; absent environment addresses yield `not-configured` and no balance is fabricated.

## Balances and status

Each `AssetPosition` keeps raw `bigint` balance, verified token decimals, a separate display string, availability, optional reference price, scaled USD value, and allocation BPS. `null` means unknown or unavailable; it is never interchangeable with the known financial value `0n`. Deployed addresses are read using batched `balanceOf` and `decimals` calls. A failed configured-token read or decimals mismatch creates an unknown balance and makes portfolio completeness unavailable. An asset with no configured address is `not-configured` and is outside live onchain completeness because there is no contract to read.

## Prices and valuation

Reference prices use eight decimals (`PRICE_DECIMALS = 8`) and integer math. Phase 3's provider is explicitly `DemoReferencePriceProvider`; its transparent demo references are USD₮0 $1, sTRSY $100, sXAU $2,000, and sAAPLx $200. These are sandbox valuation inputs, not market data, backing, ownership claims, or a verified peg. External market and Chainlink integrations are later work.

`valued` means every configured readable balance is known and every known nonzero holding is priced. `partial` means a meaningful valued subtotal exists, but at least one configured balance is unknown or one known nonzero holding is unpriced. `unavailable` means no meaningful USD value can be presented, including when configured balances are unknown and no other exposure can be valued. Zero-balance unpriced assets do not make a complete valuation partial, and `not-configured` assets do not affect live completeness.

`totalUsdValue` is the complete Adaptara-supported reference total only for `valued`. For `partial`, it is explicitly a valued subtotal of successfully priced known positions. For `unavailable`, no meaningful total is presented. `unknownBalanceAssetCount` records configured assets whose balance could not be read or safely interpreted.

Allocations use 10,000 BPS and exist only when `valuationStatus` is `valued`. Each position is floored using integer division; the remainder is assigned to the largest-valued position, with catalog order breaking ties. Thus complete allocations sum to exactly 10,000 BPS. Every position has `allocationBps = null` for `partial` and `unavailable`; the application never presents the valued subset as whole-portfolio composition.

At the time of Phase 3, the Risk Engine was future work. The Phase 4 deterministic Risk Engine now exists and rejects or explicitly degrades calculations whenever required portfolio valuation is incomplete. Current configured portfolio reads use live X Layer onchain balances and verified decimals; valuation still uses the explicitly demo/non-live references above. The system makes no live-market or price-prediction claim.

## Snapshot provenance

`PortfolioSnapshot` records wallet or vault source, account address, chain ID, block number, block-consistency mode, capture time, positions, totals, valuation status, and price sources. Wallet and vault snapshots are never silently merged. Phase 3 pins its batch to one captured block and says so; it does not claim historical reproducibility beyond that RPC block context.

Vault discovery distinguishes an unconfigured factory, wrong chain, read failure, zero-address/no vault, and an available vault. Registry reads map the Solidity enum order exactly to `Reserve`, `Defensive`, `Balanced`, and `Aggressive`.
