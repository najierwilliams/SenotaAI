import {
  HRA_SPATIAL_UNITS,
  HRA_V11_ALLEN_BRAIN_ASSET,
  hraBrainFemaleCoordinate,
  hraCcfBodyCoordinate,
  lunaRawGlbCoordinate,
  type HraBrainFemaleCoordinate,
  type HraCcfBodyCoordinate,
  type HraCoordinateSpaceId,
  type HraSpatialValidationStatus,
  type LunaRawGlbCoordinate,
} from "./HraSpatialReference";

export interface HraSpatialPlacement {
  id: string;
  label: string;
  sourceSpaceId: HraCoordinateSpaceId;
  targetSpaceId: HraCoordinateSpaceId;
  sourceAsset: typeof HRA_V11_ALLEN_BRAIN_ASSET | null;
  hraVersion: "v1.1";
  placementDate: "2021-12-01";
  units: typeof HRA_SPATIAL_UNITS;
  scale: readonly [number, number, number];
  rotationDegrees: readonly [number, number, number];
  translationMillimetres: readonly [number, number, number];
  applicationOrder: "scale → rotate X/Y/Z → translate";
  provenanceUrl: string;
  validationStatus: HraSpatialValidationStatus;
  validationNote: string;
  mniStatus: "not-established";
}

/**
 * HRA v1.1 Local placement of female brain. These fields are copied verbatim
 * from the authoritative HRA graph for the exact Allen_F_Brain.glb asset.
 */
export const HRA_RAW_GLB_TO_BRAIN_FEMALE: HraSpatialPlacement = {
  id: "hra-v1-1-allen-f-brain-local-placement",
  label: "Raw Allen_F_Brain.glb → HRA Brain-Female",
  sourceSpaceId: "luna-raw-hra-v11-allen-brain-glb",
  targetSpaceId: "hra-brain-female-v1-1",
  sourceAsset: HRA_V11_ALLEN_BRAIN_ASSET,
  hraVersion: "v1.1",
  placementDate: "2021-12-01",
  units: HRA_SPATIAL_UNITS,
  scale: [1, 1, 1],
  rotationDegrees: [-90, 0, 0],
  translationMillimetres: [74.68038, -711.022258, 148.092479],
  applicationOrder: "scale → rotate X/Y/Z → translate",
  provenanceUrl:
    "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
  validationStatus: "metadata-only",
  validationNote:
    "The HRA graph placement and exact asset identity are verified. No independent landmark residual set has been published or executed here.",
  mniStatus: "not-established",
};

/**
 * HRA v1.1 Global placement of female brain. It is intentionally retained as
 * a separate HRA CCF body placement rather than being folded into an MNI claim.
 */
export const HRA_BRAIN_FEMALE_TO_CCF_BODY: HraSpatialPlacement = {
  id: "hra-v1-1-brain-female-global-placement",
  label: "HRA Brain-Female → HRA CCF body reference",
  sourceSpaceId: "hra-brain-female-v1-1",
  targetSpaceId: "hra-ccf-body-v1-2",
  sourceAsset: null,
  hraVersion: "v1.1",
  placementDate: "2021-12-01",
  units: HRA_SPATIAL_UNITS,
  scale: [1, 1, 1],
  rotationDegrees: [0, 0, 0],
  translationMillimetres: [-74.68038, 711.022258, -148.092479],
  applicationOrder: "scale → rotate X/Y/Z → translate",
  provenanceUrl:
    "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
  validationStatus: "metadata-only",
  validationNote:
    "The HRA graph placement is available. Its target is the HRA CCF body graph, not MNI or a clinical reference frame.",
  mniStatus: "not-established",
};

type Vector3 = readonly [number, number, number];

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function applyRotationX([x, y, z]: Vector3, degrees: number): Vector3 {
  const angle = radians(degrees);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [x, y * cosine - z * sine, y * sine + z * cosine];
}

