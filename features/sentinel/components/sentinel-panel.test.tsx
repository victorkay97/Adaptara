import { describe, expect, it } from "vitest";
import { sentinelCompletionForContext } from "./sentinel-panel";

describe("Sentinel request context isolation", () => {
  it("accepts same-context success", () => expect(sentinelCompletionForContext("a", "a", "result")).toBe("result"));
  it("ignores stale success after a context change", () => expect(sentinelCompletionForContext("a", "b", "result")).toBeNull());
  it("ignores stale non-OK and network-error state after a context change", () => { expect(sentinelCompletionForContext("a", "b", "non-ok")).toBeNull(); expect(sentinelCompletionForContext("a", "b", "network-error")).toBeNull(); });
});
