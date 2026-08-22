import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_XLAYER_NETWORK_MODE: "demo",
    NEXT_PUBLIC_XLAYER_CHAIN_ID: 1952,
    NEXT_PUBLIC_XLAYER_RPC_URL: "https://testrpc.xlayer.tech/terigon",
    NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: "https://xlayertestrpc.okx.com/terigon",
    NEXT_PUBLIC_TEST_USDT0_ADDRESS: "0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "test-project-id",
  },
}));
import { appKitNetworks, wagmiConfig, xLayerTransports } from "./config";

describe("shared X Layer wallet configuration", () => {
  it("registers both X Layer networks with AppKit", () => {
    expect(new Set(appKitNetworks.map((network) => network.id))).toEqual(new Set([196, 1952]));
  });

  it("registers both chains and transports with Wagmi", () => {
    expect(new Set(wagmiConfig.chains.map((chain) => chain.id))).toEqual(new Set([196, 1952]));
    expect(xLayerTransports[196]).toBeTypeOf("function");
    expect(xLayerTransports[1952]).toBeTypeOf("function");
  });
});
