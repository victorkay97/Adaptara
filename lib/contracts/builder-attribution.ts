import { publicEnv } from "@/lib/env/public";

export interface BuilderAttribution { readonly code: string }
export function getBuilderAttribution(): BuilderAttribution | undefined {
  return publicEnv.NEXT_PUBLIC_BUILDER_CODE ? { code: publicEnv.NEXT_PUBLIC_BUILDER_CODE } : undefined;
}

// Do not alter transaction calldata until X Layer's official current viem
// ERC-8021 integration is verified. See docs/CHAIN_CONFIGURATION.md.
