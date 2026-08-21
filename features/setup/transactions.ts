import { encodeFunctionData, getAddress, isAddress, zeroAddress, type Address, type Hex } from "viem";
import { publicEnv } from "@/lib/env/public";

export const XLAYER_MAINNET_CHAIN_ID = 196 as const;
const v1FactoryAbi = [{ type:"function", name:"createManagedVault", stateMutability:"nonpayable", inputs:[{name:"guardian",type:"address"},{name:"executor",type:"address"}], outputs:[{name:"vault",type:"address"}] }] as const;
const v2FactoryAbi = [{ type:"function", name:"createManagedVault", stateMutability:"nonpayable", inputs:[{name:"guardian",type:"address"}], outputs:[{name:"vault",type:"address"}] }] as const;
const erc20Abi = [{ type:"function", name:"approve", stateMutability:"nonpayable", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{type:"bool"}] }] as const;
const vaultAbi = [
  { type:"function", name:"deposit", stateMutability:"nonpayable", inputs:[{name:"asset",type:"address"},{name:"amount",type:"uint256"}], outputs:[] },
  { type:"function", name:"setPolicy", stateMutability:"nonpayable", inputs:[{name:"newPolicy",type:"tuple",components:[{name:"minimumReserveBps",type:"uint16"},{name:"maximumSingleAssetExposureBps",type:"uint16"},{name:"maximumAggressiveExposureBps",type:"uint16"},{name:"maximumDailyReallocationBps",type:"uint16"}]}], outputs:[] },
  { type:"function", name:"setExecutor", stateMutability:"nonpayable", inputs:[{name:"newExecutor",type:"address"}], outputs:[] },
  { type:"function", name:"setManagementMode", stateMutability:"nonpayable", inputs:[{name:"newMode",type:"uint8"}], outputs:[] },
  { type:"function", name:"setAutonomousPaused", stateMutability:"nonpayable", inputs:[{name:"paused_",type:"bool"}], outputs:[] },
] as const;

export interface PreparedOwnerTransaction { chainId: 196; account: Address; to: Address; value: 0n; data: Hex; meaning: string; movesFunds: boolean; submit: false }
const address = (value:string,name:string):Address => { if(!isAddress(value)||getAddress(value)===zeroAddress) throw new Error(`${name} must be a nonzero address`); return getAddress(value); };
const base=(account:string,to:string,data:Hex,meaning:string,movesFunds=false):PreparedOwnerTransaction=>({chainId:196,account:address(account,"Owner"),to:address(to,"Target"),value:0n,data,meaning,movesFunds,submit:false});
export const requireMainnet=(chainId:number)=>{if(chainId!==196) throw new Error("Switch to X Layer (chain 196)");};
type VaultCreationInput =
  | { chainId:number; factoryGeneration:"v1"; owner:string; guardian:string; executor:string }
  | { chainId:number; factoryGeneration:"v2"; owner:string; guardian:string };

export function prepareVaultCreation(input: VaultCreationInput) {
  requireMainnet(input.chainId);
  const guardian = address(input.guardian, "Guardian");
  if (input.factoryGeneration === "v2") {
    const configured = publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_V2_ADDRESS;
    if (!configured) throw new Error("AdaptiveManagedVaultFactoryV2 is not deployed in this environment");
    return base(input.owner, configured, encodeFunctionData({abi:v2FactoryAbi,functionName:"createManagedVault",args:[guardian]}), "Create an independently governed AdaptiveManagedVaultV1 with executor forced to zero");
  }
  const configured = publicEnv.NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS;
  if (!configured) throw new Error("AdaptiveManagedVaultFactoryV1 is not configured in this environment");
  const executor = address(input.executor, "Executor");
  return base(input.owner, configured, encodeFunctionData({abi:v1FactoryAbi,functionName:"createManagedVault",args:[guardian,executor]}), "Create one owner-controlled AdaptiveManagedVaultV1 with the explicitly selected executor");
}
export function prepareFunding(input:{chainId:number;token:string;vault:string;owner:string;amount:bigint}) { requireMainnet(input.chainId); if(input.amount<=0n) throw new Error("Amount must be positive"); const token=address(input.token,"Token"),vault=address(input.vault,"Vault"),owner=address(input.owner,"Owner"); return [base(owner,token,encodeFunctionData({abi:erc20Abi,functionName:"approve",args:[vault,input.amount]}),"Approve the exact selected token amount",false),base(owner,vault,encodeFunctionData({abi:vaultAbi,functionName:"deposit",args:[token,input.amount]}),"Deposit the exact selected amount into the owner-controlled Vault",true)] as const; }
export function preparePolicy(input:{chainId:number;vault:string;owner:string;policy:{minimumReserveBps:number;maximumSingleAssetExposureBps:number;maximumAggressiveExposureBps:number;maximumDailyReallocationBps:number}}){requireMainnet(input.chainId); Object.values(input.policy).forEach(v=>{if(!Number.isInteger(v)||v<0||v>10000)throw new Error("Policy BPS must be integers from 0 to 10000")}); return base(input.owner,input.vault,encodeFunctionData({abi:vaultAbi,functionName:"setPolicy",args:[input.policy]}),"Save owner-approved Financial Constitution");}
export function prepareExecutorAction(input:{chainId:number;vault:string;owner:string;executor?:string;action:"assign"|"revoke"|"pause"}){requireMainnet(input.chainId); if(input.action==="pause") return base(input.owner,input.vault,encodeFunctionData({abi:vaultAbi,functionName:"setAutonomousPaused",args:[true]}),"Pause Adaptive management"); const next=input.action==="revoke"?zeroAddress:address(input.executor??"","Executor"); return base(input.owner,input.vault,encodeFunctionData({abi:vaultAbi,functionName:"setExecutor",args:[next]}),input.action==="revoke"?"Revoke executor immediately":"Assign restricted execution role");}
