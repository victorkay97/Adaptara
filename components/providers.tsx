"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { appKitMetadata, appKitNetworks, wagmiAdapter, wagmiConfig, walletConnectProjectId } from "@/lib/wallet/config";
import { activeXLayer } from "@/lib/chain/xlayer";
import { createAppKitMetadata } from "@/lib/wallet/metadata";

const runtimeMetadata = appKitMetadata ?? (typeof window !== "undefined" ? createAppKitMetadata(window.location.origin) : undefined);

createAppKit({
  adapters: [wagmiAdapter],
  networks: [...appKitNetworks],
  defaultNetwork: activeXLayer,
  projectId: walletConnectProjectId,
  ...(runtimeMetadata ? { metadata: runtimeMetadata } : {}),
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
