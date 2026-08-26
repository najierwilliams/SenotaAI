export const HRA_SPATIAL_UNITS = "millimetres" as const;

export type HraSpatialValidationStatus =
  | "verified"
  | "metadata-only"
  | "requires-validation"
  | "unavailable";

export type HraSpatialRegistrationStatus =
  | "established"
  | "requires-revalidation"
  | "unavailable";

export type HraMniRegistrationStatus = "not-established";

export type HraCoordinateSpaceId =
  | "luna-raw-hra-v11-allen-brain-glb"
  | "hra-brain-female-v1-1"
  | "hra-ccf-body-v1-2"
  | "luna-viewer-presentation"
  | "mni-icbm-152-2009c-asym";

export interface HraCoordinateSpace {
  id: HraCoordinateSpaceId;
  label: string;
  category:
    | "raw-glb"
    | "hra-reference-object"
    | "hra-body-reference"
    | "viewer-presentation"
    | "external-template";
  units: typeof HRA_SPATIAL_UNITS | null;
  coordinateConvention: string;
  provenanceUrl: string | null;
  scientificUse: string;
}

/**
 * The checksum is the identity guard for HRA scientific placement records. It
 * intentionally binds the registration to the unmodified raw GLB, not to a
 * Three.js scene after visual centering, scaling, camera framing, or picking.
 */
export interface HraPinnedAsset {
  path: string;
  label: string;
  sha256: string;
  sourceUrl: string;
  version: "v1.1";
  persistentIdentifier: string;
  recordUrl: string;
  license: "CC BY 4.0";
}

export const HRA_V11_ALLEN_BRAIN_ASSET: HraPinnedAsset = {
  path: "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
  label: "HRA v1.1 Allen_F_Brain.glb",
  sha256:
    "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc",
  sourceUrl:
    "https://cdn.humanatlas.io/hra-releases/v1.1/models/Allen_F_Brain.glb",
  version: "v1.1",
  persistentIdentifier:
    "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
  recordUrl:
    "https://lod.humanatlas.io/ref-organ/brain-female/v1.1/",
  license: "CC BY 4.0",
};

export const HRA_COORDINATE_SPACES: Record<
  HraCoordinateSpaceId,
  HraCoordinateSpace
> = {
  "luna-raw-hra-v11-allen-brain-glb": {
    id: "luna-raw-hra-v11-allen-brain-glb",
    label: "Raw Luna/HRA Allen_F_Brain GLB",
    category: "raw-glb",
    units: HRA_SPATIAL_UNITS,
    coordinateConvention:
      "Exact HRA v1.1 Allen_F_Brain.glb object frame; source of the published HRA local SpatialPlacement.",
    provenanceUrl:
      "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
    scientificUse:
      "Scientific source frame only when the loaded asset checksum matches the HRA v1.1 pinned asset.",
  },
  "hra-brain-female-v1-1": {
    id: "hra-brain-female-v1-1",
    label: "HRA Brain-Female v1.1",
    category: "hra-reference-object",
    units: HRA_SPATIAL_UNITS,
    coordinateConvention:
      "HRA CCF Brain-female spatial entity declared by the versioned reference-object graph.",
    provenanceUrl:
      "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
    scientificUse:
      "Authoritative HRA reference-object coordinate target; it is not an MNI or clinical stereotactic frame.",
  },
  "hra-ccf-body-v1-2": {
    id: "hra-ccf-body-v1-2",
    label: "HRA CCF body reference",
    category: "hra-body-reference",
    units: HRA_SPATIAL_UNITS,
    coordinateConvention:
      "HRA CCF body graph coordinate context used by the Brain-female global placement.",
    provenanceUrl:
      "https://purl.humanatlas.io/graph/hra-ccf-body",
    scientificUse:
      "Reference-object assembly context only; it is not an MNI, clinical, tissue, cellular, or molecular coordinate space.",
  },
  "luna-viewer-presentation": {
    id: "luna-viewer-presentation",
    label: "Luna viewer presentation space",
    category: "viewer-presentation",
    units: null,
    coordinateConvention:
      "Three.js display frame after BrainViewer centering, uniform normalization, camera framing, and interaction transforms.",
    provenanceUrl: null,
    scientificUse:
      "Visual presentation only. It must not be supplied to HRA transform functions or reported as a scientific coordinate frame.",
  },
  "mni-icbm-152-2009c-asym": {
    id: "mni-icbm-152-2009c-asym",
    label: "MNI ICBM 152 2009c Nonlinear Asymmetric",
    category: "external-template",
    units: HRA_SPATIAL_UNITS,
    coordinateConvention:
      "External neuroimaging template coordinate frame; no HRA/Luna bridge is established.",
    provenanceUrl:
      "https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/",
    scientificUse:
      "Unavailable from Luna and HRA Brain-female until an authoritative, validated chain is supplied.",
  },
};

const coordinateSpaceBrand: unique symbol = Symbol("hra-coordinate-space");

export type HraCoordinate<Space extends HraCoordinateSpaceId> = Readonly<{
  x: number;
  y: number;
  z: number;
  units: typeof HRA_SPATIAL_UNITS;
  readonly [coordinateSpaceBrand]: Space;
}>;

function assertFiniteCoordinate(
  x: number,
  y: number,
  z: number,
): void {
  if (![x, y, z].every(Number.isFinite)) {
    throw new Error("HRA coordinates must contain finite x, y, and z values.");
  }
}

function createHraCoordinate<Space extends HraCoordinateSpaceId>(
  space: Space,
  x: number,
  y: number,
  z: number,
): HraCoordinate<Space> {
  assertFiniteCoordinate(x, y, z);
  return {
    x,
    y,
    z,
    units: HRA_SPATIAL_UNITS,
    [coordinateSpaceBrand]: space,
  };
}

export type LunaRawGlbCoordinate = HraCoordinate<"luna-raw-hra-v11-allen-brain-glb">;
export type HraBrainFemaleCoordinate = HraCoordinate<"hra-brain-female-v1-1">;
export type HraCcfBodyCoordinate = HraCoordinate<"hra-ccf-body-v1-2">;

export function lunaRawGlbCoordinate(
  x: number,
  y: number,
  z: number,
): LunaRawGlbCoordinate {
  return createHraCoordinate("luna-raw-hra-v11-allen-brain-glb", x, y, z);
}

export function hraBrainFemaleCoordinate(
  x: number,
  y: number,
  z: number,
): HraBrainFemaleCoordinate {
  return createHraCoordinate("hra-brain-female-v1-1", x, y, z);
}

export function hraCcfBodyCoordinate(
  x: number,
  y: number,
  z: number,
): HraCcfBodyCoordinate {
  return createHraCoordinate("hra-ccf-body-v1-2", x, y, z);
}

export interface ViewerPresentationCoordinate {
  x: number;
  y: number;
  z: number;
  coordinateSpace: "luna-viewer-presentation";
}

export function viewerPresentationCoordinate(
  x: number,
  y: number,
  z: number,
): ViewerPresentationCoordinate {
  assertFiniteCoordinate(x, y, z);
  return {
    x,
    y,
    z,
    coordinateSpace: "luna-viewer-presentation",
  };
}

export function isVerifiedHraV11Asset(
  asset: Pick<HraPinnedAsset, "path" | "sha256">,
): boolean {
  return (
    asset.path === HRA_V11_ALLEN_BRAIN_ASSET.path &&
    asset.sha256 === HRA_V11_ALLEN_BRAIN_ASSET.sha256
  );
}
