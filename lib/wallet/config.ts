import { fallback, http } from "viem";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { isLiveReadOnlyMode, xLayerMainnet, xLayerTestnet } from "@/lib/chain/xlayer";
import { publicEnv } from "@/lib/env/public";
import { createAppKitMetadata } from "@/lib/wallet/metadata";
import { okxUniversalConnector } from "@/lib/wallet/okx-universal-connector";

const configuredProjectId = publicEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!configuredProjectId) throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required for wallet connectivity");
export const walletConnectProjectId: string = configuredProjectId;

export const appKitNetworks = isLiveReadOnlyMode
  ? [xLayerMainnet, xLayerTestnet] as const
  : [xLayerTestnet, xLayerMainnet] as const;
export const xLayerTransports = {
  196: fallback(xLayerMainnet.rpcUrls.default.http.map((url) => http(url))),
  1952: fallback(xLayerTestnet.rpcUrls.default.http.map((url) => http(url))),
} as const;
export const wagmiAdapter = new WagmiAdapter({
  networks: [...appKitNetworks],
  projectId: walletConnectProjectId,
  ssr: true,
  connectors: [okxUniversalConnector()],
  transports: xLayerTransports,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const appKitMetadata = publicEnv.NEXT_PUBLIC_APP_URL ? createAppKitMetadata(publicEnv.NEXT_PUBLIC_APP_URL) : undefined;

declare module "wagmi" { interface Register { config: typeof wagmiConfig } }
