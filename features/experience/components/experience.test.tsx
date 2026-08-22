import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DemoModeBadge, ProductState, TechnicalDisclosure } from "@/components/ui/product-primitives";
import { AdaptiveSystemIllustration } from "./adaptive-system-illustration";
import { DASHBOARD_DESTINATIONS, OrientationContent } from "./dashboard-shell";
import { DEMO_DESTINATION, LANDING_NAVIGATION, LIVE_DESTINATION, LandingPage, landingAnchor } from "./landing-page";
import { LiveUnavailableDashboard } from "./live-unavailable-dashboard";

describe("Phase 12E experience foundation", () => {
  it("defines the complete public navigation in the locked order", () => {
    expect(LANDING_NAVIGATION).toEqual(["How it works", "Vaults", "MARA", "Learn"]);
    expect(LANDING_NAVIGATION.map(landingAnchor)).toEqual(["#portfolio-intelligence", "#vaults", "#mara", "/docs"]);
  });

  it("keeps live entry separate from the non-transactional Demo explanation", () => {
    expect(LIVE_DESTINATION).toBe("/dashboard");
    expect(DEMO_DESTINATION).toBe("/demo");
  });

  it("renders the compact Live shell without leaking Demo fixture balances", () => {
    const html = renderToStaticMarkup(<LiveUnavailableDashboard destination="Home" connectionAction={<button>Connect Wallet</button>} />);
    expect(html).toContain("Overview");
    expect(html).toContain("Connect your wallet to view your X Layer portfolio");
    expect(html).toContain("Not evaluated");
    expect(html).toContain("No Vaults discovered");
    expect(html).toContain("No live activity yet");
    expect(html).toContain("Connect Wallet");
    expect(html).toContain("Your Vaults");
    expect(html).toContain("Recent Activity");
    expect(html).not.toMatch(/\$25,000|\$10,500|\$14,500|Growth Vault|Reserve Vault|Opportunity Vault|MARA flagged/);
  });

  it("renders the approved single-narrative landing structure without wallet controls", () => {
    const html = renderToStaticMarkup(<LandingPage />);
    expect(html).toContain("Policy-bound intelligence");
    expect(html).toContain("See the whole picture");
    expect(html).toContain("Separate Vaults");
    expect(html).toContain("Intelligence that");
    expect(html).toContain("AI can advise");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/demo"');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).not.toMatch(/Connect Wallet|writeContract|useAccount/);
  });

  it("renders all three product-native landing stories without design placeholders", () => {
    const html = renderToStaticMarkup(<LandingPage />);
    expect(html).toContain("Portfolio Intelligence preview");
    expect(html).toContain("Three independently governed Vaults");
    expect(html).toContain("MARA interpretation");
    expect(html).toContain("BLOCKED");
    expect(html).toContain("Nothing moved");
    expect(html).not.toContain("product visual placeholder");
    expect(html).not.toContain("Product visual in design");
  });

  it("keeps final landing states server-rendered while motion remains progressive and reduced-motion safe", () => {
    const html = renderToStaticMarkup(<LandingPage />);
    const motion = fs.readFileSync(path.join(process.cwd(), "features/experience/components/landing-motion.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(html).toContain("$25,000");
    expect(html).toContain("$14,500 remains outside Adaptara");
    expect(html).toContain("Projected xETH");
    expect(html).toContain("BLOCKED");
    expect(html).toContain("Nothing moved");
    expect(motion).toContain('!("IntersectionObserver" in window)');
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\[data-motion\][\s\S]*?opacity:1!important/);
  });

  it("uses semantic outline icons for trust cards and navigation affordances", () => {
    const html = renderToStaticMarkup(<LandingPage />);
    expect(html.match(/class="mingcute-icon"/g)?.length).toBeGreaterThanOrEqual(8);
    expect(html).toContain("Onchain rules");
    expect(html).toContain("Bounded execution");
    expect(html).toContain("Post-action checks");
    expect(html).toContain("User-controlled capital");
    expect(html).not.toMatch(/→|↗/);
  });

  it("keeps the approved landing footer dark and destination-safe", () => {
    const html = renderToStaticMarkup(<LandingPage />);
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(html).toContain("Privacy · Terms");
    expect(html).toContain("Research");
    expect(css).toMatch(/\.lp-footer\{[^}]*background:#151515/);
  });

  it("uses beginner-first destinations without a top-level Strategy page", () => {
    expect(DASHBOARD_DESTINATIONS).toEqual(["Home", "Portfolio", "Vaults", "Activity"]);
    expect(DASHBOARD_DESTINATIONS).not.toContain("Strategy");
    expect(DASHBOARD_DESTINATIONS).not.toContain("MARA");
    expect(DASHBOARD_DESTINATIONS).not.toContain("Safety");
  });

  it("keeps Demo Mode provenance explicit", () => {
    const html = renderToStaticMarkup(<DemoModeBadge />);
    expect(html).toContain("Demo mode");
    expect(html).toContain("non-live inputs");
  });

  it("renders a dismissible, non-transactional first-time orientation", () => {
    const onDismiss = vi.fn();
    const element = OrientationContent({ onDismiss });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Your intelligence workspace is ready");
    expect(html).toContain("Enter dashboard");
    expect(html).not.toMatch(/sign|transaction|scan|analyzing/i);
    const children = element.props.children.props.children as Array<{ props?: { onClick?: () => void; children?: unknown } }>;
    const button = children.find((child) => child?.props?.children === "Enter dashboard");
    button?.props?.onClick?.();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("uses accessible progressive disclosure and truthful explanatory illustration copy", () => {
    const disclosure = renderToStaticMarkup(<TechnicalDisclosure summary="Technical details"><code>executionAuthority: none</code></TechnicalDisclosure>);
    const illustration = renderToStaticMarkup(<AdaptiveSystemIllustration />);
    const state = renderToStaticMarkup(<ProductState title="Connect" detail="No signature or transaction." />);
    expect(disclosure).toContain("<details");
    expect(disclosure).toContain("executionAuthority: none");
    expect(illustration).toContain("No transaction is shown");
    expect(illustration).toContain("MARA INTELLIGENCE");
    expect(state).toContain("No signature or transaction");
  });
});