function applyRotationY([x, y, z]: Vector3, degrees: number): Vector3 {
  const angle = radians(degrees);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [x * cosine + z * sine, y, -x * sine + z * cosine];
}

function applyRotationZ([x, y, z]: Vector3, degrees: number): Vector3 {
  const angle = radians(degrees);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [x * cosine - y * sine, x * sine + y * cosine, z];
}

function applyPlacement(
  point: { x: number; y: number; z: number },
  placement: HraSpatialPlacement,
): Vector3 {
  const scaled: Vector3 = [
    point.x * placement.scale[0],
    point.y * placement.scale[1],
    point.z * placement.scale[2],
  ];
  const rotateX = applyRotationX(scaled, placement.rotationDegrees[0]);
  const rotateY = applyRotationY(rotateX, placement.rotationDegrees[1]);
  const rotateZ = applyRotationZ(rotateY, placement.rotationDegrees[2]);
  return [
    rotateZ[0] + placement.translationMillimetres[0],
    rotateZ[1] + placement.translationMillimetres[1],
    rotateZ[2] + placement.translationMillimetres[2],
  ];
}

function applyInversePlacement(
  point: { x: number; y: number; z: number },
  placement: HraSpatialPlacement,
): Vector3 {
  const untranslated: Vector3 = [
    point.x - placement.translationMillimetres[0],
    point.y - placement.translationMillimetres[1],
    point.z - placement.translationMillimetres[2],
  ];
  const inverseZ = applyRotationZ(
    untranslated,
    -placement.rotationDegrees[2],
  );
  const inverseY = applyRotationY(
    inverseZ,
    -placement.rotationDegrees[1],
  );
  const inverseX = applyRotationX(
    inverseY,
    -placement.rotationDegrees[0],
  );
  return [
    inverseX[0] / placement.scale[0],
    inverseX[1] / placement.scale[1],
    inverseX[2] / placement.scale[2],
  ];
}

export function rawGlbToHraBrainFemale(
  coordinate: LunaRawGlbCoordinate,
): HraBrainFemaleCoordinate {
  const [x, y, z] = applyPlacement(
    coordinate,
    HRA_RAW_GLB_TO_BRAIN_FEMALE,
  );
  return hraBrainFemaleCoordinate(x, y, z);
}

export function hraBrainFemaleToRawGlb(
  coordinate: HraBrainFemaleCoordinate,
): LunaRawGlbCoordinate {
  const [x, y, z] = applyInversePlacement(
    coordinate,
    HRA_RAW_GLB_TO_BRAIN_FEMALE,
  );
  return lunaRawGlbCoordinate(x, y, z);
}

export function hraBrainFemaleToHraCcfBody(
  coordinate: HraBrainFemaleCoordinate,
): HraCcfBodyCoordinate {
  const [x, y, z] = applyPlacement(
    coordinate,
    HRA_BRAIN_FEMALE_TO_CCF_BODY,
  );
  return hraCcfBodyCoordinate(x, y, z);
}

export function hraCcfBodyToHraBrainFemale(
  coordinate: HraCcfBodyCoordinate,
): HraBrainFemaleCoordinate {
  const [x, y, z] = applyInversePlacement(
    coordinate,
    HRA_BRAIN_FEMALE_TO_CCF_BODY,
  );
  return hraBrainFemaleCoordinate(x, y, z);
}

/**
 * There is intentionally no rawGlbToMni/hraToMni executable function. The
 * missing mesh-to-Allen-volume and inter-template links are represented as a
 * status, not replaced with calculated coordinates.
 */
export function getHraMniRegistrationStatus(): {
  status: "not-established";
  reason: string;
} {
  return {
    status: "not-established",
    reason:
      "HRA v1.1 establishes reference-object placements only. No authoritative HRA/Allen mesh-to-MNI ICBM 152 2009c Nonlinear Asymmetric chain or landmark validation is available.",
  };
}
