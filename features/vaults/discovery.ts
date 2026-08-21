import { getAddress, parseAbi, zeroAddress, type Address, type PublicClient } from "viem";
import { vaultFactoryReadAbi } from "@/features/portfolio/abis";

export type VaultGeneration = "v1" | "v2";
export interface DiscoveredManagedVault { source: VaultGeneration; address: Address; owner: Address; index: number }
export interface SelectedVaultContext { selectedVaultAddress: Address; selectedVaultSource: VaultGeneration }
export interface VaultDiscoveryIssue { source: VaultGeneration; message: string }
export interface ManagedVaultDiscoveryResult { vaults: DiscoveredManagedVault[]; issues: VaultDiscoveryIssue[] }

export const vaultFactoryV2ReadAbi = parseAbi([
  "function vaultCount(address owner) view returns (uint256)",
  "function vaultAt(address owner,uint256 index) view returns (address)",
]);

export function aggregateManagedVaults(v1: readonly DiscoveredManagedVault[], v2: readonly DiscoveredManagedVault[]): DiscoveredManagedVault[] {
  const seen = new Set<string>();
  return [...v1, ...v2].filter((vault) => { const key = vault.address.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

export async function discoverManagedVaults(args: { client: PublicClient; owner: Address; v1Factory?: Address; v2Factory?: Address }): Promise<ManagedVaultDiscoveryResult> {
  const { client, owner, v1Factory, v2Factory } = args;
  const v1: DiscoveredManagedVault[] = [];
  const v2: DiscoveredManagedVault[] = [];
  const issues: VaultDiscoveryIssue[] = [];
  if (v1Factory) {
    try {
      const address = getAddress(await client.readContract({ address: v1Factory, abi: vaultFactoryReadAbi, functionName: "managedVaultOf", args: [owner] }));
      if (address !== zeroAddress) v1.push({ source: "v1", address, owner, index: 0 });
    } catch (error) { issues.push({ source: "v1", message: error instanceof Error ? error.message : "V1 discovery failed" }); }
  }
  if (v2Factory) {
    try {
      const count = Number(await client.readContract({ address: v2Factory, abi: vaultFactoryV2ReadAbi, functionName: "vaultCount", args: [owner] }));
      if (count > 16) throw new Error("V2 factory returned an invalid owner Vault count");
      for (let index = 0; index < count; index += 1) {
        const address = getAddress(await client.readContract({ address: v2Factory, abi: vaultFactoryV2ReadAbi, functionName: "vaultAt", args: [owner, BigInt(index)] }));
        if (address === zeroAddress) throw new Error(`V2 factory returned address zero at index ${index}`);
        v2.push({ source: "v2", address, owner, index });
      }
    } catch (error) { issues.push({ source: "v2", message: error instanceof Error ? error.message : "V2 discovery failed" }); }
  }
  return { vaults: aggregateManagedVaults(v1, v2), issues };
}

export const selectVault = (vault: DiscoveredManagedVault): SelectedVaultContext => ({ selectedVaultAddress: vault.address, selectedVaultSource: vault.source });
