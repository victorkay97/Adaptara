import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import { readVaultConstitution } from "./readers";
import { isConstitutionActivated } from "./constants";
const vault="0x0000000000000000000000000000000000000002" as const;
const owner="0x0000000000000000000000000000000000000001" as const;
const client=(overrides={})=>({getChainId:vi.fn().mockResolvedValue(1952),getBlockNumber:vi.fn().mockResolvedValue(42n),readContract:vi.fn(async ({functionName})=>functionName==="owner"?owner:[1,2,3,4]),...overrides}) as unknown as PublicClient;
describe("onchain constitution reader",()=>{
  it("pins direct owner and policy reads to one block",async()=>{const c=client(); const result=await readVaultConstitution(c,vault); expect(result).toMatchObject({source:"onchain",owner,blockNumber:42n,constitution:{minimumReserveBps:1,maximumDailyReallocationBps:4}}); expect(c.readContract).toHaveBeenCalledTimes(2); expect(vi.mocked(c.readContract).mock.calls.every(([args])=>args.blockNumber===42n)).toBe(true); expect("multicall" in c).toBe(false);});
  it("rejects wrong chain before reads",async()=>{const c=client({getChainId:vi.fn().mockResolvedValue(1),readContract:vi.fn()}); await expect(readVaultConstitution(c,vault)).rejects.toThrow("Unsupported chain"); expect(c.readContract).not.toHaveBeenCalled();});
  it("propagates reads instead of substituting zero",async()=>{await expect(readVaultConstitution(client({readContract:vi.fn().mockRejectedValue(new Error("RPC failed"))}),vault)).rejects.toThrow("RPC failed");});
  it("rejects structurally invalid decoded onchain policy",async()=>{const c=client({readContract:vi.fn(async({functionName})=>functionName==="owner"?owner:[10001,2,3,4])}); await expect(readVaultConstitution(c,vault)).rejects.toThrow("Invalid onchain constitution");});
  it("interprets the confirmed all-zero onchain policy as uninitialized",async()=>{const c=client({readContract:vi.fn(async({functionName})=>functionName==="owner"?owner:[0,0,0,0])}); const result=await readVaultConstitution(c,vault); expect(result.constitution).toEqual({minimumReserveBps:0,maximumSingleAssetExposureBps:0,maximumAggressiveExposureBps:0,maximumDailyReallocationBps:0}); expect(isConstitutionActivated(result.constitution)).toBe(false);});
});
