import { z } from "zod";
import { keccak256 } from "viem";
import type { DeterministicSwapPlan, HexAddress, NormalizedSwapRoute, SwapRouteProvider } from "./types";
if (typeof window !== "undefined") throw new Error("OKX_ROUTE_PROVIDER_SERVER_ONLY");
export const OKX_SWAP_PATH = "/api/v6/dex/aggregator/swap";
const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/).transform((x) => x.toLowerCase() as HexAddress);
const uint = z.string().regex(/^\d+$/);
const token = z.object({ tokenContractAddress: address, isHoneyPot: z.boolean().optional(), taxRate: z.string().optional() }).passthrough();
const responseSchema = z.object({ code: z.literal("0"), msg: z.string(), data: z.array(z.object({ routerResult: z.object({ chainIndex: z.string(), fromTokenAmount: uint, toTokenAmount: uint, estimateGasFee: z.string().optional(), priceImpactPercentage: z.string().optional(), fromToken: token.optional(), toToken: token.optional(), dexRouterList: z.array(z.object({ fromToken: token, toToken: token }).passthrough()).optional() }).passthrough(), tx: z.object({ from: address, to: address, value: uint, minReceiveAmount: uint, data: z.string().regex(/^0x[a-fA-F0-9]*$/), slippagePercent: z.string() }).passthrough(), signatureData: z.array(z.string()).optional() }).passthrough()).length(1) }).strict();
export type OkxSwapRequest = (path: string, query: Record<string, string>, timeoutMs: number) => Promise<unknown>;
export class OkxSwapRouteProvider implements SwapRouteProvider {
  constructor(private readonly request: OkxSwapRequest, private readonly approvalTarget: HexAddress, private readonly timeoutMs = 3_000, private readonly quoteTtlMs = 60_000) {}
  async getExactInRoute(plan: DeterministicSwapPlan, now: Date): Promise<NormalizedSwapRoute> {
    const raw = await this.request(OKX_SWAP_PATH, { chainIndex: String(plan.chainId), amount: plan.amountIn.toString(), swapMode: "exactIn", fromTokenAddress: plan.assetIn, toTokenAddress: plan.assetOut, userWalletAddress: plan.vault, slippagePercent: (plan.maximumSlippageBps / 100).toString(), approveTransaction: "false" }, this.timeoutMs);
    const parsed = responseSchema.safeParse(raw); if (!parsed.success) throw new Error("OKX_MALFORMED_RESPONSE"); const item = parsed.data.data[0];
    if (item.routerResult.chainIndex !== String(plan.chainId)) throw new Error("OKX_WRONG_CHAIN");
    const from = item.routerResult.fromToken ?? item.routerResult.dexRouterList?.[0]?.fromToken; const to = item.routerResult.toToken ?? item.routerResult.dexRouterList?.at(-1)?.toToken;
    if (!from || !to) throw new Error("OKX_TOKEN_PROVENANCE_MISSING");
    const tax = from.isHoneyPot || to.isHoneyPot || Number(from.taxRate ?? "0") > 0 || Number(to.taxRate ?? "0") > 0;
    return { provider: "okx-classic-swap", chainId: plan.chainId, assetIn: from.tokenContractAddress, assetOut: to.tokenContractAddress, amountIn: BigInt(item.routerResult.fromTokenAmount), estimatedAmountOut: BigInt(item.routerResult.toTokenAmount), minimumAmountOut: BigInt(item.tx.minReceiveAmount), slippageBps: Math.round(Number(item.tx.slippagePercent) * 100), priceImpactBps: item.routerResult.priceImpactPercentage === undefined ? null : Math.round(Number(item.routerResult.priceImpactPercentage) * 100), router: item.tx.to, approvalTarget: this.approvalTarget, recipient: item.tx.from, transactionValue: BigInt(item.tx.value), calldataHash: keccak256(item.tx.data as `0x${string}`), quotedAt: now.toISOString(), expiresAt: new Date(Math.min(Date.parse(plan.expiresAt), now.getTime() + this.quoteTtlMs)).toISOString(), taxOrHoneypot: Boolean(tax) };
  }
}
