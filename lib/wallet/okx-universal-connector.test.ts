import { describe, expect, it, vi } from "vitest";
import { xLayerMainnet, xLayerTestnet } from "@/lib/chain/xlayer";
import { OKX_EVM_NAMESPACE, OKX_XLAYER_CAIP_CHAIN, OKX_XLAYER_TESTNET_CAIP_CHAIN, okxConnectParameters, okxUniversalConnector, parseOkxEvmAccounts, type OkxProviderFactory } from "./okx-universal-connector";

const addressA = "0x7bc800000000000000000000000000000000234e";
const addressB = "0x0000000000000000000000000000000000000002";
const session = (account = addressA) => ({ topic: "topic", namespaces: { eip155: { chains: [OKX_XLAYER_CAIP_CHAIN], accounts: [`${OKX_XLAYER_CAIP_CHAIN}:${account}`], methods: [], defaultChain: "196" } } });

function harness(initialSession = session()) {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const request = vi.fn().mockResolvedValue("0xc4");
  const connect = vi.fn().mockResolvedValue(initialSession);
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const provider = { session: undefined as ReturnType<typeof session> | undefined, connected: vi.fn(() => Boolean(provider.session)), connect, disconnect, request, on: vi.fn((event: string, listener: (...args: unknown[]) => void) => listeners.set(event, listener)), removeListener: vi.fn() };
  const providerFactory = vi.fn(async () => provider) as unknown as OkxProviderFactory;
  const events: { event: string; payload?: unknown }[] = [];
  const factory = okxUniversalConnector({ providerFactory, origin: () => "https://adaptara.example" });
  const connector = factory({ chains: [xLayerMainnet, xLayerTestnet], emitter: { emit: (event: string, payload?: unknown) => events.push({ event, payload }) } as never });
  return { connector, provider, providerFactory, listeners, events, connect, disconnect, request };
}

describe("OKX Connect X Layer transport", () => {
  it("initializes official metadata and authorizes exactly both X Layer namespaces", async () => {
    const h = harness(); await h.connector.connect();
    expect(h.providerFactory).toHaveBeenCalledWith({ name: "Adaptara", icon: "https://adaptara.example/brand/logo.png" });
    expect(h.connect).toHaveBeenCalledWith(okxConnectParameters());
    expect(okxConnectParameters().namespaces[OKX_EVM_NAMESPACE]).toEqual({ chains: ["eip155:196", "eip155:1952"], defaultChain: "1952", rpcMap: { 196: expect.any(String), 1952: expect.any(String) } });
    expect(h.request).not.toHaveBeenCalled();
  });
  it("accepts testnet accounts without losing mainnet support", () => {
    const testnetSession = { ...session(), namespaces: { eip155: { ...session().namespaces.eip155, chains: [OKX_XLAYER_CAIP_CHAIN, OKX_XLAYER_TESTNET_CAIP_CHAIN], accounts: [`${OKX_XLAYER_TESTNET_CAIP_CHAIN}:${addressA}`], defaultChain: "1952" } } };
    expect(parseOkxEvmAccounts(testnetSession)).toEqual([addressA]);
  });
  it("accepts manual chain changes to either configured X Layer chain", async () => {
    const h = harness(); await h.connector.getProvider();
    h.connector.onChainChanged("0xc4");
    expect(h.events.at(-1)).toEqual({ event: "change", payload: { chainId: 196 } });
    h.connector.onChainChanged("0x7a0");
    expect(h.events.at(-1)).toEqual({ event: "change", payload: { chainId: 1952 } });
  });
  it("returns a validated EVM address as the authoritative Wagmi connection", async () => {
    await expect(harness().connector.connect()).resolves.toEqual({ accounts: [addressA], chainId: 196 });
  });
  it("rejects cancellation and malformed or absent accounts without a fallback", async () => {
    const cancelled = harness(); cancelled.connect.mockRejectedValueOnce(Object.assign(new Error("User Rejected"), { code: 300 }));
    await expect(cancelled.connector.connect()).rejects.toMatchObject({ code: 300 });
    expect(parseOkxEvmAccounts(session("not-an-address"))).toEqual([]);
    await expect(harness(session("not-an-address")).connector.connect()).rejects.toThrow(/valid X Layer EVM account/);
  });
  it("propagates session account updates and deletion through Wagmi events", async () => {
    const h = harness(); await h.connector.getProvider(); h.listeners.get("session_update")?.(session(addressB));
    expect(h.events.at(-1)).toEqual({ event: "change", payload: { accounts: [addressB], chainId: 196 } });
    h.listeners.get("session_delete")?.({ topic: "topic" }); expect(h.events.at(-1)?.event).toBe("disconnect");
  });
  it("terminates an active OKX session and emits disconnect", async () => {
    const h = harness(); await h.connector.getProvider(); h.provider.session = session(); await h.connector.disconnect();
    expect(h.disconnect).toHaveBeenCalledOnce(); expect(h.events.at(-1)?.event).toBe("disconnect");
  });
  it("never requests signing, transactions, chain switching, or chain addition", async () => {
    const h = harness(); await h.connector.connect(); expect(h.request).not.toHaveBeenCalled();
    expect(JSON.stringify(okxConnectParameters())).not.toMatch(/personal_sign|signTypedData|sendTransaction|wallet_addEthereumChain|wallet_switchEthereumChain/);
  });
});
