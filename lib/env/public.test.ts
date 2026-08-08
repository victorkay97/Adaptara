import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./public";

describe("public environment validation", () => {
  it("provides safe development defaults", () => {
    expect(parsePublicEnv({}).NEXT_PUBLIC_XLAYER_CHAIN_ID).toBe(1952);
  });

  it("rejects the wrong chain and malformed addresses", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_XLAYER_CHAIN_ID: "1" })).toThrow("1952");
    expect(() => parsePublicEnv({ NEXT_PUBLIC_TEST_USDT0_ADDRESS: "invalid" })).toThrow("valid EVM address");
  });
});
