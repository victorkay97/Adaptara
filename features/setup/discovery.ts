import type { Address } from "viem";
export type ManagedVaultDiscovery =
 | {status:"none"}|{status:"legacy-only";legacy:Address}|{status:"managed";managed:Address}|{status:"both";legacy:Address;managed:Address}|{status:"unavailable";reason:string};
export function classifyVaults(legacy?:Address|null,managed?:Address|null,error?:string):ManagedVaultDiscovery { if(error)return{status:"unavailable",reason:error}; if(legacy&&managed)return{status:"both",legacy,managed}; if(managed)return{status:"managed",managed}; if(legacy)return{status:"legacy-only",legacy}; return{status:"none"}; }
