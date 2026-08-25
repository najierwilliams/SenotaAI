import type {
  BrainCoordinateTransform,
  BrainDataset,
  BrainDatasetProvenance,
  BrainReferenceSpace,
  BrainScientificScale,
  BrainSpatialCapability,
  BrainSpatialTarget,
  BrainStructureMapping,
} from "@shared/brainScience";
import { isDatasetUsable } from "@shared/brainScience";

export interface SpatialTargetState {
  spatialTarget: BrainSpatialTarget;
  spatialCapability: BrainSpatialCapability;
}

interface CreateSpatialTargetStateOptions {
  scale: BrainScientificScale;
  dataset: BrainDataset;
  provenance: BrainDatasetProvenance | null;
  referenceSpace: BrainReferenceSpace | null;
  structureMapping: BrainStructureMapping | null;
  coordinateTransform: BrainCoordinateTransform | null;
}

function unavailableState(
  options: CreateSpatialTargetStateOptions,
  details: {
    spatialDataAvailable: boolean;
    targetTypeSupported: boolean;
    reason: string;
    coordinateType?: BrainSpatialTarget["coordinateType"];
    targetDerivation?: string | null;
    sourceMap?: string | null;
  },
): SpatialTargetState {
  const datasetAvailable = isDatasetUsable(
    options.dataset.status,
  );
  const referenceSpaceKnown = Boolean(
    options.referenceSpace);
  const structureMappingAvailable =
    options.structureMapping?.status === "exact";
  const transformToLunaAvailable = false;
  const coordinateResolved = false;

  return {
    spatialTarget: {
      structureId:
        options.structureMapping?.canonicalStructureId ??
        null,
      datasetId: options.dataset.id,
      scale: options.scale,
      referenceSpace: options.referenceSpace,
      coordinate: null,
      coordinateType:
        details.coordinateType ?? "unavailable",
      resolution: options.referenceSpace?.resolution ?? null,
      targetDerivation:
        details.targetDerivation ?? null,
      sourceMap: details.sourceMap ?? null,
      probabilityThreshold: null,
      coordinateTransform: options.coordinateTransform,
      provenance: options.provenance,
      confidence: null,
      spatialStatus: "unavailable",
      reason: details.reason,
    },
    spatialCapability: {
      scale: options.scale,
      datasetAvailable,
      spatialDataAvailable: details.spatialDataAvailable,
      referenceSpaceKnown,
      structureMappingAvailable,
      transformToLunaAvailable,
      coordinateResolved,
      targetTypeSupported: details.targetTypeSupported,
      operationEnabled: false,
      reason: details.reason,
    },
  };
}

/**
 * Reports the present provider and Luna registration state without turning a
 * region map, donor sample, tissue annotation, or transcriptomic embedding
 * into a fabricated navigational coordinate.
 */
export function createSpatialTargetState(
  options: CreateSpatialTargetStateOptions,
): SpatialTargetState {
  switch (options.scale) {
    case "macro":
      return unavailableState(options, {
        spatialDataAvailable: true,
        targetTypeSupported: true,
        coordinateType: "point",
        targetDerivation:
          "Resolved only in BrainViewer from the selected local Three.js mesh.",
        reason:
          "Macro target position is resolved by the active Luna viewer mesh and is not supplied by the server observation record.",
      });
    case "tissue":
      return unavailableState(options, {
        spatialDataAvailable: true,
        targetTypeSupported: false,
        coordinateType: "region",
        targetDerivation:
          "Provider probabilistic atlas region; no Luna point is derived.",
        sourceMap: "Julich-Brain probabilistic cytoarchitectonic map",
        reason:
          "Tissue atlas maps are available in provider reference spaces, but no validated reference-space registration into Luna Local exists.",
      });
    case "cellular":
      return unavailableState(options, {
        spatialDataAvailable: false,
        targetTypeSupported: false,
        reason:
          "Human Brain Cell Atlas metadata is available, but the registered CELLxGENE collection provides no coordinate-resolved human cell positions or Luna reference-space mapping.",
      });
    case "molecular":
      return unavailableState(options, {
        spatialDataAvailable: true,
        targetTypeSupported: false,
        coordinateType: "point",
        targetDerivation:
          "Allen sample coordinates remain donor MR/MNI provenance until a Luna registration is documented.",
        reason:
          "Allen donor-MR/MNI sample provenance is available, but no validated reference-space registration into Luna Local exists.",
      });
    case "subcellular":
      return unavailableState(options, {
        spatialDataAvailable: false,
        targetTypeSupported: false,
        reason:
          "No coordinate-resolved human whole-brain subcellular dataset is registered for the selected Luna structure.",
      });
  }
}
