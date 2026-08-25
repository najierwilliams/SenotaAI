import type { BrainStructure } from "./BrainStructureRegistry";

export interface BrainAnatomyNode {
  id: string;
  label: string;
  type:
    | "brain"
    | "hemisphere"
    | "region"
    | "structure"
    | "substructure";
  structureIds: string[];
  children: BrainAnatomyNode[];
  structureCount: number;
  scaleCounts: Record<"macro" | "tissue" | "cellular" | "subcellular" | "molecular", number>;
}

export interface BrainAnatomyHierarchy {
  root: BrainAnatomyNode;
}

const REGION_ORDER = [
  "frontal",
  "parietal",
  "temporal",
  "occipital",
  "cingulate",
  "insula",
  "hippocampus",
  "amygdala",
  "thalamus",
  "hypothalamus",
  "caudate",
  "putamen",
  "pallidus",
  "claustrum",
  "corpus callosum",
  "fornix",
  "cerebellum",
  "brainstem",
];

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function detectRegion(
  structure: BrainStructure,
): string {
  if (structure.parentRegion) {
    return structure.parentRegion;
  }

  return structure.category;
}

function createNode(
  id: string,
  label: string,
  type: BrainAnatomyNode["type"],
): BrainAnatomyNode {
  return {
    id,
    label,
    type,
    structureIds: [],
    children: [],
    structureCount: 0,
    scaleCounts: {
      macro: 0,
      tissue: 0,
      cellular: 0,
      subcellular: 0,
      molecular: 0,
    },
  };
}

function refreshCounts(
  node: BrainAnatomyNode,
  structuresById: Map<string, BrainStructure>,
): number {
  const counts = {
    macro: 0,
    tissue: 0,
    cellular: 0,
    subcellular: 0,
    molecular: 0,
  };

  node.structureIds.forEach((id) => {
    const structure = structuresById.get(id);
    if (structure) {
      counts[structure.scale] += 1;
    }
  });

  const childCount = node.children.reduce(
    (total, child) =>
      total + refreshCounts(child, structuresById),
    0,
  );

  node.structureCount =
    node.structureIds.length + childCount;

  node.children.forEach((child) => {
    (Object.keys(counts) as Array<keyof typeof counts>).forEach((scale) => {
      counts[scale] += child.scaleCounts[scale];
    });
  });

  node.scaleCounts = counts;
  return node.structureCount;
}

export function buildBrainAnatomyHierarchy(
  structures: BrainStructure[],
): BrainAnatomyHierarchy {
  const root =
    createNode(
      "brain",
      "Luna Brain",
      "brain",
    );

  const hemisphereNodes: Record<
    "left" | "right" | "unknown",
    BrainAnatomyNode
  > = {
    left: createNode(
      "left_hemisphere",
      "Left Hemisphere",
      "hemisphere",
    ),

    right: createNode(
      "right_hemisphere",
      "Right Hemisphere",
      "hemisphere",
    ),

    unknown: createNode(
      "midline_structures",
      "Midline / Unspecified",
      "hemisphere",
    ),
  };

  root.children.push(
    hemisphereNodes.left,
    hemisphereNodes.right,
    hemisphereNodes.unknown,
  );

  const regionMaps = {
    left: new Map<
      string,
      BrainAnatomyNode
    >(),

    right: new Map<
      string,
      BrainAnatomyNode
    >(),

    unknown: new Map<
      string,
      BrainAnatomyNode
    >(),
  };

  for (const structure of structures) {
    const hemisphere =
      structure.hemisphere === "left"
        ? "left"
        : structure.hemisphere === "right"
          ? "right"
          : "unknown";

    const region =
      detectRegion(structure);

    const map =
      regionMaps[hemisphere];

    let regionNode =
      map.get(region);

    if (!regionNode) {
      regionNode =
        createNode(
          `${hemisphere}_${region}`,
          titleCase(region),
          "region",
        );

      map.set(
        region,
        regionNode,
      );

      hemisphereNodes[
        hemisphere
      ].children.push(
        regionNode,
      );
    }

    regionNode.structureIds.push(
      structure.id,
    );

    const structureNode =
      createNode(
        structure.id,
        structure.displayName,
        "structure",
      );

    structureNode.structureIds.push(
      structure.id,
    );

    regionNode.children.push(
      structureNode,
    );
  }

  for (const hemisphere of [
    "left",
    "right",
    "unknown",
  ] as const) {
    hemisphereNodes[
      hemisphere
    ].children.sort(
      (a, b) => {
        const aIndex =
          REGION_ORDER.indexOf(
            a.id.replace(
              `${hemisphere}_`,
              "",
            ),
          );

        const bIndex =
          REGION_ORDER.indexOf(
            b.id.replace(
              `${hemisphere}_`,
              "",
            ),
          );

        if (
          aIndex === -1 &&
          bIndex === -1
        ) {
          return a.label.localeCompare(
            b.label,
          );
        }

        if (aIndex === -1) {
          return 1;
        }

        if (bIndex === -1) {
          return -1;
        }

        return aIndex - bIndex;
      },
    );

    hemisphereNodes[
      hemisphere
    ].children.forEach(
      (regionNode) => {
        regionNode.children.sort(
          (a, b) =>
            a.label.localeCompare(
              b.label,
            ),
        );
      },
    );
  }

  const structuresById = new Map(
    structures.map((structure) => [structure.id, structure]),
  );

  refreshCounts(root, structuresById);

  return {
    root,
  };
}