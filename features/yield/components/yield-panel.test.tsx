import { describe, expect, it } from "vitest";
import { projectionForContext } from "./yield-panel";
describe("yield UI context isolation", () => { it("hides a projection for a changed context", () => { const result = { status: "unavailable", reason: "fixture" } as const; expect(projectionForContext({ contextKey: "a", result }, "a")).toBe(result); expect(projectionForContext({ contextKey: "a", result }, "b")).toBeNull(); }); });
