"use client";

import { formatEther, type Address } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { xLayerTestnet } from "@/lib/chain/xlayer";
import { shortenAddress } from "@/lib/wallet/format";

export function WalletControl() {
  const { address, chain, isConnected } = useAccount();
  const { connectors, connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const onXLayer = chain?.id === xLayerTestnet.id;
  const { data: balance } = useBalance({ address, chainId: xLayerTestnet.id, query: { enabled: isConnected && onXLayer } });

  if (!isConnected || !address) return <div className="flex flex-col items-end gap-2"><div className="flex flex-wrap justify-end gap-2">{connectors.map((connector) => <button key={connector.uid} type="button" disabled={isPending} onClick={() => connect({ connector })} className="rounded-full bg-[#173d2d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#22583f] disabled:opacity-60">{isPending ? "Connecting…" : connector.name === "Injected" ? "Connect Wallet" : connector.name}</button>)}</div>{connectError ? <p className="max-w-60 text-right text-xs text-red-700" role="alert">{connectError.message}</p> : null}</div>;

  return <ConnectedWalletControl address={address} onXLayer={onXLayer} balanceLabel={onXLayer && balance ? `${Number(formatEther(balance.value)).toFixed(4)} OKB` : undefined} isSwitching={isSwitching} onSwitch={() => switchChain({ chainId: xLayerTestnet.id })} onDisconnect={() => disconnect()} />;
}

export function ConnectedWalletControl({ address, onXLayer, balanceLabel, isSwitching, onSwitch, onDisconnect }: { address: Address; onXLayer: boolean; balanceLabel?: string; isSwitching: boolean; onSwitch: () => void; onDisconnect: () => void }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">
    {!onXLayer ? <button type="button" disabled={isSwitching} onClick={onSwitch} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{isSwitching ? "Switching…" : "Switch to X Layer"}</button> : null}
    <button type="button" onClick={onDisconnect} title="Disconnect wallet" className="rounded-full border border-[#cbd6ce] bg-white/70 px-4 py-2 text-left text-sm hover:bg-white"><span className="block font-semibold">{shortenAddress(address)}</span><span className="block text-xs text-[#657269]">{onXLayer ? xLayerTestnet.name : "Wrong network"}{onXLayer && balanceLabel ? ` · ${balanceLabel}` : ""}</span></button>
  </div>;
}
