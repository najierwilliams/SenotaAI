import type {
  BrainCoordinateTransform,
  BrainDataset,
  BrainReferenceSpace,
  BrainScientificDatasetManifest,
  LunaReferenceRegistration,
} from "@shared/brainScience";
import {
  HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
} from "@shared/hraSpatial";
import { SCIENTIFIC_REFERENCE_ASSETS } from "./scientificReferenceRegistry";

export const BRAIN_REFERENCE_SPACES: BrainReferenceSpace[] = [
  {
    id: "luna-viewer-local",
    label: "Luna viewer local coordinates",
    kind: "viewer-local",
    provider: "luna",
    template: null,
    units: null,
    axisOrientation: null,
    coordinateConvention:
      "Three.js presentation coordinates after BrainViewer centering and display scaling.",
    resolution: null,
    version: null,
    provenanceUrl: null,
    description:
      "Viewer presentation frame only. BrainViewer centres and display-scales the loaded mesh for rendering; it is not the checksum-pinned raw GLB coordinate frame and has no validated transform to external scientific reference spaces.",
  },
  {
    id: "luna-raw-hra-v11-allen-brain-glb",
    label: "Raw Luna/HRA Allen_F_Brain GLB",
    kind: "raw-asset",
    provider: "luna",
    template: null,
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention:
      "Exact raw HRA v1.1 Allen_F_Brain.glb object frame, valid only for the checksum-pinned asset.",
    resolution: null,
    version: "HRA v1.1",
    provenanceUrl:
      "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
    description:
      "Scientific source frame for the authoritative HRA local placement. It is distinct from the Three.js viewer presentation frame and is not MNI.",
  },
  {
    id: "hra-brain-female-v1-1",
    label: "HRA Brain-Female v1.1",
    kind: "hra-reference-object",
    provider: "luna",
    template: "HRA Brain-female reference organ",
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention:
      "HRA CCF reference-object spatial entity reached from the exact raw GLB by the v1.1 published placement.",
    resolution: null,
    version: "HRA v1.1",
    provenanceUrl:
      "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
    description:
      "Authoritative HRA reference-object space. It is not MNI, a clinical stereotactic frame, or a provider coordinate system for lower-scale observations.",
  },
  {
    id: "hra-ccf-body-v1-2",
    label: "HRA CCF body reference",
    kind: "hra-body-reference",
    provider: "luna",
    template: "HRA CCF body graph",
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention:
      "HRA CCF body graph target of the v1.1 Brain-female global placement.",
    resolution: null,
    version: "HRA CCF body graph v1.2",
    provenanceUrl: "https://purl.humanatlas.io/graph/hra-ccf-body",
    description:
      "HRA body reference context used to assemble reference objects. It does not create an MNI, tissue, cellular, molecular, or subcellular target coordinate.",
  },
  {
    id: "ebrains-mni-icbm-152-2009c",
    label: "MNI ICBM 152 2009c",
    kind: "template",
    provider: "ebrains",
    template: "ICBM 152 2009c",
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention: "Provider MNI/ICBM template coordinates",
    resolution: "1 × 1 × 1 mm",
    version: "2009c nonlinear asymmetric",
    provenanceUrl: "https://search.kg.ebrains.eu/instances/Dataset/4ac9f0bc-560d-47e0-8916-7b24da9bb0ce",
    description:
      "A human atlas reference space exposed by the EBRAINS multilevel human atlas.",
  },
  {
    id: "ebrains-bigbrain",
    label: "BigBrain reference space",
    kind: "histological",
    provider: "bigbrain",
    template: "BigBrain",
    units: "micrometres",
    axisOrientation: null,
    coordinateConvention: "Provider histological reference coordinates",
    resolution: "20 μm",
    version: null,
    provenanceUrl: "https://ebrains.eu/data-tools-services/brain-atlases/human-brain",
    description:
      "Microscopic 20 μm histological reference represented in the EBRAINS multilevel atlas.",
  },
  {
    id: "allen-human-donor-mr",
    label: "Allen Human Brain Atlas donor MR space",
    kind: "donor-native",
    provider: "allen-institute",
    template: null,
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention: "Donor MR volume coordinates",
    resolution: "1 mm isotropic donor T1 acquisition",
    version: null,
    provenanceUrl: "https://brain-map.org/support/documentation/human-brain-atlas-api",
    description:
      "Donor-specific MR-volume coordinates of Allen Human Brain Atlas sampling sites. These are not interchangeable with Luna viewer coordinates.",
  },
  {
    id: "cellxgene-human-brain-anatomical-annotation",
    label: "CELLxGENE human-brain anatomical annotation",
    kind: "annotation",
    provider: "cellxgene",
    template: null,
    units: null,
    axisOrientation: null,
    coordinateConvention: null,
    resolution: null,
    version: "Human Brain Cell Atlas v1.0",
    provenanceUrl: "https://cellxgene.cziscience.com/collections/283d65eb-dd53-496d-adb7-7570c7caa443",
    description:
      "Dataset anatomical-region annotation metadata. It is not a 3D spatial coordinate system.",
  },
];

