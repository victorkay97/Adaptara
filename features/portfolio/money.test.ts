import { describe, expect, it } from "vitest";
import { formatUnitsExact, valueFromBalance } from "./money";

describe("decimal money math", () => {
  it("formats 6 and 18 decimals without floating point", () => {
    expect(formatUnitsExact(1_250_000_001n, 6)).toBe("1250.000001");
    expect(formatUnitsExact(1_000_000_000_000_000_001n, 18)).toBe("1.000000000000000001");
  });
  it("handles zero and very large values exactly", () => {
    expect(formatUnitsExact(0n, 6)).toBe("0");
    expect(valueFromBalance(10n ** 40n, 18, 123_456_789n, 8)).toBe(1_234_567_890_000_000_000_000_000_000_000n);
  });
  it("rejects an implicit price scale", () => expect(() => valueFromBalance(1n, 0, 1n, 6)).toThrow("scale mismatch"));
});
