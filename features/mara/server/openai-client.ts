import "server-only";
import OpenAI from "openai";
import { MARA_JSON_SCHEMA } from "../schemas";
import { MARA_INSTRUCTIONS, buildMaraModelInput } from "../prompt";
import type { MaraModelClient, MaraModelInput } from "../types";
import { MaraError } from "../types";
import { parseServerEnv } from "@/lib/env/server";

type ResponsesClient = Pick<OpenAI, "responses">;
export class OpenAIMaraClient implements MaraModelClient {
  constructor(private readonly client: ResponsesClient, private readonly model: string) {}
  async analyze(input: MaraModelInput): Promise<unknown> {
    let response;
    try {
      response = await this.client.responses.create({ model: this.model, instructions: MARA_INSTRUCTIONS, input: [{ role: "user", content: buildMaraModelInput(input.context, input.question) }], reasoning: { effort: "low" }, store: false, max_output_tokens: 1800, text: { format: { type: "json_schema", name: "mara_analysis", strict: true, schema: MARA_JSON_SCHEMA } } });
    } catch { throw new MaraError("provider-failure", "MARA provider request failed."); }
    if (response.status !== "completed" || !response.output_text) throw new MaraError("provider-failure", "MARA provider did not complete a structured response.");
    try { return JSON.parse(response.output_text); } catch { throw new MaraError("invalid-model-output", "MARA provider returned invalid structured output."); }
  }
}

export function createOpenAIMaraClient(): OpenAIMaraClient {
  const { OPENAI_API_KEY: apiKey, OPENAI_MODEL: model } = parseServerEnv(process.env);
  if (!apiKey) throw new MaraError("not-configured", "MARA is not configured.");
  return new OpenAIMaraClient(new OpenAI({ apiKey }), model);
}
