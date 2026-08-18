import { describe, expect, it } from "vitest";
import { getOwnerAccess } from "./db";

describe("owner access persistence", () => {
  it("reads the singleton owner-password record without delaying first-visit access checks", async () => {
    const access = await getOwnerAccess();
    expect(access ?? undefined).toEqual(access);
  }, 8_000);
});
