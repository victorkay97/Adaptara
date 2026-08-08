import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_XLAYER_CHAIN_ID: z.coerce.number().int().refine((id) => id === 1952, "Must be X Layer Testnet chain ID 1952").default(1952),
  NEXT_PUBLIC_XLAYER_RPC_URL: z.url().default("https://testrpc.xlayer.tech/terigon"),
  NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: z.url().default("https://xlayertestrpc.okx.com/terigon"),
  NEXT_PUBLIC_TEST_USDT0_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address").default("0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_BUILDER_CODE: z.string().trim().min(1).optional(),
});

export type PublicEnv = z.infer<typeof schema>;
export function parsePublicEnv(input: Record<string, string | undefined>): PublicEnv {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(`Invalid public environment configuration: ${z.prettifyError(result.error)}`);
  return result.data;
}
export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_XLAYER_CHAIN_ID: process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID,
  NEXT_PUBLIC_XLAYER_RPC_URL: process.env.NEXT_PUBLIC_XLAYER_RPC_URL,
  NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: process.env.NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL,
  NEXT_PUBLIC_TEST_USDT0_ADDRESS: process.env.NEXT_PUBLIC_TEST_USDT0_ADDRESS,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_BUILDER_CODE: process.env.NEXT_PUBLIC_BUILDER_CODE,
});
