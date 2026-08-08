import { defineChain, getAddress, type Address } from "viem";
import { publicEnv } from "@/lib/env/public";

export const XLAYER_TESTNET_CHAIN_ID = 1952 as const;
export const TEST_USDT0_ADDRESS: Address = getAddress(publicEnv.NEXT_PUBLIC_TEST_USDT0_ADDRESS);
export const xLayerTestnet = defineChain({
  id: XLAYER_TESTNET_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [publicEnv.NEXT_PUBLIC_XLAYER_RPC_URL, publicEnv.NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL] } },
  testnet: true,
});
