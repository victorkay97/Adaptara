import { describe, expect, it } from "vitest";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import { sentinelAssessmentForContext, sentinelContextFingerprint } from "./context";

const snapshot = { source: "wallet", accountAddress: "0x0000000000000000000000000000000000000001", chainId: 1952, blockNumber: 10n, positions: [{ asset: { id: "strsy" } }] } as unknown as PortfolioSnapshot;
describe("Sentinel context isolation", () => {
  it("changes for source, account, chain, block, or canonical assets", () => { const a = sentinelContextFingerprint(snapshot); expect(sentinelContextFingerprint({ ...snapshot, source: "vault" })).not.toBe(a); expect(sentinelContextFingerprint({ ...snapshot, blockNumber: 11n })).not.toBe(a); expect(sentinelContextFingerprint({ ...snapshot, chainId: 1 })).not.toBe(a); expect(sentinelContextFingerprint({ ...snapshot, accountAddress: "0x0000000000000000000000000000000000000002" })).not.toBe(a); });
  it("exposes only an assessment matching the current context", () => { const contextKey = sentinelContextFingerprint(snapshot); const assessment = { status: "complete" } as never; expect(sentinelAssessmentForContext({ contextKey, assessment }, contextKey)).toBe(assessment); expect(sentinelAssessmentForContext({ contextKey, assessment }, "other")).toBeNull(); });
});
