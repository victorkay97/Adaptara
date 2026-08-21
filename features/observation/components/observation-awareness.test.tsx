import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ObservationAwareness } from "./observation-awareness";

describe("ObservationAwareness", () => {
  it("shows provenance health and an explicit non-execution boundary", () => {
    const html = renderToStaticMarkup(<ObservationAwareness market="healthy" news="partial" />);
    expect(html).toContain("Watching only"); expect(html).toContain("Current"); expect(html).toContain("Partial");
    expect(html).toContain("cannot choose amounts"); expect(html).not.toContain("Execute");
  });
});
