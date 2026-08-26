import type {
  BrainCoordinate,
  BrainReferenceSpace,
  ScientificCoordinate,
  ScientificCoordinateQueryResult,
  ScientificSpatialProvider,
  ScientificTarget,
} from "@shared/brainScience";
import {
  BRAIN_REFERENCE_SPACES,
} from "./registry";
import {
  assignJulichAtMni2009cCoordinate,
} from "./ebrainsProvider";
import {
  JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
  JULICH_MNI_2009C_PROVIDER_SPACE_ID,
} from "./scientificReferenceRegistry";
import {
  getJulichCorticalOverlay,
} from "./julichCorticalOverlayService";
import {
  transformMni2009cCoordinateToBigBrain,
} from "./bigbrainProvider";
import {
  getScientificBrainArchitectureManifest,
} from "./scientificBrainArchitectureService";

export const CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID =
  "ebrains-mni-icbm-152-2009c";

const SIIBRA_SPATIAL_PROVIDER: ScientificSpatialProvider = {
  id: "ebrains-siibra",
  label: "EBRAINS / siibra",
  version: "siibra API v3.0",
  sourceUrl: "https://siibra-api-stable.apps.hbp.eu/v3_0",
  access: "remote-api",
  redistribution: "not-redistributed",
  limitations: [
    "Luna uses bounded server-side provider requests and does not bundle or redistribute atlas volumes, maps, meshes, or BigBrain assets.",
    "Only independently entered coordinates explicitly declared in the selected MNI ICBM 152 2009c Nonlinear Asymmetric space are accepted.",
    "No Luna/HRA GLB, viewer, camera, mesh, bounds, or anatomy-selection coordinate is accepted or transformed.",
  ],
};

function getReferenceSpace(id: string): BrainReferenceSpace {
  const space = BRAIN_REFERENCE_SPACES.find((entry) => entry.id === id);
  if (!space) {
    throw new Error(`Scientific reference space ${id} is not registered.`);
  }
  return space;
}

export function getScientificSpatialBackbone() {
  const mniReference = getReferenceSpace(CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID);
  const bigBrainReference = getReferenceSpace("ebrains-bigbrain");

  return {
    visualModel: {
      label: "HRA Brain-Female v1.1",
      role: "PRESENTATION_MODEL" as const,
      lunaToMni: "NOT_ESTABLISHED" as const,
      limitation: "Visual anatomy selection and Macro simulation remain Luna-local. The HRA GLB is not a scientific coordinate source.",
    },
    scientificProvider: SIIBRA_SPATIAL_PROVIDER,
    canonicalReference: mniReference,
    bigBrainReference,
    julich: {
      providerParcellationId: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
      providerReferenceSpaceId: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
      datasetVersion: "Julich-Brain v3.1",
      license: "CC BY-NC-SA 4.0",
      redistribution: "not-redistributed" as const,
    },
    julichCorticalOverlay: getJulichCorticalOverlay(),
    scientificBrainArchitecture: getScientificBrainArchitectureManifest(),
    limitations: [
      "MNI 2009c Nonlinear Asymmetric is not substituted with MNI symmetric, MNI 2009b, CerebrA, or another MNI variant.",
      "The optional MNI template layer is a separate provider-streamed cortical reference surface, not an HRA registration, a whole-brain replacement, or a Julich-labelled mesh.",
      "BigBrain transformation is available only for independently entered MNI 2009c millimetre coordinates through the provider service; no BigBrain-to-Luna or Luna-to-BigBrain transform is registered.",
      "Molecular and cellular sources remain dataset/sample-scoped and are not interpolated onto the Luna mesh.",
      "Connectivity is exposed as provider context only unless a future provider-backed query returns explicit reference-space provenance.",
      "The Julich cortical-overlay manifest remains intentionally non-rendering because no exact MNI 2009c region-labelled provider surface has been registered.",
    ],
  };
}

export interface ScientificCoordinateInput {
  referenceSpaceId: string;
  units: string;
  x: number;
  y: number;
  z: number;
}

function normalizeMniCoordinate(
  input: ScientificCoordinateInput,
): ScientificCoordinate {
  const referenceSpace = getReferenceSpace(input.referenceSpaceId);

  if (input.referenceSpaceId !== CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID) {
    throw new Error(
      "Only the registered MNI ICBM 152 2009c Nonlinear Asymmetric provider reference space is accepted. Luna does not silently substitute an MNI variant.",
    );
  }

  if (input.units !== "millimetres") {
    throw new Error(
      "Scientific coordinate queries require explicit units=millimetres for MNI ICBM 152 2009c Nonlinear Asymmetric.",
    );
  }

  if (![input.x, input.y, input.z].every(Number.isFinite)) {
    throw new Error("Scientific coordinate queries require finite X, Y, and Z values.");
  }

  return {
    x: input.x,
    y: input.y,
    z: input.z,
    units: "millimetres",
    referenceSpaceId: referenceSpace.id,
    provider: "ebrains",
    providerReferenceSpaceId: referenceSpace.providerReferenceSpaceId ?? null,
    referenceVersion: referenceSpace.version,
    axisOrientation: referenceSpace.axisOrientation,
    handedness: referenceSpace.handedness ?? null,
    origin: referenceSpace.origin ?? null,
    source: "user-entered",
  };
}

