import { beforeAll, describe, expect, it, vi } from "vitest";
import { MaraError } from "@/features/mara/types";

vi.mock("server-only", () => ({}));
const { clientFactory } = vi.hoisted(() => ({ clientFactory: vi.fn() }));
vi.mock("@/features/mara/server/openai-client", () => ({ createOpenAIMaraClient: clientFactory }));
let POST: (request: Request) => Promise<Response>;
beforeAll(async () => { ({ POST } = await import("./route")); }, 30_000);

const invalidContext = { contextVersion: "phase-5.v1", portfolioSource: "wallet", portfolioStatus: "valued", riskStatus: "assessed", facts: [], limitations: [], capturedAt: "2026-01-01T00:00:00.000Z", assessedAt: "2026-01-01T00:00:01.000Z" };
const validContext = { ...invalidContext, portfolioSource: "vault", limitations: ["Risk signals are demo data, not live market truth."], facts: [
  { id: "portfolio.valuation-status", category: "portfolio", label: "Valuation status", value: "valued", source: "portfolio-engine" },
  { id: "portfolio.risk.status", category: "risk", label: "Risk assessment status", value: "assessed", source: "risk-engine" },
  { id: "portfolio.risk.score", category: "risk", label: "Authoritative portfolio risk score (BPS)", value: "2000", source: "risk-engine" },
  { id: "portfolio.risk.current-tier", category: "risk", label: "Current portfolio risk tier", value: "Defensive", source: "risk-engine" },
  { id: "asset.saaplx.symbol", category: "asset", label: "Asset symbol", value: "sAAPLx", source: "asset-catalog" },
  { id: "asset.saaplx.allocation", category: "portfolio", label: "Portfolio allocation (BPS)", value: "10000", source: "portfolio-engine" },
  { id: "asset.saaplx.baseline-tier", category: "asset", label: "Baseline product risk tier", value: "Aggressive", source: "asset-catalog" },
  { id: "asset.saaplx.current-tier", category: "risk", label: "Current calculated risk tier", value: "Balanced", source: "risk-engine" },
  ...["volatility", "liquidity", "referenceDeviation", "issuerCollateral", "concentration", "marketEventStress"].map((factorId) => ({ id: `asset.saaplx.risk.${factorId}`, category: "factor", label: `${factorId} risk factor contribution`, value: "100", source: "risk-engine" })),
] };

describe("POST /api/mara/analyze trust boundary", () => {
  it("returns 413 for an oversized declared body", async () => { const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", headers: { "content-length": "65537" }, body: "{}" })); expect(response.status).toBe(413); });
  it("returns 413 and cancels an oversized chunked body without Content-Length", async () => { let cancelled = false; const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(40_000)); controller.enqueue(new Uint8Array(30_000)); }, cancel() { cancelled = true; } }); const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body, duplex: "half" } as RequestInit)); expect(response.status).toBe(413); expect(cancelled).toBe(true); });
  it("reads a syntactically valid body just below the limit", async () => { const facts = Array.from({ length: 145 }, (_, index) => ({ id: `x.${index}`, category: "portfolio", label: "l".repeat(100), value: "v".repeat(200), source: "portfolio-engine" })); const body = JSON.stringify({ context: { ...invalidContext, facts }, question: null }); expect(new TextEncoder().encode(body).byteLength).toBeLessThan(65_536); expect((await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body }))).status).toBe(422); });
  it("returns 400 for malformed JSON", async () => expect((await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body: "{" }))).status).toBe(400));
  it("returns semantic 422 before creating a provider when the key is missing", async () => { clientFactory.mockClear(); delete process.env.OPENAI_API_KEY; const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body: JSON.stringify({ context: invalidContext, question: null }) })); expect(response.status).toBe(422); expect(clientFactory).not.toHaveBeenCalled(); });
  it("logs only sanitized internal diagnostics while preserving the public 502 contract", async () => {
    const secret = "sk-test-secret-never-log";
    const generated = "generated prose never log";
    const prompt = "prompt input never log";
    const diagnostic = new MaraError("invalid-model-output", generated, "unknown_evidence", { providerErrorName: "BadRequestError", providerStatus: 400, providerCode: "invalid_request", providerType: "invalid_request_error", providerRequestId: "req_safe" });
    clientFactory.mockReturnValueOnce({ analyze: vi.fn().mockRejectedValue(diagnostic) });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", headers: { authorization: `Bearer ${secret}` }, body: JSON.stringify({ context: validContext, question: prompt }) }));
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "MARA analysis is temporarily unavailable.", code: "invalid-model-output" });
    expect(JSON.stringify(body)).not.toContain("diagnosticCode");
    expect(log).toHaveBeenCalledOnce();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("unknown_evidence");
    expect(logged).toContain("req_safe");
    expect(logged).not.toContain(secret);
    expect(logged).not.toContain("Bearer");
    expect(logged).not.toContain(prompt);
    expect(logged).not.toContain(generated);
    log.mockRestore();
  });
});
