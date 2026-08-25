import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

export type BrainScaleAssetKind =
  | "model"
  | "dataset"
  | "placeholder";

export interface BrainScaleAsset {
  id: string;
  structureId: string | null;
  scale: BrainScale;
  label: string;
  description: string;
  url: string | null;
  available: boolean;
  kind: BrainScaleAssetKind;
}

export interface BrainScaleAssetState {
  loading: boolean;
  error: string | null;
  asset: BrainScaleAsset | null;
}

const SCALE_METADATA: Record<
  BrainScale,
  {
    label: string;
    description: string;
  }
> = {
  macro: {
    label: "Macro anatomy",
    description:
      "Whole-brain and anatomical structure scale.",
  },
  tissue: {
    label: "Tissue",
    description:
      "Tissue architecture and local microanatomy.",
  },
  cellular: {
    label: "Cellular",
    description:
      "Individual cells and cellular organization.",
  },
  subcellular: {
    label: "Subcellular",
    description:
      "Intracellular structures and organelles.",
  },
  molecular: {
    label: "Molecular",
    description:
      "Molecular components, pathways, and interactions.",
  },
};

export function getBrainScaleLabel(
  scale: BrainScale,
): string {
  return SCALE_METADATA[scale].label;
}

export function getBrainScaleDescription(
  scale: BrainScale,
): string {
  return SCALE_METADATA[scale].description;
}

export function createBrainScaleAsset(
  structure: BrainStructure,
  scale: BrainScale,
): BrainScaleAsset {
  if (scale === "macro") {
    return {
      id: `${structure.id}_macro`,
      structureId: structure.id,
      scale,
      label: SCALE_METADATA[scale].label,
      description:
        SCALE_METADATA[scale].description,
      url:
        "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
      available: true,
      kind: "model",
    };
  }

  return {
    id: `${structure.id}_${scale}`,
    structureId: structure.id,
    scale,
    label: SCALE_METADATA[scale].label,
    description:
      SCALE_METADATA[scale].description,
    url: null,
    available: false,
    kind: "placeholder",
  };
}

export function getBrainScaleAsset(
  structure: BrainStructure,
  scale: BrainScale,
): BrainScaleAsset {
  return createBrainScaleAsset(
    structure,
    scale,
  );
}

export function getObservationScaleAsset(
  structure: BrainStructure | null,
  scale: BrainScale,
): BrainScaleAsset | null {
  if (structure) {
    return getBrainScaleAsset(
      structure,
      scale,
    );
  }

  if (scale === "macro") {
    return {
      id: "luna_brain_macro",
      structureId: null,
      scale: "macro",
      label: SCALE_METADATA.macro.label,
      description: SCALE_METADATA.macro.description,
      url:
        "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
      available: true,
      kind: "model",
    };
  }

  return {
    id: `luna_brain_${scale}`,
    structureId: null,
    scale,
    label: SCALE_METADATA[scale].label,
    description: SCALE_METADATA[scale].description,
    url: null,
    available: false,
    kind: "placeholder",
  };
}

export function isBrainScaleAvailable(
  structure: BrainStructure | null,
  scale: BrainScale,
): boolean {
  if (!structure) {
    return scale === "macro";
  }

  return getBrainScaleAsset(
    structure,
    scale,
  ).available;
}