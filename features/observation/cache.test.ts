import { describe, expect, it } from "vitest";
import { ObservationCache } from "./cache";

describe("ObservationCache", () => {
  it("deduplicates current requests and refreshes after expiry", async () => {
    const cache = new ObservationCache<number>(1_000); let calls = 0; const load = async () => ++calls;
    expect(await cache.get(new Date(0), load)).toBe(1); expect(await cache.get(new Date(500), load)).toBe(1);
    expect(await cache.get(new Date(1_001), load)).toBe(2); expect(calls).toBe(2);
  });
  it("does not cache failures", async () => {
    const cache = new ObservationCache<number>(1_000); let calls = 0;
    await expect(cache.get(new Date(0), async () => { calls++; throw new Error("down"); })).rejects.toThrow("down");
    expect(await cache.get(new Date(1), async () => ++calls)).toBe(2);
  });
});
