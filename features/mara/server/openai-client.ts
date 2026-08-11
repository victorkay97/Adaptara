import "server-only";
import OpenAI, { APIError } from "openai";
import { MARA_JSON_SCHEMA } from "../schemas";
import { MARA_INSTRUCTIONS, buildMaraModelInput } from "../prompt";
import type { MaraModelClient, MaraModelInput, MaraProviderMetadata } from "../types";
import { MaraError } from "../types";
import { parseServerEnv } from "@/lib/env/server";

type ResponsesClient = Pick<OpenAI, "responses">;
function safeProviderMetadata(error: unknown): MaraProviderMetadata {
  const metadata: MaraProviderMetadata = { providerErrorName: error instanceof Error ? error.constructor.name : "UnknownError" };
  if (!(error instanceof APIError)) return metadata;
  if (typeof error.status === "number") metadata.providerStatus = error.status;
  if (typeof error.code === "string") metadata.providerCode = error.code;
  if (typeof error.type === "string") metadata.providerType = error.type;
  if (typeof error.requestID === "string") metadata.providerRequestId = error.requestID;
  return metadata;
}
export class OpenAIMaraClient implements MaraModelClient {
  constructor(private readonly client: ResponsesClient, private readonly model: string) {}
  async analyze(input: MaraModelInput): Promise<unknown> {
    let response;
    try {
      response = await this.client.responses.create({ model: this.model, instructions: MARA_INSTRUCTIONS, input: [{ role: "user", content: buildMaraModelInput(input.context, input.question) }], reasoning: { effort: "low" }, store: false, max_output_tokens: 1800, text: { format: { type: "json_schema", name: "mara_analysis", strict: true, schema: MARA_JSON_SCHEMA } } });
    } catch (error) { throw new MaraError("provider-failure", "MARA provider request failed.", "openai_request_failure", safeProviderMetadata(error)); }
    if (response.status !== "completed") throw new MaraError("provider-failure", "MARA provider did not complete a structured response.", "response_not_completed");
    if (!response.output_text) throw new MaraError("provider-failure", "MARA provider did not return structured output text.", "output_text_missing");
    try { return JSON.parse(response.output_text); } catch { throw new MaraError("invalid-model-output", "MARA provider returned invalid structured output.", "output_json_parse"); }
  }
}

export function createOpenAIMaraClient(): OpenAIMaraClient {
  const { OPENAI_API_KEY: apiKey, OPENAI_MODEL: model } = parseServerEnv(process.env);
  if (!apiKey) throw new MaraError("not-configured", "MARA is not configured.");
  return new OpenAIMaraClient(new OpenAI({ apiKey }), model);
}
