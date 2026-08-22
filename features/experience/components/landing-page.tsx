import Link from "next/link";
import type { CSSProperties } from "react";
import { Brand } from "@/components/brand/brand";
import { MingcuteIcon, type MingcuteIconName } from "@/components/ui/mingcute-icon";
import { LandingMotion } from "./landing-motion";
import { MaraAdaptationPreview, PortfolioIntelligencePreview, VaultConstitutionPreview } from "./landing-product-visuals";

export const LANDING_NAVIGATION = ["How it works", "Vaults", "MARA", "Learn"] as const;
export const landingAnchor = (label: typeof LANDING_NAVIGATION[number]) => label === "How it works" ? "#portfolio-intelligence" : label === "Vaults" ? "#vaults" : label === "MARA" ? "#mara" : "/docs";
export const LIVE_DESTINATION = "/dashboard";
export const DEMO_DESTINATION = "/demo";

const sections = [
  {
    id: "portfolio-intelligence",
    eyebrow: "Portfolio Intelligence",
    title: <>See the whole picture<br />before anything moves.</>,
    copy: "Connect your wallet and Adaptara maps your assets, allocation, concentration and risk exposure. MARA watches for what deserves attention, while your capital remains under your control until you choose to delegate it.",
    points: ["Know your allocation", "Understand your risk", "Nothing moves yet"],
    reverse: false,
  },
  {
    id: "vaults",
    eyebrow: "Vaults",
    title: <>One portfolio.<br />Separate Vaults.<br />Separate rules.</>,
    copy: "Create separate Vaults for different goals and delegate only the capital you choose. Each Vault gets its own Financial Constitution — defining its reserve, exposure and adaptation limits. Everything outside a Vault remains outside Adaptara's authority.",
    points: ["Create Vaults for different goals", "Set independent rules for each Vault", "Keep undelegated capital outside Adaptara"],
    reverse: true,
  },
  {
    id: "mara",
    eyebrow: "MARA",
    title: <>Intelligence that<br />knows when to act —<br />and when not to.</>,
    copy: "MARA watches your portfolio, Vaults and changing market conditions to identify what deserves attention. Adaptara turns those signals into deterministic plans, checks them against your rules, and only permitted actions can move forward.",
    points: ["Watches what changes", "Explains why it matters", "Proposes actions that still have to pass your rules"],
    reverse: false,
  },
] as const;

const trustItems: ReadonlyArray<readonly [string, string, MingcuteIconName]> = [
  ["Onchain rules", "Financial Constitutions are enforced as part of the Vault's decision path.", "shield"],
  ["Bounded execution", "Adaptara uses approved, typed actions instead of unrestricted arbitrary execution.", "controls"],
  ["Post-action checks", "The resulting portfolio is validated again before an action can stand.", "circleCheck"],
  ["User-controlled capital", "Only capital intentionally delegated to a Vault enters Adaptara's management boundary.", "walletLock"],
];

function LandingCtas() {
  return <div className="lp-actions"><Link className="lp-button lp-button--primary" href={LIVE_DESTINATION}>Launch Adaptara <MingcuteIcon name="arrowRight" size={16} /></Link><Link className="lp-button lp-button--secondary" href={DEMO_DESTINATION}>Try Demo <MingcuteIcon name="arrowRight" size={16} /></Link></div>;
}

function PublicNavigation() {
  return <header className="lp-nav" data-motion="hero"><div className="lp-container lp-nav__inner"><Brand /><nav className="lp-nav__links" aria-label="Main navigation">{LANDING_NAVIGATION.map((label) => <a key={label} href={landingAnchor(label)}>{label}</a>)}</nav><Link className="lp-nav__launch" href={LIVE_DESTINATION}>Launch App <MingcuteIcon name="arrowUpRight" size={15} /></Link><details className="lp-mobile-nav"><summary aria-label="Open navigation"><span /><span /></summary><nav aria-label="Mobile navigation">{LANDING_NAVIGATION.map((label) => <a key={label} href={landingAnchor(label)}>{label}</a>)}<Link href={LIVE_DESTINATION}>Launch App <MingcuteIcon name="arrowRight" size={15} /></Link></nav></details></div></header>;
}

function ProductPreview() {
  return <div className="lp-product-preview" aria-label="Read-only Adaptara dashboard preview"><div className="lp-product-preview__bar"><Brand compact /><span>Home</span><span>Portfolio</span><span>Vaults</span><span>Activity</span><i /><small>Live · read only</small><small>X Layer Mainnet</small></div><div className="lp-product-preview__body"><span>Overview</span><h2>Your portfolio and independently governed Vaults.</h2><div><article><small>Portfolio</small><strong>Connect to read</strong></article><article><small>Managed Vaults</small><strong>V1 + V2 discovery</strong></article><article><small>Authority</small><strong>Your rules</strong></article><article><small>Public writes</small><strong>Disabled</strong></article></div></div></div>;
}

