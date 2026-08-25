export type BrainHemisphere =
  | "left"
  | "right"
  | "midline"
  | "unknown";

export type BrainStructureCategory =
  | "cortical"
  | "subcortical"
  | "limbic"
  | "ventricular"
  | "cerebellar"
  | "brainstem"
  | "white_matter"
  | "other";

export interface BrainStructure {
  id: string;
  sourceName: string;
  displayName: string;
  hemisphere: BrainHemisphere;
  category: BrainStructureCategory;
  parentRegion: string | null;
}

/**
 * Converts a GLB mesh/node name into a stable ID.
 *
 * Example:
 *
 * Allen_head_of_hippocampus_L
 *
 * becomes:
 *
 * allen_head_of_hippocampus_l
 */
export function createStructureId(
  sourceName: string,
): string {
  return sourceName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Determines the hemisphere encoded in the
 * Allen atlas mesh name.
 */
export function detectHemisphere(
  sourceName: string,
): BrainHemisphere {
  const normalized = sourceName
    .trim()
    .toLowerCase();

  if (
    normalized.endsWith("_l") ||
    normalized.includes("_left")
  ) {
    return "left";
  }

  if (
    normalized.endsWith("_r") ||
    normalized.includes("_right")
  ) {
    return "right";
  }

  return "unknown";
}

/**
 * Converts the source mesh name into a human-readable
 * display name.
 */
export function createDisplayName(
  sourceName: string,
): string {
  let name = sourceName
    .replace(/^Allen_/i, "")
    .replace(/_[LR]$/i, "")
    .replace(/_/g, " ")
    .trim();

  if (!name) {
    name = sourceName;
  }

  return name
    .split(" ")
    .map((word) => {
      if (!word) {
        return word;
      }

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );
    })
    .join(" ");
}

/**
 * Determines a broad anatomical category.
 *
 * This is deliberately conservative. We are not assigning
 * neurological functions here.
 */
export function detectCategory(
  sourceName: string,
): BrainStructureCategory {
  const name =
    sourceName.toLowerCase();

  if (
    name.includes("cerebell")
  ) {
    return "cerebellar";
  }

  if (
    name.includes("brainstem") ||
    name.includes("midbrain") ||
    name.includes("pons") ||
    name.includes("medulla")
  ) {
    return "brainstem";
  }

  if (
    name.includes("ventricle") ||
    name.includes("ventricular")
  ) {
    return "ventricular";
  }

  if (
    name.includes("hippocampus") ||
    name.includes("amygdala") ||
    name.includes("cingulate") ||
    name.includes("fornix")
  ) {
    return "limbic";
  }

  if (
    name.includes("corpus_callosum") ||
    name.includes("white_matter") ||
    name.includes("fiber") ||
    name.includes("tract")
  ) {
    return "white_matter";
  }

  if (
    name.includes("thalamus") ||
    name.includes("hypothalamus") ||
    name.includes("caudate") ||
    name.includes("putamen") ||
    name.includes("pallidus") ||
    name.includes("claustrum")
  ) {
    return "subcortical";
  }

  if (
    name.includes("gyrus") ||
    name.includes("cortex") ||
    name.includes("sulcus") ||
    name.includes("lobe") ||
    name.includes("insula")
  ) {
    return "cortical";
  }

  return "other";
}

/**
 * Attempts to determine the broad parent anatomical region.
 */
export function detectParentRegion(
  sourceName: string,
): string | null {
  const name =
    sourceName.toLowerCase();

  const regions = [
    "hippocampus",
    "amygdala",
    "thalamus",
    "hypothalamus",
    "caudate",
    "putamen",
    "globus pallidus",
    "pallidus",
    "claustrum",
    "corpus callosum",
    "fornix",
    "cerebellum",
    "brainstem",
    "cingulate",
    "insula",
    "frontal",
    "parietal",
    "temporal",
    "occipital",
  ];

  for (const region of regions) {
    if (
      name.includes(
        region.replace(/ /g, "_"),
      ) ||
      name.includes(region)
    ) {
      return region;
    }
  }

  return null;
}

/**
 * Creates the Luna anatomical metadata record
 * for an individual GLB mesh.
 */
export function createBrainStructure(
  sourceName: string,
): BrainStructure {
  return {
    id: createStructureId(
      sourceName,
    ),

    sourceName,

    displayName:
      createDisplayName(
        sourceName,
      ),

    hemisphere:
      detectHemisphere(
        sourceName,
      ),

    category:
      detectCategory(
        sourceName,
      ),

    parentRegion:
      detectParentRegion(
        sourceName,
      ),
  };
}

/**
 * Builds a registry from the names found in the GLB.
 */
export function buildBrainStructureRegistry(
  sourceNames: string[],
): BrainStructure[] {
  return sourceNames
    .filter(
      (name) =>
        Boolean(name?.trim()),
    )
    .map(
      createBrainStructure,
    );
}