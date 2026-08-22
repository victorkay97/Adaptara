import { describe, expect, it } from "vitest";
import { derivedActivity, emptyLiveActivity, normalizeOnchainActivity, offchainActivity, simulationActivity } from "./model";

const hash = `0x${"1".repeat(64)}` as const;
const vault = "0x0000000000000000000000000000000000000001" as const;
describe("authoritative Activity provenance", () => {
  it("normalizes emitted Vault events as onchain evidence", () => expect(normalizeOnchainActivity({eventName:"SwapExecuted",chainId:196,blockNumber:1n,transactionHash:hash,logIndex:2,occurredAt:"now",emitter:vault})).toMatchObject({provenance:"onchain",kind:"swap-executed",vaultAddress:vault}));
  it("keeps MARA and deterministic planning offchain", () => expect(offchainActivity({id:"m1",kind:"deterministic-plan",occurredAt:"now",label:"Plan",contextFingerprint:"ctx"}).provenance).toBe("offchain"));
  it("requires derived summaries to retain their input provenance", () => { expect(() => derivedActivity({id:"d",kind:"summary",occurredAt:"now",label:"Summary",inputs:[]})).toThrow(/inputs/); expect(derivedActivity({id:"d",kind:"summary",occurredAt:"now",label:"Summary",inputs:["m1"]}).provenance).toBe("derived"); });
  it("keeps future demo fixtures distinguishable from live records", () => expect(simulationActivity({id:"s",kind:"recommendation",occurredAt:"now",label:"Fixture",fixtureId:"demo-1"}).provenance).toBe("simulation"));
  it("does not fabricate production history without ingestion", () => expect(emptyLiveActivity()).toEqual([]));
});
