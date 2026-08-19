import { describe, expect, it } from "vitest";
import { buildTemporalContext, resolveTimeZone } from "./temporalContext";

describe("live temporal context", () => {
  it("uses daylight-aware Eastern time by default", () => {
    expect(buildTemporalContext(undefined, new Date("2026-08-19T16:00:00.000Z"))).toContain("12:00:00 PM EDT");
    expect(buildTemporalContext(undefined, new Date("2026-01-19T17:00:00.000Z"))).toContain("12:00:00 PM EST");
  });

  it("accepts a supplied player IANA time zone and rejects malformed zones", () => {
    expect(resolveTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(buildTemporalContext("Asia/Tokyo", new Date("2026-08-19T16:00:00.000Z"))).toContain("1:00:00 AM GMT+9");
    expect(() => resolveTimeZone("Eastern Standard Time")).toThrow("valid IANA time zone");
  });
});
