import { z } from "zod";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address");
const deploymentKeys = [
  "NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS",
  "NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS",
  "NEXT_PUBLIC_STRSY_ADDRESS",
  "NEXT_PUBLIC_SXAU_ADDRESS",
  "NEXT_PUBLIC_SAAPLX_ADDRESS",
] as const;

const schema = z.object({
  NEXT_PUBLIC_XLAYER_CHAIN_ID: z.coerce.number().int().refine((id) => id === 1952, "Must be X Layer Testnet chain ID 1952").default(1952),
  NEXT_PUBLIC_XLAYER_RPC_URL: z.url().default("https://testrpc.xlayer.tech/terigon"),
  NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: z.url().default("https://xlayertestrpc.okx.com/terigon"),
  NEXT_PUBLIC_TEST_USDT0_ADDRESS: address.refine((value) => value.toLowerCase() === "0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c", "Must be the official X Layer Testnet USD₮0 address").default("0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_BUILDER_CODE: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS: address.optional(),
  NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS: address.optional(),
  NEXT_PUBLIC_STRSY_ADDRESS: address.optional(),
  NEXT_PUBLIC_SXAU_ADDRESS: address.optional(),
  NEXT_PUBLIC_SAAPLX_ADDRESS: address.optional(),
}).superRefine((env, context) => {
  const configured = deploymentKeys.filter((key) => env[key] !== undefined);
  if (configured.length !== 0 && configured.length !== deploymentKeys.length) {
    context.addIssue({ code: "custom", message: `Live X Layer deployment configuration is incomplete; configure all of: ${deploymentKeys.join(", ")}` });
  }
  if (configured.length === deploymentKeys.length) {
    const addresses = [env.NEXT_PUBLIC_TEST_USDT0_ADDRESS, ...deploymentKeys.map((key) => env[key]!)].map((value) => value.toLowerCase());
    if (new Set(addresses).size !== addresses.length) context.addIssue({ code: "custom", message: "Live X Layer deployment addresses must be distinct" });
  }
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
  NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS,
  NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS,
  NEXT_PUBLIC_STRSY_ADDRESS: process.env.NEXT_PUBLIC_STRSY_ADDRESS,
  NEXT_PUBLIC_SXAU_ADDRESS: process.env.NEXT_PUBLIC_SXAU_ADDRESS,
  NEXT_PUBLIC_SAAPLX_ADDRESS: process.env.NEXT_PUBLIC_SAAPLX_ADDRESS,
});
