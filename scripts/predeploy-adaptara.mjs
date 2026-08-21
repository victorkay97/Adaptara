import fs from "node:fs";
import path from "node:path";
import { createPublicClient, defineChain, getAddress, http } from "viem";

const localEnv = path.join(process.cwd(), ".env.local");
if (fs.existsSync(localEnv)) for (const line of fs.readFileSync(localEnv, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const file = process.env.ADAPTARA_DEPLOY_CONFIG || path.join(process.cwd(), "config/xlayer-mainnet.template.json");
const mode = process.env.ADAPTARA_PREDEPLOY_MODE || "pre-broadcast";
const reasons = []; const verified = [];
let config;
try { config = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { reasons.push(`config unreadable: ${error.message}`); }
if (config) {
  if (config.chainId !== 196) reasons.push("chainId must be 196");
  const deploymentOutputs = new Set(["config.assetRegistry", "config.valuationProvider", "config.protocolAdapterRegistry", "config.uniswapAdapter", "config.aaveAdapter", "config.managedVaultFactory"]);
  const walk = (value, key = "config") => {
    if (mode === "pre-broadcast" && deploymentOutputs.has(key)) return;
    if (key === "config.initialAdmin" && process.env.ADAPTARA_PRODUCTION_ADMIN) return;
    if (typeof value === "string" && /REQUIRED|UNVERIFIED|PLACEHOLDER/.test(value)) reasons.push(`${key} is unresolved`);
    else if (value && typeof value === "object") Object.entries(value).forEach(([child, item]) => walk(item, `${key}.${child}`));
  };
  walk(config);
  if (!new Set(["pre-broadcast", "post-deploy"]).has(mode)) reasons.push("CONFIG_UNRESOLVED: invalid predeploy mode");
  const admin = process.env.ADAPTARA_PRODUCTION_ADMIN;
  if (!admin || !/^0x[0-9a-fA-F]{40}$/.test(admin) || /^0x0{40}$/i.test(admin)) reasons.push("CONFIG_UNRESOLVED: production admin missing or invalid");
  if (!fs.existsSync(path.join(process.cwd(), "contracts/script/DeployXLayerMainnet.s.sol"))) reasons.push("CONFIG_UNRESOLVED: deployment script missing");
  if (!fs.existsSync(path.join(process.cwd(), "contracts/test/Phase13G2FreshDeploymentFork.t.sol"))) reasons.push("CONFIG_UNRESOLVED: fresh deployment proof missing");
  if (!fs.existsSync(path.join(process.cwd(), "config/deployments/xlayer-mainnet-gas.json"))) reasons.push("CONFIG_UNRESOLVED: deployment gas artifact missing");
  const candidates = [process.env[config.rpcEnv], "https://rpc.xlayer.tech"].filter((value, index, all) => value && all.indexOf(value) === index);
  if (!candidates.length) reasons.push(`RPC_UNAVAILABLE: ${config.rpcEnv} is missing`);
  else {
    let client; let sawWrongChain = false;
    for (const rpc of candidates) try {
      const candidate = createPublicClient({ chain: defineChain({ id: 196, name: "X Layer", nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } }), transport: http(rpc, { timeout: 12_000 }) });
      if (await candidate.getChainId() !== 196) { sawWrongChain = true; continue; }
      client = candidate; break;
    } catch {}
    if (!client) reasons.push(sawWrongChain ? "WRONG_CHAIN: no endpoint returned chain 196" : "RPC_UNAVAILABLE: all chain-196 endpoints failed");
    else {
    try {
      verified.push("chain 196 RPC");
      for (const [name, address] of Object.entries(config.external ?? {})) {
        const code = await client.getCode({ address: getAddress(address) });
        if (!code || code === "0x") reasons.push(`EXTERNAL_CONTRACT_MISSING: ${name}`); else verified.push(`${name} code`);
      }
      const sequencer = getAddress("0x45c2b8C204568A03Dc7A2E32B71D67Fe97F908A9");
      const abi = [{ type: "function", name: "latestRoundData", stateMutability: "view", inputs: [], outputs: [{ type: "uint80" }, { type: "int256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint80" }] }];
      const round = await client.readContract({ address: sequencer, abi, functionName: "latestRoundData" });
      if (round[0] === 0n || round[1] !== 0n || round[2] === 0n || round[4] < round[0]) reasons.push("PROTOCOL_STATE_BLOCKED: sequencer feed is unsafe"); else verified.push("sequencer up");
      for (const asset of config.assets ?? []) {
        const code = await client.getCode({ address: getAddress(asset.feed) });
        if (!code || code === "0x") reasons.push(`EXTERNAL_CONTRACT_MISSING: ${asset.symbol} feed`); else verified.push(`${asset.symbol} feed code`);
      }
      if (admin) {
        const known = new Set([...(Object.values(config.external ?? {})), ...(config.assets ?? []).flatMap((asset) => [asset.address, asset.feed])].map((address) => address.toLowerCase()));
        if (known.has(admin.toLowerCase())) reasons.push("CONFIG_UNRESOLVED: production admin collides with infrastructure");
        else {
          const code = await client.getCode({ address: getAddress(admin) });
          if (code && code !== "0x") reasons.push("CONFIG_UNRESOLVED: contract admin requires explicit multisig classification"); else verified.push("production admin valid EOA");
        }
      }
      if (mode === "post-deploy") for (const key of deploymentOutputs) {
        const field = key.slice("config.".length);
        const address = config[field];
        if (!address || /REQUIRED/.test(address)) continue;
        const code = await client.getCode({ address: getAddress(address) });
        if (!code || code === "0x") reasons.push(`EXTERNAL_CONTRACT_MISSING: ${field}`);
      }
    } catch (error) { reasons.push(`PROTOCOL_STATE_BLOCKED: ${error.shortMessage ?? error.message}`); }
    }
  }
  if (config.assets?.some((asset) => !asset.liveManagement)) reasons.push("CONFIG_UNRESOLVED: one or more assets are not approved for live management");
  verified.push(`CORE_DEPLOYMENT_READY=${reasons.filter((reason) => !reason.startsWith("PROTOCOL_STATE_BLOCKED")).length === 0}`);
  verified.push(`AAVE_NEW_SUPPLY_AVAILABLE=${Boolean(config.capabilities?.aaveNewSupplyEnabled)}`);
  verified.push(`ADAPTIVE_EXECUTOR_READY=${Boolean(config.capabilities?.adaptiveExecutorEnabled)}`);
}
console.log(reasons.length ? "BLOCKED" : mode === "pre-broadcast" ? "READY_FOR_HUMAN_MAINNET_DEPLOYMENT_AUTHORIZATION" : "POST_DEPLOYMENT_VERIFIED");
console.log(`- mode: ${mode}`);
if (mode === "pre-broadcast") console.log("- Adaptara deployed addresses: PENDING - expected before broadcast");
verified.forEach((item) => console.log(`- verified: ${item}`));
reasons.forEach((reason) => console.log(`- ${reason}`));
process.exitCode = reasons.length ? 1 : 0;
