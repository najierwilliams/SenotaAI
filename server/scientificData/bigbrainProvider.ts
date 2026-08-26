import type {
  NormalizedScientificObservation,
  ScientificCoordinate,
  ScientificTarget,
} from "@shared/brainScience";
import {
  CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
} from "./scientificSpatialService";

const HBP_SPATIAL_BACKEND_URL = "https://hbp-spatial-backend.apps.hbp.eu/v1/transform-point";
const MNI_SPACE_LABEL = "MNI 152 ICBM 2009c Nonlinear Asymmetric";
const BIGBRAIN_SPACE_LABEL = "Big Brain (Histology)";
const BIGBRAIN_REFERENCE_SPACE_ID = "ebrains-bigbrain";
const TIMEOUT_MS = 8_000;

export interface BigBrainCoordinateQuery {
  x: number;
  y: number;
  z: number;
  units: string;
  referenceSpaceId: string;
}

export interface BigBrainCoordinateTransformResult {
  status: "COMPLETE" | "UNAVAILABLE";
  sourceCoordinate: ScientificCoordinate;
  targetCoordinate: ScientificCoordinate | null;
  observation: NormalizedScientificObservation;
  reason: string | null;
}

function sourceCoordinate(input: BigBrainCoordinateQuery): ScientificCoordinate {
  return {
    x: input.x,
    y: input.y,
    z: input.z,
    units: "millimetres",
    referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
    provider: "ebrains",
    providerReferenceSpaceId: "minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2",
    referenceVersion: MNI_SPACE_LABEL,
    axisOrientation: "XYZ as declared by siibra provider metadata",
    handedness: null,
    origin: "Provider axes-origin values [0, 0, 0]; no Luna conversion is inferred.",
    source: "user-entered",
  };
}

function unavailableResult(input: BigBrainCoordinateQuery, reason: string): BigBrainCoordinateTransformResult {
  const coordinate = sourceCoordinate(input);
  return {
    status: "UNAVAILABLE",
    sourceCoordinate: coordinate,
    targetCoordinate: null,
    reason,
    observation: {
      id: `bigbrain-mni-transform:${input.x}:${input.y}:${input.z}`,
      kind: "bigbrain-transform-context",
      status: "UNAVAILABLE",
      provider: "EBRAINS hbp-spatial-backend",
      dataset: "Collection of transformations between Human Brain standard spaces, 2018 version",
      version: "v1",
      referenceSpaceId: BIGBRAIN_REFERENCE_SPACE_ID,
      coordinate,
      region: null,
      mapId: null,
      measurement: null,
      uncertainty: "No transform result was available; no coordinate, region, image, layer, or Luna target was inferred.",
      provenanceId: "bigbrain-mni-2009c-transform-service",
      licenseId: "bigbrain-mni-transformations",
      retrievedAt: new Date().toISOString(),
      scientificTarget: null,
      limitation: "Only explicit MNI 2009c millimetre input can query this provider. HRA/Luna and viewer coordinates are never accepted.",
    },
  };
}

function validate(input: BigBrainCoordinateQuery): string | null {
  if (input.referenceSpaceId !== CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID) {
    return "Only the registered MNI ICBM 152 2009c Nonlinear Asymmetric reference space can be transformed to BigBrain.";
  }
  if (input.units !== "millimetres") return "units=millimetres is required for the provider BigBrain transform.";
  if (![input.x, input.y, input.z].every(Number.isFinite)) return "Finite X, Y, and Z coordinates are required.";
  return null;
}

