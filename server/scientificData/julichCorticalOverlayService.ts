import type {
  JulichCorticalOverlay,
} from "@shared/brainScience";
import {
  JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
  JULICH_MNI_2009C_PROVIDER_SPACE_ID,
  JULICH_MNI_2009C_REFERENCE_SPACE_ID,
} from "./scientificReferenceRegistry";

/**
 * This is a deliberately non-rendering manifest. It records the exact provider
 * assets that were inspected and the eligibility decision; it never supplies a
 * mesh URL, creates a Three.js object, or derives geometry from a volume.
 */
export const JULICH_CORTICAL_OVERLAY: JulichCorticalOverlay = {
  id: "julich-brain-v3-1-mni-2009c-cortical-overlay",
  label: "Julich/siibra Scientific Cortical Overlay",
  provider: "EBRAINS / siibra / Julich-Brain",
  datasetVersion: "Julich-Brain Atlas cytoarchitectonic maps v3.1",
  persistentId: "doi:10.25493/KNSN-XB4",
  knowledgeGraphId: "f1fe19e8-99bd-44bc-9616-a52850680777",
  providerParcellationId: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
  referenceSpaceId: JULICH_MNI_2009C_REFERENCE_SPACE_ID,
  providerReferenceSpaceId: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
  mapIds: {
    labelled: "siibra-map-v0.0.1_mni152-jba31-labelled",
    continuousDefaultGranularity: "siibra-map-v0.0.1_mni152-jba31_207-continuous",
    continuousHighGranularity: "siibra-map-v0.0.1_mni152-jba31_227-continuous",
  },
  surfaceDelivery: {
    status: "ASSET_DELIVERY_UNRESOLVED",
    requiredReferenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric",
    requiredGeometry: "Provider-published Julich v3.1 cortical surface geometry with stable region identifiers.",
    assetUrl: null,
    surfaceId: null,
    format: null,
    bytes: null,
    deliveryMode: "none",
    inspectedProviderAssets: [
      {
        path: "fsaverage_surface/lh.JulichBrainAtlas_3.1.label.gii",
        format: "GIFTI label",
        bytes: 69913,
        providerReference: "FreeSurfer fsaverage surface space",
        eligibility: "REJECTED_WRONG_REFERENCE_SPACE",
        reason: "The file is an fsaverage label and not an MNI ICBM 152 2009c asymmetric cortical mesh.",
      },
      {
        path: "fsaverage_surface/rh.JulichBrainAtlas_3.1.label.gii",
        format: "GIFTI label",
        bytes: 69549,
        providerReference: "FreeSurfer fsaverage surface space",
        eligibility: "REJECTED_WRONG_REFERENCE_SPACE",
        reason: "The file is an fsaverage label and not an MNI ICBM 152 2009c asymmetric cortical mesh.",
      },
      {
        path: "maximum-probability-maps_MPMs_207-areas/JulichBrainAtlas_3.1_207areas_MPM_lh_MNI152.nii.gz",
        format: "NIfTI volume",
        bytes: 151961,
        providerReference: "MNI ICBM 152 2009c Nonlinear Asymmetric",
        eligibility: "REJECTED_NOT_SURFACE_GEOMETRY",
        reason: "A labelled volume is not provider-published cortical surface geometry and Luna will not reconstruct a mesh from it.",
      },
      {
        path: "maximum-probability-maps_MPMs_207-areas/JulichBrainAtlas_3.1_207areas_MPM_rh_MNI152.nii.gz",
        format: "NIfTI volume",
        bytes: 154140,
        providerReference: "MNI ICBM 152 2009c Nonlinear Asymmetric",
        eligibility: "REJECTED_NOT_SURFACE_GEOMETRY",
        reason: "A labelled volume is not provider-published cortical surface geometry and Luna will not reconstruct a mesh from it.",
      },
    ],
    reason: "The inspected Julich v3.1 provider bucket exposes fsaverage label files and MNI NIfTI volumes, but no exact MNI ICBM 152 2009c Nonlinear Asymmetric cortical surface geometry, mesh ID, or streamable mesh URL.",
  },
  rendering: {
    defaultVisible: false,
    defaultOpacity: 0.72,
    visibilityControl: "DISABLED_ASSET_UNRESOLVED",
    opacityControl: "DISABLED_ASSET_UNRESOLVED",
    hoverCapability: "UNAVAILABLE_NO_STABLE_PROVIDER_GEOMETRY",
    selectionCapability: "UNAVAILABLE_NO_STABLE_PROVIDER_GEOMETRY",
  },
  licensing: {
    license: "CC BY-NC-SA 4.0",
    licenseStatus: "LICENSE_REVIEW_REQUIRED",
    redistribution: "not-redistributed",
    sourceUrl: "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
    note: "The dataset record is free access under CC BY-NC-SA 4.0. Luna does not bundle, cache, stream, redistribute, or render a provider asset unless an eligible exact surface artifact and deployment-use review are documented.",
  },
  provenanceIds: ["julich-brain-v3-1-mni-2009c"],
  licenseId: "julich-brain-v3-1",
  visualModelRelationship: "The HRA Brain-Female v1.1 GLB remains a separate presentation and Macro-simulation model. No overlay placement, viewer juxtaposition, visual alignment, coordinate conversion, or region mapping establishes HRA/Luna to MNI/Julich registration.",
  limitations: [
    "No MNI 2009b, MNI 2009c symmetric, generic MNI, fsaverage, fs_LR, Colin27, CerebrA, HRA, or Visible Human substitute is used.",
    "The rejected fsaverage label files are never loaded, transformed, or used as geometry.",
    "The MNI NIfTI maps are never converted into a surface or used for inferred region picking.",
    "No Julich region is selected from an HRA mesh name, viewer coordinate, anatomical label, proximity, or geometry.",
    "A future selected Julich region may only be a provider-defined region-probabilistic target and never a nanobot, lower-scale, clinical, or physical target.",
    "BigBrain remains separate provider context; cellular and molecular sources remain sample-scoped.",
  ],
};

export function getJulichCorticalOverlay(): JulichCorticalOverlay {
  return JULICH_CORTICAL_OVERLAY;
}
