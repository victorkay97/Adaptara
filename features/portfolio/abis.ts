import { parseAbi } from "viem";

export const erc20ReadAbi = parseAbi(["function balanceOf(address account) view returns (uint256)", "function decimals() view returns (uint8)"]);
export const vaultFactoryReadAbi = parseAbi(["function managedVaultOf(address owner) view returns (address)"]);
export const assetRegistryReadAbi = parseAbi(["function isSupported(address asset) view returns (bool)", "function getAssetConfig(address asset) view returns ((bool supported, uint8 baselineRiskTier))"]);