export const BRAIN_COORDINATE_TRANSFORMS: BrainCoordinateTransform[] = [
  {
    id: "luna-to-ebrains-mni",
    sourceReferenceSpaceId: "luna-viewer-local",
    targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    status: "unavailable",
    transformType: "unavailable",
    version: null,
    method: null,
    documentationUrl: null,
    confidence: null,
    reversible: null,
    note:
      "No validated transform from the Luna GLB coordinate frame to MNI is configured. Luna does not project external coordinates into the viewer.",
  },
  {
    id: "ebrains-mni-to-luna",
    sourceReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    targetReferenceSpaceId: "luna-viewer-local",
    status: "unavailable",
    transformType: "unavailable",
    version: null,
    method: null,
    documentationUrl: null,
    confidence: null,
    reversible: null,
    note:
      "No validated transform from MNI ICBM 152 2009c to the Luna GLB coordinate frame is configured. Provider coordinates are not projected into the viewer.",
  },
  {
    id: "luna-raw-hra-v11-allen-brain-glb-to-ebrains-mni-icbm-152-2009c",
    sourceReferenceSpaceId: "luna-raw-hra-v11-allen-brain-glb",
    targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    status: "unavailable",
    transformType: "unavailable",
    version: null,
    method: null,
    documentationUrl: null,
    confidence: null,
    reversible: null,
    note:
      "P33 NOT_ESTABLISHED: the checksum-pinned raw HRA GLB lacks a documented GLB-to-Allen-volume correspondence, native-coordinate convention, transform artifact, and independently validated landmark residuals for MNI ICBM 152 2009c Nonlinear Asymmetric.",
  },
  {
    id: "ebrains-mni-icbm-152-2009c-to-luna-raw-hra-v11-allen-brain-glb",
    sourceReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    targetReferenceSpaceId: "luna-raw-hra-v11-allen-brain-glb",
    status: "unavailable",
    transformType: "unavailable",
    version: null,
    method: null,
    documentationUrl: null,
    confidence: null,
    reversible: null,
    note:
      "P33 NOT_ESTABLISHED: MNI ICBM 152 2009c coordinates cannot be projected into the raw HRA GLB without the same verified forward chain and independent validation.",
  },
  {
    id: "allen-donor-mr-to-mni",
    sourceReferenceSpaceId: "allen-human-donor-mr",
    targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    status: "available",
    transformType: "provider-service",
    version: null,
    method: "Provider-documented donor-specific MR-to-MNI registration",
    documentationUrl:
      "https://brain-map.org/support/documentation/human-brain-atlas-api",
    confidence: null,
    reversible: null,
    note:
      "The Allen provider documents donor-specific transforms. Luna does not apply them client-side; returned sample coordinates remain provider provenance.",
  },
];

