import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import {
  getBrainScaleDescription,
  getBrainScaleLabel,
  type BrainScaleAsset,
} from "./BrainScaleAssetRegistry";

export type BrainObservationStatus =
  | "loading"
  | "ready"
  | "unavailable"
  | "error";

export interface BrainObservationContext {
  scale: BrainScale;
  scaleLabel: string;
  scaleDescription: string;
  structureId: string | null;
  structureName: string | null;
  parentStructureId: string | null;
  parentStructureName: string | null;
  datasetId: string | null;
  datasetLabel: string | null;
  datasetUrl: string | null;
  status: BrainObservationStatus;
  available: boolean;
  message: string;
}

interface CreateBrainObservationContextOptions {
  scale: BrainScale;
  structure: BrainStructure | null;
  asset: BrainScaleAsset | null;
  loading: boolean;
  error: string | null;
}

export function createBrainObservationContext({
  scale,
  structure,
  asset,
  loading,
  error,
}: CreateBrainObservationContextOptions): BrainObservationContext {
  const scaleLabel =
    getBrainScaleLabel(scale);

  const scaleDescription =
    getBrainScaleDescription(scale);

  const macroModelAvailable =
    scale === "macro" &&
    !asset;

  const available =
    macroModelAvailable ||
    Boolean(asset?.available);

  const status: BrainObservationStatus =
    loading
      ? "loading"
      : error
        ? "error"
        : available
          ? "ready"
          : "unavailable";

  const selectedName =
    structure?.displayName ??
    null;

  let message =
    `${scaleLabel} observation ready`;

  if (status === "loading") {
    message =
      `Loading ${scaleLabel.toLowerCase()} observation...`;
  } else if (status === "error") {
    message =
      error ??
      `Unable to load ${scaleLabel.toLowerCase()} observation`;
  } else if (status === "unavailable") {
    message =
      `${scaleLabel} dataset not connected`;
  }

  return {
    scale,
    scaleLabel,
    scaleDescription,
    structureId:
      structure?.id ?? null,
    structureName: selectedName,
    parentStructureId:
      structure?.parentRegion ?? null,
    parentStructureName:
      structure?.parentRegion ?? null,
    datasetId:
      asset?.id ??
      (macroModelAvailable
        ? "luna_brain_macro"
        : null),
    datasetLabel:
      asset?.label ??
      (macroModelAvailable
        ? "Macro anatomy model"
        : null),
    datasetUrl:
      asset?.url ??
      (macroModelAvailable
        ? "/models/luna/brain/source/3d-vh-f-allen-brain.glb"
        : null),
    status,
    available,
    message,
  };
}

export function getObservationContextLabel(
  context: BrainObservationContext,
): string {
  const target =
    context.structureName ??
    "Luna Brain";

  return `${target} · ${context.scaleLabel} Observation`;
}
