import type { BrainReferenceSpace } from "@shared/brainScience";

export type ScientificReferenceStatus =
  | "available"
  | "validated"
  | "deprecated"
  | "unavailable";

/**
 * A scientific coordinate source that remains independent of Luna's visual
 * GLB. `validated` here means valid within the named provider reference space;
 * it never means a Luna-to-provider registration exists.
 */
export interface ScientificReferenceAsset {
  id: string;
  name: string;
  provider: "ebrains" | "julich-brain";
  version: string;
  status: ScientificReferenceStatus;
  role: "scientific-coordinate-reference";
  referenceSpaceId: string;
  providerReferenceSpaceId: string;
  coordinateSystem: string;
  units: "millimetres";
  axisOrientation: string;
  handedness: string | null;
  origin: string;
  assetAvailability: "provider-hosted";
  assetFormats: string[];
  assetUrl: string | null;
  metadataUrl: string;
  license: string;
  provenance: string[];
  structureSource: {
    providerParcellationId: string;
    kind: "probabilistic-cytoarchitectonic-map";
    identifiers: "siibra region identifiers and provider ontology identifiers";
    mappingPolicy: string;
  };
  transformSources: string[];
  availableScales: Array<"tissue" | "cellular" | "molecular">;
  visualModelRelationship: string;
  limitations: string[];
}

export const JULICH_MNI_2009C_REFERENCE_SPACE_ID =
  "ebrains-mni-icbm-152-2009c";
export const JULICH_MNI_2009C_PROVIDER_SPACE_ID =
  "minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2";
/** Current Multilevel Human Atlas parcellation identity returned by siibra. */
export const JULICH_BRAIN_PROVIDER_PARCELLATION_ID =
  "minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-310";

export const SCIENTIFIC_REFERENCE_ASSETS: ScientificReferenceAsset[] = [
  {
    id: "julich-brain-v3-1-mni-icbm-152-2009c",
    name: "Julich-Brain v3.1 in MNI ICBM 152 2009c Nonlinear Asymmetric",
    provider: "julich-brain",
    version: "Julich-Brain cytoarchitectonic maps v3.1; MNI ICBM 152 2009c nonlinear asymmetric",
    status: "validated",
    role: "scientific-coordinate-reference",
    referenceSpaceId: JULICH_MNI_2009C_REFERENCE_SPACE_ID,
    providerReferenceSpaceId: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
    coordinateSystem: "MNI stereotaxic XYZ coordinates in the named MNI ICBM 152 2009c nonlinear asymmetric template.",
    units: "millimetres",
    axisOrientation: "XYZ as declared by the live siibra/openMINDS provider metadata; no further axis semantic is inferred by Luna.",
    handedness: null,
    origin: "Provider metadata declares axes-origin values [0, 0, 0]. Its native image unit is micrometres; Luna only accepts explicit query values expressed in millimetres and does not infer a Luna conversion.",
    assetAvailability: "provider-hosted",
    assetFormats: ["NIfTI volume", "GIFTI label in fsaverage space (ineligible for this MNI integration)"],
    assetUrl: null,
    metadataUrl: "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
    license: "CC BY-NC-SA 4.0 for Julich-Brain v3.1 maps; Luna does not redistribute maps or meshes.",
    provenance: [
      "https://julich-brain-atlas.de/atlas",
      "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
      "https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/",
      "https://siibra-api-stable.apps.hbp.eu/v3_0/redoc",
    ],
    structureSource: {
      providerParcellationId: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
      kind: "probabilistic-cytoarchitectonic-map",
      identifiers: "siibra region identifiers and provider ontology identifiers",
      mappingPolicy:       "Provider-returned region identifiers may be used only for an explicit Julich coordinate assignment. They are not inferred from Luna mesh names, display labels, HRA placement, or approved UBERON identity.",
    },
    transformSources: [
      "Provider-declared identity inside MNI ICBM 152 2009c nonlinear asymmetric only.",
      "No Luna GLB ↔ MNI/Julich transform is registered or executable.",
      "Provider relationships to BigBrain remain provider-scoped and are not composed with Luna.",
    ],
    availableScales: ["tissue"],
    visualModelRelationship: "Luna/HRA Brain-Female GLB remains a separate presentation-only model. No visual vertex, mesh, viewer coordinate, or bounds mapping is implied.",
    limitations: [
      "This registry does not bundle a Julich or MNI volume, mesh, or probability map.",
      "The inspected v3.1 provider bucket exposes fsaverage GIFTI labels and MNI NIfTI volumes, but no exact MNI ICBM 152 2009c Nonlinear Asymmetric cortical surface geometry or mesh URL.",
      "The selected provider reference supports direct provider-space queries, not Luna-local navigation.",
      "Cellular and molecular observations remain unavailable for spatial operations until a separately documented, dataset-specific reference-space relation and gate are present.",
      "BigBrain relationships are provider-specific; their terms must be reviewed before any derivative or redistributed use.",
    ],
  },
];

export function getSelectedScientificReference(): ScientificReferenceAsset {
  return SCIENTIFIC_REFERENCE_ASSETS[0];
}

export function getSelectedScientificReferenceSpace(
  spaces: BrainReferenceSpace[],
): BrainReferenceSpace | null {
  return spaces.find((space) =>
    space.id === JULICH_MNI_2009C_REFERENCE_SPACE_ID,
  ) ?? null;
}