export async function transformMni2009cCoordinateToBigBrain(
  input: BigBrainCoordinateQuery,
): Promise<BigBrainCoordinateTransformResult> {
  const validationError = validate(input);
  if (validationError) return unavailableResult(input, validationError);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(HBP_SPATIAL_BACKEND_URL);
    url.searchParams.set("source_space", MNI_SPACE_LABEL);
    url.searchParams.set("target_space", BIGBRAIN_SPACE_LABEL);
    url.searchParams.set("x", String(input.x));
    url.searchParams.set("y", String(input.y));
    url.searchParams.set("z", String(input.z));

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return unavailableResult(input, `BigBrain transform provider returned HTTP ${response.status}.`);

    const payload = await response.json() as { target_point?: unknown };
    if (!Array.isArray(payload.target_point) || payload.target_point.length !== 3 || !payload.target_point.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return unavailableResult(input, "BigBrain transform provider returned no finite target point.");
    }

    const targetCoordinate: ScientificCoordinate = {
      x: payload.target_point[0] as number,
      y: payload.target_point[1] as number,
      z: payload.target_point[2] as number,
      units: "millimetres",
      referenceSpaceId: BIGBRAIN_REFERENCE_SPACE_ID,
      provider: "bigbrain",
      providerReferenceSpaceId: "minds/core/referencespace/v1.0.0/a1655b99-82f1-420f-a3c2-fe80fd4c8588",
      referenceVersion: "BigBrain 2015 native histology",
      axisOrientation: null,
      handedness: null,
      origin: null,
      source: "provider-returned",
    };
    const scientificTarget: ScientificTarget = {
      id: `bigbrain-coordinate-context:${input.x}:${input.y}:${input.z}`,
      targetKind: "scientific-coordinate-target",
      structureUberonId: null,
      structureFmaId: null,
      provider: "bigbrain",
      datasetId: "bigbrain-microscopic-reference",
      datasetVersion: "2015 release",
      referenceSpaceId: BIGBRAIN_REFERENCE_SPACE_ID,
      coordinate: { x: targetCoordinate.x, y: targetCoordinate.y, z: targetCoordinate.z, units: "millimetres" },
      coordinateUnits: "millimetres",
      registrationMethod: "Provider-documented diffeomorphic transform from explicit MNI 2009c input; not a Luna/HRA registration.",
      registrationErrorMillimetres: null,
      uncertaintySigmaMillimetres: null,
      evidenceTier: "point-validated",
      provenanceId: "bigbrain-mni-2009c-transform-service",
      licenseId: "bigbrain-mni-transformations",
      status: "available",
      limitation: "Provider coordinate context only. It does not imply a BigBrain image/layer assignment, HRA relation, lower-scale target, or nanobot capability.",
    };

    return {
      status: "COMPLETE",
      sourceCoordinate: sourceCoordinate(input),
      targetCoordinate,
      reason: null,
      observation: {
        id: `bigbrain-mni-transform:${input.x}:${input.y}:${input.z}`,
        kind: "bigbrain-transform-context",
        status: "COMPLETE",
        provider: "EBRAINS hbp-spatial-backend",
        dataset: "Collection of transformations between Human Brain standard spaces, 2018 version",
        version: "v1",
        referenceSpaceId: BIGBRAIN_REFERENCE_SPACE_ID,
        coordinate: targetCoordinate,
        region: null,
        mapId: null,
        measurement: {
          label: "Provider coordinate transformation",
          value: "MNI 2009c → BigBrain histology",
          unit: "millimetres",
          method: "Provider-documented DISCO/DARTEL diffeomorphic transform",
        },
        uncertainty: "Provider transformation applies to named template spaces; no HRA/Luna relation, image sampling, region probability, or biological target is implied.",
        provenanceId: "bigbrain-mni-2009c-transform-service",
        licenseId: "bigbrain-mni-transformations",
        retrievedAt: new Date().toISOString(),
        scientificTarget,
        limitation: scientificTarget.limitation ?? "Provider coordinate context only.",
      },
    };
  } catch (error) {
    return unavailableResult(input, `BigBrain transform provider is unavailable: ${error instanceof Error ? error.message : "unknown provider error"}`);
  } finally {
    clearTimeout(timeout);
  }
}
