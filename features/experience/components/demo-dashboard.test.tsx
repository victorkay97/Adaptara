import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DemoPage from "@/app/demo/page";
import { DEMO_ACTIVITY, DEMO_METRICS, DEMO_VAULTS } from "../demo-fixtures";
import { DemoDashboard } from "./demo-dashboard";
import { ApplicationHeader } from "./application-header";
import { LandingPage } from "./landing-page";

describe("production Demo Mode", () => {
  it("supports direct signed-out entry with persistent simulation labeling", async () => {
    const html = renderToStaticMarkup(await DemoPage({}));
    expect(html).toContain("Demo Mode");
    expect(html).toContain("Simulated environment");
    expect(html).toContain("No real funds");
    expect(html).not.toMatch(/Connect Wallet|X Layer Mainnet|wallet_switchEthereumChain/);
  });

  it("keeps all four Demo navigation items visible with the active item attached to its label", async () => {
    for (const [query, label] of [[undefined, "Home"], ["home", "Home"], ["portfolio", "Portfolio"], ["vaults", "Vaults"], ["activity", "Activity"]] as const) {
      const html = renderToStaticMarkup(await DemoPage({ searchParams: Promise.resolve(query ? { view: query } : {}) }));
      for (const item of ["Home", "Portfolio", "Vaults", "Activity"]) expect(html).toContain(`>${item}<`);
      expect(html).toMatch(new RegExp(`aria-current="page"[^>]*>${label}</a>`));
    }
  });

  it("uses the shared application header presentation contract", () => {
    const header = renderToStaticMarkup(<ApplicationHeader navigation={<a aria-current="page">Home</a>} context={<span>Live</span>} />);
    expect(header).toContain("final-app-header__inner");
    expect(header).toContain("Application navigation");
    expect(header).toContain("Adaptara");
  });

  it("renders the approved Home values and blocked Constitution scenario", () => {
    const html = renderToStaticMarkup(<DemoDashboard />);
    for (const [, value] of DEMO_METRICS) expect(html).toContain(value);
    expect(html).toContain("63%");
    expect(html).toContain("BLOCKED");
    expect(html).toContain("Nothing moved");
  });

  it("defines three independently described simulated Vaults", () => {
    expect(DEMO_VAULTS.map((vault) => vault.name)).toEqual(["Growth Vault", "Reserve Vault", "Opportunity Vault"]);
    expect(new Set(DEMO_VAULTS.map((vault) => vault.constitution)).size).toBe(3);
    expect(new Set(DEMO_VAULTS.map((vault) => vault.mara)).size).toBe(3);
  });

  it("uses simulation provenance for every Demo Activity entry", () => {
    expect(DEMO_ACTIVITY).toHaveLength(4);
    expect(DEMO_ACTIVITY.every((event) => event.provenance === "simulation")).toBe(true);
  });

  it("routes every public Demo CTA directly to /demo and offers a Live exit", () => {
    const landing = renderToStaticMarkup(<LandingPage />);
    const demo = renderToStaticMarkup(<DemoDashboard />);
    expect(landing.match(/href="\/demo"/g)).toHaveLength(4);
    expect(demo).toContain('href="/dashboard"');
    expect(demo).toContain("Switch to Live");
  });

  it("keeps Demo entry free of wallet, signing, and write dependencies", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "features/experience/components/demo-dashboard.tsx"), "utf8");
    expect(source).not.toMatch(/wagmi|WalletControl|useAccount|useConnect|writeContract|sendTransaction|switchChain|eth_sendTransaction/);
  });

  it("keeps Live dashboard isolated from Demo fixtures and fallback patterns", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "features/experience/components/dashboard-shell.tsx"), "utf8");
    expect(source).not.toMatch(/DEMO_(METRICS|HOLDINGS|VAULTS|ACTIVITY)|demo-fixtures/);
    expect(source).not.toMatch(/realData\s*\?\?|realVaults\.length\s*\?|demoData|demoVaults/);
  });

  it("renders the approved Portfolio hierarchy and custody boundary", () => {
    const html = renderToStaticMarkup(<DemoDashboard view="Portfolio" />);
    expect(html).toContain("Asset Allocation");
    expect(html).toContain("Risk Exposure");
    expect(html).toContain("Holdings");
    expect(html).toContain("Custody Split");
    expect(html).toContain("Where capital is managed");
  });

  it("renders independent Vault Constitutions without enabling creation", () => {
    const html = renderToStaticMarkup(<DemoDashboard view="Vaults" />);
    expect(html).toContain("3 / 16 Vaults");
    expect(html).toContain("Constitutions Overview");
    expect(html).toContain("No global Constitution controls all Vaults");
    expect(html).toContain("disabled");
  });

  it("renders simulation provenance and the blocked Activity detail", () => {
    const html = renderToStaticMarkup(<DemoDashboard view="Activity" />);
    expect(html).toContain("Simulation · Constitution");
    expect(html).toContain("Projected result");
    expect(html).toContain("BLOCKED");
    expect(html).toContain("No transaction was submitted");
  });
});
