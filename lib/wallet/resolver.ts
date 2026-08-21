import type { Connector } from "wagmi";

export type WalletChoice = "okx" | "metamask" | "coinbase" | "other";
export type WalletTransport = "direct" | "okx-connect" | "mobile-handoff" | "generic-walletconnect" | "unavailable";
export type WalletResolution = { connector?: Connector; transport: WalletTransport };

const named = (connectors: readonly Connector[], pattern: RegExp) => connectors.find((connector) => pattern.test(`${connector.id} ${connector.name}`));

export function resolveWalletConnection({ wallet, connectors, providers, mobile }: {
  wallet: WalletChoice;
  connectors: readonly Connector[];
  providers: { okx: boolean; metamask: boolean };
  mobile: boolean;
}): WalletResolution {
  const walletConnect = named(connectors, /walletconnect/i);
  if (wallet === "okx") {
    const direct = providers.okx ? connectors.find((connector) => /okx/i.test(`${connector.id} ${connector.name}`) && !/okxUniversal/i.test(connector.id)) : undefined;
    if (direct) return { connector: direct, transport: "direct" };
    const okxConnect = named(connectors, /okxUniversal/i);
    if (mobile && okxConnect) return { connector: okxConnect, transport: "okx-connect" };
    return { transport: "unavailable" };
  }
  if (wallet === "metamask") {
    const direct = named(connectors, /metamask/i);
    if (direct) return { connector: direct, transport: mobile && !providers.metamask ? "mobile-handoff" : "direct" };
    if (mobile && walletConnect) return { connector: walletConnect, transport: "mobile-handoff" };
    return { transport: "unavailable" };
  }
  if (wallet === "coinbase") {
    const connector = named(connectors, /coinbase/i);
    return connector ? { connector, transport: mobile ? "mobile-handoff" : "direct" } : { transport: "unavailable" };
  }
  return walletConnect ? { connector: walletConnect, transport: "generic-walletconnect" } : { transport: "unavailable" };
}

export function browserWalletEnvironment() {
  if (typeof window === "undefined") return { mobile: false, providers: { okx: false, metamask: false } };
  const ethereum = window.ethereum as (Window["ethereum"] & { isMetaMask?: boolean; isOkxWallet?: boolean }) | undefined;
  return {
    mobile: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    providers: { okx: Boolean((window as Window & { okxwallet?: unknown }).okxwallet ?? ethereum?.isOkxWallet), metamask: Boolean(ethereum?.isMetaMask) },
  };
}
