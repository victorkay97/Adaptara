"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAppKitWallet, type Wallet } from "@reown/appkit-wallet-button/react";
import { formatEther, type Address } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { activeXLayer, isLiveReadOnlyMode } from "@/lib/chain/xlayer";
import { shortenAddress } from "@/lib/wallet/format";
import { browserWalletEnvironment, resolveWalletConnection, type WalletChoice } from "@/lib/wallet/resolver";

export const APPKIT_NAMESPACE = "eip155" as const;
export function appKitWalletForChoice(wallet: WalletChoice): Wallet {
  if (wallet === "okx") throw new Error("OKX transport must be selected by capability.");
  return wallet === "other" ? "walletConnect" : wallet;
}

export function WalletControl({ variant = "default", onConnectRequested, onConnected, showNetworkSwitch = true }: { variant?: "default" | "primary"; onConnectRequested?: () => void; onConnected?: () => void; showNetworkSwitch?: boolean }) {
  const { address, chain, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectAsync, connectors } = useConnect();
  const queryClient = useQueryClient();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const onXLayer = chain?.id === activeXLayer.id;
  const { data: balance } = useBalance({ address, chainId: activeXLayer.id, query: { enabled: isConnected && onXLayer } });
  const wasConnected = useRef(isConnected);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const [environment, setEnvironment] = useState(() => ({ mobile: false, providers: { okx: false, metamask: false } }));
  const { connect: connectNamedWallet, error: appKitError, isPending, isReady } = useAppKitWallet({
    namespace: APPKIT_NAMESPACE,
    onSuccess: () => setSelectorOpen(false),
    onError: (error) => setLocalError(friendlyWalletError(error)),
  });
  useEffect(() => {
    if (!wasConnected.current && isConnected) onConnected?.();
    wasConnected.current = isConnected;
  }, [isConnected, onConnected]);

  if (!isConnected || !address) return <div className="wallet-connect"><button ref={triggerRef} type="button" className={variant === "primary" ? "button button-primary" : "wallet-button"} onClick={() => { setLocalError(undefined); setEnvironment(browserWalletEnvironment()); setSelectorOpen(true); }}>Connect Wallet</button>{selectorOpen ? <WalletSelector environment={environment} pending={isPending} error={localError ?? friendlyWalletError(appKitError)} onClose={() => { setSelectorOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }} onSelect={(wallet) => {
    setLocalError(undefined);
    if (!isReady) { setLocalError("Wallet connections are still loading. Please try again."); return; }
    onConnectRequested?.();
    const resolution = resolveWalletConnection({ wallet, connectors, ...environment });
    const connection = wallet === "okx" && resolution.connector
      ? connectAsync({ connector: resolution.connector })
      : wallet === "okx"
        ? Promise.reject(new Error("OKX Wallet is unavailable in this browser."))
        : connectNamedWallet(appKitWalletForChoice(wallet));
    void connection.then(() => setSelectorOpen(false)).catch((error: unknown) => setLocalError(friendlyWalletError(error instanceof Error ? error : null)));
  }} /> : appKitError ? <p className="wallet-error" role="alert">{friendlyWalletError(appKitError)}</p> : null}</div>;

  return <ConnectedWalletControl address={address} onXLayer={onXLayer} readOnly={isLiveReadOnlyMode} showNetworkSwitch={showNetworkSwitch} balanceLabel={onXLayer && balance ? `${Number(formatEther(balance.value)).toFixed(4)} OKB` : undefined} isSwitching={isSwitching} onSwitch={() => switchChain({ chainId: activeXLayer.id })} onDisconnect={() => { clearAddressScopedQueries(queryClient, address); disconnect(); }} />;
}

