import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManagedSetup } from "./managed-setup";

describe("managed setup", () => {
  const html = renderToStaticMarkup(<ManagedSetup />);
  it("starts in Intelligence Mode and explains the Vault boundary", () => { expect(html).toContain("Intelligence Mode"); expect(html).toContain("Nothing in your wallet is controlled by MARA"); });
  it("shows coherent beginner progress without BPS", () => { expect(html).toContain("Portfolio"); expect(html).toContain("Activate"); expect(html).not.toContain("BPS"); });
  it("never presents public execution", () => { expect(html).toContain("no wallet signature or public transaction"); expect(html).not.toMatch(/live autonomous management active/i); });
});