/**
 * Executes a provider-backed scientific lookup for an independently entered
 * MNI coordinate. This intentionally has no input path from Luna's visual GLB.
 */
export async function queryScientificCoordinate(
  input: ScientificCoordinateInput,
): Promise<ScientificCoordinateQueryResult> {
  const coordinate = normalizeMniCoordinate(input);
  const referenceSpace = getReferenceSpace(coordinate.referenceSpaceId);
  const [assignment, bigBrainTransform] = await Promise.all([
    assignJulichAtMni2009cCoordinate(
      coordinate satisfies BrainCoordinate,
    ),
    transformMni2009cCoordinateToBigBrain({
      x: coordinate.x,
      y: coordinate.y,
      z: coordinate.z,
      units: coordinate.units ?? "",
      referenceSpaceId: coordinate.referenceSpaceId,
    }),
  ]);
  const scientificTarget: ScientificTarget = {
    id: `scientific-coordinate:${coordinate.referenceSpaceId}:${coordinate.x.toFixed(3)}:${coordinate.y.toFixed(3)}:${coordinate.z.toFixed(3)}`,
    targetKind: "scientific-coordinate-target",
    structureUberonId: null,
    structureFmaId: null,
    provider: "ebrains",
    datasetId: "julich-brain-cytoarchitecture",
    datasetVersion: "Julich-Brain v3.1",
    referenceSpaceId: coordinate.referenceSpaceId,
    coordinate: {
      x: coordinate.x,
      y: coordinate.y,
      z: coordinate.z,
      units: coordinate.units,
    },
    coordinateUnits: coordinate.units,
    registrationMethod: "Provider-native MNI ICBM 152 2009c Nonlinear Asymmetric coordinate entered independently of Luna.",
    registrationErrorMillimetres: null,
    uncertaintySigmaMillimetres: null,
    evidenceTier: "point-validated",
    provenanceId: "siibra-spatial-backbone-mni-2009c",
    licenseId: "siibra-spatial-backbone",
    status: "available",
    limitation: "Scientific-coordinate target only. It is not a Luna visual-mesh target, a physical biological target, or an enabled lower-scale nanobot mission target.",
  };

  return {
    coordinate,
    scientificTarget,
    provider: SIIBRA_SPATIAL_PROVIDER,
    referenceSpace,
    julich: {
      status: assignment.availability,
      assignment: assignment.assignment,
      reason: assignment.reason,
      providerParcellationId: assignment.providerParcellationId,
      datasetVersion: "Julich-Brain v3.1",
    },
    bigBrain: {
      status: bigBrainTransform.status === "COMPLETE" ? "available" : "unavailable",
      referenceSpaceId: "ebrains-bigbrain",
      coordinate: bigBrainTransform.targetCoordinate,
      observation: bigBrainTransform.observation,
      reason: bigBrainTransform.reason ?? "Provider-returned BigBrain histology coordinate from independently entered MNI 2009c millimetres. It is scientific context only and does not create an HRA/Luna relation or target.",
    },
    molecular: {
      status: "sample-scoped",
      reason: "Allen Human Brain Atlas molecular observations retain provider donor/sample and donor-MR/MNI provenance. No value is inferred at the entered MNI point or on the Luna mesh.",
    },
    cellular: {
      status: "sample-scoped",
      reason: "Cellular datasets are retained as provider dataset/sample-scoped context until a provider declares a compatible spatial reference for a requested observation.",
    },
    connectivity: {
      status: "provider-context",
      reason: "siibra and HCP connectivity resources require dataset-specific, reference-space-provenanced queries. Luna does not project connectivity onto the HRA presentation model.",
    },
    provenanceIds: [
      "siibra-spatial-backbone-mni-2009c",
      "julich-brain-v3-1-mni-2009c",
      "bigbrain-mni-2009c-transform-service",
      "allen-ahba-sample-context",
      "cellxgene-human-brain-sample-context",
      "hcp-connectivity-provider-context",
    ],
    licenseIds: [
      "siibra-spatial-backbone",
      "julich-brain-v3-1",
      "bigbrain-mni-transformations",
      "allen-human-brain-atlas",
      "cellxgene-human-brain-atlas",
      "hcp-provider-context",
    ],
    limitations: [
      "This result is a scientific-coordinate target in the declared MNI provider space only; it is not a Luna visual-mesh target or a physical biological target.",
      "The provider may emit MNI-to-BigBrain histology coordinates from explicitly entered MNI millimetres. No Luna-to-MNI, MNI-to-Luna, BigBrain-to-Luna, or Luna-to-BigBrain transform is emitted.",
      "A provider region assignment is probabilistic scientific context and does not enable lower-scale nanobot operations.",
    ],
  };
}

export function isCanonicalScientificReferenceSpace(
  referenceSpaceId: string,
): boolean {
  return referenceSpaceId === CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID;
}

export function clearScientificSpatialCache(): void {
  // siibra adapter owns its bounded five-minute cache. This function is kept as
  // a stable administrative seam without creating a second cache layer.
}
