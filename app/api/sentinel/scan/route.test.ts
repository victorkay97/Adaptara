import { describe, expect, it } from "vitest";
import { DemoSentinelProvider } from "@/features/sentinel/providers/demo";
import type { SentinelProvider } from "@/features/sentinel/types";
import { handleSentinelScan, POST } from "./route";

const request = (body: string, headers?: HeadersInit) => new Request("http://localhost/api/sentinel/scan", { method: "POST", body, headers });
describe("POST /api/sentinel/scan", () => {
  it("returns 200 for canonical unique assets", async () => { const response = await POST(request(JSON.stringify({ assetIds: ["strsy", "sxau"] }))); expect(response.status).toBe(200); expect((await response.json()).assessment).toMatchObject({ status: "complete", feedMode: "demo", executionAuthority: "none" }); });
  it.each([{ assetIds: ["unknown"] }, { assetIds: ["strsy", "strsy"] }, { assetIds: [] }])("returns 400 for invalid assets: $assetIds", async (body) => expect((await POST(request(JSON.stringify(body)))).status).toBe(400));
  it("returns 400 for malformed JSON", async () => expect((await POST(request("{"))).status).toBe(400));
  it("returns 413 for an oversized declared body", async () => expect((await POST(request("{}", { "content-length": "16385" }))).status).toBe(413));
  it("returns 413 for an oversized streamed body", async () => { const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(20_000)); } }); const response = await POST(new Request("http://localhost/api/sentinel/scan", { method: "POST", body, duplex: "half" } as RequestInit)); expect(response.status).toBe(413); });
  it("returns a truthful provider failure rather than zero stress", async () => { const provider: SentinelProvider = { scan: async () => { throw new Error("fixture failure"); } }; const response = await handleSentinelScan(request(JSON.stringify({ assetIds: ["strsy"] })), provider); expect(response.status).toBe(502); expect(await response.json()).toMatchObject({ code: "provider-failure" }); });
  it("uses no network for the demo provider", async () => expect(await new DemoSentinelProvider().scan(["strsy"], "2026-01-01T00:00:00.000Z")).toHaveLength(2));
});
