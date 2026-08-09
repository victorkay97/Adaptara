import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { clientFactory } = vi.hoisted(() => ({ clientFactory: vi.fn() }));
vi.mock("@/features/mara/server/openai-client", () => ({ createOpenAIMaraClient: clientFactory }));
let POST: (request: Request) => Promise<Response>;
beforeAll(async () => { ({ POST } = await import("./route")); }, 30_000);

const invalidContext = { contextVersion: "phase-5.v1", portfolioSource: "wallet", portfolioStatus: "valued", riskStatus: "assessed", facts: [], limitations: [], capturedAt: "2026-01-01T00:00:00.000Z", assessedAt: "2026-01-01T00:00:01.000Z" };

describe("POST /api/mara/analyze trust boundary", () => {
  it("returns 413 for an oversized declared body", async () => { const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", headers: { "content-length": "65537" }, body: "{}" })); expect(response.status).toBe(413); });
  it("returns 413 and cancels an oversized chunked body without Content-Length", async () => { let cancelled = false; const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(40_000)); controller.enqueue(new Uint8Array(30_000)); }, cancel() { cancelled = true; } }); const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body, duplex: "half" } as RequestInit)); expect(response.status).toBe(413); expect(cancelled).toBe(true); });
  it("reads a syntactically valid body just below the limit", async () => { const facts = Array.from({ length: 145 }, (_, index) => ({ id: `x.${index}`, category: "portfolio", label: "l".repeat(100), value: "v".repeat(200), source: "portfolio-engine" })); const body = JSON.stringify({ context: { ...invalidContext, facts }, question: null }); expect(new TextEncoder().encode(body).byteLength).toBeLessThan(65_536); expect((await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body }))).status).toBe(422); });
  it("returns 400 for malformed JSON", async () => expect((await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body: "{" }))).status).toBe(400));
  it("returns semantic 422 before creating a provider when the key is missing", async () => { clientFactory.mockClear(); delete process.env.OPENAI_API_KEY; const response = await POST(new Request("http://localhost/api/mara/analyze", { method: "POST", body: JSON.stringify({ context: invalidContext, question: null }) })); expect(response.status).toBe(422); expect(clientFactory).not.toHaveBeenCalled(); });
});
