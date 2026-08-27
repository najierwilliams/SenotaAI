import { describe, expect, it } from "vitest";
import {
  assertLunaControlledToolPermission,
  invokeLunaControlledTool,
} from "./controlledTools";

describe("Luna controlled tools", () => {
  it("permits only a declared tool class for the worker role", () => {
    expect(() => assertLunaControlledToolPermission("SCOUT", "read_scientific_registry")).not.toThrow();
    expect(() => assertLunaControlledToolPermission("MEMORY_AGENT", "read_scientific_registry")).toThrow(/not permitted/);
  });

  it("rejects an arbitrary tool name rather than allowing shell or unregistered execution", () => {
    expect(() => assertLunaControlledToolPermission("SCOUT", "shell_execute")).toThrow(/not registered/);
  });

  it("returns only reviewed in-process science context and preserves the registration boundary", async () => {
    const result = await invokeLunaControlledTool({
      userId: 1,
      role: "SCOUT",
      toolName: "read_scientific_registry",
    });
    expect(result.toolClass).toBe("PROVIDER");
    expect(result.resultSummary).toContain("no external provider request was made");
    expect(result.promptContext).toContain("NOT_ESTABLISHED");
    expect(result.promptContext).toContain("0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped");
    expect(result.promptContext).toContain("does not call providers");
  });
});
