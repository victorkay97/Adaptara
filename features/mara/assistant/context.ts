import type { DashboardDestination } from "@/features/experience/components/dashboard-shell";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";
import type { ConstitutionCompliance, FinancialConstitution } from "@/features/constitution/types";

export interface AskMaraContext {
  destination: DashboardDestination;
  source: "wallet" | "vault";
  valuationStatus: PortfolioSnapshot["valuationStatus"];
  portfolioValue: string | null;
  positions: readonly { symbol: string; allocationPercent: string | null; availability: string }[];
  riskTier: string | null;
  riskScore: string | null;
  reservePercent: string | null;
  compliance: ConstitutionCompliance["status"] | "unavailable";
  policy: FinancialConstitution | null;
}

export function buildAskMaraContext(input: { destination: DashboardDestination; snapshot: PortfolioSnapshot; assessment: PortfolioRiskAssessment; compliance?: ConstitutionCompliance; policy?: FinancialConstitution; displayValue: string | null }): AskMaraContext {
  const reserve = input.snapshot.positions.find((position) => position.asset.baselineRiskTier === "Reserve")?.allocationBps ?? null;
  return {
    destination: input.destination,
    source: input.snapshot.source,
    valuationStatus: input.snapshot.valuationStatus,
    portfolioValue: input.displayValue,
    positions: input.snapshot.positions.map((position) => ({ symbol: position.asset.symbol, allocationPercent: position.allocationBps === null ? null : `${(position.allocationBps / 100).toFixed(2)}%`, availability: position.availability })),
    riskTier: input.assessment.portfolioCurrentRiskTier,
    riskScore: input.assessment.portfolioRiskScoreBps === null ? null : (input.assessment.portfolioRiskScoreBps / 100).toFixed(2),
    reservePercent: reserve === null ? null : `${(reserve / 100).toFixed(2)}%`,
    compliance: input.compliance?.status ?? "unavailable",
    policy: input.policy ?? null,
  };
}