export const BRAIN_LUNA_REFERENCE_REGISTRATION: LunaReferenceRegistration = {
  id: "luna-local-to-ebrains-mni-registration-v1",
  status: "unavailable",
  sourceSpaceId: "luna-viewer-local",
  targetSpaceId: "ebrains-mni-icbm-152-2009c",
  sourceAsset: {
    path: "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
    sha256:
      "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc",
    label: "HuBMAP CCF Brain-female v1.1 / Allen_F_Brain.glb",
    provider: "HuBMAP Human Reference Atlas",
    sourceUrl:
      "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/assets/Allen_F_Brain.glb",
    sourceVersion: "HRA Brain-female v1.1",
    license: "CC BY 4.0",
  },
  registrationMethod: "unavailable",
  transformType: "unavailable",
  transformArtifact: null,
  sourceUnits: null,
  targetUnits: "millimetres",
  sourceOrientation: null,
  targetOrientation: null,
  qualityGate: {
    status: "NOT_ESTABLISHED",
    assessedAt: "2026-08-26",
    assessmentVersion: "P33",
    decision:
      "A reproducible, independently validated transform from the exact Luna/HRA Allen_F_Brain GLB to MNI ICBM 152 2009c Nonlinear Asymmetric is not established. No Luna-native or reverse MNI coordinate conversion is enabled.",
    transformEnabled: false,
    requiredEvidence: [
      "Checksum-bound source asset/version plus documented native coordinate units, axes, handedness, and origin.",
      "Declared MNI ICBM 152 2009c Nonlinear Asymmetric target template/version and an executable, direction-specific transform chain.",
      "Documented GLB-to-Allen 3D/ICBM 2009b correspondence and any explicit 2009b Nonlinear Symmetric to 2009c Nonlinear Asymmetric conversion artifact.",
      "Independent source-target landmark pairs distributed across bilateral, anterior-posterior, and superior-inferior anatomy, with residuals and quality metrics.",
      "Independent validation review that binds results to the exact source checksum and transformation artifact hashes.",
    ],
    missingEvidence: [
      "No published raw GLB mesh-generation, per-vertex, or voxel correspondence to the Allen Human Reference Atlas 3D annotation volume.",
      "No published raw GLB-to-ICBM 2009b Nonlinear Symmetric affine, deformation field, or native coordinate-convention artifact.",
      "No published ICBM 2009b Nonlinear Symmetric-to-ICBM 2009c Nonlinear Asymmetric conversion artifact for this chain.",
      "No independent GLB-to-MNI landmark-pair file, residual distribution, target-registration quality metric, or validation report.",
    ],
  },
  provenance: {
    sourceUrls: [
      "https://hubmapconsortium.github.io/ccf-releases/v1.1/docs/ref-organs/brain-female.html",
      "https://apps.humanatlas.io/kg-explorer/ref-organ/brain-female/v1.1",
      "https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405",
      "https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/",
    ],
    citations: [
      "Browne K, et al. HuBMAP CCF 3D Reference Object Library, Brain-female v1.1, DOI: 10.48539/HBM724.XTTN.487.",
      "Ding SL, et al. Allen Human Reference Atlas – 3D, 2020, RRID:SCR_017764, version 1.0.0.",
      "Fonov VS, et al. ICBM 152 Nonlinear Atlases (2009).",
    ],
    notes: [
      "The repository GLB is byte-identical to the documented HuBMAP v1.1 Allen_F_Brain.glb asset (SHA-256 c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc).",
      "HuBMAP documents a mirrored and resized presentation model derived from the Allen Human Reference Atlas, but does not publish a mesh-to-MNI transform, native mesh coordinate convention, mesh-generation correspondence, or landmark validation artifact.",
      "The Allen Human Reference Atlas 3D volume was drawn on ICBM 2009b Nonlinear Symmetric, while this target is MNI ICBM 152 2009c Nonlinear Asymmetric; no authoritative raw-GLB-to-2009b or 2009b-to-2009c chain artifact was found.",
    ],
  },
  validation: {
    status: "unavailable",
    method: null,
    landmarks: [
      {
        id: "left-right-orientation",
        label: "Left/right orientation",
        sourceCoordinate: null,
        targetCoordinate: null,
        residualMillimetres: null,
        status: "not-evaluated",
        note: "No source mesh orientation or validated landmark correspondence is published for this GLB.",
      },
      {
        id: "anterior-posterior-orientation",
        label: "Anterior/posterior orientation",
        sourceCoordinate: null,
        targetCoordinate: null,
        residualMillimetres: null,
        status: "not-evaluated",
        note: "No source mesh coordinate convention or registration artifact is available.",
      },
      {
        id: "hippocampal-region",
        label: "Hippocampal region correspondence",
        sourceCoordinate: null,
        targetCoordinate: null,
        residualMillimetres: null,
        status: "not-evaluated",
        note: "Anatomical labels alone are not landmark coordinates and cannot validate a transform.",
      },
      {
        id: "ventricular-region",
        label: "Ventricular region correspondence",
        sourceCoordinate: null,
        targetCoordinate: null,
        residualMillimetres: null,
        status: "not-evaluated",
        note: "No mapped source-to-target landmark pair is retained with the GLB.",
      },
    ],
    summary:
      "No Luna Local-to-MNI transform was validated because the verified GLB has no published coordinate convention, transform artifact, or landmark correspondence to MNI ICBM 152 2009c Nonlinear Asymmetric.",
  },
  confidence: null,
  createdAt: "2026-08-25",
  version: "1.0.0",
  blockers: [
    "The verified HRA GLB has no declared source units, axis orientation, origin, or MNI coordinate convention.",
    "No authoritative transform artifact maps the mirrored/resized HRA presentation mesh to MNI ICBM 152 2009c Nonlinear Asymmetric.",
    "No source-to-target anatomical landmark correspondence set with validation residuals is published for this asset.",
  ],
};

