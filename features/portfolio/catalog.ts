import { getAddress, type Address } from "viem";
import { TEST_USDT0_ADDRESS } from "@/lib/chain/xlayer";
import { publicEnv } from "@/lib/env/public";
import type { AssetMetadata } from "./types";

const optionalAddress = (value?: string): Address | undefined => value ? getAddress(value) : undefined;

export function createAssetCatalog(addresses: Partial<Record<"strsy" | "sxau" | "saaplx", Address>> = {}): readonly AssetMetadata[] {
  return [
    { id: "usdt0", symbol: "USD₮0", displayName: "USD₮0 Reserve", role: "Reserve", baselineRiskTier: "Reserve", expectedDecimals: 6, sandbox: false, address: TEST_USDT0_ADDRESS, referencePriceId: "usd0-usd" },
    { id: "strsy", symbol: "sTRSY", displayName: "Sandbox Treasury Exposure", role: "Treasury exposure", baselineRiskTier: "Defensive", expectedDecimals: 18, sandbox: true, address: addresses.strsy, referencePriceId: "demo-strsy-usd" },
    { id: "sxau", symbol: "sXAU", displayName: "Sandbox Gold Exposure", role: "Gold exposure", baselineRiskTier: "Balanced", expectedDecimals: 18, sandbox: true, address: addresses.sxau, referencePriceId: "demo-sxau-usd" },
    { id: "saaplx", symbol: "sAAPLx", displayName: "Sandbox Apple Exposure", role: "Equity exposure", baselineRiskTier: "Aggressive", expectedDecimals: 18, sandbox: true, address: addresses.saaplx, referencePriceId: "demo-saaplx-usd" },
  ];
}

export const ASSET_CATALOG = createAssetCatalog({
  strsy: optionalAddress(publicEnv.NEXT_PUBLIC_STRSY_ADDRESS),
  sxau: optionalAddress(publicEnv.NEXT_PUBLIC_SXAU_ADDRESS),
  saaplx: optionalAddress(publicEnv.NEXT_PUBLIC_SAAPLX_ADDRESS),
});

export const MAINNET_ASSET_CATALOG: readonly AssetMetadata[] = [
  { id: "usdt", symbol: "USDT", displayName: "Tether USD", role: "Reserve", baselineRiskTier: "Reserve", expectedDecimals: 6, sandbox: false, address: getAddress("0x779Ded0c9e1022225f8E0630b35a9b54bE713736") },
  { id: "xeth", symbol: "xETH", displayName: "X Layer Ether", role: "Native ecosystem exposure", baselineRiskTier: "Balanced", expectedDecimals: 18, sandbox: false, address: getAddress("0xE7B000003A45145decf8a28FC755aD5eC5EA025A") },
];
