import type {
  BrainDatasetProvider,
  BrainStructureMapping,
} from "@shared/brainScience";

export interface CanonicalStructureMappingQuery {
  structureId: string | null | undefined;
  structureName: string | null | undefined;
  provider: BrainDatasetProvider;
}

/**
 * Maps external providers into the canonical Luna identity. Luna never copies a
 * second anatomical registry or upgrades a name match into a spatial mapping.
 * External mappings remain query-required until the provider returns a stable,
 * reviewed identifier for the selected canonical structure.
 */
export function resolveCanonicalStructureMapping(
  query: CanonicalStructureMappingQuery,
): BrainStructureMapping | null {
  if (!query.structureId || !query.structureName) {
    return null;
  }

  if (query.provider === "luna") {
    return {
      canonicalStructureId: query.structureId,
      provider: "luna",
      externalId: query.structureId,
      externalName: query.structureName,
      status: "exact",
      note:
        "Canonical Luna structure identity is the selected local Macro model structure.",
    };
  }

  return {
    canonicalStructureId: query.structureId,
    provider: query.provider,
    externalId: null,
    externalName: query.structureName,
    status: "query-required",
    note:
      "The canonical Luna structure is retained as the identity. Provider-specific assignment must be queried and reviewed; it is not a validated coordinate transform.",
  };
}

export function mappingMatchesProvider(
  mapping: BrainStructureMapping | null,
  provider: BrainDatasetProvider,
): boolean {
  return Boolean(mapping && mapping.provider === provider);
}
