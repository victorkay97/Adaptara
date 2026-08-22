import { simulationActivity, type SimulationActivity } from "@/features/activity/model";

export const DEMO_METRICS = [["Total Portfolio", "$25,000"], ["In Vaults", "$10,500"], ["Outside Vaults", "$14,500"], ["Active Vaults", "3"]] as const;
export const DEMO_HOLDINGS = [["xETH", "$11,750", "47%", "Growth Vault + outside", "Balanced"], ["USDT", "$7,250", "29%", "Reserve Vault + outside", "Reserve"], ["sTRSY", "$3,750", "15%", "Opportunity Vault", "Balanced"], ["sXAU", "$2,250", "9%", "Outside Vaults", "Defensive"]] as const;
export const DEMO_VAULTS = [
  { name: "Growth Vault", balance: "$4,800", mode: "Approval Required", health: "Attention", constitution: "20% reserve · 50% single-asset maximum", mara: "xETH concentration requires review" },
  { name: "Reserve Vault", balance: "$3,900", mode: "Advisory", health: "Healthy", constitution: "60% reserve · 20% single-asset maximum", mara: "Reserve remains inside its policy boundary" },
  { name: "Opportunity Vault", balance: "$1,800", mode: "Advisory", health: "Healthy", constitution: "25% reserve · 35% aggressive maximum", mara: "No intervention currently recommended" },
] as const;
export const DEMO_ACTIVITY: readonly SimulationActivity[] = [
  simulationActivity({ id: "demo-market-event", kind: "intelligence-event", occurredAt: "Scenario step 1", label: "Simulated xETH concentration change", fixtureId: "growth-vault-blocked-v1" }),
  simulationActivity({ id: "demo-mara-observation", kind: "mara-observation", occurredAt: "Scenario step 2", label: "MARA identified concentration risk", fixtureId: "growth-vault-blocked-v1" }),
  simulationActivity({ id: "demo-plan", kind: "deterministic-plan", occurredAt: "Scenario step 3", label: "Candidate action projected xETH at 63%", fixtureId: "growth-vault-blocked-v1" }),
  simulationActivity({ id: "demo-block", kind: "constitution-block", occurredAt: "Scenario step 4", label: "Financial Constitution blocked the action", fixtureId: "growth-vault-blocked-v1" }),
];
