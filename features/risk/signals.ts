import type { AssetId } from "@/features/portfolio/types";
import type { ExternalRiskSignals, RiskSignalProvider } from "./types";

// Deterministic demonstration inputs only. They are not live measurements,
// predictions, oracle data, or investment recommendations.
const DEMO_SIGNALS: Readonly<Record<AssetId, ExternalRiskSignals>> = {
  usdt0: { assetId: "usdt0", source: "demo", volatilityScoreBps: 900, liquidityScoreBps: 700, referenceDeviationScoreBps: 600, issuerCollateralScoreBps: 2_400, marketEventStressScoreBps: 1_200 },
  strsy: { assetId: "strsy", source: "demo", volatilityScoreBps: 1_800, liquidityScoreBps: 2_200, referenceDeviationScoreBps: 900, issuerCollateralScoreBps: 2_000, marketEventStressScoreBps: 1_500 },
  sxau: { assetId: "sxau", source: "demo", volatilityScoreBps: 3_800, liquidityScoreBps: 3_600, referenceDeviationScoreBps: 1_400, issuerCollateralScoreBps: 2_800, marketEventStressScoreBps: 2_500 },
  saaplx: { assetId: "saaplx", source: "demo", volatilityScoreBps: 7_200, liquidityScoreBps: 4_800, referenceDeviationScoreBps: 1_500, issuerCollateralScoreBps: 3_000, marketEventStressScoreBps: 2_000 },
};

export const getDemoRiskSignals = (assetId: AssetId): ExternalRiskSignals | null => DEMO_SIGNALS[assetId] ?? null;

export class DemoRiskSignalProvider implements RiskSignalProvider {
  async getSignals(assetId: AssetId): Promise<ExternalRiskSignals | null> {
    return getDemoRiskSignals(assetId);
  }
}
