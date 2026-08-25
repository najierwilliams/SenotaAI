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

export type BrainStructureDepth =
  | "surface"
  | "intermediate"
  | "deep"
  | "central";

export type BrainScale =
  | "macro"
  | "tissue"
  | "cellular"
  | "subcellular"
  | "molecular";

export interface BrainScaleOption {
  value: BrainScale;
  label: string;
  description: string;
}

export const BRAIN_SCALE_OPTIONS: BrainScaleOption[] = [
  {
    value: "macro",
    label: "Macro",
    description:
      "Whole-brain and anatomical structure scale.",
  },
  {
    value: "tissue",
    label: "Tissue",
    description:
      "Tissue architecture and local microanatomy.",
  },
  {
    value: "cellular",
    label: "Cellular",
    description:
      "Individual cells and cellular organization.",
  },
  {
    value: "subcellular",
    label: "Subcellular",
    description:
      "Intracellular structures and organelles.",
  },
  {
    value: "molecular",
    label: "Molecular",
    description:
      "Molecular components, pathways, and interactions.",
  },
];

export interface BrainStructure {
  id: string;
  sourceName: string;
  displayName: string;
  hemisphere: BrainHemisphere;
  category: BrainStructureCategory;
  parentRegion: string | null;
  depth: BrainStructureDepth;
  scale: BrainScale;
  searchText: string;
}

export function createStructureId(
  sourceName: string,
): string {
  return sourceName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function detectHemisphere(
  sourceName: string,
): BrainHemisphere {
  const normalized =
    sourceName.trim().toLowerCase();

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

export function detectCategory(
  sourceName: string,
): BrainStructureCategory {
  const name =
    sourceName.toLowerCase();

  if (name.includes("cerebell")) {
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

export function detectDepth(
  category: BrainStructureCategory,
  parentRegion: string | null,
): BrainStructureDepth {
  const region =
    parentRegion?.toLowerCase() ?? "";

  if (
    category === "brainstem" ||
    category === "cerebellar"
  ) {
    return "central";
  }

  if (
    category === "subcortical" ||
    category === "limbic" ||
    region === "thalamus" ||
    region === "hypothalamus"
  ) {
    return "deep";
  }

  if (
    category === "white_matter" ||
    category === "ventricular"
  ) {
    return "intermediate";
  }

  if (category === "cortical") {
    return "surface";
  }

  return "intermediate";
}

export function detectScale(
  _depth: BrainStructureDepth,
): BrainScale {
  return "macro";
}

export function getBrainScaleOption(
  scale: BrainScale,
): BrainScaleOption {
  return (
    BRAIN_SCALE_OPTIONS.find(
      (option) =>
        option.value === scale,
    ) ?? BRAIN_SCALE_OPTIONS[0]
  );
}

export function createBrainStructure(
  sourceName: string,
): BrainStructure {
  const category =
    detectCategory(sourceName);

  const parentRegion =
    detectParentRegion(sourceName);

  const displayName =
    createDisplayName(sourceName);

  const id =
    createStructureId(sourceName);

  const depth =
    detectDepth(
      category,
      parentRegion,
    );

  const scale =
    detectScale(depth);

  return {
    id,
    sourceName,
    displayName,
    hemisphere:
      detectHemisphere(sourceName),
    category,
    parentRegion,
    depth,
    scale,
    searchText: [
      id,
      sourceName,
      displayName,
      parentRegion ?? "",
      category,
      depth,
      scale,
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export function buildBrainStructureRegistry(
  sourceNames: string[],
): BrainStructure[] {
  const seen = new Set<string>();

  return sourceNames
    .filter(
      (name) =>
        Boolean(name?.trim()),
    )
    .map(createBrainStructure)
    .filter((structure) => {
      if (seen.has(structure.id)) {
        return false;
      }

      seen.add(structure.id);
      return true;
    });
}