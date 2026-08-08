import { fallback, http } from "viem";
import { createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { xLayerTestnet } from "@/lib/chain/xlayer";
import { publicEnv } from "@/lib/env/public";

export const wagmiConfig = createConfig({
  chains: [xLayerTestnet],
  connectors: publicEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    ? [injected(), walletConnect({ projectId: publicEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID })]
    : [injected()],
  transports: { [xLayerTestnet.id]: fallback([http(publicEnv.NEXT_PUBLIC_XLAYER_RPC_URL), http(publicEnv.NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL)]) },
  ssr: true,
});

declare module "wagmi" { interface Register { config: typeof wagmiConfig } }
