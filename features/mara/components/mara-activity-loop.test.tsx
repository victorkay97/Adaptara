import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MaraActivityLoop } from "./mara-activity-loop";

describe("MARA activity narrative", () => {
  const html=renderToStaticMarkup(<MaraActivityLoop />);
  it("separates MARA direction from deterministic amount",()=>{expect(html).toContain("MARA proposes");expect(html).toContain("Adaptara calculates");expect(html).toContain("0.001 xETH");});
  it("shows both allowed and blocked Constitution outcomes",()=>{expect(html).toContain("Allowed by your Constitution");expect(html).toContain("Blocked by your Financial Constitution");expect(html).toContain("No action was permitted");});
  it("keeps Aave secondary and non-guaranteed",()=>{expect(html.indexOf("Yield opportunity")).toBeGreaterThan(html.indexOf("MARA noticed"));expect(html).toContain("not guaranteed");});
});
