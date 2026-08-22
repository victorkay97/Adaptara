import {
  getAddress,
  encodeAbiParameters,
  createPublicClient,
  fallback,
  http,
  keccak256,
  toBytes,
  zeroAddress,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { xLayerMainnet, XLAYER_MAINNET_CHAIN_ID } from "@/lib/chain/xlayer";

export const PRODUCTION_ADMIN = getAddress("0xf4ac7c9ad5a809240291a4f2e4cbe9189b14cdf4");
export const DEPLOYER_ADMIN = getAddress("0x7bc8489c39A750CCFa6C06d5d6dB5F682976234E");
export const ACCEPT_ADMIN_CALLDATA = "0xcefc1429" as const;
export const governancePublicClient = createPublicClient({ chain: xLayerMainnet, transport: fallback([http("https://rpc.xlayer.tech"), http("https://xlayerrpc.okx.com")]) });

export const GOVERNANCE_CONTRACTS = [
  { name: "AssetRegistry", address: getAddress("0xd211E4d1e1049d800d5360A078d52B0fcDD74684") },
  { name: "ChainlinkValuationProviderV1", address: getAddress("0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc") },
  { name: "ProtocolAdapterRegistryV1", address: getAddress("0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A") },
  { name: "UniswapV3SwapAdapterV1", address: getAddress("0x009e2dfEa3FE134BcE3F769aA3E6C287823af184") },
] as const;

const governanceAbi = [
  { type: "function", name: "defaultAdmin", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "pendingDefaultAdmin", stateMutability: "view", inputs: [], outputs: [{ name: "newAdmin", type: "address" }, { name: "acceptSchedule", type: "uint48" }] },
  { type: "function", name: "acceptDefaultAdminTransfer", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export interface GovernanceRead {
  currentAdmin: Address;
  pendingAdmin: Address;
  acceptSchedule: number;
  blockTimestamp: bigint;
  balance: bigint;
  gasPrice: bigint;
  estimatedGas?: bigint;
  simulationSucceeded: boolean;
  codePresent: boolean;
}

export interface GovernanceGateInput {
  connected: boolean;
  chainId?: number;
  connectedAddress?: Address;
  read?: GovernanceRead;
  unlocked: boolean;
  stoppedReason?: string;
}

export function bufferedGovernanceGasCost(read: Pick<GovernanceRead, "estimatedGas" | "gasPrice">): bigint | undefined {
  return read.estimatedGas === undefined ? undefined : read.estimatedGas * read.gasPrice * 2n;
}

export function governanceBlockReason(input: GovernanceGateInput): string | undefined {
  if (input.stoppedReason) return input.stoppedReason;
  if (!input.unlocked) return "The previous contract has not been verified.";
  if (!input.connected || !input.connectedAddress) return "Connect the production-admin wallet.";
  if (input.chainId !== XLAYER_MAINNET_CHAIN_ID) return "Switch to X Layer Mainnet (chain 196).";
  if (getAddress(input.connectedAddress) !== PRODUCTION_ADMIN) return "Connected wallet is not the required production admin.";
  if (!input.read) return "Fresh onchain preflight has not completed.";
  if (!input.read.codePresent) return "Runtime bytecode is missing at the fixed contract address.";
  if (input.read.currentAdmin !== DEPLOYER_ADMIN) return "Current admin is no longer the expected deployer.";
  if (input.read.pendingAdmin !== PRODUCTION_ADMIN) return "Pending admin does not match the production admin.";
  if (input.read.acceptSchedule === 0 || input.read.blockTimestamp < BigInt(input.read.acceptSchedule)) return "The admin-transfer delay has not elapsed.";
  if (!input.read.simulationSucceeded || input.read.estimatedGas === undefined) return "Acceptance simulation or gas estimation failed.";
  const bufferedCost = bufferedGovernanceGasCost(input.read);
  if (bufferedCost === undefined || input.read.balance < bufferedCost) return "Native OKB balance is below the 100% buffered gas estimate.";
  return undefined;
}

export function sessionInvalidationReason(session: {address: Address; chainId: number}, current: {address?: Address; chainId?: number}): string | undefined {
  if (!current.address || getAddress(current.address) !== getAddress(session.address)) return "Connected account changed.";
  if (current.chainId !== session.chainId) return "Connected network changed.";
  return undefined;
}

export async function readGovernancePreflight(publicClient: PublicClient, address: Address, account: Address): Promise<GovernanceRead> {
  const [chainId, block, balance, gasPrice, code, currentAdmin, pending] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBlock({ blockTag: "latest" }),
    publicClient.getBalance({ address: account, blockTag: "latest" }),
    publicClient.getGasPrice(),
    publicClient.getCode({ address, blockTag: "latest" }),
    publicClient.readContract({ address, abi: governanceAbi, functionName: "defaultAdmin" }),
    publicClient.readContract({ address, abi: governanceAbi, functionName: "pendingDefaultAdmin" }),
  ]);
  if (chainId !== XLAYER_MAINNET_CHAIN_ID) throw new Error("Public client is not on X Layer Mainnet (chain 196).");
  let estimatedGas: bigint | undefined;
  let simulationSucceeded = false;
  try {
    await publicClient.simulateContract({ account, address, abi: governanceAbi, functionName: "acceptDefaultAdminTransfer" });
    estimatedGas = await publicClient.estimateContractGas({ account, address, abi: governanceAbi, functionName: "acceptDefaultAdminTransfer" });
    simulationSucceeded = true;
  } catch {
    simulationSucceeded = false;
  }
  return {
    currentAdmin: getAddress(currentAdmin),
    pendingAdmin: getAddress(pending[0]),
    acceptSchedule: pending[1],
    blockTimestamp: block.timestamp,
    balance,
    gasPrice,
    estimatedGas,
    simulationSucceeded,
    codePresent: Boolean(code && code !== "0x"),
  };
}

export interface AcceptanceResult {
  hash: Hash;
  blockNumber: bigint;
  gasUsed: bigint;
  postCurrentAdmin: Address;
  postPendingAdmin: Address;
}

export async function acceptGovernanceAdmin(params: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  connectedAddress: Address;
  contract: (typeof GOVERNANCE_CONTRACTS)[number];
}): Promise<AcceptanceResult> {
  const { publicClient, walletClient, connectedAddress, contract } = params;
  const walletChainId = await walletClient.getChainId();
  const walletAccounts = await walletClient.getAddresses();
  if (walletChainId !== XLAYER_MAINNET_CHAIN_ID || await publicClient.getChainId() !== XLAYER_MAINNET_CHAIN_ID) throw new Error("Wallet and public client must be on X Layer Mainnet (chain 196).");
  if (getAddress(connectedAddress) !== PRODUCTION_ADMIN || !walletAccounts.some((item) => getAddress(item) === PRODUCTION_ADMIN)) throw new Error("Connected wallet is not the production admin.");
  const before = await readGovernancePreflight(publicClient, contract.address, connectedAddress);
  const blocked = governanceBlockReason({ connected: true, chainId: walletChainId, connectedAddress, read: before, unlocked: true });
  if (blocked) throw new Error(blocked);
  const hash = await walletClient.sendTransaction({ account: connectedAddress, chain: xLayerMainnet, to: contract.address, data: ACCEPT_ADMIN_CALLDATA, value: 0n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${contract.name} acceptance transaction failed onchain.`);
  const [postCurrentAdmin, postPending] = await Promise.all([
    publicClient.readContract({ address: contract.address, abi: governanceAbi, functionName: "defaultAdmin" }),
    publicClient.readContract({ address: contract.address, abi: governanceAbi, functionName: "pendingDefaultAdmin" }),
  ]);
  const current = getAddress(postCurrentAdmin);
  const pending = getAddress(postPending[0]);
  if (current !== PRODUCTION_ADMIN || pending !== zeroAddress || postPending[1] !== 0) throw new Error(`${contract.name} receipt succeeded, but the verified admin post-state is unexpected.`);
  return { hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed, postCurrentAdmin: current, postPendingAdmin: pending };
}

const USDT = getAddress("0x779Ded0c9e1022225f8E0630b35a9b54bE713736");
const XETH = getAddress("0xE7B000003A45145decf8a28FC755aD5eC5EA025A");
const AAVE_ADAPTER = getAddress("0xd7c2662e436Bd1D50A6AA033C05DB905A2dddc83");
const FACTORY = getAddress("0xE0969F6F0C0cFEE3F34132466f84CF45e883DcA5");
const SEQUENCER = getAddress("0x45c2b8C204568A03Dc7A2E32B71D67Fe97F908A9");
const assetAbi = [{ type:"function", name:"getAssetConfig", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"tuple",components:[{name:"supported",type:"bool"},{name:"baselineRiskTier",type:"uint8"}]}] }] as const;
const valuationAbi = [
  { type:"function", name:"feedConfig", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"address"},{type:"bytes32"},{type:"uint32"},{type:"bool"}] },
  { type:"function", name:"sequencerUptimeFeed", stateMutability:"view", inputs:[], outputs:[{type:"address"}] },
  { type:"function", name:"sequencerGracePeriod", stateMutability:"view", inputs:[], outputs:[{type:"uint32"}] },
] as const;
const protocolAbi = [{ type:"function", name:"adapterInfo", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"bytes32"},{type:"bytes32"},{type:"bool"}] }] as const;
const uniswapAbi = [
  { type:"function", name:"pairFee", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint24"}] },
  { type:"function", name:"PAIR_ADMIN_ROLE", stateMutability:"view", inputs:[], outputs:[{type:"bytes32"}] },
  { type:"function", name:"hasRole", stateMutability:"view", inputs:[{type:"bytes32"},{type:"address"}], outputs:[{type:"bool"}] },
] as const;
const factoryAbi = [{ type:"function", name:"managedVaultOf", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"address"}] }] as const;

export interface FinalContractVerification { name: string; address: Address; defaultAdmin: Address; pendingAdmin: Address; codePresent: boolean }
export interface FinalVerification { ok: boolean; failures: string[]; contracts: FinalContractVerification[] }
export async function verifyCompletedHandover(publicClient: PublicClient): Promise<FinalVerification> {
  const failures: string[] = [];
  const contracts: FinalContractVerification[] = [];
  for (const contract of GOVERNANCE_CONTRACTS) {
    const [code, admin, pending] = await Promise.all([
      publicClient.getCode({ address: contract.address }),
      publicClient.readContract({ address: contract.address, abi: governanceAbi, functionName: "defaultAdmin" }),
      publicClient.readContract({ address: contract.address, abi: governanceAbi, functionName: "pendingDefaultAdmin" }),
    ]);
    const result = {name:contract.name,address:contract.address,defaultAdmin:getAddress(admin),pendingAdmin:getAddress(pending[0]),codePresent:Boolean(code&&code!=="0x")};
    contracts.push(result);
    if (!result.codePresent || result.defaultAdmin !== PRODUCTION_ADMIN || result.pendingAdmin !== zeroAddress || pending[1] !== 0) failures.push(`${contract.name} governance state is not finalized.`);
  }
  const assetRegistry = GOVERNANCE_CONTRACTS[0].address;
  const valuation = GOVERNANCE_CONTRACTS[1].address;
  const protocols = GOVERNANCE_CONTRACTS[2].address;
  const uniswap = GOVERNANCE_CONTRACTS[3].address;
  const pairKey = (left: Address, right: Address) => keccak256(encodeAbiParameters([{type:"address"},{type:"address"}],[left,right]));
  const [usdtAsset,xethAsset,usdtFeed,xethFeed,sequencer,grace,uniInfo,aaveInfo,forwardFee,reverseFee,pairRole,deployerVault] = await Promise.all([
    publicClient.readContract({address:assetRegistry,abi:assetAbi,functionName:"getAssetConfig",args:[USDT]}), publicClient.readContract({address:assetRegistry,abi:assetAbi,functionName:"getAssetConfig",args:[XETH]}),
    publicClient.readContract({address:valuation,abi:valuationAbi,functionName:"feedConfig",args:[USDT]}), publicClient.readContract({address:valuation,abi:valuationAbi,functionName:"feedConfig",args:[XETH]}),
    publicClient.readContract({address:valuation,abi:valuationAbi,functionName:"sequencerUptimeFeed"}), publicClient.readContract({address:valuation,abi:valuationAbi,functionName:"sequencerGracePeriod"}),
    publicClient.readContract({address:protocols,abi:protocolAbi,functionName:"adapterInfo",args:[uniswap]}), publicClient.readContract({address:protocols,abi:protocolAbi,functionName:"adapterInfo",args:[AAVE_ADAPTER]}),
    publicClient.readContract({address:uniswap,abi:uniswapAbi,functionName:"pairFee",args:[pairKey(XETH,USDT)]}), publicClient.readContract({address:uniswap,abi:uniswapAbi,functionName:"pairFee",args:[pairKey(USDT,XETH)]}),
    publicClient.readContract({address:uniswap,abi:uniswapAbi,functionName:"PAIR_ADMIN_ROLE"}), publicClient.readContract({address:FACTORY,abi:factoryAbi,functionName:"managedVaultOf",args:[PRODUCTION_ADMIN]}),
  ]);
  if (!usdtAsset.supported || usdtAsset.baselineRiskTier !== 0 || !xethAsset.supported || xethAsset.baselineRiskTier !== 2) failures.push("AssetRegistry configuration changed.");
  if (getAddress(usdtFeed[0]) !== getAddress("0xb928a0678352005a2e51F614efD0b54C9830dB80") || usdtFeed[2] !== 90000 || !usdtFeed[3] || getAddress(xethFeed[0]) !== getAddress("0x8b85b50535551F8E8cDAF78dA235b5Cf1005907b") || xethFeed[2] !== 90000 || !xethFeed[3] || getAddress(sequencer) !== SEQUENCER || grace !== 3600) failures.push("Valuation or sequencer configuration changed.");
  if (uniInfo[0] !== keccak256(toBytes("uniswap-v3-direct")) || uniInfo[1] !== keccak256(toBytes("v1")) || !uniInfo[2] || aaveInfo[0] !== keccak256(toBytes("aave-v3-yield")) || aaveInfo[1] !== keccak256(toBytes("v1")) || !aaveInfo[2]) failures.push("ProtocolAdapterRegistry entries changed.");
  const [deployerPairAdmin,productionPairAdmin] = await Promise.all([publicClient.readContract({address:uniswap,abi:uniswapAbi,functionName:"hasRole",args:[pairRole,DEPLOYER_ADMIN]}),publicClient.readContract({address:uniswap,abi:uniswapAbi,functionName:"hasRole",args:[pairRole,PRODUCTION_ADMIN]})]);
  if (forwardFee !== 500 || reverseFee !== 0 || deployerPairAdmin || productionPairAdmin) failures.push("Uniswap route or revoked pair-configurator state changed.");
  if (getAddress(deployerVault) !== zeroAddress) failures.push("A production-admin Vault was unexpectedly created; executor/Adaptive state cannot remain absent.");
  return { ok: failures.length === 0, failures, contracts };
}
