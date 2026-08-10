# X Layer Chain Configuration

`lib/chain/xlayer.ts` is the application source of truth: X Layer Testnet, chain ID 1952, test OKB, primary RPC `https://testrpc.xlayer.tech/terigon`, fallback RPC `https://xlayertestrpc.okx.com/terigon`, and test USD0 `0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c`.

No block explorer is configured because one has not been verified. Unit tests do not depend on live RPC availability.

## Builder Code / ERC-8021

`lib/contracts/builder-attribution.ts` validates the optional `NEXT_PUBLIC_ADAPTARA_BUILDER_CODE` and uses `Attribution.toDataSuffix` from the direct `ox/erc8021` dependency. The owner-only Constitution writer passes that typed suffix through Viem's per-transaction `dataSuffix` option on its existing single `writeContract` call. With no registered/configured code, the suffix is absent. Registration remains a separate explicit operation.
