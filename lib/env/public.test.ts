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

  it("rejects a noncanonical test USD₮0 address", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_TEST_USDT0_ADDRESS: "0x0000000000000000000000000000000000000001" })).toThrow("official X Layer Testnet USD₮0");
  });

  it("requires live deployment addresses as one complete distinct set", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS: "0x0000000000000000000000000000000000000001" })).toThrow("incomplete");
    const configured = {
      NEXT_PUBLIC_ADAPTARA_FACTORY_ADDRESS: "0xBE65de08FFbF819B124cbD2C8C88C21bAcdA8c2e",
      NEXT_PUBLIC_ADAPTARA_ASSET_REGISTRY_ADDRESS: "0xd211E4d1e1049d800d5360A078d52B0fcDD74684",
      NEXT_PUBLIC_STRSY_ADDRESS: "0x4BC1974cdf868702bcC2B6B7D9F8aF54A7A156Dc",
      NEXT_PUBLIC_SXAU_ADDRESS: "0x836B4866d5BA31F4B2f6d05e65C26b8960A1604A",
      NEXT_PUBLIC_SAAPLX_ADDRESS: "0x009e2dfEa3FE134BcE3F769aA3E6C287823af184",
    };
    expect(parsePublicEnv(configured)).toMatchObject(configured);
    expect(() => parsePublicEnv({ ...configured, NEXT_PUBLIC_SXAU_ADDRESS: configured.NEXT_PUBLIC_STRSY_ADDRESS })).toThrow("distinct");
  });
});