export function WalletSelector({ environment, pending, error, onClose, onSelect }: { environment: ReturnType<typeof browserWalletEnvironment>; pending: boolean; error?: string; onClose: () => void; onSelect: (wallet: WalletChoice) => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  const options: { wallet: WalletChoice; label: string; detail: string }[] = [
    { wallet: "okx", label: "OKX Wallet", detail: environment.providers.okx ? "Open with OKX Wallet" : "Open in OKX Wallet" },
    { wallet: "metamask", label: "MetaMask", detail: "Open with MetaMask" },
    { wallet: "coinbase", label: "Coinbase Wallet", detail: "Open with Coinbase Wallet" },
    { wallet: "other", label: "Other wallets", detail: "Connect another compatible wallet" },
  ];
  return <div className="wallet-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={panelRef} className="wallet-modal__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}><header><div><h2 id={titleId}>Connect a wallet</h2><p>Choose the wallet you want to use.</p></div><button type="button" className="wallet-modal__close" aria-label="Close wallet selector" onClick={onClose}>×</button></header><div className="wallet-modal__options">{options.map((option) => <button key={option.wallet} type="button" disabled={pending} aria-label={`Connect with ${option.label}`} onClick={() => onSelect(option.wallet)}><span className="wallet-modal__icon" aria-hidden="true" /><strong>{option.label}<small>{option.detail}</small></strong><span aria-hidden="true">›</span></button>)}</div>{error ? <p className="wallet-error" role="alert">{error}</p> : null}<footer>Mobile connections may open your wallet app. OKX Connect requires OKX Wallet 6.88.0 or later. Connecting never requests a transaction signature.</footer></div></div>;
}

export function friendlyWalletError(error?: { name?: string; message?: string; code?: number } | null) {
  if (!error) return undefined;
  const value = `${error.name ?? ""} ${error.message ?? ""}`;
  const code = "code" in error ? Number(error.code) : undefined;
  if (code === 300) return "Connection cancelled.";
  if (code === 500) return "OKX Wallet does not support the required X Layer connection.";
  if (code === 600) return "This OKX Wallet version cannot complete the connection. Update OKX Wallet and try again.";
  if (code === 700 || code === 12) return "OKX Wallet could not complete the connection. Check the wallet and try again.";
  if (/provider.*not found|ProviderNotFound/i.test(value)) return "We couldn't open this wallet. Try Other wallets instead.";
  if (/rejected|denied|cancel/i.test(value)) return "Connection cancelled.";
  if (/timeout/i.test(value)) return "The wallet did not respond in time. Try again or choose another wallet.";
  return "Wallet connection could not be completed. Check the wallet and try again.";
}

export function clearAddressScopedQueries(queryClient: QueryClient, address: Address) {
  const needle = address.toLowerCase();
  queryClient.removeQueries({ predicate: (query) => query.queryKey.some((part) => typeof part === "string" && part.toLowerCase() === needle) });
}

export function ConnectedWalletControl({ address, onXLayer, readOnly = false, showNetworkSwitch = true, balanceLabel, isSwitching, onSwitch, onDisconnect }: { address: Address; onXLayer: boolean; readOnly?: boolean; showNetworkSwitch?: boolean; balanceLabel?: string; isSwitching: boolean; onSwitch: () => void; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  const explorerUrl = `${activeXLayer.blockExplorers?.default.url ?? "https://www.oklink.com/x-layer"}/address/${address}`;
  return <div className="wallet-account-group">
    {showNetworkSwitch && !readOnly && !onXLayer ? <button type="button" disabled={isSwitching} onClick={onSwitch} className="wallet-button wallet-button--warning">{isSwitching ? "Switching…" : "Switch to X Layer"}</button> : null}
    <div className="account-menu" ref={menuRef}><button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="wallet-account"><i aria-hidden="true" /><span>{shortenAddress(address)}</span></button>{open ? <div className="account-dropdown" role="menu"><header><i aria-hidden="true" /><div><span>Connected</span><strong>{shortenAddress(address, 6)}</strong><small>{readOnly ? "X Layer Mainnet · read only" : onXLayer ? activeXLayer.name : "Wrong network"}{!readOnly && onXLayer && balanceLabel ? ` · ${balanceLabel}` : ""}</small></div></header><button role="menuitem" onClick={() => void navigator.clipboard.writeText(address)}>Copy address</button><a role="menuitem" href={explorerUrl} target="_blank" rel="noreferrer">View on X Layer Explorer</a><button role="menuitem" className="account-dropdown__disconnect" onClick={onDisconnect}>Disconnect</button></div> : null}</div>
  </div>;
}
