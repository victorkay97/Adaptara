import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { shortenAddress } from "./format";

describe("shortenAddress", () => {
  it("keeps a recognizable prefix and suffix", () => {
    expect(shortenAddress(getAddress("0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c"))).toBe("0x9e29…FB0c");
  });
});
