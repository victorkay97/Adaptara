import { getAddress, type Address, type PublicClient } from "viem";
import { XLAYER_TESTNET_CHAIN_ID } from "@/lib/chain/xlayer";
import { adaptiveVaultConstitutionAbi } from "./abis";
import { CONSTITUTION_VERSION } from "./constants";
import type { FinancialConstitution, OnchainConstitution } from "./types";
import { validateConstitution } from "./validation";

export async function readVaultConstitution(client: PublicClient, vaultAddress: Address): Promise<OnchainConstitution> {
  const chainId = await client.getChainId();
  if (chainId !== XLAYER_TESTNET_CHAIN_ID) throw new Error(`Unsupported chain ${chainId}; expected ${XLAYER_TESTNET_CHAIN_ID}`);
  const blockNumber = await client.getBlockNumber();
  const [owner, raw] = await Promise.all([client.readContract({ address: vaultAddress, abi: adaptiveVaultConstitutionAbi, functionName: "owner", blockNumber }), client.readContract({ address: vaultAddress, abi: adaptiveVaultConstitutionAbi, functionName: "policy", blockNumber })]);
  const values = raw as readonly [number, number, number, number];
  const constitution: FinancialConstitution = { minimumReserveBps: Number(values[0]), maximumSingleAssetExposureBps: Number(values[1]), maximumAggressiveExposureBps: Number(values[2]), maximumDailyReallocationBps: Number(values[3]) };
  const validation = validateConstitution(constitution);
  if (!validation.valid) throw new Error(`Invalid onchain constitution returned by ${vaultAddress}: ${validation.errors.map((error) => error.message).join(" ")}`);
  return { version: CONSTITUTION_VERSION, source: "onchain", constitution, vaultAddress, owner: getAddress(owner), blockNumber, capturedAt: new Date().toISOString() };
}
