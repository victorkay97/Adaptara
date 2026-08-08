# Adaptara

Phase 2 vault and onchain security foundation for a policy-bounded AI wealth agent for tokenized real-world assets on X Layer Testnet.

## Quick start

1. Install Node.js 20.9+ and Foundry.
2. Copy `.env.example` to `.env.local` and add a WalletConnect project ID if desired.
3. Run `npm install`.
4. Contract dependencies are included as Git submodules; run `git submodule update --init --recursive` after cloning.
5. Run `npm run dev`.

## Validation

Use `npm run check`, or run `lint`, `typecheck`, `test`, `build`, and `test:contracts` separately. Unit tests do not use a live RPC.

This is experimental hackathon software for testnet assets only. Phase 2 provides isolated vault custody and authorization boundaries but no autonomous investment or execution functionality.
