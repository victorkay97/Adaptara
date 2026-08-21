import { describe, expect, it } from "vitest";
import type { Connector } from "wagmi";
import { resolveWalletConnection } from "./resolver";

const connectors = [
  { id: "metaMaskSDK", uid: "mm", name: "MetaMask" },
  { id: "coinbaseWalletSDK", uid: "cb", name: "Coinbase Wallet" },
  { id: "okx", uid: "okx", name: "OKX Wallet" },
  { id: "okxUniversal", uid: "okxUniversal", name: "OKX Wallet Mobile" },
  { id: "walletConnect", uid: "wc", name: "WalletConnect" },
] as unknown as readonly Connector[];

describe("wallet-first connector resolver", () => {
  it("uses direct OKX only when its injected provider exists", () => {
    expect(resolveWalletConnection({ wallet: "okx", connectors, mobile: false, providers: { okx: true, metamask: false } })).toMatchObject({ transport: "direct", connector: { id: "okx" } });
  });
  it("routes ordinary mobile Chrome through OKX Connect and fails closed without it", () => {
    expect(resolveWalletConnection({ wallet: "okx", connectors, mobile: true, providers: { okx: false, metamask: false } })).toMatchObject({ transport: "okx-connect", connector: { id: "okxUniversal" } });
    expect(resolveWalletConnection({ wallet: "okx", connectors: connectors.filter((connector) => connector.id !== "okxUniversal"), mobile: true, providers: { okx: false, metamask: false } }).transport).toBe("unavailable");
  });
  it("uses the dedicated MetaMask path on desktop and its supported mobile handoff", () => {
    expect(resolveWalletConnection({ wallet: "metamask", connectors, mobile: false, providers: { okx: false, metamask: true } }).transport).toBe("direct");
    expect(resolveWalletConnection({ wallet: "metamask", connectors, mobile: true, providers: { okx: false, metamask: false } })).toMatchObject({ transport: "mobile-handoff", connector: { id: "metaMaskSDK" } });
  });
  it("keeps Coinbase dedicated and Other wallets generic WalletConnect", () => {
    expect(resolveWalletConnection({ wallet: "coinbase", connectors, mobile: true, providers: { okx: false, metamask: false } }).connector).toMatchObject({ id: "coinbaseWalletSDK" });
    expect(resolveWalletConnection({ wallet: "other", connectors, mobile: true, providers: { okx: false, metamask: false } })).toMatchObject({ transport: "generic-walletconnect", connector: { id: "walletConnect" } });
  });
});
