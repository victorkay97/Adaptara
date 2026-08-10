import { createPublicClient, getAddress, http, zeroAddress } from "viem";

const CHAIN_ID = 1952;
const OFFICIAL_USDT0 = getAddress("0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c");
const rpcUrl = process.env.XLAYER_TESTNET_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
const deployerValue = process.env.DEPLOYER_ADDRESS;

if (process.env.TEST_USDT0_ADDRESS && getAddress(process.env.TEST_USDT0_ADDRESS) !== OFFICIAL_USDT0) {
  throw new Error(`TEST_USDT0_ADDRESS must equal canonical X Layer testnet USD0 ${OFFICIAL_USDT0}.`);
}

if (!deployerValue) throw new Error("DEPLOYER_ADDRESS is required (public address only; no private key).");
const deployer = getAddress(deployerValue);
if (deployer === zeroAddress) throw new Error("DEPLOYER_ADDRESS must be nonzero.");

const client = createPublicClient({ transport: http(rpcUrl) });
const chainId = await client.getChainId();
if (chainId !== CHAIN_ID) throw new Error(`Wrong chain ${chainId}; expected ${CHAIN_ID}.`);

const [blockNumber, balance, usdt0Code, decimals] = await Promise.all([
  client.getBlockNumber(),
  client.getBalance({ address: deployer }),
  client.getCode({ address: OFFICIAL_USDT0 }),
  client.readContract({ address: OFFICIAL_USDT0, abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals" }),
]);
if (!usdt0Code || usdt0Code === "0x") throw new Error("Official test USD0 address has no bytecode.");
if (decimals !== 6) throw new Error(`Official test USD0 decimals are ${decimals}; expected 6.`);
if (balance === 0n) throw new Error("Deployer has zero test OKB. Fund it manually before Phase 12B.");

const deploymentKeys = ["ASSET_REGISTRY_ADDRESS", "ADAPTARA_FACTORY_ADDRESS", "STRSY_ADDRESS", "SXAU_ADDRESS", "SAAPLX_ADDRESS", "DEMO_VAULT_ADDRESS"];
const configured = deploymentKeys.flatMap((key) => process.env[key] ? [[key, getAddress(process.env[key])]] : []);
if (configured.some(([, address]) => address === OFFICIAL_USDT0)) throw new Error("An Adaptara deployment address reuses official test USD0.");
const unique = new Set(configured.map(([, address]) => address));
if (unique.size !== configured.length) throw new Error("Two deployment fields reuse the same address.");
for (const [key, address] of configured) {
  const code = await client.getCode({ address });
  if (!code || code === "0x") throw new Error(`${key} has no bytecode on chain 1952.`);
  if (["STRSY_ADDRESS", "SXAU_ADDRESS", "SAAPLX_ADDRESS"].includes(key)) {
    const tokenDecimals = await client.readContract({ address, abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals" });
    if (tokenDecimals !== 18) throw new Error(`${key} decimals are ${tokenDecimals}; expected 18.`);
  }
}

const registryValue = process.env.ASSET_REGISTRY_ADDRESS;
const sandboxValues = [process.env.STRSY_ADDRESS, process.env.SXAU_ADDRESS, process.env.SAAPLX_ADDRESS];
if (registryValue && sandboxValues.every(Boolean)) {
  const registryAddress = getAddress(registryValue);
  const registryAbi = [{
    type: "function",
    name: "getAssetConfig",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{
      name: "",
      type: "tuple",
      components: [{ name: "supported", type: "bool" }, { name: "baselineRiskTier", type: "uint8" }],
    }],
  }];
  const identityAssets = [OFFICIAL_USDT0, ...sandboxValues.map((value) => getAddress(value))];
  const expectedTiers = [0, 1, 2, 3];
  for (let index = 0; index < identityAssets.length; index += 1) {
    const config = await client.readContract({ address: registryAddress, abi: registryAbi, functionName: "getAssetConfig", args: [identityAssets[index]] });
    const supported = config.supported ?? config[0];
    const baselineRiskTier = Number(config.baselineRiskTier ?? config[1]);
    if (!supported) throw new Error(`Registry identity asset ${identityAssets[index]} is disabled.`);
    if (baselineRiskTier !== expectedTiers[index]) throw new Error(`Registry identity tier mismatch at asset slot ${index}.`);
  }
}

console.log(JSON.stringify({ rpcResponsive: true, chainId, blockNumber: blockNumber.toString(), deployer, deployerTestOkbWei: balance.toString(), officialUsdt0: OFFICIAL_USDT0, officialUsdt0Decimals: decimals, checkedConfiguredAddresses: configured.map(([key, address]) => ({ key, address })) }, null, 2));