export const BRAIN_DATASETS: BrainDataset[] = [
  {
    id: "luna-macro-anatomy-model",
    name: "Luna Macro Anatomy Model",
    provider: "luna",
    scale: "macro",
    modality: "3D anatomical mesh",
    species: "Homo sapiens",
    version: "HRA Brain-female v1.1",
    status: "available",
    accessType: "local-asset",
    endpoint: null,
    assetUrl:
      "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
    requiresAuthentication: false,
    downloadable: false,
    approximateSize: null,
    license: "CC BY 4.0 (HuBMAP Human Reference Atlas); local asset SHA-256 c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc.",
    citation:
      "Browne K, et al. HuBMAP CCF 3D Reference Object Library, Brain-female v1.1. DOI: 10.48539/HBM724.XTTN.487.",
    referenceSpaceIds: [
      "luna-viewer-local",
      "luna-raw-hra-v11-allen-brain-glb",
      "hra-brain-female-v1-1",
      "hra-ccf-body-v1-2",
    ],
    description:
      "Repository-local copy of the byte-verified HuBMAP Human Reference Atlas Brain-female v1.1 Allen_F_Brain.glb anatomical reference object, derived using Allen Human Reference Atlas data, mirrored to form a whole brain, and resized to fit Visible Human bodies.",
    limitations:
      "The HRA presentation mesh has no published Luna/GLB-to-MNI mapping, source units, axis orientation, origin, or landmark validation. It is not a documented MNI, ICBM, donor-MR, or BigBrain transform; viewer centering and display normalization are never scientific transforms.",
  },
  {
    id: "ebrains-multilevel-human-atlas",
    name: "EBRAINS Multilevel Human Brain Atlas",
    provider: "ebrains",
    scale: "tissue",
    modality: "Probabilistic cytoarchitecture and regional atlas metadata",
    species: "Homo sapiens",
    version: "siibra API v3.0",
    status: "partial",
    accessType: "remote-api",
    endpoint: "https://siibra-api-stable.apps.hbp.eu/v3_0",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: null,
    license: "Dataset and asset specific; no provider data is redistributed by Luna.",
    citation:
      "Amunts K, Mohlberg H, Bludau S, Zilles K. Julich-Brain: A 3D probabilistic atlas of the human brain’s cytoarchitecture. Science. 2020;369(6506):988-992. https://doi.org/10.1126/science.abb4588",
    referenceSpaceIds: [
      "ebrains-mni-icbm-152-2009c",
      "ebrains-bigbrain",
    ],
    description:
      "Remote atlas metadata and regional feature discovery through the documented public siibra HTTP API.",
    limitations:
      "Luna exposes verified atlas metadata and provenance only. It does not download or render raw probabilistic volumes, and region mappings remain query-reviewed.",
  },
  {
    id: "julich-brain-cytoarchitecture",
    name: "Julich-Brain Cytoarchitectonic Atlas",
    provider: "julich-brain",
    scale: "tissue",
    modality: "3D probabilistic cytoarchitectonic maps",
    species: "Homo sapiens",
    version: null,
    status: "partial",
    accessType: "remote-api",
    endpoint: "https://siibra-api-stable.apps.hbp.eu/v3_0/atlases/juelich/iav/atlas/v1.0.0/1",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "Tera- to petabyte-scale source imaging pipeline",
    license: "Dataset and asset specific; no raw map is copied into Luna.",
    citation:
      "Amunts K, Mohlberg H, Bludau S, Zilles K. Julich-Brain: A 3D probabilistic atlas of the human brain’s cytoarchitecture. Science. 2020;369(6506):988-992. https://doi.org/10.1126/science.abb4588",
    referenceSpaceIds: [
      "ebrains-mni-icbm-152-2009c",
      "ebrains-bigbrain",
    ],
    description:
      "Cytoarchitectonic tissue context reached through the EBRAINS/siibra atlas service.",
    limitations:
      "No raw probability map is converted to a false binary boundary or displayed in Luna’s local coordinate frame.",
  },
  {
    id: "bigbrain-microscopic-reference",
    name: "BigBrain Microscopic Human Brain Reference",
    provider: "bigbrain",
    scale: "tissue",
    modality: "20 μm histological 3D reference",
    species: "Homo sapiens",
    version: null,
    status: "unsupported",
    accessType: "remote-stream",
    endpoint: "https://bigbrainproject.org/",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: ">1 TB full dataset",
    license: "Dataset-specific terms must be reviewed before derivative use or redistribution.",
    citation:
      "Amunts K, et al. BigBrain: An Ultrahigh-Resolution 3D Human Brain Model. Science. 2013;340(6139):1472-1475. https://doi.org/10.1126/science.1235381",
    referenceSpaceIds: ["ebrains-bigbrain"],
    description:
      "A microscopic reference discoverable in EBRAINS; retained as a future streaming/derived-map candidate.",
    limitations:
      "The full source dataset is too large for GitHub and browser payloads. Luna does not download, cache, or render the raw volume.",
  },
  {
    id: "cellxgene-human-brain-cell-atlas-v1",
    name: "Human Brain Cell Atlas v1.0",
    provider: "cellxgene",
    scale: "cellular",
    modality: "Single-nucleus transcriptomic cell metadata",
    species: "Homo sapiens",
    version: "CELLxGENE collection version retrieved at runtime",
    status: "partial",
    accessType: "server-query",
    endpoint:
      "https://api.cellxgene.cziscience.com/curation/v1/collections/283d65eb-dd53-496d-adb7-7570c7caa443",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "Collection contains >3 million nuclei; individual H5AD files vary by subset.",
    license: "Dataset-specific; Luna retrieves metadata only and does not redistribute H5AD files.",
    citation:
      "Siletti K, et al. A cellular census of the human brain. Science. 2023. https://doi.org/10.1126/science.add7046",
    referenceSpaceIds: [
      "cellxgene-human-brain-anatomical-annotation",
    ],
    description:
      "Lazy server-side collection metadata lookup for selected anatomy, returning only bounded dataset summaries.",
    limitations:
      "The collection is transcriptomic and anatomical metadata, not a 3D coordinate set aligned to the Luna GLB. Luna does not render cells without provider-supported positions.",
  },
  {
    id: "allen-human-brain-atlas-microarray",
    name: "Allen Human Brain Atlas Microarray",
    provider: "allen-institute",
    scale: "molecular",
    modality: "Microarray gene-expression sampling metadata and expression service",
    species: "Homo sapiens",
    version: null,
    status: "partial",
    accessType: "remote-api",
    endpoint: "https://api.brain-map.org/api/v2/data/query.json",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "Provider data and downloads vary by donor and query.",
    license: "Use is subject to provider terms and citation policy; Luna does not redistribute raw data.",
    citation:
      "Allen Institute for Brain Science. Allen Human Brain Atlas API. https://brain-map.org/support/documentation/human-brain-atlas-api",
    referenceSpaceIds: ["allen-human-donor-mr"],
    description:
      "Lazy remote lookup of provider structure metadata for molecular queries, with exact results and donor/MR provenance retained.",
    limitations:
      "No expression value is inferred for an unmatched Luna structure or interpolated across anatomy. Returned molecular measurements require an exact provider structure/probe query.",
  },
  {
    id: "human-cortical-em-fragment",
    name: "Human Cortical Electron-Microscopy Fragment",
    provider: "human-em",
    scale: "subcellular",
    modality: "Electron-microscopy reconstruction",
    species: "Homo sapiens",
    version: null,
    status: "unavailable",
    accessType: "download",
    endpoint: null,
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "~1.4 PB source imaging data",
    license: "Provider-specific; no source data is included in Luna.",
    citation:
      "Shapson-Coe A, et al. A petavoxel fragment of human cerebral cortex reconstructed at nanoscale resolution. Science. 2024. https://doi.org/10.1126/science.adk4858",
    referenceSpaceIds: [],
    description:
      "A public, sample-scoped human cortical EM resource retained in the registry as a future candidate.",
    limitations:
      "It is a single surgical cortical sample without a validated mapping to Luna’s canonical whole-brain structures. Luna therefore does not expose it as subcellular structure data.",
  },
];

export function getDataset(
  id: string,
): BrainDataset | null {
  return (
    BRAIN_DATASETS.find(
      (dataset) => dataset.id === id,
    ) ?? null
  );
}

export function getDatasetsForScale(
  scale: BrainDataset["scale"],
): BrainDataset[] {
  return BRAIN_DATASETS.filter(
    (dataset) => dataset.scale === scale,
  );
}

export function getScientificDatasetManifest(): BrainScientificDatasetManifest {
  return {
    datasets: BRAIN_DATASETS,
    referenceSpaces: BRAIN_REFERENCE_SPACES,
    coordinateTransforms:
      BRAIN_COORDINATE_TRANSFORMS,
    scientificReferences: SCIENTIFIC_REFERENCE_ASSETS,
    lunaReferenceRegistration:
      BRAIN_LUNA_REFERENCE_REGISTRATION,
    hraSpatialRegistration:
      HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
  };
}
