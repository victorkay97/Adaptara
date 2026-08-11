import { beforeAll, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import type OpenAI from "openai";
import type { MaraModelInput } from "../types";

vi.mock("server-only", () => ({}));
let OpenAIMaraClient: typeof import("./openai-client").OpenAIMaraClient;
beforeAll(async () => { ({ OpenAIMaraClient } = await import("./openai-client")); });

const input = { context: {}, question: null } as MaraModelInput;
const clientWith = (create: ReturnType<typeof vi.fn>) => new OpenAIMaraClient({ responses: { create } } as unknown as Pick<OpenAI, "responses">, "gpt-5.6");

describe("OpenAI MARA diagnostics", () => {
  it("preserves only documented safe APIError metadata", async () => {
    const headers = new Headers({ "x-request-id": "req_safe", authorization: "Bearer secret" });
    const providerError = new APIError(429, { code: "rate_limit", type: "rate_limit_error", message: "provider detail must not propagate" }, "unsafe provider message", headers);
    const promise = clientWith(vi.fn().mockRejectedValue(providerError)).analyze(input);
    await expect(promise).rejects.toMatchObject({ code: "provider-failure", diagnosticCode: "openai_request_failure", providerMetadata: { providerErrorName: "APIError", providerStatus: 429, providerCode: "rate_limit", providerType: "rate_limit_error", providerRequestId: "req_safe" } });
    await promise.catch((error) => expect(JSON.stringify(error.providerMetadata)).not.toMatch(/Bearer|secret|provider detail|authorization/i));
  });

  it.each([
    [{ status: "incomplete", output_text: "{}" }, "provider-failure", "response_not_completed"],
    [{ status: "completed", output_text: "" }, "provider-failure", "output_text_missing"],
    [{ status: "completed", output_text: "{" }, "invalid-model-output", "output_json_parse"],
  ] as const)("classifies response pipeline stage %#", async (response, code, diagnosticCode) => {
    await expect(clientWith(vi.fn().mockResolvedValue(response)).analyze(input)).rejects.toMatchObject({ code, diagnosticCode });
  });
});
