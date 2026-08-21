import { defineChain, getAddress, type Address } from "viem";
import { publicEnv } from "@/lib/env/public";

export const XLAYER_TESTNET_CHAIN_ID = 1952 as const;
export const XLAYER_MAINNET_CHAIN_ID = 196 as const;
export const XLAYER_MAINNET_RPC_URLS = ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"] as const;
export const XLAYER_TESTNET_RPC_URLS = ["https://testrpc.xlayer.tech/terigon", "https://xlayertestrpc.okx.com/terigon"] as const;
export const TEST_USDT0_ADDRESS: Address = getAddress(publicEnv.NEXT_PUBLIC_TEST_USDT0_ADDRESS);
export const isLiveReadOnlyMode = publicEnv.NEXT_PUBLIC_XLAYER_NETWORK_MODE === "live-read-only";

const activeRpcUrls = [publicEnv.NEXT_PUBLIC_XLAYER_RPC_URL, publicEnv.NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL] as const;
export const xLayerTestnet = defineChain({
  id: XLAYER_TESTNET_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: isLiveReadOnlyMode ? [...XLAYER_TESTNET_RPC_URLS] : [...activeRpcUrls] } },
  testnet: true,
});

export const xLayerMainnet = defineChain({
  id: XLAYER_MAINNET_CHAIN_ID,
  name: "X Layer Mainnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: isLiveReadOnlyMode ? [...activeRpcUrls] : [...XLAYER_MAINNET_RPC_URLS] } },
});

export const activeXLayer = isLiveReadOnlyMode ? xLayerMainnet : xLayerTestnet;
