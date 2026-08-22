import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { APPKIT_NAMESPACE, ConnectedWalletControl, WalletSelector, appKitWalletForChoice, clearAddressScopedQueries, connectedWalletNetworkSummary, friendlyWalletError } from "./wallet-control";
import { createAppKitMetadata } from "@/lib/wallet/metadata";

const address = "0x7bc800000000000000000000000000000000234E" as const;
const renderConnected = (onXLayer: boolean) => renderToStaticMarkup(<ConnectedWalletControl address={address} onXLayer={onXLayer} balanceLabel="0.0000 OKB" isSwitching={false} onSwitch={vi.fn()} onDisconnect={vi.fn()} />);

describe("connected wallet network presentation", () => {
  it("shows a compact connected address trigger without undefined copy", () => { const html = renderConnected(true); expect(html).toContain("0x7bc8"); expect(html).toContain('aria-haspopup="menu"'); expect(html).not.toMatch(/undefined|null/); });
  it("keeps the wrong-network recovery outside the account menu", () => { const html = renderConnected(false); expect(html).toContain("Switch to X Layer"); expect(html).not.toMatch(/undefined|null|Chain undefined|0\.0000 OKB/); });
  it("keeps the explicit Switch to X Layer action without operational additions", () => { const html = renderConnected(false); expect(html).toContain("Switch to X Layer"); expect(html).not.toMatch(/Run Sentinel|Analyze with MARA|Generate Adaptation|Run Compounding|sendTransaction|writeContract/); });
  it("uses one authoritative chain label in the account summary", () => {
    expect(connectedWalletNetworkSummary({ networkLabel: "X Layer Mainnet", onXLayer: true, readOnly: true, balanceLabel: "0.0100 OKB" })).toBe("X Layer Mainnet · read only · 0.0100 OKB");
    expect(connectedWalletNetworkSummary({ networkLabel: "X Layer Testnet", onXLayer: false, readOnly: true, balanceLabel: "99 OKB" })).toBe("X Layer Testnet");
  });
});

describe("local network-control isolation", () => {
  it("can suppress the shared active-chain switch without changing its default", () => {
    expect(renderConnected(false)).toContain("Switch to X Layer");
    const html = renderToStaticMarkup(<ConnectedWalletControl address={address} onXLayer={false} showNetworkSwitch={false} isSwitching={false} onSwitch={vi.fn()} onDisconnect={vi.fn()} />);
    expect(html).not.toContain("Switch to X Layer");
  });
});

describe("wallet selector", () => {
  it("renders one accessible dialog over the existing connector choices", () => {
    const html = renderToStaticMarkup(<WalletSelector environment={{ mobile: true, providers: { okx: false, metamask: false } }} pending={false} onClose={vi.fn()} onSelect={vi.fn()} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Connect a wallet");
    expect(html).toContain("Coinbase Wallet");
    expect(html).toContain("MetaMask");
    expect(html).toContain("OKX Wallet");
    expect(html).toContain("Other wallets");
    expect(html).toContain("6.88.0 or later");
    expect(html).not.toContain("Unavailable in this browser");
    expect(html).not.toMatch(/private key|signTransaction|sendTransaction|broadcast/i);
  });
  it("maps every named row to the official AppKit EVM wallet action", () => {
    expect(APPKIT_NAMESPACE).toBe("eip155");
    expect(() => appKitWalletForChoice("okx")).toThrow(/capability/);
    expect(appKitWalletForChoice("metamask")).toBe("metamask");
    expect(appKitWalletForChoice("coinbase")).toBe("coinbase");
    expect(appKitWalletForChoice("other")).toBe("walletConnect");
  });
  it("derives complete wallet metadata from the exact runtime HTTPS origin", () => {
    expect(createAppKitMetadata("https://adaptara-preview.vercel.app")).toEqual({
      name: "Adaptara",
      description: "Policy-bounded portfolio intelligence and owner-approved management on X Layer.",
      url: "https://adaptara-preview.vercel.app",
      icons: ["https://adaptara-preview.vercel.app/brand/logo.png"],
    });
  });
  it("never exposes raw provider or package errors", () => {
    expect(friendlyWalletError({ name: "ProviderNotFoundError", message: "Provider not found. Version: @wagmi/core@2.22.1" })).toContain("Other wallets");
    expect(friendlyWalletError({ message: "User rejected request" })).toBe("Connection cancelled.");
    expect(friendlyWalletError({ code: 500 })).toMatch(/X Layer/);
    expect(friendlyWalletError({ code: 600 })).toMatch(/Update OKX Wallet/);
    expect(friendlyWalletError({})).not.toMatch(/undefined|@wagmi|ProviderNotFound/);
  });
  it("removes only the disconnected address scope before wallet switching", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["portfolio", "wallet", address], "A");
    queryClient.setQueryData(["portfolio", "wallet", "0x0000000000000000000000000000000000000002"], "B");
    clearAddressScopedQueries(queryClient, address);
    expect(queryClient.getQueryData(["portfolio", "wallet", address])).toBeUndefined();
    expect(queryClient.getQueryData(["portfolio", "wallet", "0x0000000000000000000000000000000000000002"])).toBe("B");
  });
});
