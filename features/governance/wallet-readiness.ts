import { createWalletClient, custom, getAddress, numberToHex, type Address, type EIP1193Provider, type WalletClient } from "viem";
import type { Connector } from "wagmi";
import { xLayerMainnet, XLAYER_MAINNET_CHAIN_ID } from "@/lib/chain/xlayer";

export type ObservableProvider = EIP1193Provider & { on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
export interface ConnectorReadiness { chainId: number; accounts: readonly Address[]; provider: ObservableProvider }
export function walletReadinessReason(input:{address?:Address;chainId?:number;clientAvailable:boolean;rpcHealthy:boolean;switchFailed?:boolean}):string|undefined{if(input.switchFailed)return"Wallet network switch failed.";if(!input.address||getAddress(input.address)!==getAddress("0xf4ac7c9ad5a809240291a4f2e4cbe9189b14cdf4"))return"Connected wallet is not the production admin.";if(input.chainId!==196)return"Connected wallet is not on X Layer Mainnet (chain 196).";if(!input.rpcHealthy)return"X Layer Mainnet read-only RPC is unavailable.";if(!input.clientAvailable)return"Connector-backed wallet client is unavailable.";return;}

export class GovernanceWalletSwitchError extends Error {
  constructor(public readonly method: "wallet_switchEthereumChain" | "wallet_addEthereumChain", public readonly technicalMessage: string) {
    super("Unable to switch the connected wallet to X Layer Mainnet."); this.name = "GovernanceWalletSwitchError";
  }
}

async function connectorProvider(connector: Connector): Promise<ObservableProvider> {
  const provider = await connector.getProvider();
  if (!provider || typeof (provider as EIP1193Provider).request !== "function") throw new Error("The connected wallet provider is unavailable.");
  return provider as ObservableProvider;
}

export async function readConnectorReadiness(connector: Connector): Promise<ConnectorReadiness> {
  const provider = await connectorProvider(connector);
  const [chainHex, rawAccounts] = await Promise.all([provider.request({method:"eth_chainId"}),provider.request({method:"eth_accounts"})]);
  const chainId = typeof chainHex === "string" ? Number.parseInt(chainHex,16) : Number(chainHex);
  if (!Number.isSafeInteger(chainId)) throw new Error("The connected wallet returned an invalid chain ID.");
  const accounts = Array.isArray(rawAccounts) ? rawAccounts.flatMap((account)=>{try{return typeof account==="string"?[getAddress(account)]:[];}catch{return [];}}) : [];
  return {chainId,accounts,provider};
}

function technicalMessage(error:unknown){if(error instanceof Error)return `${error.name}: ${error.message}`;if(typeof error==="object"&&error&&"message" in error)return String(error.message);return String(error);}
function errorCode(error:unknown):number|undefined{if(typeof error!=="object"||!error)return;const direct="code" in error?Number(error.code):undefined;if(Number.isFinite(direct))return direct;if("data" in error&&typeof error.data==="object"&&error.data&&"originalError" in error.data){const original=error.data.originalError;if(typeof original==="object"&&original&&"code" in original)return Number(original.code);}return;}

export async function switchConnectorToXLayerMainnet(connector:Connector):Promise<ConnectorReadiness>{
  const provider=await connectorProvider(connector);
  try{await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:numberToHex(XLAYER_MAINNET_CHAIN_ID)}]});}
  catch(error){if(errorCode(error)!==4902)throw new GovernanceWalletSwitchError("wallet_switchEthereumChain",technicalMessage(error));try{await provider.request({method:"wallet_addEthereumChain",params:[{chainId:numberToHex(196),chainName:xLayerMainnet.name,nativeCurrency:xLayerMainnet.nativeCurrency,rpcUrls:["https://rpc.xlayer.tech","https://xlayerrpc.okx.com"],blockExplorerUrls:[xLayerMainnet.blockExplorers?.default.url??"https://www.oklink.com/xlayer"]}]});}catch(addError){throw new GovernanceWalletSwitchError("wallet_addEthereumChain",technicalMessage(addError));}}
  const readiness=await readConnectorReadiness(connector);if(readiness.chainId!==196)throw new GovernanceWalletSwitchError("wallet_switchEthereumChain",`Wallet remained on chain ${readiness.chainId}.`);return readiness;
}

export async function createConnectorWalletClient(connector:Connector,account:Address):Promise<WalletClient>{const readiness=await readConnectorReadiness(connector);if(readiness.chainId!==196)throw new Error("The connected wallet is not on X Layer Mainnet (chain 196).");if(!readiness.accounts.some((item)=>item===getAddress(account)))throw new Error("The connector account does not match the connected production-admin account.");return createWalletClient({account,chain:xLayerMainnet,transport:custom(readiness.provider)});}
export function subscribeToConnectorChanges(provider:ObservableProvider,onChange:()=>void):()=>void{const listener=()=>onChange();provider.on?.("chainChanged",listener);provider.on?.("accountsChanged",listener);return()=>{provider.removeListener?.("chainChanged",listener);provider.removeListener?.("accountsChanged",listener);};}
