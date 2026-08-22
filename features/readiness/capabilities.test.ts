import { describe, expect, it } from "vitest";
import { adaptiveExecutionAllowed, CURRENT_CAPABILITIES } from "./capabilities";
describe("capability truth",()=>{
  it("distinguishes fork proof from live",()=>{ expect(CURRENT_CAPABILITIES.aave.level).toBe("fork-proven"); expect(CURRENT_CAPABILITIES.aave.publicExecution).toBe(false); });
  it.each(["degraded","stale","unavailable","paused","blocked"] as const)("fails closed for %s", state=>expect(adaptiveExecutionAllowed(["healthy",state])).toBe(false));
  it("allows only a fully healthy dependency set",()=>expect(adaptiveExecutionAllowed(["healthy","healthy"])).toBe(true));
});
