import { concatHex, decodeFunctionData, encodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";
import { adaptiveVaultConstitutionAbi } from "@/features/constitution/abis";
import { createBuilderAttributionDataSuffix, optionalBuilderAttributionDataSuffix } from "./builder-attribution";

export const TEST_BUILDER_CODE = "adaptra12c3test1";
const OTHER_TEST_BUILDER_CODE = "adaptra12c3test2";
const policy = { minimumReserveBps: 2000, maximumSingleAssetExposureBps: 6000, maximumAggressiveExposureBps: 3000, maximumDailyReallocationBps: 1000 };
const expectedBaseCalldata = "0x3c5ea51600000000000000000000000000000000000000000000000000000000000007d000000000000000000000000000000000000000000000000000000000000017700000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000000000000000000000000000000000000000003e8";

describe("ERC-8021 Builder attribution", () => {
  it("uses ox to produce deterministic, distinct, nonempty suffixes", () => {
    const first = createBuilderAttributionDataSuffix(TEST_BUILDER_CODE);
    expect(first).toMatch(/^0x[0-9a-f]+$/);
    expect(first.length).toBeGreaterThan(2);
    expect(createBuilderAttributionDataSuffix(TEST_BUILDER_CODE)).toBe(first);
    expect(createBuilderAttributionDataSuffix(OTHER_TEST_BUILDER_CODE)).not.toBe(first);
  });

  it("keeps absence explicit and rejects malformed codes", () => {
    expect(optionalBuilderAttributionDataSuffix()).toBeUndefined();
    for (const malformed of ["", "short", "ADAPTRA12C3TEST1", "adaptra-2c3test1", "adaptra12c3test12"]) expect(() => createBuilderAttributionDataSuffix(malformed)).toThrow("Builder Code");
  });

  it("preserves exact setPolicy ABI semantics with a trailing-only suffix", () => {
    const base = encodeFunctionData({ abi: adaptiveVaultConstitutionAbi, functionName: "setPolicy", args: [policy] });
    const suffix = createBuilderAttributionDataSuffix(TEST_BUILDER_CODE);
    const attributed = concatHex([base, suffix]);
    expect(base).toBe(expectedBaseCalldata);
    expect(base.length).toBe(2 + 132 * 2);
    expect(attributed).toBe(`${base}${suffix.slice(2)}`);
    expect(attributed.slice(0, base.length)).toBe(base);
    expect(attributed.slice(base.length)).toBe(suffix.slice(2));
    expect(decodeFunctionData({ abi: adaptiveVaultConstitutionAbi, data: base })).toEqual({ functionName: "setPolicy", args: [policy] });
  });
});
