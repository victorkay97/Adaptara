# Development

Requirements: Node.js 20.9+, npm, and Foundry (`forge`). Copy `.env.example` to `.env.local`; injected wallets work with defaults, while WalletConnect requires a project ID.

```bash
npm install
git submodule update --init --recursive
npm run dev
```

Validation commands: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:contracts`, and `npm run check`. Unit tests use no live RPC. Never store a private key in source control or a `NEXT_PUBLIC_` variable.
