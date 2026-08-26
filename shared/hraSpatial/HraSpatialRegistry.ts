import {
  HRA_COORDINATE_SPACES,
  HRA_V11_ALLEN_BRAIN_ASSET,
  isVerifiedHraV11Asset,
  type HraPinnedAsset,
  type HraSpatialRegistrationStatus,
} from "./HraSpatialReference";
import {
  HRA_BRAIN_FEMALE_TO_CCF_BODY,
  HRA_RAW_GLB_TO_BRAIN_FEMALE,
  getHraMniRegistrationStatus,
  type HraSpatialPlacement,
} from "./HraSpatialTransform";
import {
  HRA_LANDMARK_VALIDATION_FRAMEWORK,
  type HraLandmarkValidationFramework,
} from "./HraSpatialValidation";
import {
  ALLEN_ICBM_2009B_CORRESPONDENCE_EVIDENCE,
  type AllenIcbm2009bRegistrationEvidence,
} from "./AllenIcbm2009bEvidence";

export interface HraSpatialRegistration {
  id: string;
  status: HraSpatialRegistrationStatus;
  label: string;
  asset: HraPinnedAsset;
  referenceSpaces: typeof HRA_COORDINATE_SPACES;
  transforms: readonly [
    typeof HRA_RAW_GLB_TO_BRAIN_FEMALE,
    typeof HRA_BRAIN_FEMALE_TO_CCF_BODY,
  ];
  validation: HraLandmarkValidationFramework;
  mni: ReturnType<typeof getHraMniRegistrationStatus>;
  allenIcbm2009b: AllenIcbm2009bRegistrationEvidence;
  provenanceUrls: string[];
  limitations: string[];
}

export const HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION: HraSpatialRegistration = {
  id: "hra-v1-1-allen-f-brain-spatial-registration",
  status: "established",
  label: "Authoritative HRA v1.1 Allen_F_Brain reference-object placement",
  asset: HRA_V11_ALLEN_BRAIN_ASSET,
  referenceSpaces: HRA_COORDINATE_SPACES,
  transforms: [
    HRA_RAW_GLB_TO_BRAIN_FEMALE,
    HRA_BRAIN_FEMALE_TO_CCF_BODY,
  ],
  validation: HRA_LANDMARK_VALIDATION_FRAMEWORK,
  mni: getHraMniRegistrationStatus(),
  allenIcbm2009b: ALLEN_ICBM_2009B_CORRESPONDENCE_EVIDENCE,
  provenanceUrls: [
    "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
    "https://lod.humanatlas.io/ref-organ/brain-female/v1.1/",
    "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
    "https://purl.humanatlas.io/graph/hra-ccf-body",
  ],
  limitations: [
    "The established HRA layer applies only to the exact checksum-pinned raw GLB asset.",
    "The current Three.js viewer presentation frame is deliberately excluded from scientific transform execution.",
    "The HRA graph does not establish GLB vertex-to-Allen-volume correspondence.",
    "The separately recorded Allen Human Reference Atlas 3D / ICBM 2009b correspondence remains unavailable because no GLB-to-annotation artifact or landmark validation is published.",
    "MNI ICBM 152 2009c Nonlinear Asymmetric registration remains not established.",
    "HRA coordinates do not resolve tissue, cellular, molecular, or subcellular biological targets.",
  ],
};

export interface HraSpatialRegistrationResolution {
  registration: HraSpatialRegistration;
  status: HraSpatialRegistrationStatus;
  checksumVerified: boolean;
  message: string;
}

export function getHraSpatialRegistrationForAsset(
  asset: Pick<HraPinnedAsset, "path" | "sha256"> | null | undefined,
): HraSpatialRegistrationResolution {
  const checksumVerified = Boolean(asset && isVerifiedHraV11Asset(asset));

  const status: HraSpatialRegistrationStatus = checksumVerified
    ? "established"
    : "requires-revalidation";

  return {
    registration: {
      ...HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
      status,
    },
    status,
    checksumVerified,
    message: checksumVerified
      ? "The loaded raw asset matches the checksum-pinned HRA v1.1 Allen_F_Brain.glb registration. HRA placement is available; MNI remains not established."
      : "The current raw asset does not match the checksum-pinned HRA v1.1 Allen_F_Brain.glb. The HRA placement requires revalidation and must not be applied automatically.",
  };
}

export function getHraSpatialPlacement(
  id: string,
): HraSpatialPlacement | null {
  return (
    HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION.transforms.find(
      (transform) => transform.id === id,
    ) ?? null
  );
}
