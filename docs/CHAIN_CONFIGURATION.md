# X Layer Chain Configuration

`lib/chain/xlayer.ts` is the application source of truth: X Layer Testnet, chain ID 1952, test OKB, primary RPC `https://testrpc.xlayer.tech/terigon`, fallback RPC `https://xlayertestrpc.okx.com/terigon`, and test USD0 `0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c`.

No block explorer is configured because one has not been verified. Unit tests do not depend on live RPC availability.

## Builder Code / ERC-8021

`lib/contracts/builder-attribution.ts` provides a typed configuration boundary but deliberately does not modify transactions. Before transactions are implemented, verify X Layer's current official ERC-8021/viem mechanism and apply it once at the shared transaction boundary with encoding tests. `NEXT_PUBLIC_BUILDER_CODE` remains optional. No attribution API has been fabricated.
