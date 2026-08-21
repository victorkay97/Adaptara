import { createConnector } from "wagmi";
import { getAddress, type Address, type EIP1193Provider } from "viem";
import type { SessionTypes } from "@okxconnect/universal-provider";
import { activeXLayer, XLAYER_MAINNET_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID, xLayerMainnet, xLayerTestnet } from "@/lib/chain/xlayer";
import { publicEnv } from "@/lib/env/public";
import { createAppKitMetadata } from "@/lib/wallet/metadata";

export const OKX_EVM_NAMESPACE = "eip155" as const;
export const OKX_XLAYER_MAINNET_CAIP_CHAIN = `eip155:${XLAYER_MAINNET_CHAIN_ID}` as const;
export const OKX_XLAYER_TESTNET_CAIP_CHAIN = `eip155:${XLAYER_TESTNET_CHAIN_ID}` as const;
export const OKX_XLAYER_CAIP_CHAIN = OKX_XLAYER_MAINNET_CAIP_CHAIN;
const supportedChainIds = new Set<number>([XLAYER_MAINNET_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID]);

type OkxProvider = EIP1193Provider & {
  session?: SessionTypes.Struct;
  connected(): boolean;
  connect(parameters: {
    namespaces: Record<string, { chains: string[]; defaultChain: string; rpcMap: Record<string, string> }>;
  }): Promise<SessionTypes.Struct | undefined>;
  disconnect(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
};

export type OkxProviderFactory = (metadata: { name: string; icon: string }) => Promise<OkxProvider>;

export function okxConnectParameters() {
  return {
    namespaces: {
      [OKX_EVM_NAMESPACE]: {
        chains: [OKX_XLAYER_MAINNET_CAIP_CHAIN, OKX_XLAYER_TESTNET_CAIP_CHAIN],
        defaultChain: String(activeXLayer.id),
        rpcMap: {
          [XLAYER_MAINNET_CHAIN_ID]: xLayerMainnet.rpcUrls.default.http[0],
          [XLAYER_TESTNET_CHAIN_ID]: xLayerTestnet.rpcUrls.default.http[0],
        },
      },
    },
  };
}

export function parseOkxEvmAccounts(session?: SessionTypes.Struct): readonly Address[] {
  const accounts = session?.namespaces[OKX_EVM_NAMESPACE]?.accounts ?? [];
  const parsed = accounts.map((account) => {
    const match = /^eip155:(\d+):(0x[0-9a-fA-F]{40})$/.exec(account);
    if (!match || !supportedChainIds.has(Number(match[1]))) return undefined;
    try { return getAddress(match[2]); } catch { return undefined; }
  }).filter((account): account is Address => Boolean(account));
  return [...new Set(parsed)];
}

export function parseOkxSessionChainId(session?: SessionTypes.Struct): number {
  const raw = session?.namespaces[OKX_EVM_NAMESPACE]?.defaultChain;
  const parsed = Number(String(raw ?? "").replace(/^eip155:/, ""));
  return supportedChainIds.has(parsed) ? parsed : activeXLayer.id;
}

async function defaultProviderFactory(metadata: { name: string; icon: string }) {
  const { OKXUniversalProvider } = await import("@okxconnect/universal-provider");
  return OKXUniversalProvider.init({ dappMetaData: metadata }) as Promise<OkxProvider>;
}

export function okxUniversalConnector({ providerFactory = defaultProviderFactory, origin }: { providerFactory?: OkxProviderFactory; origin?: () => string } = {}) {
  type Properties = {
    connect<withCapabilities extends boolean = false>(parameters?: { withCapabilities?: withCapabilities | boolean }): Promise<{
      accounts: withCapabilities extends true ? readonly { address: Address; capabilities: Record<string, unknown> }[] : readonly Address[];
      chainId: number;
    }>;
  };
  return createConnector<OkxProvider, Properties>((config) => {
    let provider: OkxProvider | undefined;
    const sessionUpdated = (session: unknown) => {
      const accounts = parseOkxEvmAccounts(session as SessionTypes.Struct);
      if (accounts.length) config.emitter.emit("change", { accounts, chainId: parseOkxSessionChainId(session as SessionTypes.Struct) });
      else config.emitter.emit("disconnect");
    };
    const sessionDeleted = () => config.emitter.emit("disconnect");
    const getProvider = async () => {
      if (provider) return provider;
      const url = origin?.() ?? (typeof window !== "undefined" ? window.location.origin : publicEnv.NEXT_PUBLIC_APP_URL);
      if (!url) throw new Error("A public HTTPS application origin is required for OKX Wallet.");
      const metadata = createAppKitMetadata(url);
      provider = await providerFactory({ name: metadata.name, icon: metadata.icons[0] });
      provider.on("session_update", sessionUpdated);
      provider.on("session_delete", sessionDeleted);
      return provider;
    };
    return {
      id: "okxUniversal",
      name: "OKX Wallet Mobile",
      type: "okxUniversal",
      async connect<withCapabilities extends boolean = false>({ withCapabilities }: { withCapabilities?: withCapabilities | boolean } = {}) {
        const current = await getProvider();
        const session = current.connected() && current.session ? current.session : await current.connect(okxConnectParameters());
        const accounts = parseOkxEvmAccounts(session);
        if (!accounts.length) throw new Error("OKX Wallet did not return a valid X Layer EVM account.");
        return {
          accounts: (withCapabilities ? accounts.map((address) => ({ address, capabilities: {} })) : accounts) as withCapabilities extends true ? readonly { address: Address; capabilities: Record<string, unknown> }[] : readonly Address[],
          chainId: parseOkxSessionChainId(session),
        };
      },
      async disconnect() {
        const current = await getProvider();
        if (current.connected()) await current.disconnect();
        config.emitter.emit("disconnect");
      },
      async getAccounts() { return parseOkxEvmAccounts((await getProvider()).session); },
      async getChainId() {
        const current = await getProvider();
        try {
          const raw = await current.request({ method: "eth_chainId" });
          const chainId = typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw);
          if (supportedChainIds.has(chainId)) return chainId;
        } catch { /* Fall back to the authorized session chain. */ }
        return parseOkxSessionChainId(current.session);
      },
      getProvider,
      async isAuthorized() { return parseOkxEvmAccounts((await getProvider()).session).length > 0; },
      onAccountsChanged(accounts) {
        const valid = accounts.flatMap((account) => { try { return [getAddress(account)]; } catch { return []; } });
        if (valid.length) config.emitter.emit("change", { accounts: valid }); else config.emitter.emit("disconnect");
      },
      onChainChanged(chain) {
        const chainId = typeof chain === "string" ? Number.parseInt(chain, chain.startsWith("0x") ? 16 : 10) : Number(chain);
        if (supportedChainIds.has(chainId)) config.emitter.emit("change", { chainId });
      },
      onDisconnect() { config.emitter.emit("disconnect"); },
    };
  });
}
