import { getAddress, type Address, type Hash } from "viem";

export type ActivityProvenance = "onchain" | "offchain" | "derived" | "simulation";
export type OnchainActivityKind =
  | "vault-created" | "deposit" | "withdrawal" | "constitution-updated"
  | "management-mode-changed" | "autonomy-pause-changed" | "executor-changed"
  | "swap-executed" | "yield-supplied" | "yield-withdrawn" | "yield-settled";
export type OffchainActivityKind = "mara-observation" | "intelligence-event" | "recommendation" | "deterministic-plan" | "constitution-block";

export interface ActivityBase { id: string; provenance: ActivityProvenance; occurredAt: string; vaultAddress?: Address; label: string }
export interface OnchainActivity extends ActivityBase { provenance: "onchain"; kind: OnchainActivityKind; chainId: number; blockNumber: bigint; transactionHash: Hash; logIndex: number }
export interface OffchainActivity extends ActivityBase { provenance: "offchain"; kind: OffchainActivityKind; contextFingerprint: string }
export interface DerivedActivity extends ActivityBase { provenance: "derived"; kind: "summary"; inputs: readonly string[] }
export interface SimulationActivity extends ActivityBase { provenance: "simulation"; kind: OffchainActivityKind | "summary"; fixtureId: string }
export type ActivityRecord = OnchainActivity | OffchainActivity | DerivedActivity | SimulationActivity;

export const ONCHAIN_EVENT_KINDS = {
  ManagedVaultCreated: "vault-created", Deposited: "deposit", Withdrawn: "withdrawal",
  VaultPolicyUpdated: "constitution-updated", ManagementModeChanged: "management-mode-changed",
  AutonomousManagementPauseChanged: "autonomy-pause-changed", ExecutorChanged: "executor-changed",
  SwapExecuted: "swap-executed", YieldSupplied: "yield-supplied", YieldWithdrawn: "yield-withdrawn",
  YieldSettled: "yield-settled",
} as const satisfies Record<string, OnchainActivityKind>;

export function normalizeOnchainActivity(input: { eventName: keyof typeof ONCHAIN_EVENT_KINDS; chainId: number; blockNumber: bigint; transactionHash: Hash; logIndex: number; occurredAt: string; emitter: Address; vaultAddress?: Address }): OnchainActivity {
  const vaultAddress = getAddress(input.vaultAddress ?? input.emitter);
  return { id: `${input.chainId}:${input.transactionHash}:${input.logIndex}`, provenance: "onchain", kind: ONCHAIN_EVENT_KINDS[input.eventName], chainId: input.chainId, blockNumber: input.blockNumber, transactionHash: input.transactionHash, logIndex: input.logIndex, occurredAt: input.occurredAt, vaultAddress, label: input.eventName };
}

export function offchainActivity(input: Omit<OffchainActivity, "provenance">): OffchainActivity { return { ...input, provenance: "offchain" }; }
export function derivedActivity(input: Omit<DerivedActivity, "provenance">): DerivedActivity { if (input.inputs.length === 0) throw new Error("Derived activity requires provenance inputs"); return { ...input, provenance: "derived" }; }
export function simulationActivity(input: Omit<SimulationActivity, "provenance">): SimulationActivity { return { ...input, provenance: "simulation" }; }
export const emptyLiveActivity = (): readonly ActivityRecord[] => [];
