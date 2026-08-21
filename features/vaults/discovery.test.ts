import { describe, expect, it, vi } from "vitest";
import { aggregateManagedVaults, discoverManagedVaults, selectVault, type DiscoveredManagedVault } from "./discovery";

const owner = "0x0000000000000000000000000000000000000001" as const;
const v1Factory = "0x0000000000000000000000000000000000000011" as const;
const v2Factory = "0x0000000000000000000000000000000000000022" as const;
const a = "0x00000000000000000000000000000000000000A1" as const;
const b = "0x00000000000000000000000000000000000000b2" as const;
const c = "0x00000000000000000000000000000000000000C3" as const;

describe("unified V1 + V2 Vault discovery", () => {
  it("supports no Vault and one V1 Vault", async () => {
    const empty = { readContract: vi.fn().mockResolvedValue("0x0000000000000000000000000000000000000000") } as never;
    expect(await discoverManagedVaults({ client: empty, owner, v1Factory })).toEqual({ vaults: [], issues: [] });
    const one = { readContract: vi.fn().mockResolvedValue(a) } as never;
    expect(await discoverManagedVaults({ client: one, owner, v1Factory })).toEqual({ vaults: [{ source: "v1", address: a, owner, index: 0 }], issues: [] });
  });
  it("supports one and multiple V2 Vaults plus V1 aggregation", async () => {
    const readContract = vi.fn().mockResolvedValueOnce(a).mockResolvedValueOnce(2n).mockResolvedValueOnce(b).mockResolvedValueOnce(c);
    const result = await discoverManagedVaults({ client: { readContract } as never, owner, v1Factory, v2Factory });
    expect(result.vaults.map((vault) => [vault.source, vault.address])).toEqual([["v1", a], ["v2", b], ["v2", c]]);
    expect(result.issues).toEqual([]);
  });
  it("deduplicates by authoritative address and keeps selected source paired", () => {
    const v1: DiscoveredManagedVault = { source: "v1", address: a, owner, index: 0 };
    const duplicate: DiscoveredManagedVault = { source: "v2", address: a, owner, index: 0 };
    expect(aggregateManagedVaults([v1], [duplicate])).toEqual([v1]); expect(selectVault(v1)).toEqual({ selectedVaultAddress: a, selectedVaultSource: "v1" });
  });
  it("supports V2-only discovery and preserves V1 when V2 reads fail", async () => {
    const v2Only = vi.fn().mockResolvedValueOnce(1n).mockResolvedValueOnce(b);
    expect((await discoverManagedVaults({ client: { readContract: v2Only } as never, owner, v2Factory })).vaults).toEqual([{ source: "v2", address: b, owner, index: 0 }]);
    const isolated = vi.fn(async ({ address }: { address: string }) => { if (address === v1Factory) return a; throw new Error("V2 RPC unavailable"); });
    const result = await discoverManagedVaults({ client: { readContract: isolated } as never, owner, v1Factory, v2Factory });
    expect(result.vaults).toEqual([{ source: "v1", address: a, owner, index: 0 }]);
    expect(result.issues).toEqual([{ source: "v2", message: "V2 RPC unavailable" }]);
  });
  it("enforces the 16-Vault bound without issuing unbounded index reads", async () => {
    const readContract = vi.fn().mockResolvedValue(17n);
    const result = await discoverManagedVaults({ client: { readContract } as never, owner, v2Factory });
    expect(result.vaults).toEqual([]);
    expect(result.issues[0].message).toContain("invalid owner Vault count");
    expect(readContract).toHaveBeenCalledOnce();
  });
});
