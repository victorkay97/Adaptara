import { describe, expect, it } from "vitest";
import { isAddress } from "viem";
import { TEST_USDT0_ADDRESS, XLAYER_MAINNET_CHAIN_ID, XLAYER_MAINNET_RPC_URLS, XLAYER_TESTNET_CHAIN_ID, xLayerMainnet, xLayerTestnet } from "./xlayer";

describe("X Layer Testnet configuration", () => {
  it("uses the locked testnet values", () => {
    expect(xLayerTestnet.id).toBe(XLAYER_TESTNET_CHAIN_ID);
    expect(xLayerTestnet.id).toBe(1952);
    expect(xLayerTestnet.nativeCurrency.symbol).toBe("OKB");
    expect(xLayerTestnet.testnet).toBe(true);
  });

  it("defines canonical X Layer Mainnet independently of the active environment", () => {
    expect(xLayerMainnet.id).toBe(XLAYER_MAINNET_CHAIN_ID);
    expect(xLayerMainnet.id).toBe(196);
    expect(xLayerMainnet.nativeCurrency.symbol).toBe("OKB");
    expect(xLayerMainnet.rpcUrls.default.http).toContain(XLAYER_MAINNET_RPC_URLS[0]);
  });

  it("contains a valid test USD0 address", () => {
    expect(isAddress(TEST_USDT0_ADDRESS)).toBe(true);
    expect(TEST_USDT0_ADDRESS.toLowerCase()).toBe("0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c");
  });
});
