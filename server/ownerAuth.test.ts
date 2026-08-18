import { describe, expect, it } from "vitest";
import { hashPassword, passwordValidationMessage, verifyPassword } from "./ownerAuth";

describe("owner password security", () => {
  it("uses a salted hash and accepts only the matching password", async () => {
    const passwordHash = await hashPassword("SenotaAccess2026");
    expect(passwordHash).not.toContain("SenotaAccess2026");
    await expect(verifyPassword("SenotaAccess2026", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("different password", passwordHash)).resolves.toBe(false);
  });

  it("requires a minimum length and mixed character classes", () => {
    expect(passwordValidationMessage("short123")).toBe("Use at least 12 characters.");
    expect(passwordValidationMessage("onlyletterslong")).toBe("Use a mix of letters and numbers.");
    expect(passwordValidationMessage("SenotaAccess2026")).toBeNull();
  });
});
