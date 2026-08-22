import { z } from "zod";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address");
export const PRODUCTION_ADAPTARA_FACTORY_V2_ADDRESS = "0x98dE37855b85993C0cA6746b667BA01f2894efad" as const;
const deploymentKeys = [
  "NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS",
  "NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS",
  "NEXT_PUBLIC_STRSY_ADDRESS",
  "NEXT_PUBLIC_SXAU_ADDRESS",
  "NEXT_PUBLIC_SAAPLX_ADDRESS",
] as const;

const schema = z.object({
  NEXT_PUBLIC_XLAYER_NETWORK_MODE: z.enum(["demo", "live-read-only"]).default("demo"),
  NEXT_PUBLIC_XLAYER_CHAIN_ID: z.coerce.number().int().refine((id) => id === 1952 || id === 196, "Must be X Layer Testnet 1952 or Mainnet 196"),
  NEXT_PUBLIC_XLAYER_RPC_URL: z.url(),
  NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: z.url(),
  NEXT_PUBLIC_TEST_USDT0_ADDRESS: address.refine((value) => value.toLowerCase() === "0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c", "Must be the official X Layer Testnet USD₮0 address").default("0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.url().refine((url) => url.startsWith("https://"), "Production application URL must use HTTPS").optional(),
  NEXT_PUBLIC_ADAPTARA_BUILDER_CODE: z.string().trim().regex(/^[a-z0-9]{16}$/, "Must be a 16-character lowercase alphanumeric X Layer Builder Code").optional(),
  NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS: address.optional(),
  NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS: address.optional(),
  NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS: address.optional(),
  NEXT_PUBLIC_STRSY_ADDRESS: address.optional(),
  NEXT_PUBLIC_SXAU_ADDRESS: address.optional(),
  NEXT_PUBLIC_SAAPLX_ADDRESS: address.optional(),
}).superRefine((env, context) => {
  const expectedChain = env.NEXT_PUBLIC_XLAYER_NETWORK_MODE === "live-read-only" ? 196 : 1952;
  if (env.NEXT_PUBLIC_XLAYER_CHAIN_ID !== expectedChain) context.addIssue({ code: "custom", message: `${env.NEXT_PUBLIC_XLAYER_NETWORK_MODE} mode requires X Layer chain ID ${expectedChain}` });
  const configured = deploymentKeys.filter((key) => env[key] !== undefined);
  if (configured.length !== 0 && configured.length !== deploymentKeys.length) {
    context.addIssue({ code: "custom", message: `Live X Layer deployment configuration is incomplete; configure all of: ${deploymentKeys.join(", ")}` });
  }
  if (configured.length === deploymentKeys.length) {
    const addresses = [env.NEXT_PUBLIC_TEST_USDT0_ADDRESS, ...deploymentKeys.map((key) => env[key]!)].map((value) => value.toLowerCase());
    if (new Set(addresses).size !== addresses.length) context.addIssue({ code: "custom", message: "Live X Layer deployment addresses must be distinct" });
  }
  if (env.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS && env.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS && env.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS.toLowerCase() === env.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS.toLowerCase()) {
    context.addIssue({ code: "custom", message: "V1 and V2 managed Vault factory addresses must be distinct" });
  }
});

export type PublicEnv = z.infer<typeof schema>;
export function parsePublicEnv(input: Record<string, string | undefined>): PublicEnv {
  const mode = input.NEXT_PUBLIC_XLAYER_NETWORK_MODE === "live-read-only" ? "live-read-only" : "demo";
  const result = schema.safeParse({
    ...input,
    NEXT_PUBLIC_XLAYER_NETWORK_MODE: mode,
    NEXT_PUBLIC_XLAYER_CHAIN_ID: input.NEXT_PUBLIC_XLAYER_CHAIN_ID ?? (mode === "live-read-only" ? "196" : "1952"),
    NEXT_PUBLIC_XLAYER_RPC_URL: input.NEXT_PUBLIC_XLAYER_RPC_URL ?? (mode === "live-read-only" ? "https://rpc.xlayer.tech" : "https://testrpc.xlayer.tech/terigon"),
    NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: input.NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL ?? (mode === "live-read-only" ? "https://xlayerrpc.okx.com" : "https://xlayertestrpc.okx.com/terigon"),
    NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS: input.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS ?? (mode === "live-read-only" ? PRODUCTION_ADAPTARA_FACTORY_V2_ADDRESS : undefined),
  });
  if (!result.success) throw new Error(`Invalid public environment configuration: ${z.prettifyError(result.error)}`);
  return result.data;
}
export function resolvePublicAppUrl(configured?: string, vercelUrl?: string): string | undefined {
  if (configured) return configured;
  if (!vercelUrl) return undefined;
  return `https://${vercelUrl.replace(/^https?:\/\//, "")}`;
}
export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_XLAYER_NETWORK_MODE: process.env.NEXT_PUBLIC_XLAYER_NETWORK_MODE,
  NEXT_PUBLIC_XLAYER_CHAIN_ID: process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID,
  NEXT_PUBLIC_XLAYER_RPC_URL: process.env.NEXT_PUBLIC_XLAYER_RPC_URL,
  NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL: process.env.NEXT_PUBLIC_XLAYER_FALLBACK_RPC_URL,
  NEXT_PUBLIC_TEST_USDT0_ADDRESS: process.env.NEXT_PUBLIC_TEST_USDT0_ADDRESS,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_APP_URL: resolvePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_URL),
  NEXT_PUBLIC_ADAPTARA_BUILDER_CODE: process.env.NEXT_PUBLIC_ADAPTARA_BUILDER_CODE,
  NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS,
  NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS: process.env.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS,
  NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS,
  NEXT_PUBLIC_STRSY_ADDRESS: process.env.NEXT_PUBLIC_STRSY_ADDRESS,
  NEXT_PUBLIC_SXAU_ADDRESS: process.env.NEXT_PUBLIC_SXAU_ADDRESS,
  NEXT_PUBLIC_SAAPLX_ADDRESS: process.env.NEXT_PUBLIC_SAAPLX_ADDRESS,
});
