import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import {
  isDatasetUsable,
  type BrainDatasetProvenance,
  type BrainDatasetStatus,
  type BrainCoordinateTransform,
  type BrainReferenceSpace,
  type BrainScientificFinding,
  type BrainSpatialCapability,
  type BrainSpatialTarget,
  type BrainScientificObservation,
  type BrainStructureMapping,
} from "@shared/brainScience";

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
  scientificStatus: BrainDatasetStatus | null;
  scientificAvailable: boolean;
  scientificObservation: BrainScientificObservation | null;
  provenance: BrainDatasetProvenance | null;
  referenceSpace: BrainReferenceSpace | null;
  coordinateTransform: BrainCoordinateTransform | null;
  structureMapping: BrainStructureMapping | null;
  spatialTarget: BrainSpatialTarget | null;
  spatialCapability: BrainSpatialCapability | null;
  findings: BrainScientificFinding[];
}

interface CreateBrainObservationContextOptions {
  scale: BrainScale;
  structure: BrainStructure | null;
  asset: BrainScaleAsset | null;
  loading: boolean;
  error: string | null;
  scientificObservation?: BrainScientificObservation | null;
  scientificLoading?: boolean;
  scientificError?: string | null;
}

export function createBrainObservationContext({
  scale,
  structure,
  asset,
  loading,
  error,
  scientificObservation = null,
  scientificLoading = false,
  scientificError = null,
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

  const scientificStatus =
    scientificLoading
      ? "loading"
      : scientificObservation?.status ??
        (scientificError ? "offline" : null);

  const scientificAvailable =
    scientificObservation
      ? isDatasetUsable(
          scientificObservation.status,
        )
      : false;

  let message =
    `${scaleLabel} observation ready`;

  if (scientificLoading) {
    message =
      `Loading ${scaleLabel.toLowerCase()} scientific dataset...`;
  } else if (scientificObservation) {
    message = scientificObservation.message;
  } else if (scientificError) {
    message =
      `Scientific provider unavailable: ${scientificError}`;
  } else if (status === "loading") {
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
      scientificObservation?.dataset?.id ??
      asset?.id ??
      (macroModelAvailable
        ? "luna_brain_macro"
        : null),
    datasetLabel:
      scientificObservation?.dataset?.name ??
      asset?.label ??
      (macroModelAvailable
        ? "Macro anatomy model"
        : null),
    datasetUrl:
      scientificObservation?.dataset?.endpoint ??
      scientificObservation?.dataset?.assetUrl ??
      asset?.url ??
      (macroModelAvailable
        ? "/models/luna/brain/source/3d-vh-f-allen-brain.glb"
        : null),
    status,
    available,
    message,
    scientificStatus,
    scientificAvailable,
    scientificObservation,
    provenance:
      scientificObservation?.dataset
        ? {
            provider:
              scientificObservation.dataset.provider,
            datasetName:
              scientificObservation.dataset.name,
            version:
              scientificObservation.dataset.version,
            sourceUrl:
              scientificObservation.dataset.endpoint ??
              scientificObservation.dataset.assetUrl ??
              "",
            citation:
              scientificObservation.dataset.citation,
            license:
              scientificObservation.dataset.license,
            accessedAt:
              scientificObservation.fetchedAt,
            referenceSpaceIds:
              scientificObservation.dataset.referenceSpaceIds,
          }
        : null,
    referenceSpace:
      scientificObservation?.referenceSpace ?? null,
    coordinateTransform:
      scientificObservation?.coordinateTransform ?? null,
    structureMapping:
      scientificObservation?.structureMapping ?? null,
    spatialTarget:
      scientificObservation?.spatialTarget ?? null,
    spatialCapability:
      scientificObservation?.spatialCapability ?? null,
    findings:
      scientificObservation?.findings ?? [],
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
