import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConnectedWalletControl } from "./wallet-control";

const address = "0x7bc800000000000000000000000000000000234E" as const;
const renderConnected = (onXLayer: boolean) => renderToStaticMarkup(<ConnectedWalletControl address={address} onXLayer={onXLayer} balanceLabel="0.0000 OKB" isSwitching={false} onSwitch={vi.fn()} onDisconnect={vi.fn()} />);

describe("connected wallet network presentation", () => {
  it("shows the accepted X Layer label and balance without undefined copy", () => { const html = renderConnected(true); expect(html).toContain("X Layer Testnet · 0.0000 OKB"); expect(html).not.toMatch(/undefined|null/); });
  it("uses a truthful wrong-network fallback without an X Layer balance", () => { const html = renderConnected(false); expect(html).toContain("Wrong network"); expect(html).not.toMatch(/undefined|null|Chain undefined|X Layer Testnet|0\.0000 OKB/); });
  it("keeps the explicit Switch to X Layer action without operational additions", () => { const html = renderConnected(false); expect(html).toContain("Switch to X Layer"); expect(html).not.toMatch(/Run Sentinel|Analyze with MARA|Generate Adaptation|Run Compounding|sendTransaction|writeContract/); });
});
