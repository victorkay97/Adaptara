import { ASSET_CATALOG } from "@/features/portfolio/catalog";
import type { AssetId, AssetPosition, PortfolioSnapshot } from "@/features/portfolio/types";

export interface YieldPositionIdentity {
  matchingPositionCount: number;
  assetId: AssetId | null;
  symbol: string | null;
  displayName: string | null;
  role: string | null;
  baselineRiskTier: string | null;
  expectedDecimals: number | null;
  sandbox: boolean | null;
  referencePriceId: string | null;
  address: string | null;
  availability: string | null;
  rawBalance: string | null;
  balanceDecimals: number | null;
  metadataMatchesCanonical: boolean;
}

export interface YieldPositionEvaluation {
  canonicalAsset: (typeof ASSET_CATALOG)[number] | null;
  position: AssetPosition | null;
  identity: YieldPositionIdentity;
}

export function evaluateYieldPosition(snapshot: PortfolioSnapshot, assetId: AssetId): YieldPositionEvaluation {
  const canonicalAsset = ASSET_CATALOG.find((asset) => asset.id === assetId) ?? null;
  const matches = snapshot.positions.filter((item) => item.asset.id === assetId);
  const position = matches.length === 1 ? matches[0] : null;
  const metadataMatchesCanonical = Boolean(canonicalAsset && position
    && position.asset.id === canonicalAsset.id
    && position.asset.symbol === canonicalAsset.symbol
    && position.asset.displayName === canonicalAsset.displayName
    && position.asset.role === canonicalAsset.role
    && position.asset.baselineRiskTier === canonicalAsset.baselineRiskTier
    && position.asset.expectedDecimals === canonicalAsset.expectedDecimals
    && position.asset.sandbox === canonicalAsset.sandbox
    && position.asset.referencePriceId === canonicalAsset.referencePriceId
    && position.asset.address === canonicalAsset.address);

  return {
    canonicalAsset,
    position,
    identity: {
      matchingPositionCount: matches.length,
      assetId: position?.asset.id ?? null,
      symbol: position?.asset.symbol ?? null,
      displayName: position?.asset.displayName ?? null,
      role: position?.asset.role ?? null,
      baselineRiskTier: position?.asset.baselineRiskTier ?? null,
      expectedDecimals: position?.asset.expectedDecimals ?? null,
      sandbox: position?.asset.sandbox ?? null,
      referencePriceId: position?.asset.referencePriceId ?? null,
      address: position?.asset.address ?? null,
      availability: position?.availability ?? null,
      rawBalance: position?.rawBalance?.toString() ?? null,
      balanceDecimals: position?.balanceDecimals ?? null,
      metadataMatchesCanonical,
    },
  };
}
