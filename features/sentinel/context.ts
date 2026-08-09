import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { ContextScopedSentinelAssessment, SentinelAssessment } from "./types";

export const sentinelContextFingerprint = (snapshot: PortfolioSnapshot): string => JSON.stringify({ source: snapshot.source, accountAddress: snapshot.accountAddress, chainId: snapshot.chainId, blockNumber: snapshot.blockNumber?.toString() ?? null, assetIds: snapshot.positions.map((item) => item.asset.id).sort() });
export const sentinelAssessmentForContext = (stored: ContextScopedSentinelAssessment | null, contextKey: string): SentinelAssessment | null => stored?.contextKey === contextKey ? stored.assessment : null;
