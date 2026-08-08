import "server-only";
import { z } from "zod";

const schema = z.object({
  CHAINLINK_DATA_STREAMS_API_KEY: z.string().min(1).optional(),
  CHAINLINK_DATA_STREAMS_USER_SECRET: z.string().min(1).optional(),
  CHAINLINK_STREAM_USDT0: z.string().min(1).optional(),
  CHAINLINK_STREAM_TRSY: z.string().min(1).optional(),
  CHAINLINK_STREAM_XAU: z.string().min(1).optional(),
  CHAINLINK_STREAM_AAPLX: z.string().min(1).optional(),
  CHAINLINK_VERIFIER_PROXY: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  AGENT_EXECUTOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.url().optional(),
});

export function parseServerEnv(input: Record<string, string | undefined>) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(`Invalid server environment configuration: ${z.prettifyError(result.error)}`);
  return result.data;
}
