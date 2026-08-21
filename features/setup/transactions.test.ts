import { beforeEach,describe,expect,it,vi } from "vitest"; import { maxUint256, zeroAddress } from "viem";
vi.mock("@/lib/env/public",()=>({publicEnv:{NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS:"0x0000000000000000000000000000000000000002"}}));
import { prepareVaultCreation,prepareExecutorAction,prepareFunding,preparePolicy } from "./transactions";
import { publicEnv } from "@/lib/env/public";
const owner="0x0000000000000000000000000000000000000001", target="0x0000000000000000000000000000000000000002", other="0x0000000000000000000000000000000000000003";
describe("owner transaction preparation",()=>{
 beforeEach(()=>{vi.clearAllMocks();delete (publicEnv as {NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS?:string}).NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS;});
 it("prepares configured V1 creation and never submits",()=>expect(prepareVaultCreation({chainId:196,factoryGeneration:"v1",owner,guardian:owner,executor:other})).toMatchObject({chainId:196,to:target,submit:false,movesFunds:false}));
 it("rejects wrong chain",()=>expect(()=>prepareVaultCreation({chainId:1952,factoryGeneration:"v1",owner,guardian:owner,executor:other})).toThrow("Switch to X Layer"));
 it("fails closed when V2 has no deployed address",()=>expect(()=>prepareVaultCreation({chainId:196,factoryGeneration:"v2",owner,guardian:owner})).toThrow(/not deployed/));
 it("prepares only the configured V2 guardian argument with executor forced zero by the contract",()=>{(publicEnv as {NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS?:string}).NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS=other;const tx=prepareVaultCreation({chainId:196,factoryGeneration:"v2",owner,guardian:owner});expect(tx.to).toBe(other);expect(tx.data).toHaveLength(74);expect(tx.meaning).toContain("forced to zero");});
 it("prepares exact approval then deposit without max approval",()=>{const tx=prepareFunding({chainId:196,token:target,vault:other,owner,amount:50n});expect(tx).toHaveLength(2);expect(tx[0].data).not.toContain(maxUint256.toString(16));expect(tx[1].movesFunds).toBe(true);expect(tx.every(x=>!x.submit)).toBe(true)});
 it("rejects invalid policy",()=>expect(()=>preparePolicy({chainId:196,vault:target,owner,policy:{minimumReserveBps:10001,maximumSingleAssetExposureBps:5000,maximumAggressiveExposureBps:3000,maximumDailyReallocationBps:1000}})).toThrow("BPS"));
 it("prepares assignment pause and zero-address revocation",()=>{expect(prepareExecutorAction({chainId:196,vault:target,owner,executor:other,action:"assign"}).meaning).toContain("restricted");expect(prepareExecutorAction({chainId:196,vault:target,owner,action:"pause"}).meaning).toContain("Pause");expect(prepareExecutorAction({chainId:196,vault:target,owner,action:"revoke"}).data).toContain(zeroAddress.slice(2));});
});
