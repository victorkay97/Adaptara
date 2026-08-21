export type CapabilityLevel = "demo" | "fork-proven" | "deployment-ready" | "live";
export type HealthState = "healthy" | "degraded" | "stale" | "unavailable" | "paused" | "blocked";

export interface CapabilityStatus { level: CapabilityLevel; health: HealthState; label: string; publicExecution: boolean }

export const CURRENT_CAPABILITIES = {
  portfolio: { level: "deployment-ready", health: "healthy", label: "Wallet-readable when connected", publicExecution: false },
  managedVault: { level: "deployment-ready", health: "blocked", label: "Awaiting public deployment", publicExecution: false },
  uniswap: { level: "fork-proven", health: "healthy", label: "X Layer fork proof passed", publicExecution: false },
  aave: { level: "fork-proven", health: "healthy", label: "X Layer fork proof passed", publicExecution: false },
  autonomousExecution: { level: "demo", health: "blocked", label: "Public execution disabled", publicExecution: false },
} satisfies Record<string, CapabilityStatus>;

export function adaptiveExecutionAllowed(states: HealthState[]): boolean {
  return states.length > 0 && states.every((state) => state === "healthy");
}
