import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VAULT_FIXTURE_SCENARIOS, VaultFixtureState } from "./product-showcase";

describe("read-only multi-Vault showcase scenarios", () => {
  it("covers zero, V1-only, V2-only, and mixed simulated states", () => {
    expect(VAULT_FIXTURE_SCENARIOS).toEqual(["zero", "v1", "v2", "mixed"]);
    for (const scenario of VAULT_FIXTURE_SCENARIOS) {
      const html = renderToStaticMarkup(<VaultFixtureState scenario={scenario} />);
      expect(html).toContain("simulated Vaults");
      expect(html).toContain('disabled=""');
      if (scenario === "zero") expect(html).toContain("No managed value");
      else expect(html).toContain("never included in live discovery");
    }
  });
});
