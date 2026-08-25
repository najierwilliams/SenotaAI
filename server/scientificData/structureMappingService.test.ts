import { describe, expect, it } from "vitest";
import {
  mappingMatchesProvider,
  resolveCanonicalStructureMapping,
} from "./structureMappingService";

describe("canonical Luna structure mappings", () => {
  it("keeps a local Macro structure as an exact canonical Luna identity", () => {
    const mapping = resolveCanonicalStructureMapping({
      structureId: "allen_hippocampus_l",
      structureName: "Left Hippocampus",
      provider: "luna",
    });

    expect(mapping?.status).toBe("exact");
    expect(mapping?.externalId).toBe("allen_hippocampus_l");
    expect(mappingMatchesProvider(mapping, "luna")).toBe(true);
  });

  it("does not create a mapping without canonical structure identity", () => {
    const mapping = resolveCanonicalStructureMapping({
      structureId: null,
      structureName: "Hippocampus",
      provider: "ebrains",
    });

    expect(mapping).toBeNull();
  });

  it("keeps external provider structure matches query-required and detects mismatched providers", () => {
    const mapping = resolveCanonicalStructureMapping({
      structureId: "allen_hippocampus_l",
      structureName: "Left Hippocampus",
      provider: "allen-institute",
    });

    expect(mapping?.status).toBe("query-required");
    expect(mapping?.externalId).toBeNull();
    expect(mappingMatchesProvider(mapping, "ebrains")).toBe(false);
  });
});
