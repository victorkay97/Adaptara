import { getAddress, type Address, type Hex, type PublicClient, type WalletClient } from "viem";
import type { AssetMetadata } from "@/features/portfolio/types";
import { XLAYER_TESTNET_CHAIN_ID } from "@/lib/chain/xlayer";
import { adaptiveVaultConstitutionAbi } from "./abis";
import { evaluateConstitutionFeasibility } from "./feasibility";
import { readVaultConstitution } from "./readers";
import type { ConstitutionUpdateResult, FinancialConstitution } from "./types";
import { validateConstitution } from "./validation";

function policiesEqual(left: FinancialConstitution, right: FinancialConstitution): boolean {
  return left.minimumReserveBps === right.minimumReserveBps
    && left.maximumSingleAssetExposureBps === right.maximumSingleAssetExposureBps
    && left.maximumAggressiveExposureBps === right.maximumAggressiveExposureBps
    && left.maximumDailyReallocationBps === right.maximumDailyReallocationBps;
}

export async function updateVaultConstitution(params: { publicClient: PublicClient; walletClient: WalletClient; vaultAddress: Address; connectedAddress: Address; policy: FinancialConstitution; assets: readonly AssetMetadata[]; dataSuffix?: Hex }): Promise<ConstitutionUpdateResult> {
  const { publicClient, walletClient, vaultAddress, connectedAddress, policy, assets, dataSuffix } = params;
  if (await publicClient.getChainId() !== XLAYER_TESTNET_CHAIN_ID || walletClient.chain?.id !== XLAYER_TESTNET_CHAIN_ID) throw new Error("Wallet and public client must be on X Layer Testnet.");
  if (walletClient.account && getAddress(walletClient.account.address) !== getAddress(connectedAddress)) throw new Error("Wallet client account does not match the connected wallet.");
  const validation = validateConstitution(policy);
  if (!validation.valid) throw new Error(validation.errors.map((item) => item.message).join(" "));
  const feasibility = evaluateConstitutionFeasibility(policy, assets);
  if (!feasibility.feasible) throw new Error(feasibility.issues.join(" "));
  const before = await readVaultConstitution(publicClient, vaultAddress);
  if (getAddress(connectedAddress) !== before.owner) throw new Error("Connected wallet is not the vault owner.");
  const transactionHash = await walletClient.writeContract({ account: connectedAddress, chain: walletClient.chain, address: vaultAddress, abi: adaptiveVaultConstitutionAbi, functionName: "setPolicy", args: [policy], ...(dataSuffix ? { dataSuffix } : {}) });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  if (receipt.status !== "success") throw new Error("Constitution transaction failed onchain.");
  let constitution;
  try { constitution = await readVaultConstitution(publicClient, vaultAddress); } catch (error) { throw new Error(`Transaction confirmed, but the onchain constitution reread failed: ${error instanceof Error ? error.message : "unknown error"}`); }
  if (constitution.vaultAddress !== getAddress(vaultAddress) || constitution.owner !== before.owner || !policiesEqual(constitution.constitution, validation.value)) throw new Error("Transaction confirmed, but the onchain constitution does not match the requested policy.");
  return { transactionHash, receiptBlockNumber: receipt.blockNumber, constitution };
}