function FeatureSection({ section }: { section: (typeof sections)[number] }) {
  const visual = section.id === "portfolio-intelligence" ? <PortfolioIntelligencePreview /> : section.id === "vaults" ? <VaultConstitutionPreview /> : <MaraAdaptationPreview />;
  return <section id={section.id} className={section.reverse ? "lp-feature lp-feature--reverse lp-container" : "lp-feature lp-container"}><div className="lp-feature__copy" data-motion="reveal"><p className="lp-pill">{section.eyebrow}</p><h2>{section.title}</h2><p>{section.copy}</p><ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul></div><div className={section.reverse ? "lp-motion-side lp-motion-side--left" : "lp-motion-side lp-motion-side--right"} data-motion="story" data-sequence={section.id}>{visual}</div></section>;
}

export function LandingPage() {
  return <main className="lp-page">
    <LandingMotion />
    <PublicNavigation />
    <section className="lp-hero lp-container" aria-labelledby="landing-title"><p className="lp-status" data-motion="hero" style={{ "--motion-order": 1 } as CSSProperties}><i aria-hidden="true" />Policy-bound portfolio intelligence on X Layer</p><h1 id="landing-title" data-motion="hero" style={{ "--motion-order": 2 } as CSSProperties}>Policy-bound intelligence<br />for your portfolio and Vaults.</h1><p data-motion="hero" style={{ "--motion-order": 3 } as CSSProperties}>Understand what you own, delegate only what you choose, and govern each Vault with its own Financial Constitution. MARA proposes, Adaptara calculates, and your rules allow or block.</p><div data-motion="hero" style={{ "--motion-order": 4 } as CSSProperties}><LandingCtas /></div><div className="lp-hero-preview-motion" data-motion="hero-preview"><ProductPreview /></div></section>
    {sections.map((section) => <FeatureSection key={section.id} section={section} />)}
    <section id="experience" className="lp-experience lp-container"><p className="lp-pill">Choose your experience</p><h2>Go live with your portfolio.<br />Or explore everything in Demo Mode.</h2><p>Connect your wallet for the real X Layer experience, or open an isolated simulated product experience without using real funds.</p><div className="lp-experience__cards"><article><span>Live Mode</span><h3>Your portfolio. Onchain.</h3><p>Use the real X Layer experience with your connected wallet and live read-only portfolio state.</p><Link href={LIVE_DESTINATION}>Launch Live <MingcuteIcon name="arrowRight" size={16} /></Link></article><article><span>Demo Mode</span><h3>The full experience. No real funds.</h3><p>Explore the clearly simulated Adaptara journey without connecting a wallet.</p><Link href={DEMO_DESTINATION}>Try Demo <MingcuteIcon name="arrowRight" size={16} /></Link></article></div></section>
    <section className="lp-trust"><div className="lp-container"><p className="lp-pill lp-pill--dark">Built for verifiable control</p><h2>AI can advise.<br />Your rules stay in charge.</h2><p className="lp-trust__lede">Adaptara combines onchain Vaults, deterministic policy checks and constrained protocol integrations so intelligence can inform decisions without gaining unrestricted control over user capital.</p><div className="lp-trust__grid">{trustItems.map(([title, copy, icon]) => <article key={title}><MingcuteIcon name={icon} size={20} /><h3>{title}</h3><p>{copy}</p></article>)}</div><div className="lp-infrastructure"><h3>Built on X Layer</h3><div><span><strong>X Layer</strong><small>Onchain environment</small></span><span><strong>Chainlink</strong><small>Portfolio valuation</small></span><span><strong>Uniswap</strong><small>Typed adaptation venue</small></span><span><strong>Aave</strong><small>Approved yield strategy</small></span></div></div><p className="lp-trust__closing">MARA can reason about your portfolio. It doesn&apos;t own it.</p></div></section>
    <section className="lp-final lp-container"><h2>Ready to put your rules in motion?</h2><p>Launch Adaptara with your real X Layer portfolio, or explore the product&apos;s simulated experience path without connecting a wallet.</p><LandingCtas /></section>
    <footer className="lp-footer"><div className="lp-container"><div className="lp-footer__top"><div><Brand /><p>Policy-bound portfolio intelligence on X Layer.</p></div><nav aria-label="Product links"><span>Product</span><a href="#portfolio-intelligence">How it works</a><a href="#vaults">Vaults</a><a href="#mara">MARA</a><Link href={LIVE_DESTINATION}>Launch App</Link><Link href={DEMO_DESTINATION}>Demo</Link></nav><nav aria-label="Learn links"><span>Learn</span><Link href="/docs">Docs</Link><Link href="/whitepaper">Whitepaper</Link><Link href="/docs#security">Security</Link><span>Research</span></nav><nav aria-label="Connect links"><span>Connect</span><a href="https://github.com/victorkay97/Adaptara" target="_blank" rel="noreferrer">GitHub</a></nav></div><div className="lp-footer__bottom"><span>© 2026 Adaptara</span><span>Privacy · Terms</span></div></div></footer>
  </main>;
}
