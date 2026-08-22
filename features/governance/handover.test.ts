import fs from "node:fs";
import { getAddress, keccak256, toBytes, zeroAddress, type Address, type PublicClient, type WalletClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { acceptGovernanceAdmin, DEPLOYER_ADMIN, GOVERNANCE_CONTRACTS, governanceBlockReason, PRODUCTION_ADMIN, sessionInvalidationReason, verifyCompletedHandover, type GovernanceRead } from "./handover";

const other = getAddress("0x0000000000000000000000000000000000000001");
const readyRead: GovernanceRead = {currentAdmin:DEPLOYER_ADMIN,pendingAdmin:PRODUCTION_ADMIN,acceptSchedule:100,blockTimestamp:101n,balance:10n**15n,gasPrice:20_000_001n,estimatedGas:65000n,simulationSucceeded:true,codePresent:true};
const gate = (overrides:Partial<Parameters<typeof governanceBlockReason>[0]>={}) => governanceBlockReason({connected:true,chainId:196,connectedAddress:PRODUCTION_ADMIN,read:readyRead,unlocked:true,...overrides});

describe("governance handover gates",()=>{
  it("disables the wrong wallet",()=>expect(gate({connectedAddress:other})).toMatch(/not the required/));
  it("disables the wrong chain",()=>expect(gate({chainId:1})).toMatch(/chain 196/));
  it("disables a pending-admin mismatch",()=>expect(gate({read:{...readyRead,pendingAdmin:other}})).toMatch(/does not match/));
  it("disables before the delay elapses",()=>expect(gate({read:{...readyRead,blockTimestamp:99n}})).toMatch(/not elapsed/));
  it("disables after simulation failure",()=>expect(gate({read:{...readyRead,simulationSucceeded:false}})).toMatch(/simulation/));
  it("disables when balance is below the buffered gas estimate",()=>expect(gate({read:{...readyRead,balance:1n}})).toMatch(/balance/));
  it("enables the first transaction only for the exact ready state",()=>expect(gate()).toBeUndefined());
  it("uses the gate reason on the actual HTML disabled attribute",()=>{const source=fs.readFileSync(new URL("./governance-handover.tsx",import.meta.url),"utf8");expect(source).toContain("disabled={Boolean(reason)||step.loading}");});
  it("keeps the next transaction locked before prior verification",()=>expect(gate({unlocked:false})).toMatch(/previous contract/));
  it("stops on account and chain switches",()=>{expect(sessionInvalidationReason({address:PRODUCTION_ADMIN,chainId:196},{address:other,chainId:196})).toMatch(/account/);expect(sessionInvalidationReason({address:PRODUCTION_ADMIN,chainId:196},{address:PRODUCTION_ADMIN,chainId:1})).toMatch(/network/);});
});

function clients(options:{receipt?:"success"|"reverted";postAdmin?:Address;postPending?:Address}={}){
  let adminReads=0,pendingReads=0;
  const publicClient={
    getChainId:vi.fn().mockResolvedValue(196),getBlock:vi.fn().mockResolvedValue({timestamp:101n}),getBalance:vi.fn().mockResolvedValue(10n**15n),getGasPrice:vi.fn().mockResolvedValue(20_000_001n),getCode:vi.fn().mockResolvedValue("0x01"),
    simulateContract:vi.fn().mockResolvedValue({result:undefined,request:{}}),estimateContractGas:vi.fn().mockResolvedValue(65000n),
    readContract:vi.fn(async({functionName}:{functionName:string})=>{if(functionName==="defaultAdmin")return ++adminReads===1?DEPLOYER_ADMIN:(options.postAdmin??PRODUCTION_ADMIN);if(functionName==="pendingDefaultAdmin")return ++pendingReads===1?[PRODUCTION_ADMIN,100]:[options.postPending??zeroAddress,0];throw new Error("unexpected read");}),
    waitForTransactionReceipt:vi.fn().mockResolvedValue({status:options.receipt??"success",blockNumber:123n,gasUsed:64000n}),
  } as unknown as PublicClient;
  const walletClient={getChainId:vi.fn().mockResolvedValue(196),getAddresses:vi.fn().mockResolvedValue([PRODUCTION_ADMIN]),sendTransaction:vi.fn().mockResolvedValue(`0x${"1".repeat(64)}`)} as unknown as WalletClient;
  return {publicClient,walletClient};
}

describe("one-at-a-time acceptance",()=>{
  it("successful receipt plus verified post-state unlocks the caller-controlled next step",async()=>{const c=clients();const result=await acceptGovernanceAdmin({...c,connectedAddress:PRODUCTION_ADMIN,contract:GOVERNANCE_CONTRACTS[0]});expect(result.postCurrentAdmin).toBe(PRODUCTION_ADMIN);expect(c.walletClient.sendTransaction).toHaveBeenCalledWith(expect.objectContaining({to:GOVERNANCE_CONTRACTS[0].address,data:"0xcefc1429",value:0n}));});
  it("failed receipt stops without another send",async()=>{const c=clients({receipt:"reverted"});await expect(acceptGovernanceAdmin({...c,connectedAddress:PRODUCTION_ADMIN,contract:GOVERNANCE_CONTRACTS[0]})).rejects.toThrow(/failed onchain/);expect(c.walletClient.sendTransaction).toHaveBeenCalledOnce();});
  it("unexpected post-state stops after confirmation",async()=>{const c=clients({postAdmin:DEPLOYER_ADMIN});await expect(acceptGovernanceAdmin({...c,connectedAddress:PRODUCTION_ADMIN,contract:GOVERNANCE_CONTRACTS[0]})).rejects.toThrow(/post-state/);});
});

describe("final verification and production isolation",()=>{
  it("verifies all four admins plus fixed deployment configuration",async()=>{
    const pairRole=keccak256(toBytes("PAIR_ADMIN_ROLE"));
    const client={getCode:vi.fn().mockResolvedValue("0x01"),readContract:vi.fn(async({address,functionName,args}:{address:Address;functionName:string;args?:readonly unknown[]})=>{
      if(functionName==="defaultAdmin")return PRODUCTION_ADMIN;if(functionName==="pendingDefaultAdmin")return [zeroAddress,0];
      if(functionName==="getAssetConfig")return {supported:true,baselineRiskTier:getAddress(args![0] as Address).toLowerCase().startsWith("0x779d")?0:2};
      if(functionName==="feedConfig"){const usdt=getAddress(args![0] as Address).toLowerCase().startsWith("0x779d");return [usdt?getAddress("0xb928a0678352005a2e51F614efD0b54C9830dB80"):getAddress("0x8b85b50535551F8E8cDAF78dA235b5Cf1005907b"),`0x${"1".repeat(64)}`,90000,true];}
      if(functionName==="sequencerUptimeFeed")return getAddress("0x45c2b8C204568A03Dc7A2E32B71D67Fe97F908A9");if(functionName==="sequencerGracePeriod")return 3600;
      if(functionName==="adapterInfo"){const uniswap=getAddress(address)===GOVERNANCE_CONTRACTS[2].address&&getAddress(args![0] as Address)===GOVERNANCE_CONTRACTS[3].address;return [keccak256(toBytes(uniswap?"uniswap-v3-direct":"aave-v3-yield")),keccak256(toBytes("v1")),true];}
      if(functionName==="pairFee")return (args![0] as string)===keccak256(new Uint8Array([...new Uint8Array(12),...toBytes("0xE7B000003A45145decf8a28FC755aD5eC5EA025A"),...new Uint8Array(12),...toBytes("0x779Ded0c9e1022225f8E0630b35a9b54bE713736")]))?500:0;
      if(functionName==="PAIR_ADMIN_ROLE")return pairRole;if(functionName==="hasRole")return false;if(functionName==="managedVaultOf")return zeroAddress;throw new Error(`unexpected ${functionName}`);
    })} as unknown as PublicClient;
    const result=await verifyCompletedHandover(client);expect(result.ok).toBe(true);expect(result.failures).toEqual([]);expect(result.contracts).toHaveLength(4);expect(result.contracts.every((item)=>item.defaultAdmin===PRODUCTION_ADMIN&&item.pendingAdmin===zeroAddress&&item.codePresent)).toBe(true);
  });
  it("keeps the page development-only and server-gated to notFound in production",()=>{const source=fs.readFileSync(new URL("../../app/dev-governance-handover/page.tsx",import.meta.url),"utf8");expect(source).toMatch(/NODE_ENV\s*===\s*["']production["']/);expect(source).toMatch(/notFound\(\)/);});
});
