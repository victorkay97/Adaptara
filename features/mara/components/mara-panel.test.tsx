import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MaraPanel } from "./mara-panel";
import type { PortfolioSnapshot } from "@/features/portfolio/types";
import type { PortfolioRiskAssessment } from "@/features/risk/types";

const snapshot = { source: "wallet", valuationStatus: "valued", positions: [], priceSources: [], capturedAt: "2026-01-01T00:00:00.000Z" } as unknown as PortfolioSnapshot;
const risk = { status: "assessed", assetAssessments: [], signalSources: [], assessedAt: "2026-01-01T00:00:01.000Z" } as unknown as PortfolioRiskAssessment;
describe("MARA panel", () => {
  it("renders explicit initiation and advisory boundary without execution CTA", () => { const html = renderToStaticMarkup(<MaraPanel snapshot={snapshot} assessment={risk} />); expect(html).toContain("Analyze with MARA"); expect(html).toContain("advisory only"); expect(html).not.toContain("Execute recommendation"); });
  it("renders incomplete deterministic state without analysis button", () => { const html = renderToStaticMarkup(<MaraPanel snapshot={{ ...snapshot, valuationStatus: "partial" }} assessment={risk} />); expect(html).toContain("unavailable until deterministic"); expect(html).not.toContain("Analyze with MARA"); });
});
