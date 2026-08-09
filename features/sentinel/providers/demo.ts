import type { AssetId } from "@/features/portfolio/types";
import type { SentinelObservation, SentinelProvider } from "../types";

const ago = (asOf: string, hours: number) => new Date(Date.parse(asOf) - hours * 3_600_000).toISOString();
export class DemoSentinelProvider implements SentinelProvider {
  async scan(assetIds: readonly AssetId[], asOf: string): Promise<SentinelObservation[]> {
    const fixtures: SentinelObservation[] = [
      { observationId: "demo-collateral-a", eventKey: "demo-collateral-review", sourceId: "demo-desk-a", sourceLabel: "Demo Desk A", publishedAt: ago(asOf, 2), headline: "Demo issuer collateral review event", summary: "Synthetic report for testing independent-source event corroboration.", affectedAssetIds: ["usdt0", "strsy"], eventType: "issuer_collateral", severity: "high" },
      { observationId: "demo-collateral-b", eventKey: "demo-collateral-review", sourceId: "demo-desk-b", sourceLabel: "Demo Desk B", publishedAt: ago(asOf, 1), headline: "Demo collateral review follow-up", summary: "Independent synthetic report referring to the same demo event.", affectedAssetIds: ["usdt0", "strsy"], eventType: "issuer_collateral", severity: "high" },
      { observationId: "demo-liquidity-a", eventKey: "demo-liquidity-watch", sourceId: "demo-desk-c", sourceLabel: "Demo Desk C", publishedAt: ago(asOf, 4), headline: "Demo liquidity watch", summary: "Single-source synthetic liquidity observation for display only.", affectedAssetIds: ["sxau"], eventType: "liquidity_market", severity: "critical" },
      { observationId: "demo-operations-a", eventKey: "demo-expired-operations", sourceId: "demo-desk-a", sourceLabel: "Demo Desk A", publishedAt: ago(asOf, 80), headline: "Expired demo operations notice", summary: "Synthetic expired observation retained for transparent history in this scan.", affectedAssetIds: ["saaplx"], eventType: "operational_cyber", severity: "medium" },
      { observationId: "demo-operations-b", eventKey: "demo-expired-operations", sourceId: "demo-desk-b", sourceLabel: "Demo Desk B", publishedAt: ago(asOf, 79), headline: "Expired demo operations follow-up", summary: "Second synthetic source for an event outside the active window.", affectedAssetIds: ["saaplx"], eventType: "operational_cyber", severity: "medium" },
    ];
    return fixtures.filter((item) => item.affectedAssetIds.some((id) => assetIds.includes(id)));
  }
}
